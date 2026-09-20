function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

  if (tab === 'login') {
    document.querySelector('.tab:nth-child(1)').classList.add('active');
    document.getElementById('loginPanel').classList.add('active');
  } else {
    document.querySelector('.tab:nth-child(2)').classList.add('active');
    document.getElementById('registerPanel').classList.add('active');
  }
}

// Login Handler
document.getElementById('loginForm').onsubmit = async (e) => {
  e.preventDefault();
  const aadhaar = document.getElementById('loginAadhaar').value.replace(/\s/g, '');
  const phone = document.getElementById('loginPhone').value.trim();
  if (aadhaar.length !== 12) return showToast('Aadhaar must be 12 digits', 'error');
  if (!phone) return showToast('Phone number is required', 'error');

  try {
    const res = await fetch('/api/auth/citizen/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aadhaar, phone })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    Auth.saveSession(data.token, data.user);
    showToast('Login successful! Redirecting...', 'success');
    setTimeout(() => window.location.href = '/citizen/portal', 1000);
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Register Handler
document.getElementById('registerForm').onsubmit = async (e) => {
  e.preventDefault();
  const aadhaar = document.getElementById('regAadhaar').value.replace(/\s/g, '');
  if (aadhaar.length !== 12) return showToast('Aadhaar must be 12 digits', 'error');

  const payload = {
    aadhaar,
    name: document.getElementById('regName').value,
    phone: document.getElementById('regPhone').value,
    email: document.getElementById('regEmail').value
  };

  try {
    const res = await fetch('/api/auth/citizen/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    Auth.saveSession(data.token, data.user);
    showToast('Registration successful! Welcome.', 'success');
    setTimeout(() => window.location.href = '/citizen/portal', 1000);
  } catch (err) {
    showToast(err.message, 'error');
  }
};

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.className = `toast-${type} show`;
  toast.innerHTML = `<strong>${type === 'success' ? 'Success:' : 'Error:'}</strong> ${msg}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Auto-spacing for Aadhaar input and number enforcement for Phone
const aadhaarInputs = document.querySelectorAll('.aadhaar-input');
aadhaarInputs.forEach(input => {
  input.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 12) val = val.substring(0, 12);
    e.target.value = val;
  });
});

const phoneInputs = [document.getElementById('loginPhone'), document.getElementById('regPhone')];
phoneInputs.forEach(input => {
  if (!input) return;
  input.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 10) val = val.substring(0, 10);
    e.target.value = val;
  });
});
