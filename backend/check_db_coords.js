const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

// DNS workaround for MongoDB Atlas
require("node:dns/promises").setServers(["8.8.8.8"]);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/municipal_grievance';

const ComplaintSchema = new mongoose.Schema({
  complaint_id: String,
  lat: Number,
  lng: Number
});

const Complaint = mongoose.model('Complaint', ComplaintSchema);

async function checkComplaints() {
  await mongoose.connect(MONGO_URI);
  const complaints = await Complaint.find({});
  console.log('Total complaints:', complaints.length);
  const geotagged = complaints.filter(c => c.lat !== undefined && c.lat !== null);
  console.log('Geotagged complaints:', geotagged.length);
  geotagged.forEach(c => console.log(`ID: ${c.complaint_id}, Lat: ${c.lat}, Lng: ${c.lng}`));
  await mongoose.disconnect();
}

checkComplaints();
