import express from 'express';
import * as tireBrandsService from '../services/tire-brands.service.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const data = await tireBrandsService.readAll();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, error: 'กรุณากรอกชื่อยี่ห้อ' });
    }
    const record = await tireBrandsService.create(name.trim());
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, error: 'กรุณากรอกชื่อยี่ห้อ' });
    }
    const record = await tireBrandsService.updateById(req.params.id, name.trim());
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const success = await tireBrandsService.deleteById(req.params.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'ไม่พบยี่ห้อ' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
