// server/index.js
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
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/uploads", express.static(uploadsDir));

// API routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/complaints", require("./routes/complaints"));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString()
  });
});

// Frontend routes
app.get("/citizen/login", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "public", "citizen", "login.html"))
);

app.get("/citizen/portal", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "public", "citizen", "portal.html"))
);

app.get("/citizen/my-complaints", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "public", "citizen", "my-complaints.html"))
);

app.get("/admin/login", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "public", "admin", "login.html"))
);

app.get("/admin/dashboard", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "public", "admin", "dashboard.html"))
);

app.get("/admin/map", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "public", "admin", "map.html"))
);

app.get("/track", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "public", "citizen", "track.html"))
);

// Home redirect
app.get("/", (req, res) => {
  res.redirect("/citizen/login");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;