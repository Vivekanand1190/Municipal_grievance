// server/db.js - MongoDB Implementation (v3 — Using Mongoose)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// DNS workaround for MongoDB Atlas
require("node:dns/promises").setServers(["8.8.8.8"]);

// ─── Connection Logic ────────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/municipal_grievance';

function connectDB() {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));
}

// Initial connection
connectDB();

function getConnectionStatus() {
  return mongoose.connection.readyState;
}

// ─── Schemas & Models ────────────────────────────────────────────────────────

const CitizenSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  aadhaar_hash: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  photo_url: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

const AdminSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'admin' },
  created_at: { type: Date, default: Date.now }
});

const ComplaintSchema = new mongoose.Schema({
  complaint_id: { type: String, required: true, unique: true },
  citizen_id: { type: String, required: true },
  name: { type: String }, // Citizen Name
  email: { type: String }, // Citizen Email
  category: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  priority: { type: String, default: 'Normal' },
  department: { type: String, default: 'General' },
  departmentEmail: { type: String },
  lat: { type: Number },
  lng: { type: Number },
  location: { type: String },
  location_text: { type: String },
  photo_url: { type: String },
  support_count: { type: Number, default: 0 },
  supports: [String],
  timeline: [{
    from: String,
    to: String,
    changed_by: String,
    at: { type: Date, default: Date.now }
  }],
  parent_id: { type: String, default: null },
  assigned_to: { type: String, default: 'Unassigned' },
  deadline: { type: Date },
  escalated: { type: Boolean, default: false },
  zone: { type: String, default: 'Central' },
  rating: { type: Number },
  feedback_comment: { type: String },
  feedback_at: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const Citizen = mongoose.model('Citizen', CitizenSchema);
const Admin = mongoose.model('Admin', AdminSchema);
const Complaint = mongoose.model('Complaint', ComplaintSchema);

// ─── Citizens ────────────────────────────────────────────────────────────────

async function registerCitizen({ aadhaar_hash, name, phone, email }) {
  try {
    const exists = await Citizen.findOne({ aadhaar_hash });
    if (exists) return { error: 'Aadhaar already registered.' };

    const citizen = new Citizen({
      id: `CIT-${Date.now()}`,
      aadhaar_hash,
      name,
      phone: phone || '',
      email: email || ''
    });

    await citizen.save();
    return { citizen: citizen.toObject() };
  } catch (err) {
    console.error('Register Citizen Error:', err);
    return { error: 'Database error occurred.' };
  }
}

async function findCitizenByAadhaar(aadhaar_hash) {
  return await Citizen.findOne({ aadhaar_hash });
}

async function findCitizenById(id) {
  return await Citizen.findOne({ id });
}

// ─── Admins ──────────────────────────────────────────────────────────────────

async function seedAdmins() {
  try {
    const count = await Admin.countDocuments();
    if (count > 0) return;

    const admins = [
      { id: 'ADM-001', email: 'admin@fixmycity.gov', name: 'Super Admin', role: 'admin', department: 'All' },
      { id: 'OFF-001', email: 'road@municipality.gov', name: 'Road Dept Officer', role: 'officer', department: 'Road & Infrastructure Department' },
      { id: 'OFF-002', email: 'water@municipality.gov', name: 'Water Dept Officer', role: 'officer', department: 'Water Supply Department' },
      { id: 'OFF-003', email: 'electric@municipality.gov', name: 'Electric Dept Officer', role: 'officer', department: 'Electricity Department' },
      { id: 'OFF-004', email: 'sanitation@municipality.gov', name: 'Sanitation Officer', role: 'officer', department: 'Sanitation & Waste Management' },
      { id: 'OFF-005', email: 'health@municipality.gov', name: 'Health Dept Officer', role: 'officer', department: 'Public Health Department' },
      { id: 'OFF-006', email: 'transport@municipality.gov', name: 'Transport Officer', role: 'officer', department: 'Transport Department' },
      { id: 'OFF-007', email: 'municipal@municipality.gov', name: 'General Services Officer', role: 'officer', department: 'Municipal Services' }
    ];

    for (const adminData of admins) {
      const admin = new Admin({
        ...adminData,
        password_hash: await bcrypt.hash('Fix@1234', 10)
      });
      await admin.save();
    }

    console.log('✅ Admin and 7 Officers seeded successfully. Password for all: Fix@1234');
  } catch (err) {
    console.error('Seed Admin Error:', err);
  }
}

async function findAdminByEmail(email) {
  return await Admin.findOne({ email: new RegExp(`^${email}$`, 'i') });
}

// ─── Complaints ───────────────────────────────────────────────────────────────

async function saveComplaint(complaintData) {
  const complaint = new Complaint(complaintData);
  await complaint.save();
  return complaint.toObject();
}

async function getAllComplaints(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.category) query.category = filters.category;
  if (filters.priority) query.priority = filters.priority;
  if (filters.assigned_to) query.assigned_to = filters.assigned_to;
  if (filters.zone) query.zone = filters.zone;
  if (filters.escalated !== undefined) query.escalated = filters.escalated;

  // Date range filter
  if (filters.startDate || filters.endDate) {
    query.created_at = {};
    if (filters.startDate) query.created_at.$gte = new Date(filters.startDate);
    if (filters.endDate) query.created_at.$lte = new Date(filters.endDate);
  }

  return await Complaint.find(query).sort({ created_at: -1 });
}

async function getComplaintById(complaint_id) {
  return await Complaint.findOne({ complaint_id });
}

async function getComplaintWithCitizen(complaint_id) {
  const complaint = await Complaint.findOne({ complaint_id });
  if (!complaint) return null;

  const citizen = await Citizen.findOne({ id: complaint.citizen_id });
  const citizenSafe = citizen ? citizen.toObject() : null;
  if (citizenSafe) delete citizenSafe.aadhaar_hash;

  const data = complaint.toObject();
  return { 
    ...data, 
    email: data.email || (citizen ? citizen.email : 'N/A'),
    citizen: citizenSafe, 
    aadhaar: citizen ? citizen.aadhaar_hash : 'N/A' 
  };
}

async function getComplaintsByCitizenId(citizen_id) {
  return await Complaint.find({ citizen_id }).sort({ created_at: -1 });
}

async function updateComplaintStatus(complaint_id, status, changed_by = 'admin') {
  const complaint = await Complaint.findOne({ complaint_id });
  if (!complaint) return null;

  const prev = complaint.status;
  complaint.status = status;
  complaint.updated_at = new Date();

  if (!complaint.timeline) complaint.timeline = [];
  complaint.timeline.push({
    from: prev,
    to: status,
    changed_by,
    at: new Date()
  });

  await complaint.save();
  return complaint.toObject();
}

async function assignComplaint(complaint_id, staff_name, deadline) {
  const complaint = await Complaint.findOne({ complaint_id });
  if (!complaint) return null;

  complaint.assigned_to = staff_name;
  if (deadline) complaint.deadline = new Date(deadline);
  complaint.updated_at = new Date();
  
  await complaint.save();
  return complaint.toObject();
}

async function getGeotaggedComplaints() {
  return await Complaint.find({ lat: { $exists: true }, lng: { $exists: true } });
}

async function addComplaintFeedback(complaint_id, feedback) {
  const complaint = await Complaint.findOne({ complaint_id });
  if (!complaint) return null;

  complaint.rating = feedback.rating;
  complaint.feedback_comment = feedback.comment || '';
  complaint.feedback_at = new Date();

  await complaint.save();
  return complaint.toObject();
}

async function findDuplicateComplaints(category, lat, lng, radiusKm = 0.5) {
  if (!lat || !lng) return null;

  // For simplicity, we'll use a basic distance fetch or a slightly more complex query
  // Here we use a 0.005 approx degrees for 0.5km for a simple box query first
  const latDiff = radiusKm / 111.32;
  const lngDiff = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));

  const potentialDuplicates = await Complaint.find({
    category,
    status: { $nin: ['Resolved', 'Rejected'] },
    lat: { $gte: lat - latDiff, $lte: lat + latDiff },
    lng: { $gte: lng - lngDiff, $lte: lng + lngDiff }
  }).exec();

  // Refine with Haversine if needed, but often box is enough for performance
  return potentialDuplicates.find(c => {
    const R = 6371;
    const dLat = (c.lat - lat) * Math.PI / 180;
    const dLng = (c.lng - lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat * Math.PI / 180) * Math.cos(c.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return distance <= radiusKm;
  });
}

async function supportComplaint(complaint_id, citizen_id) {
  const complaint = await Complaint.findOne({ complaint_id });
  if (!complaint) return { error: 'Complaint not found.' };

  if (!complaint.supports) complaint.supports = [];
  if (complaint.supports.includes(citizen_id)) return { error: 'You have already supported this.' };

  complaint.supports.push(citizen_id);
  complaint.support_count = complaint.supports.length;
  await complaint.save();
  return { success: true, count: complaint.support_count };
}

async function getPublicComplaints() {
  const complaints = await Complaint.find({}).sort({ created_at: -1 });
  return complaints.map(c => ({
    complaint_id: c.complaint_id,
    category: c.category,
    status: c.status,
    lat: c.lat,
    lng: c.lng,
    description: c.description,
    support_count: c.support_count || 0,
    created_at: c.created_at
  }));
}

async function getStats(department = null, month = null, year = null) {
  const query = department ? { department } : {};
  
  if (month !== null && year !== null) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    query.created_at = { $gte: start, $lte: end };
  }

  const list = await Complaint.find(query);
  const citizensCount = await Citizen.countDocuments();

  const byCategory = {};
  const byStatus = { Pending: 0, 'In Progress': 0, Resolved: 0, Rejected: 0 };
  const byDepartment = {};
  const byPriority = { High: 0, Normal: 0 };
  const byZone = { North: 0, South: 0, East: 0, West: 0, Central: 0 };
  
  // Time series data for the selected month or last 7 days
  const timeSeries = {};
  if (month !== null && year !== null) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      timeSeries[dateStr] = 0;
    }
  } else {
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      timeSeries[dateStr] = 0;
    }
  }

  let totalResolutionTime = 0;
  let resolvedCount = 0;

  list.forEach(c => {
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    if (byStatus[c.status] !== undefined) byStatus[c.status]++;
    byDepartment[c.department] = (byDepartment[c.department] || 0) + 1;
    byZone[c.zone || 'Central'] = (byZone[c.zone || 'Central'] || 0) + 1;
    const pKey = c.priority === 'High' ? 'High' : 'Normal';
    byPriority[pKey]++;

    const dateStr = new Date(c.created_at).toISOString().split('T')[0];
    if (timeSeries[dateStr] !== undefined) timeSeries[dateStr]++;

    if (c.status === 'Resolved' && c.timeline && c.timeline.length > 0) {
      const start = new Date(c.created_at);
      const end = new Date(c.updated_at);
      totalResolutionTime += (end - start);
      resolvedCount++;
    }
  });

  const avgResolutionDays = resolvedCount > 0
    ? (totalResolutionTime / resolvedCount / (1000 * 60 * 60 * 24)).toFixed(1)
    : 0;

  return {
    total: list.length,
    totalCitizens: citizensCount,
    byCategory,
    byStatus,
    byDepartment,
    byPriority,
    byZone,
    timeSeries,
    avgResolutionDays
  };
}

module.exports = {
  getConnectionStatus,
  seedAdmins,
  registerCitizen, findCitizenByAadhaar, findCitizenById,
  findAdminByEmail,
  saveComplaint, getAllComplaints, getComplaintById, getComplaintWithCitizen,
  getComplaintsByCitizenId, updateComplaintStatus, assignComplaint,
  getGeotaggedComplaints, getStats,
  addComplaintFeedback, findDuplicateComplaints,
  supportComplaint, getPublicComplaints
};
