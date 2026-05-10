import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { RecycleBin } from '../models/RecycleBin.model.js';
import { Service } from '../models/Service.model.js';
import { Inventory } from '../models/Inventory.model.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const filter = type ? { type } : {};
    const items = await RecycleBin.find(filter).sort({ deletedAt: -1 }).lean();
    res.json({
      success: true,
      data: items.map(i => ({
        id: i._id,
        type: i.type,
        data: i.data,
        deletedAt: i.deletedAt,
        expiresAt: new Date(new Date(i.deletedAt).getTime() + 86400000)
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/restore', async (req, res) => {
  try {
    const item = await RecycleBin.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลในถังขยะ' });

    const { __v, ...restoredData } = item.data || {};
    if (item.type === 'service') {
      await Service.create(restoredData);
    } else {
      await Inventory.create(restoredData);
    }

    await RecycleBin.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'กู้คืนข้อมูลสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Must be defined before /:id to avoid route collision
router.delete('/clear', async (req, res) => {
  try {
    const { type } = req.query;
    const filter = type ? { type } : {};
    const result = await RecycleBin.deleteMany(filter);
    res.json({ success: true, message: `ลบถาวร ${result.deletedCount} รายการ` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await RecycleBin.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
    res.json({ success: true, message: 'ลบถาวรสำเร็จ' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
