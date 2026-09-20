// server/index.js
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Seed admin users
db.seedAdmins();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.use("/uploads", express.static(uploadsDir));
app.use("/uploads/charts", express.static(path.join(uploadsDir, "charts")));

// API routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/complaints", require("./routes/complaints"));

// Database status check
app.get("/api/db-status", (req, res) => {
  const status = db.getConnectionStatus();
  res.json({
    connected: status === 1,
    status: status === 1 ? 'connected' : 'disconnected',
    database: 'MongoDB'
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    db_status: db.getConnectionStatus() === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString()
  });
});

// Frontend routes
app.get("/citizen/login", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "citizen", "login.html"))
);

app.get("/citizen/portal", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "citizen", "portal.html"))
);

app.get("/citizen/my-complaints", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "citizen", "my-complaints.html"))
);

app.get("/admin/login", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "admin", "login.html"))
);

app.get("/admin/dashboard", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "admin", "dashboard.html"))
);

app.get("/admin/map", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "admin", "map.html"))
);

app.get("/admin/analytics", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "admin", "analytics.html"))
);

app.get("/track", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "frontend", "citizen", "track.html"))
);

// Home redirect
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;