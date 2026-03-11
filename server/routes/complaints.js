// server/routes/complaints.js - V2: Photo upload, Geotagging, and Auth
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const exifr = require('exifr');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireCitizen, requireAdmin } = require('../auth');
const { classifyComplaint } = require('../classifier');
const { sendDepartmentNotification, sendCitizenConfirmation } = require('../mailer');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only images (JPEG, PNG, WEBP) are allowed.'));
  }
});

// ─── Citizen Routes ──────────────────────────────────────────────────────────

// POST /api/complaints - Submit with photo and optional geotag
router.post('/', requireCitizen, upload.single('photo'), async (req, res) => {
  try {
    const { description, location, lat, lng } = req.body;
    const citizen_id = req.user.id;
    const citizen_name = req.user.name;

    if (!description) return res.status(400).json({ error: 'Description is required.' });

    // AI Classification
    const classification = classifyComplaint(description);

    // Geotag extraction from photo if available
    let finalLat = lat ? parseFloat(lat) : null;
    let finalLng = lng ? parseFloat(lng) : null;
    let photoUrl = null;

    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
      try {
        const gps = await exifr.gps(req.file.path);
        if (gps && gps.latitude && gps.longitude) {
          finalLat = gps.latitude;
          finalLng = gps.longitude;
          console.log(`📍 Extracted GPS from EXIF: ${finalLat}, ${finalLng}`);
        }
      } catch (err) {
        console.log('No GPS EXIF data found in photo.');
      }
    }

    // Priority auto-scoring
    const urgentKeywords = ['fire', 'flood', 'accident', 'danger', 'emergency', 'death', 'injury', 'critical'];
    const isUrgent = urgentKeywords.some(k => description.toLowerCase().includes(k));
    const priority = isUrgent ? 'High' : 'Normal';

    // Generate ID
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const shortId = uuidv4().split('-')[0].toUpperCase();
    const complaint_id = `GRV-${dateStr}-${shortId}`;

    const complaint = {
      complaint_id,
      citizen_id,
      name: citizen_name,
      description,
      location: location || '',
      category: classification.category,
      department: classification.department,
      departmentEmail: classification.departmentEmail,
      status: 'Pending',
      priority,
      lat: finalLat,
      lng: finalLng,
      photo_url: photoUrl,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      timeline: [{ from: null, to: 'Pending', changed_by: 'citizen', at: now.toISOString() }]
    };

    // Save
    db.saveComplaint(complaint);

    // Send emails (async)
    // Note: In a real app we might need the citizen's email from the DB here
    const citizen = db.findCitizenById(citizen_id);
    if (citizen && citizen.email) {
      sendCitizenConfirmation({ ...complaint, email: citizen.email });
    }
    sendDepartmentNotification(complaint);

    res.status(201).json({ success: true, complaint });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints/mine - My history
router.get('/mine', requireCitizen, (req, res) => {
  const complaints = db.getComplaintsByCitizenId(req.user.id);
  res.json({ success: true, complaints });
});

// ─── Admin Routes ────────────────────────────────────────────────────────────

router.get('/all', requireAdmin, (req, res) => {
  const { status, category, priority } = req.query;
  const complaints = db.getAllComplaints({ status, category, priority });
  res.json({ success: true, complaints });
});

router.patch('/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  const updated = db.updateComplaintStatus(req.params.id, status, req.user.name);
  if (!updated) return res.status(404).json({ error: 'Complaint not found.' });
  res.json({ success: true, complaint: updated });
});

router.get('/geotagged', requireAdmin, (req, res) => {
  const complaints = db.getGeotaggedComplaints();
  res.json({ success: true, complaints });
});

router.get('/stats', requireAdmin, (req, res) => {
  const stats = db.getStats();
  res.json({ success: true, stats });
});

// ─── Public Routes ───────────────────────────────────────────────────────────

router.get('/:id', (req, res) => {
  const complaint = db.getComplaintById(req.params.id);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
  res.json({ success: true, complaint });
});

module.exports = router;
