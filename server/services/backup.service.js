import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/mongo.js';
import { serializeRecords, parseCSV } from '../lib/csv.js';
import { SERVICE_HEADERS } from './service.service.js';
import { INVENTORY_HEADERS } from './inventory.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');
const configPath = path.join(dataDir, 'backup-config.json');

// Maps each S3 object key to the collection it represents and the column order
// to serialize/parse. Keeps S3 layout identical to the CSV-era so existing
// backups remain restorable.
const BACKUP_TARGETS = [
  { filename: 'services.csv', collection: 'services', headers: SERVICE_HEADERS },
  { filename: 'inventory.csv', collection: 'inventory', headers: INVENTORY_HEADERS },
];

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
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
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

// Project a Mongo doc into the CSV-shaped object the headers expect:
// _id is exposed as `id`; all other fields default to empty string.
const docToCsvRow = (doc, headers) => {
  const { _id, ...rest } = doc;
  const row = { id: _id };
  for (const h of headers) {
    if (h === 'id') continue;
    row[h] = rest[h] ?? '';
  }
  return row;
};

// Reverse: a CSV row uses `id`, but Mongo stores it as `_id`.
const csvRowToDoc = (row) => {
  const { id, ...rest } = row;
  return { _id: id, ...rest };
};

export const backupNow = async () => {
  const client = initS3();
  const bucket = process.env.S3_BUCKET;
  const db = getDb();

  const results = [];

  for (const { filename, collection, headers } of BACKUP_TARGETS) {
    const docs = await db.collection(collection).find({}).toArray();
    const rows = docs.map(d => docToCsvRow(d, headers));
    const csv = serializeRecords(headers, rows);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      Body: csv,
      ContentType: 'text/csv'
    });

    try {
      await client.send(command);
      results.push({ file: filename, status: 'success', records: docs.length });
    } catch (error) {
      console.error(`Backup failed for ${filename}:`, error);
      throw new Error(`Failed to upload ${filename} to S3: ${error.message}`);
    }
  }

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
  const db = getDb();

  const results = [];

  for (const { filename, collection, headers } of BACKUP_TARGETS) {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: filename,
    });

    try {
      const response = await client.send(command);
      const buffer = await streamToBuffer(response.Body);
      const csv = buffer.toString('utf-8');
      const rows = parseCSV(csv, headers);
      const docs = rows.map(csvRowToDoc).filter(d => d._id);

      // Destructive replace: matches the CSV-era behaviour where the S3 file
      // overwrote the local file outright.
      await db.collection(collection).deleteMany({});
      if (docs.length > 0) {
        await db.collection(collection).insertMany(docs);
      }

      results.push({ file: filename, status: 'success', records: docs.length });
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
