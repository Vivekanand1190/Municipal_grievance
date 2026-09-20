const exifr = require('exifr');
const path = require('path');
const fs = require('fs');

async function testExif() {
  const uploadsDir = path.join(__dirname, 'backend', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.log('Uploads dir not found');
    return;
  }
  const files = fs.readdirSync(uploadsDir);
  for (const file of files) {
    const fullPath = path.join(uploadsDir, file);
    try {
      const gps = await exifr.gps(fullPath);
      console.log(`File: ${file}, GPS:`, gps);
    } catch (err) {
      console.log(`File: ${file}, Error:`, err.message);
    }
  }
}

testExif();
