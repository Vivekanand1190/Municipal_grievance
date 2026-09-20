const fs = require('fs');
const path = require('path');
require('dotenv').config();
const db = require('./server/db');

async function testFeatures() {
  console.log('🚀 Starting Verification Tests...');

  // Wait for DB connection
  let retries = 5;
  while (db.getConnectionStatus() !== 1 && retries > 0) {
    console.log('Waiting for DB connection...');
    await new Promise(r => setTimeout(r, 1000));
    retries--;
  }

  if (db.getConnectionStatus() !== 1) {
    console.error('❌ Could not connect to database.');
    process.exit(1);
  }

  // 1. Test Duplicate Detection logic directly
  console.log('\n--- Testing Duplicate Detection ---');
  const cat = 'Road'; // Match actual category names
  const lat = 12.9716;
  const lng = 77.5946;
  
  // Seed a complaint for testing using saveComplaint
  const testComplaintId = `TEST-${Date.now()}`;
  const testComplaint = {
    complaint_id: testComplaintId,
    citizen_id: 'CIT-TEST',
    name: 'Test User',
    category: cat,
    description: 'Test pothole on the road',
    lat,
    lng,
    status: 'Pending',
    created_at: new Date().toISOString()
  };
  
  await db.saveComplaint(testComplaint);
  console.log(`Seeded test complaint: ${testComplaintId}`);
  
  const duplicate = await db.findDuplicateComplaints(cat, lat + 0.0001, lng + 0.0001); // ~15 meters away
  if (duplicate && duplicate.complaint_id === testComplaintId) {
    console.log('✅ Duplicate detected successfully within range.');
  } else {
    console.error('❌ Duplicate detection failed.');
  }

  // 2. Test Feedback logic directly
  console.log('\n--- Testing Feedback System ---');
  const statusUpdate = await db.updateComplaintStatus(testComplaintId, 'Resolved');
  console.log('Status updated:', statusUpdate ? statusUpdate.status : 'FAILED');
  
  const feedback = { rating: 5, comment: 'Great job!' };
  const updated = await db.addComplaintFeedback(testComplaintId, feedback);
  console.log('Feedback update result:', updated ? JSON.stringify(updated) : 'NULL');
  
  if (updated && updated.rating === 5) {
    console.log('✅ Feedback stored correctly.');
  } else {
    console.error('❌ Feedback storage failed.');
  }

  // Cleanup
  const cleanDB = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'db.json'), 'utf-8'));
  cleanDB.complaints = cleanDB.complaints.filter(c => c.complaint_id !== 'TEST-001');
  fs.writeFileSync(path.join(__dirname, 'data', 'db.json'), JSON.stringify(cleanDB, null, 2));
  
  console.log('\n🏁 Verification Complete.');
}

testFeatures().catch(console.error);
