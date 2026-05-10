import express from 'express';
import multer from 'multer';
import * as inventoryService from '../services/inventory.service.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const data = await inventoryService.readAll();
    data.sort((a, b) => {
      if (a.tire_brand === b.tire_brand) {
        return a.tire_size.localeCompare(b.tire_size);
      }
      return a.tire_brand.localeCompare(b.tire_brand);
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { tire_brand, tire_size, cost_price } = req.body;
    if (!tire_brand || !tire_size || !cost_price) {
      return res.status(400).json({ success: false, error: 'กรุณากรอกยี่ห้อ ขนาด และราคาต้นทุน' });
    }
    const record = await inventoryService.create(req.body);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const record = await inventoryService.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลยาง' });
    }
    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_at;
    const updated = await inventoryService.updateById(req.params.id, updates);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const success = await inventoryService.deleteById(req.params.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/export', requireAdmin, async (req, res) => {
  try {
    const csvContent = await inventoryService.getCSVContent();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory.csv');
    res.send('﻿' + csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/import', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'ไม่พบข้อมูล CSV' });
    }
    const content = req.file.buffer.toString('utf-8');
    const result = await inventoryService.importLegacy(content);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
