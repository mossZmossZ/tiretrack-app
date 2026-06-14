import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import serviceRoutes from './routes/service.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import backupRoutes from './routes/backup.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import partsInventoryRoutes from './routes/parts-inventory.routes.js';
import tireBrandsRoutes from './routes/tire-brands.routes.js';
import { initAutoBackup } from './services/backup.service.js';
import { connectMongo, closeMongo } from './db/mongo.js';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/parts-inventory', partsInventoryRoutes);
app.use('/api/tire-brands', tireBrandsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'TireTrack API is running', time: new Date().toISOString() });
});

async function start() {
  try {
    await connectMongo();
    console.log('🍃 Mongo connected');
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  initAutoBackup();

  const server = app.listen(PORT, () => {
    console.log(`🚗 TireTrack API running on http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(async () => {
      await closeMongo();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
