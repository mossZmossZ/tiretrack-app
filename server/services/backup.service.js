import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');
const configPath = path.join(dataDir, 'backup-config.json');

const FILES_TO_BACKUP = ['services.csv', 'inventory.csv'];

let s3Client = null;
let currentCronJob = null;

export const getConfig = () => {
  if (!fs.existsSync(configPath)) {
    return {
      autoEnabled: false,
      schedule: '0 2 * * *', // Daily at 2 AM
      lastBackup: null,
      lastStatus: null,
    };
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
};

const saveConfig = (config) => {
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
      forcePathStyle: true, // Required for MinIO
    });
  }
  return s3Client;
};

export const backupNow = async () => {
  const client = initS3();
  const bucket = process.env.S3_BUCKET;

  const results = [];
  
  for (const filename of FILES_TO_BACKUP) {
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) {
      results.push({ file: filename, status: 'skipped', reason: 'File not found locally' });
      continue;
    }

    const fileContent = fs.readFileSync(filePath);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      Body: fileContent,
      ContentType: 'text/csv'
    });

    try {
      await client.send(command);
      results.push({ file: filename, status: 'success' });
    } catch (error) {
      console.error(`Backup failed for ${filename}:`, error);
      throw new Error(`Failed to upload ${filename} to S3: ${error.message}`);
    }
  }

  // Update last backup time
  const config = getConfig();
  config.lastBackup = new Date().toISOString();
  config.lastStatus = 'success';
  saveConfig(config);

  return results;
};

// Stream to Buffer helper for S3
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

  const results = [];

  for (const filename of FILES_TO_BACKUP) {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: filename,
    });

    try {
      const response = await client.send(command);
      const buffer = await streamToBuffer(response.Body);
      
      const filePath = path.join(dataDir, filename);
      fs.writeFileSync(filePath, buffer);
      
      results.push({ file: filename, status: 'success' });
    } catch (error) {
      console.error(`Restore failed for ${filename}:`, error);
      if (error.name === 'NoSuchKey') {
        results.push({ file: filename, status: 'skipped', reason: 'Not found in backup' });
      } else {
        throw new Error(`Failed to download ${filename} from S3: ${error.message}`);
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
