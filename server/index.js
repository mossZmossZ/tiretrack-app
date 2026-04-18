import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import serviceRoutes from './routes/service.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import backupRoutes from './routes/backup.routes.js';
import { initAutoBackup } from './services/backup.service.js';

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

// Initialize auto-backup if enabled
initAutoBackup();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'TireTrack API is running', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚗 TireTrack API running on http://localhost:${PORT}`);
});
