import express from 'express';
import multer from 'multer';
import * as inventoryService from '../services/inventory.service.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All inventory routes require auth at minimum
router.use(requireAuth);

/**
 * GET /api/inventory
 * Anyone authenticated can read inventory (Tech needs it for select box)
 */
router.get('/', (req, res) => {
  try {
    const data = inventoryService.readAll();
    // Sort logic (optional): A-Z by brand then size
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

/**
 * POST /api/inventory
 * Admin only: Add new tire model to inventory
 */
router.post('/', requireAdmin, (req, res) => {
  try {
    const { tire_brand, tire_size, cost_price } = req.body;
    if (!tire_brand || !tire_size || !cost_price) {
      return res.status(400).json({ success: false, error: 'กรุณากรอกยี่ห้อ ขนาด และราคาต้นทุน' });
    }
    const record = inventoryService.create(req.body);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/inventory/:id
 * Admin only: Edit inventory
 */
router.put('/:id', requireAdmin, (req, res) => {
  try {
    const record = inventoryService.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลยาง' });
    }
    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_at;

    const updated = inventoryService.updateById(req.params.id, updates);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/inventory/:id
 * Admin only: Delete tire from inventory
 */
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const success = inventoryService.deleteById(req.params.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/inventory/export
 * Admin only: Export inventory CSV
 */
router.get('/export', requireAdmin, (req, res) => {
  try {
    const csvContent = inventoryService.getCSVContent();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory.csv');
    // Prepend BOM so Excel reads UTF-8 Thai characters correctly
    res.send('\uFEFF' + csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/inventory/import
 * Admin only: Import inventory legacy format
 */
router.post('/import', requireAdmin, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'ไม่พบข้อมูล CSV' });
    }
    const content = req.file.buffer.toString('utf-8');
    const result = inventoryService.importLegacy(content);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
