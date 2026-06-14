import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as svc from '../services/parts-inventory.service.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const data = await svc.readAll();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const record = await svc.create(req.body);
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const record = await svc.updateById(req.params.id, req.body);
    if (!record) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const ok = await svc.deleteById(req.params.id);
    if (!ok) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
