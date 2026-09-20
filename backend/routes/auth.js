// server/routes/auth.js - Authentication routes for citizen and admin
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { signToken, requireCitizen } = require('../auth');
const db = require('../db');

// Multer setup for profile photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for profile
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only images (JPEG, PNG, WEBP) are allowed.'));
  }
});

const authRouter = express.Router();

// ─── Citizen Auth ────────────────────────────────────────────────────────────

// Verhoeff algorithm for Aadhaar checksum (simple version)
function validateAadhaar(aadhaar) {
  return /^\d{12}$/.test(aadhaar); // In a real app, use a proper Verhoeff check library
}

// Register Citizen
authRouter.post('/citizen/register', async (req, res) => {
  const { aadhaar, name, phone, email } = req.body;
  if (!validateAadhaar(aadhaar)) {
    return res.status(400).json({ error: 'Invalid Aadhaar number. Must be 12 digits.' });
  }
  if (!name) return res.status(400).json({ error: 'Name is required.' });

  // In a real app, we'd hash the Aadhaar. For this demo, we use it as a unique key.
  const result = await db.registerCitizen({ aadhaar_hash: aadhaar, name, phone, email });
  if (result.error) return res.status(400).json({ error: result.error });

  const token = signToken({ id: result.citizen.id, name: result.citizen.name, email: result.citizen.email, phone: result.citizen.phone }, 'citizen');
  res.status(201).json({ success: true, token, user: result.citizen });
});

// Login Citizen
authRouter.post('/citizen/login', async (req, res) => {
  const { aadhaar, phone } = req.body;
  if (!validateAadhaar(aadhaar)) {
    return res.status(400).json({ error: 'Invalid Aadhaar format.' });
  }
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  const citizen = await db.findCitizenByAadhaar(aadhaar);
  if (!citizen) return res.status(404).json({ error: 'Aadhaar not registered.' });

  // Match phone number (cleaning spaces/dashes if any)
  const dbPhone = citizen.phone.replace(/\s+/g, '');
  const reqPhone = phone.replace(/\s+/g, '');

  if (dbPhone !== reqPhone) {
    return res.status(401).json({ error: 'Aadhaar and phone number do not match our records.' });
  }

  const token = signToken({ id: citizen.id, name: citizen.name, email: citizen.email, phone: citizen.phone }, 'citizen');
  res.json({ success: true, token, user: citizen });
});

// Update Profile Photo
authRouter.patch('/citizen/profile', requireCitizen, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded.' });
    
    const photo_url = `/uploads/${req.file.filename}`;
    const citizen = await db.findCitizenById(req.user.id);
    if (!citizen) return res.status(404).json({ error: 'Citizen not found.' });

    citizen.photo_url = photo_url;
    await citizen.save();

    res.json({ success: true, photo_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin Auth ──────────────────────────────────────────────────────────────

authRouter.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  const admin = await db.findAdminByEmail(email);
  if (!admin) return res.status(401).json({ error: 'Invalid credentials.' });

  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

  const token = signToken({ id: admin.id, name: admin.name }, 'admin');
  res.json({ success: true, token, user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
});

module.exports = authRouter;
