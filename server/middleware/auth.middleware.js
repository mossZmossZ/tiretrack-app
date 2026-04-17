import { v4 as uuidv4 } from 'uuid';

// In-memory session store: Map<token, { role, createdAt }>
const sessions = new Map();

const EXPIRY_MS = (parseInt(process.env.SESSION_EXPIRY_HOURS) || 24) * 60 * 60 * 1000;

/**
 * Create a session token for a role
 */
export function createSession(role) {
  const token = uuidv4();
  sessions.set(token, { role, createdAt: Date.now() });
  return token;
}

/**
 * Validate a session token, return { role } or null
 */
export function validateSession(token) {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > EXPIRY_MS) {
    sessions.delete(token);
    return null;
  }
  return { role: session.role };
}

/**
 * Express middleware: require valid auth token
 * Sets req.user = { role }
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' });
  }
  const token = authHeader.split(' ')[1];
  const session = validateSession(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  }
  req.user = session;
  next();
}

/**
 * Express middleware: require admin role
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'ต้องใช้สิทธิ์ผู้ดูแลระบบ' });
  }
  next();
}
