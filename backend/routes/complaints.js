// server/routes/complaints.js - V2: Photo upload, Geotagging, and Auth
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const exifr = require('exifr');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
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

    // Duplicate Detection Logic
    const duplicate = await db.findDuplicateComplaints(classification.category, finalLat, finalLng);
    
    const complaint = {
      complaint_id,
      citizen_id,
      name: citizen_name,
      email: req.user.email || '',
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
      timeline: [{ from: null, to: 'Pending', changed_by: 'citizen', at: now.toISOString() }],
      parent_id: duplicate ? duplicate.complaint_id : null
    };

    // Save
    await db.saveComplaint(complaint);

    // Send emails (async)
    const citizen = await db.findCitizenById(citizen_id);
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

// POST /api/complaints/:id/feedback - Citizens rate service
router.post('/:id/feedback', requireCitizen, async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Valid rating (1-5) is required.' });
  }

  const complaint = await db.getComplaintById(req.params.id);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
  if (complaint.citizen_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (complaint.status !== 'Resolved') {
    return res.status(400).json({ error: 'Feedback can only be provided for resolved complaints.' });
  }

  const updated = await db.addComplaintFeedback(req.params.id, { rating, comment });
  res.json({ success: true, complaint: updated });
});

// GET /api/complaints/mine - My history
router.get('/mine', requireCitizen, async (req, res) => {
  const complaints = await db.getComplaintsByCitizenId(req.user.id);
  res.json({ success: true, complaints });
});

// ─── Admin Routes ────────────────────────────────────────────────────────────

router.get('/all', requireAdmin, async (req, res) => {
  const { status, category, priority, assigned_to, zone, startDate, endDate } = req.query;
  const filters = { status, category, priority, assigned_to, zone, startDate, endDate };
  
  if (req.user.role === 'officer' && req.user.department) {
    filters.department = req.user.department;
  }

  const complaints = await db.getAllComplaints(filters);
  res.json({ success: true, complaints });
});

router.patch('/:id/assign', requireAdmin, async (req, res) => {
  const { assigned_to, deadline } = req.body;
  if (!assigned_to) return res.status(400).json({ error: 'Assignee is required.' });

  const updated = await db.assignComplaint(req.params.id, assigned_to, deadline);
  if (!updated) return res.status(404).json({ error: 'Complaint not found.' });
  
  res.json({ success: true, complaint: updated });
});

router.patch('/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  const updated = await db.updateComplaintStatus(req.params.id, status, req.user.name);
  if (!updated) return res.status(404).json({ error: 'Complaint not found.' });
  
  // Real-time notification
  const citizen = await db.findCitizenById(updated.citizen_id);
  if (citizen && citizen.email) {
    const { sendStatusUpdateEmail } = require('../mailer');
    sendStatusUpdateEmail({ ...updated, email: citizen.email }, status);
  }

  res.json({ success: true, complaint: updated });
});

router.get('/geotagged', requireAdmin, async (req, res) => {
  const complaints = await db.getGeotaggedComplaints();
  res.json({ success: true, complaints });
});

router.get('/stats', requireAdmin, async (req, res) => {
  const { month, year } = req.query;
  const department = (req.user.role === 'officer') ? req.user.department : null;
  
  const stats = await db.getStats(
    department,
    month !== undefined ? parseInt(month) : null,
    year !== undefined ? parseInt(year) : null
  );
  res.json({ success: true, stats });
});

router.get('/python-stats', requireAdmin, async (req, res) => {
  const { month, year } = req.query;
  const department = (req.user.role === 'officer') ? req.user.department : null;
  
  const stats = await db.getStats(
    department,
    month !== undefined ? parseInt(month) : null,
    year !== undefined ? parseInt(year) : null
  );

  const dataStr = JSON.stringify(stats).replace(/"/g, '\\"');
  const scriptPath = path.join(__dirname, '..', 'generate_charts.py');
  
  exec(`python "${scriptPath}" "${dataStr}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Exec error: ${error}`);
      return res.status(500).json({ success: false, error: 'Chart generation failed' });
    }
    res.json({ 
      success: true, 
      stats, 
      charts: {
        volume: `/uploads/charts/volume.png?t=${Date.now()}`,
        status: `/uploads/charts/status.png?t=${Date.now()}`,
        dept: `/uploads/charts/dept.png?t=${Date.now()}`,
        zone: `/uploads/charts/zone.png?t=${Date.now()}`
      }
    });
  });
});

// ─── Public Routes ───────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  // Use the helper to get complaint with citizen details
  const complaint = await db.getComplaintWithCitizen(req.params.id);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });
  res.json({ success: true, complaint });
});

// NEW: Check for nearby complaints before submission
router.post('/check-nearby', requireCitizen, async (req, res) => {
  const { category, lat, lng } = req.body;
  const duplicate = await db.findDuplicateComplaints(category, parseFloat(lat), parseFloat(lng));
  res.json({ success: true, duplicate });
});

// NEW: Support an existing complaint
router.post('/:id/support', requireCitizen, async (req, res) => {
  const result = await db.supportComplaint(req.params.id, req.user.id);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ success: true, count: result.count });
});

// NEW: Public Map Data
router.get('/public/map', async (req, res) => {
  const complaints = await db.getPublicComplaints();
  res.json({ success: true, complaints });
});

module.exports = router;
