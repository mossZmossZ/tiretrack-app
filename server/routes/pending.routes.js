import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import * as pendingService from '../services/pending.service.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const items = await pendingService.readAll();
    const total = await pendingService.countAll();
    res.json({ success: true, data: items, meta: { total } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/resolve', async (req, res) => {
  try {
    const { action } = req.body;
    if (action === 'add') {
      const inventory = await pendingService.resolveAdd(req.params.id);
      if (!inventory) return res.status(404).json({ success: false, error: 'ไม่พบรายการ' });
      res.json({ success: true, data: inventory });
    } else if (action === 'link') {
      await pendingService.resolveLink(req.params.id);
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: 'action ต้องเป็น add หรือ link' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pendingService.deleteById(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
