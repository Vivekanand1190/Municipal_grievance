require('node:dns/promises').setServers(['8.8.8.8']);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const AdminSchema = new mongoose.Schema({
  id: String,
  email: { type: String, unique: true },
  password_hash: String,
  name: String,
  role: String,
  department: String
});
const Admin = mongoose.model('Admin', AdminSchema);

async function forceSeed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    await Admin.deleteMany({});
    console.log('Cleared all admins');
    
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

    for (const a of admins) {
      a.password_hash = await bcrypt.hash('Fix@1234', 10);
      await new Admin(a).save();
    }
    
    console.log('✅ Successfully seeded 7 officers and 1 admin. Password: Fix@1234');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

forceSeed();
