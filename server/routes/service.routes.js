import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import * as csvService from '../services/csv.service.js';
import { generateReceiptNumber, saveReceiptToS3 } from '../services/receipt.service.js';
import { RecycleBin } from '../models/RecycleBin.model.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    let records = await csvService.readAll();
    const { search, type, page = 1, limit = 50 } = req.query;

    if (search) {
      records = records.filter(r =>
        r.license_plate.toLowerCase().includes(search.toLowerCase()) ||
        r.car_model.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (type) {
      records = records.filter(r => r.service_type === type);
    }

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

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await csvService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/export', requireAdmin, async (req, res) => {
  try {
    const csv = await csvService.exportAll();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=tiretrack-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send('﻿' + csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const records = await csvService.search(req.query.q);
    records.sort((a, b) => (b.created_at || b.date).localeCompare(a.created_at || a.date));
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const record = await csvService.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
    }
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { receipt_config, ...serviceData } = req.body;
    if (!serviceData.service_type) {
      return res.status(400).json({ success: false, error: 'กรุณาเลือกประเภทบริการ' });
    }
    const record = await csvService.create(serviceData, req.user.role);
    const receiptNumber = generateReceiptNumber(record);

    // Fire-and-forget — S3 failure never blocks the service save
    saveReceiptToS3(record, receipt_config || {}, receiptNumber).catch(err => {
      console.error('[Receipt] S3 upload failed:', err.message);
    });

    res.status(201).json({ success: true, data: { ...record, receiptNumber } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const record = await csvService.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
    }

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

    const recordData = record.toObject ? record.toObject() : { ...record };
    const { __v, ...cleanData } = recordData;
    await RecycleBin.create({ _id: uuidv4(), type: 'service', data: cleanData });

    const deleted = await csvService.deleteById(req.params.id);
    if (!deleted) {
      return res.status(500).json({ success: false, error: 'ลบข้อมูลไม่สำเร็จ' });
    }
    res.json({ success: true, message: 'ย้ายไปถังขยะสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const record = await csvService.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
    }

    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_at;
    delete updates.created_by;

    const updated = await csvService.updateById(req.params.id, updates);
    res.json({ success: true, data: updated, message: 'แก้ไขข้อมูลสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/import', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'กรุณาอัปโหลดไฟล์ CSV' });
    }
    const content = req.file.buffer.toString('utf-8');
    const result = await csvService.importLegacy(content);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
