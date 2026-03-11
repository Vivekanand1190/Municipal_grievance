// server/routes/auth.js - Authentication routes for citizen and admin
const express = require('express');
const bcrypt = require('bcryptjs');
const { signToken } = require('../auth');
const db = require('../db');

const authRouter = express.Router();

// ─── Citizen Auth ────────────────────────────────────────────────────────────

// Verhoeff algorithm for Aadhaar checksum (simple version)
function validateAadhaar(aadhaar) {
  return /^\d{12}$/.test(aadhaar); // In a real app, use a proper Verhoeff check library
}

// Register Citizen
authRouter.post('/citizen/register', (req, res) => {
  const { aadhaar, name, phone, email } = req.body;
  if (!validateAadhaar(aadhaar)) {
    return res.status(400).json({ error: 'Invalid Aadhaar number. Must be 12 digits.' });
  }
  if (!name) return res.status(400).json({ error: 'Name is required.' });

  // In a real app, we'd hash the Aadhaar. For this demo, we use it as a unique key.
  const result = db.registerCitizen({ aadhaar_hash: aadhaar, name, phone, email });
  if (result.error) return res.status(400).json({ error: result.error });

  const token = signToken({ id: result.citizen.id, name: result.citizen.name }, 'citizen');
  res.status(201).json({ success: true, token, user: result.citizen });
});

// Login Citizen
authRouter.post('/citizen/login', (req, res) => {
  const { aadhaar } = req.body;
  if (!validateAadhaar(aadhaar)) {
    return res.status(400).json({ error: 'Invalid Aadhaar format.' });
  }

  const citizen = db.findCitizenByAadhaar(aadhaar);
  if (!citizen) return res.status(404).json({ error: 'Aadhaar not registered.' });

  const token = signToken({ id: citizen.id, name: citizen.name }, 'citizen');
  res.json({ success: true, token, user: citizen });
});

// ─── Admin Auth ──────────────────────────────────────────────────────────────

authRouter.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  const admin = db.findAdminByEmail(email);
  if (!admin) return res.status(401).json({ error: 'Invalid credentials.' });

  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

  const token = signToken({ id: admin.id, name: admin.name }, 'admin');
  res.json({ success: true, token, user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
});

module.exports = authRouter;
