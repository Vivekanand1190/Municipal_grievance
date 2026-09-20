// server/auth.js - JWT auth helpers and middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'municipal_grievance_jwt_secret_v2_2026';

function signToken(payload, role = 'citizen') {
  const expiresIn = role === 'admin' ? '8h' : '24h';
  return jwt.sign({ ...payload, role }, JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function extractToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

// Middleware — require citizen JWT
function requireCitizen(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required. Please log in.' });
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'citizen') {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
  req.user = decoded;
  next();
}

// Middleware — require admin JWT
function requireAdmin(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Admin authentication required.' });
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(401).json({ error: 'Admin access only.' });
  }
  req.user = decoded;
  next();
}

module.exports = { signToken, verifyToken, requireCitizen, requireAdmin };
