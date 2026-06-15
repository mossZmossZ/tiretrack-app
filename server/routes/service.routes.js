import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import * as serviceService from '../services/service.service.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require auth
router.use(requireAuth);

/**
 * GET /api/services
 * Query: ?search=plate&type=tire_change&page=1&limit=50
 */
router.get('/', async (req, res) => {
  try {
    let records = await serviceService.readAll();
    const { search, type, page = 1, limit = 50, from, to } = req.query;

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if ((from && !dateRe.test(from)) || (to && !dateRe.test(to))) {
      return res.status(400).json({ success: false, error: 'Invalid date range' });
    }

    if (from && to) {
      records = records.filter(r => r.date >= from && r.date <= to);
    }

    if (search) {
      records = records.filter(r =>
        r.license_plate.toLowerCase().includes(search.toLowerCase()) ||
        r.car_model.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (type) {
      records = records.filter(r => r.service_type === type);
    }

    // Sort newest first
    records.sort((a, b) => (b.created_at || b.date).localeCompare(a.created_at || a.date));

    const total = records.length;
    const start = (Number(page) - 1) * Number(limit);
    const paginated = records.slice(start, start + Number(limit));

    res.json({
      success: true,
      data: paginated,
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/services/stats
 * Admin only
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await serviceService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/services/export
 * Admin only — returns CSV file download
 */
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const csv = await serviceService.exportAll();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=tiretrack-export-${new Date().toISOString().split('T')[0]}.csv`);
    // Add BOM for Excel Thai support
    res.send('﻿' + csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/services/search?q=กค1234
 */
router.get('/search', async (req, res) => {
  try {
    const records = await serviceService.search(req.query.q);
    records.sort((a, b) => (b.created_at || b.date).localeCompare(a.created_at || a.date));
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/services/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const record = await serviceService.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
    }
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/services
 * Body: service record data
 */
router.post('/', async (req, res) => {
  try {
    const { service_type } = req.body;
    if (!service_type) {
      return res.status(400).json({ success: false, error: 'กรุณาเลือกประเภทบริการ' });
    }

    const record = await serviceService.create(req.body, req.user.role);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/services/bill/:bill_id
 * Delete all service records belonging to a bill (undo multi-service entry)
 */
router.delete('/bill/:bill_id', async (req, res) => {
  try {
    const records = await serviceService.findByBillId(req.params.bill_id);
    if (!records.length) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
    }
    if (req.user.role === 'tech') {
      const thirtyMinutes = 30 * 60 * 1000;
      for (const r of records) {
        if (r.created_by !== 'tech') {
          return res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์ลบข้อมูลนี้' });
        }
        if (Date.now() - new Date(r.created_at).getTime() > thirtyMinutes) {
          return res.status(403).json({ success: false, error: 'เกินเวลาที่อนุญาตให้ยกเลิก (30 นาที)' });
        }
      }
    }
    await serviceService.deleteByBillId(req.params.bill_id);
    res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/services/:id
 * Technician can only delete records they created recently
 */
router.delete('/:id', async (req, res) => {
  try {
    const record = await serviceService.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
    }

    // Tech can only undo their own recent entries (within 30 minutes)
    if (req.user.role === 'tech') {
      if (record.created_by !== 'tech') {
        return res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์ลบข้อมูลนี้' });
      }
      const createdAt = new Date(record.created_at).getTime();
      const thirtyMinutes = 30 * 60 * 1000;
      if (Date.now() - createdAt > thirtyMinutes) {
        return res.status(403).json({ success: false, error: 'เกินเวลาที่อนุญาตให้ยกเลิก (30 นาที)' });
      }
    }

    const deleted = await serviceService.deleteById(req.params.id);
    if (!deleted) {
      return res.status(500).json({ success: false, error: 'ลบข้อมูลไม่สำเร็จ' });
    }
    res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/services/:id
 * Admin only — edit existing record
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const record = await serviceService.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
    }

    // Prevent overriding critical fields accidentally
    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_at;
    delete updates.created_by;

    const updated = await serviceService.updateById(req.params.id, updates);
    res.json({ success: true, data: updated, message: 'แก้ไขข้อมูลสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/services/import
 * Admin only — upload legacy CSV file
 */
router.post('/import', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'กรุณาอัปโหลดไฟล์ CSV' });
    }
    const content = req.file.buffer.toString('utf-8');
    const result = await serviceService.importLegacy(content);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
