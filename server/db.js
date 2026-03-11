// server/db.js - JSON file database (v2 — with users, admins, complaint history)
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDB() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const initial = { citizens: [], admins: [], complaints: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  }
}

function readDB() {
  ensureDB();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ─── Citizens ────────────────────────────────────────────────────────────────

function registerCitizen({ aadhaar_hash, name, phone, email }) {
  const db = readDB();
  const exists = db.citizens.find(c => c.aadhaar_hash === aadhaar_hash);
  if (exists) return { error: 'Aadhaar already registered.' };
  const citizen = {
    id: `CIT-${Date.now()}`,
    aadhaar_hash,
    name,
    phone: phone || '',
    email: email || '',
    created_at: new Date().toISOString()
  };
  db.citizens.push(citizen);
  writeDB(db);
  return { citizen };
}

function findCitizenByAadhaar(aadhaar_hash) {
  const db = readDB();
  return db.citizens.find(c => c.aadhaar_hash === aadhaar_hash) || null;
}

function findCitizenById(id) {
  const db = readDB();
  return db.citizens.find(c => c.id === id) || null;
}

// ─── Admins ──────────────────────────────────────────────────────────────────

async function seedAdmins() {
  const db = readDB();
  if (db.admins.length > 0) return;
  const defaultAdmin = {
    id: 'ADM-001',
    email: 'admin@municipality.gov',
    password_hash: await bcrypt.hash('Admin@1234', 10),
    name: 'System Administrator',
    role: 'admin',
    created_at: new Date().toISOString()
  };
  db.admins.push(defaultAdmin);
  writeDB(db);
  console.log('✅ Default admin seeded: admin@municipality.gov / Admin@1234');
}

function findAdminByEmail(email) {
  const db = readDB();
  return db.admins.find(a => a.email.toLowerCase() === email.toLowerCase()) || null;
}

// ─── Complaints ───────────────────────────────────────────────────────────────

function saveComplaint(complaint) {
  const db = readDB();
  db.complaints.push(complaint);
  writeDB(db);
  return complaint;
}

function getAllComplaints(filters = {}) {
  const db = readDB();
  let list = db.complaints;
  if (filters.status) list = list.filter(c => c.status === filters.status);
  if (filters.category) list = list.filter(c => c.category === filters.category);
  if (filters.priority) list = list.filter(c => c.priority === filters.priority);
  return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getComplaintById(complaint_id) {
  const db = readDB();
  return db.complaints.find(c => c.complaint_id === complaint_id) || null;
}

function getComplaintsByCitizenId(citizen_id) {
  const db = readDB();
  return db.complaints
    .filter(c => c.citizen_id === citizen_id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function updateComplaintStatus(complaint_id, status, changed_by = 'admin') {
  const db = readDB();
  const complaint = db.complaints.find(c => c.complaint_id === complaint_id);
  if (!complaint) return null;
  const prev = complaint.status;
  complaint.status = status;
  complaint.updated_at = new Date().toISOString();
  if (!complaint.timeline) complaint.timeline = [];
  complaint.timeline.push({
    from: prev,
    to: status,
    changed_by,
    at: new Date().toISOString()
  });
  writeDB(db);
  return complaint;
}

function getGeotaggedComplaints() {
  const db = readDB();
  return db.complaints.filter(c => c.lat && c.lng);
}

function getStats() {
  const db = readDB();
  const list = db.complaints;
  const byCategory = {};
  const byStatus = { Pending: 0, 'In Progress': 0, Resolved: 0, Rejected: 0 };
  const byDepartment = {};
  const byPriority = { High: 0, Normal: 0 };

  list.forEach(c => {
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    if (byStatus[c.status] !== undefined) byStatus[c.status]++;
    byDepartment[c.department] = (byDepartment[c.department] || 0) + 1;
    const pKey = c.priority === 'High' ? 'High' : 'Normal';
    byPriority[pKey]++;
  });

  return {
    total: list.length,
    totalCitizens: db.citizens.length,
    byCategory,
    byStatus,
    byDepartment,
    byPriority
  };
}

module.exports = {
  seedAdmins,
  registerCitizen, findCitizenByAadhaar, findCitizenById,
  findAdminByEmail,
  saveComplaint, getAllComplaints, getComplaintById,
  getComplaintsByCitizenId, updateComplaintStatus,
  getGeotaggedComplaints, getStats
};
