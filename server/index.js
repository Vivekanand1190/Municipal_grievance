// server/index.js - V2: Auth, Uploads, and Admin Seeding
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Initialize and Seed Admins
db.seedAdmins();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend pages (simplified routing for the demo)
app.get('/citizen/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'citizen', 'login.html'));
});
app.get('/citizen/portal', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'citizen', 'portal.html'));
});
app.get('/citizen/my-complaints', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'citizen', 'my-complaints.html'));
});
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'login.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'dashboard.html'));
});
app.get('/admin/map', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'map.html'));
});
app.get('/track', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'citizen', 'track.html'));
});

// Default redirect for home
app.get('/', (req, res) => {
  res.redirect('/citizen/login');
});

app.listen(PORT, () => {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   🏛️  Municipal Grievance System v2           ║');
  console.log(`║   Running on: http://localhost:${PORT}            ║`);
  console.log('║   ------------------------------------------   ║');
  console.log('║   Admin Login: http://localhost:3000/admin/login ║');
  console.log('║   Citizen:    http://localhost:3000/citizen/login║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('\n');
});

module.exports = app;
