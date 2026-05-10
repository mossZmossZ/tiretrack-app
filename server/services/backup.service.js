import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exportAll, importCurrentCSV } from './csv.service.js';
import { getCSVContent, importCurrentCSV as importInventoryCSV } from './inventory.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');
const configPath = path.join(dataDir, 'backup-config.json');

let s3Client = null;
let currentCronJob = null;

export const getConfig = () => {
  if (!fs.existsSync(configPath)) {
    return {
      autoEnabled: false,
      schedule: '0 2 * * *',
      lastBackup: null,
      lastStatus: null,
    };
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
};

const saveConfig = (config) => {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
};

export const updateConfig = (newSettings) => {
  const config = { ...getConfig(), ...newSettings };
  saveConfig(config);

  if (config.autoEnabled) {
    startCronJob(config.schedule);
  } else {
    stopCronJob();
  }

  return config;
};

const initS3 = () => {
  if (!s3Client) {
    if (!process.env.S3_ENDPOINT || !process.env.S3_BUCKET || !process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
      throw new Error('S3 configuration is missing in .env');
    }
    s3Client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
};

export const backupNow = async () => {
  const client = initS3();
  const bucket = process.env.S3_BUCKET;

  // Export MongoDB data as CSV and upload to S3
  const [servicesCsv, inventoryCsv] = await Promise.all([exportAll(), getCSVContent()]);

  const uploads = [
    { key: 'services.csv', body: servicesCsv },
    { key: 'inventory.csv', body: inventoryCsv },
  ];

  const results = [];
  for (const { key, body } of uploads) {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(body, 'utf-8'),
      ContentType: 'text/csv',
    });
    try {
      await client.send(command);
      results.push({ file: key, status: 'success' });
    } catch (error) {
      console.error(`Backup failed for ${key}:`, error);
      throw new Error(`Failed to upload ${key} to S3: ${error.message}`);
    }
  }

  const config = getConfig();
  config.lastBackup = new Date().toISOString();
  config.lastStatus = 'success';
  saveConfig(config);

  return results;
};

const streamToBuffer = async (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

export const restoreBackup = async () => {
  const client = initS3();
  const bucket = process.env.S3_BUCKET;

  const restores = [
    { key: 'services.csv', importer: importCurrentCSV },
    { key: 'inventory.csv', importer: importInventoryCSV },
  ];

  const results = [];
  for (const { key, importer } of restores) {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    try {
      const response = await client.send(command);
      const buffer = await streamToBuffer(response.Body);
      await importer(buffer.toString('utf-8'));
      results.push({ file: key, status: 'success' });
    } catch (error) {
      console.error(`Restore failed for ${key}:`, error);
      if (error.name === 'NoSuchKey') {
        results.push({ file: key, status: 'skipped', reason: 'Not found in backup' });
      } else {
        throw new Error(`Failed to restore ${key} from S3: ${error.message}`);
      }
    }
  }

  return results;
};

const startCronJob = (schedule) => {
  stopCronJob();

  if (!cron.validate(schedule)) {
    console.error(`Invalid cron schedule: ${schedule}. Fallback to daily.`);
    schedule = '0 2 * * *';
  }

  currentCronJob = cron.schedule(schedule, async () => {
    console.log(`[Backup] Auto-backup triggered at ${new Date().toISOString()}`);
    try {
      await backupNow();
      console.log(`[Backup] Auto-backup successful.`);
    } catch (err) {
      console.error(`[Backup] Auto-backup failed:`, err);
      const config = getConfig();
      config.lastStatus = `failed: ${err.message}`;
      saveConfig(config);
    }
  });

  console.log(`[Backup] Auto-backup scheduled with cron: ${schedule}`);
};

const stopCronJob = () => {
  if (currentCronJob) {
    currentCronJob.stop();
    currentCronJob = null;
    console.log(`[Backup] Auto-backup stopped.`);
  }
};

export const initAutoBackup = () => {
  const config = getConfig();
  if (config.autoEnabled) {
    startCronJob(config.schedule);
  }
};
