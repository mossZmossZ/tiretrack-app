import { Router } from 'express';
import { createSession, validateSession } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /api/auth/login
 * Body: { pin: "1234" }
 * Returns: { success, token, role }
 */
router.post('/login', (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ success: false, error: 'กรุณาใส่รหัส PIN' });
  }

  const adminPin = process.env.ADMIN_PIN || '9999';
  const techPin = process.env.TECH_PIN || '1234';

  let role = null;
  if (pin === adminPin) {
    role = 'admin';
  } else if (pin === techPin) {
    role = 'tech';
  }

  if (!role) {
    return res.status(401).json({ success: false, error: 'รหัส PIN ไม่ถูกต้อง' });
  }

  const token = createSession(role);
  res.json({ success: true, data: { token, role } });
});

/**
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 * Returns: { success, role }
 */
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' });
  }
  const token = authHeader.split(' ')[1];
  const session = validateSession(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'เซสชันหมดอายุ' });
  }
  res.json({ success: true, data: { role: session.role } });
});

export default router;
