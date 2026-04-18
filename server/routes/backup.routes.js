import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import * as backupService from '../services/backup.service.js';

const router = Router();

// All backup routes require Admin role
router.use(requireAuth, requireAdmin);

/**
 * GET /api/backup/status
 * Get current backup configuration and status
 */
router.get('/status', (req, res) => {
  try {
    const config = backupService.getConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/backup/settings
 * Update backup configuration (auto-backup, schedule)
 * Body: { autoEnabled: boolean, schedule: string }
 */
router.post('/settings', (req, res) => {
  try {
    const { autoEnabled, schedule } = req.body;
    const newConfig = backupService.updateConfig({ autoEnabled, schedule });
    res.json({ success: true, data: newConfig, message: 'บันทึกการตั้งค่าสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/backup/now
 * Trigger an immediate backup to S3
 */
router.post('/now', async (req, res) => {
  try {
    const results = await backupService.backupNow();
    res.json({ success: true, data: results, message: 'สำรองข้อมูลสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/backup/restore
 * Restore backup from S3 (overwrites local CSVs)
 */
router.post('/restore', async (req, res) => {
  try {
    const results = await backupService.restoreBackup();
    res.json({ success: true, data: results, message: 'กู้คืนข้อมูลสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
