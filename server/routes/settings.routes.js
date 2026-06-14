import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import * as settingsService from '../services/settings.service.js';

const router = Router();
router.use(requireAuth);

router.get('/:type', async (req, res) => {
  try {
    const data = await settingsService.getConfig(req.params.type);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:type', requireAdmin, async (req, res) => {
  try {
    const data = await settingsService.saveConfig(req.params.type, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
