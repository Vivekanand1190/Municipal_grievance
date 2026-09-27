# FixMyCity — Municipal Grievance Platform

FixMyCity is a full-stack, AI-powered municipal grievance management system that lets citizens report civic issues (potholes, water leaks, garbage, power outages, and more) and routes them automatically to the right municipal department — with photo evidence, GPS location, email notifications, and an analytics dashboard for administrators.

##  Features

### For Citizens
- **File complaints** with description, category, and photo evidence
- **AI-based auto-classification** — the system analyzes the complaint text and automatically routes it to the correct department (Roads, Water, Electricity, Sanitation, Health, Transport, Municipal Services)
- **Automatic GPS extraction** — EXIF GPS coordinates are pulled from uploaded photos so the exact problem location is known
- **Nearby-duplicate check** — see whether a similar complaint already exists in your area before filing
- **Public reports map** — an interactive Leaflet.js map showing geolocated complaints across the city
- **Track complaint status** in real time and view your complete complaint history
- **Community support** — upvote ("support") complaints to raise their visibility
- **Email notifications** — confirmation when a complaint is filed and updates when its status changes

### For Administrators
- **Admin dashboard** — view all complaints with filtering by status, department, and priority
- **Assign staff** and **set resolution deadlines** per complaint
- **Status workflow management** (Pending → In Progress → Resolved)
- **Geotagged complaint map** for zone-wise visibility
- **Analytics dashboard** with high-quality Matplotlib charts — daily complaint volume, department-wise distribution, status breakdown, and zone analysis
- **Citizen feedback** on resolved complaints

##  Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+), Leaflet.js |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JSON Web Tokens (JWT), bcryptjs |
| File uploads | Multer, Exifr (EXIF/GPS extraction) |
| Email | Nodemailer (Ethereal test SMTP) |
| Analytics | Python — Matplotlib, NumPy |

##  Project Structure

```
Municipal_grievance/
├── backend/
│   ├── index.js               # Express server entry point
│   ├── db.js                   # MongoDB connection & seeding
│   ├── auth.js                 # JWT helpers & middleware
│   ├── classifier.js           # AI keyword-based complaint classifier
│   ├── mailer.js               # Email notifications (Nodemailer)
│   ├── generate_charts.py      # Python analytics charts (Matplotlib)
│   ├── routes/
│   │   ├── auth.js             # Registration / login endpoints
│   │   └── complaints.js       # Complaint CRUD & workflow endpoints
│   ├── uploads/                # Complaint photos & generated charts
│   └── data/                   # Local data files
├── frontend/
│   ├── index.html              # Landing page
│   ├── public-map.html         # Public Leaflet map of complaints
│   ├── citizen/                # Login, portal, tracking, my complaints
│   ├── admin/                  # Login, dashboard, map, analytics
│   └── shared/                 # Shared auth helpers & styles
└── guide.txt                   # Setup guide
```

##  Getting Started

### Prerequisites
- **Node.js** v18 or higher
- **MongoDB** (Atlas account or local installation)
- **Python 3** with `matplotlib` and `numpy` (for analytics charts)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Vivekanand1190/Municipal_grievance.git
   cd Municipal_grievance
   ```

2. Create a `.env` file in the `backend/` folder:

   ```env
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   ```

3. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```

4. Install Python dependencies for analytics:

   ```bash
   pip install matplotlib numpy
   ```

5. Start the server:

   ```bash
   npm start
   ```

The app runs at **http://localhost:3000**.

### Key URLs

| Page | URL |
|---|---|
| Home | http://localhost:3000/ |
| Citizen Login | http://localhost:3000/citizen/login |
| Citizen Portal | http://localhost:3000/citizen/portal |
| Admin Login | http://localhost:3000/admin/login |
| Admin Dashboard | http://localhost:3000/admin/dashboard |
| Analytics | http://localhost:3000/admin/analytics |

### Demo Accounts

All accounts use the password: `Fix@1234`

| Role | Email |
|---|---|
| Super Admin | admin@fixmycity.gov |
| Road Dept Officer | road@municipality.gov |
| Water Dept Officer | water@municipality.gov |
| Electricity Officer | electric@municipality.gov |
| Sanitation Officer | sanitation@municipality.gov |
| Health Dept Officer | health@municipality.gov |
| Transport Officer | transport@municipality.gov |
| Municipal Services | municipal@municipality.gov |

> Citizens can register a new account from the citizen login page.

##  API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/complaints` | File a new complaint (with photo) |
| GET | `/api/complaints/mine` | Get the logged-in citizen's complaints |
| GET | `/api/complaints/all` | Get all complaints (admin) |
| PATCH | `/api/complaints/:id/assign` | Assign staff to a complaint (admin) |
| PATCH | `/api/complaints/:id/status` | Update complaint status (admin) |
| GET | `/api/complaints/geotagged` | Get geotagged complaints (admin) |
| GET | `/api/complaints/stats` | Aggregated statistics (admin) |
| GET | `/api/complaints/python-stats` | Python-generated analytics (admin) |
| POST | `/api/complaints/:id/support` | Upvote a complaint |
| POST | `/api/complaints/check-nearby` | Check for nearby duplicates |
| GET | `/api/complaints/public/map` | Public map data |
| POST | `/api/complaints/:id/feedback` | Submit feedback on a resolved complaint |
| GET | `/api/health` | Health check |

##  Email Notifications

Emails are sent via **Nodemailer** using an [Ethereal](https://ethereal.email) test account — no real emails are delivered. The server console prints the Ethereal credentials and a preview URL on startup, where you can view the outgoing notification emails.

##  License

This project is open-source and available for educational and demonstration purposes.
