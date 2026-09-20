// mailer.js - Email notification using Nodemailer + Ethereal (mock SMTP)
const nodemailer = require('nodemailer');

let transporter = null;
let testAccount = null;

async function getTransporter() {
  if (transporter) return transporter;
  // Create a free Ethereal test account (no real email sent)
  testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
  console.log('\n📧 Ethereal Email Account Created');
  console.log(`   User: ${testAccount.user}`);
  console.log(`   Pass: ${testAccount.pass}`);
  console.log('   Preview emails at: https://ethereal.email\n');
  return transporter;
}

async function sendDepartmentNotification(complaint) {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: '"FixMyCity Support" <support@fixmycity.gov>',
      to: complaint.departmentEmail,
      subject: `[${complaint.complaint_id}] New ${complaint.category} Complaint Assigned`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1a1a2e;color:white;padding:24px;border-radius:8px 8px 0 0">
            <h2 style="margin:0">🏛️ Municipal Grievance System</h2>
            <p style="margin:4px 0 0;opacity:0.7">Department Notification</p>
          </div>
          <div style="background:#f8f9fa;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0">
            <h3 style="color:#e94560">New Complaint Assigned to Your Department</h3>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px;font-weight:bold;width:40%">Complaint ID:</td><td style="padding:8px;color:#e94560;font-weight:bold">${complaint.complaint_id}</td></tr>
              <tr style="background:#fff"><td style="padding:8px;font-weight:bold">Category:</td><td style="padding:8px">${complaint.category}</td></tr>
              <tr><td style="padding:8px;font-weight:bold">Department:</td><td style="padding:8px">${complaint.department}</td></tr>
              <tr style="background:#fff"><td style="padding:8px;font-weight:bold">Citizen Name:</td><td style="padding:8px">${complaint.name}</td></tr>
              <tr><td style="padding:8px;font-weight:bold">Citizen Email:</td><td style="padding:8px">${complaint.email}</td></tr>
              <tr style="background:#fff"><td style="padding:8px;font-weight:bold">Description:</td><td style="padding:8px">${complaint.description}</td></tr>
              <tr><td style="padding:8px;font-weight:bold">Location:</td><td style="padding:8px">${complaint.location || 'Not specified'}</td></tr>
              <tr style="background:#fff"><td style="padding:8px;font-weight:bold">Filed On:</td><td style="padding:8px">${new Date(complaint.created_at).toLocaleString()}</td></tr>
            </table>
            <p style="margin-top:16px;color:#666">Please take action on this complaint at the earliest.</p>
          </div>
        </div>
      `
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`📬 Dept notification sent → ${previewUrl}`);
    return previewUrl;
  } catch (err) {
    console.error('Email error (dept):', err.message);
    return null;
  }
}

async function sendCitizenConfirmation(complaint) {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: '"FixMyCity Support" <no-reply@fixmycity.gov>',
      to: complaint.email,
      subject: `Complaint Registered: ${complaint.complaint_id}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);color:white;padding:24px;border-radius:8px 8px 0 0">
            <h2 style="margin:0">🏛️ Municipal Grievance System</h2>
            <p style="margin:4px 0 0;opacity:0.7">Complaint Confirmation</p>
          </div>
          <div style="background:#f8f9fa;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0">
            <h3 style="color:#0f3460">Dear ${complaint.name},</h3>
            <p>Your complaint has been <strong>successfully registered</strong> and assigned to the relevant department.</p>
            <div style="background:white;border-left:4px solid #e94560;padding:16px;border-radius:4px;margin:16px 0">
              <p style="margin:0;font-size:14px;color:#666">Your Complaint ID</p>
              <p style="margin:4px 0 0;font-size:24px;font-weight:bold;color:#e94560;letter-spacing:2px">${complaint.complaint_id}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-top:8px">
              <tr><td style="padding:8px;font-weight:bold;width:40%">Category:</td><td style="padding:8px">${complaint.category}</td></tr>
              <tr style="background:#fff"><td style="padding:8px;font-weight:bold">Assigned To:</td><td style="padding:8px">${complaint.department}</td></tr>
              <tr><td style="padding:8px;font-weight:bold">Status:</td><td style="padding:8px"><span style="background:#fff3cd;color:#856404;padding:2px 8px;border-radius:12px">Pending</span></td></tr>
            </table>
            <p style="margin-top:16px;color:#666;font-size:13px">You can track your complaint status using the ID above. We aim to resolve issues within 7 working days.</p>
          </div>
        </div>
      `
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`📬 Citizen confirmation sent → ${previewUrl}`);
    return previewUrl;
  } catch (err) {
    console.error('Email error (citizen):', err.message);
    return null;
  }
}

async function sendStatusUpdateEmail(complaint, newStatus) {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: '"FixMyCity Support" <no-reply@fixmycity.gov>',
      to: complaint.email,
      subject: `Status Update: ${complaint.complaint_id} is now ${newStatus}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#16213e;color:white;padding:24px;border-radius:8px 8px 0 0">
            <h2 style="margin:0">🏛️ Municipal Grievance System</h2>
            <p style="margin:4px 0 0;opacity:0.7">Notification: Status Change</p>
          </div>
          <div style="background:#f8f9fa;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0">
            <h3>Update on your Complaint</h3>
            <p>Your grievance <strong>${complaint.complaint_id}</strong> has been updated.</p>
            <div style="background:white;border:1px solid #ddd;padding:16px;border-radius:8px;margin:16px 0">
               <p style="margin:0;color:#666">New Status:</p>
               <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#3b82f6">${newStatus}</p>
            </div>
            <p style="color:#666;font-size:13px">You can track full progress on the citizen portal.</p>
          </div>
        </div>
      `
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`📬 Status update email sent → ${previewUrl}`);
    return previewUrl;
  } catch (err) {
    console.error('Email error (status update):', err.message);
    return null;
  }
}

module.exports = { 
  sendDepartmentNotification, 
  sendCitizenConfirmation,
  sendStatusUpdateEmail
};
