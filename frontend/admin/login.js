document.getElementById('adminLoginForm').onsubmit = async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;

  try {
    const res = await fetch('/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    Auth.saveSession(data.token, data.user);
    showToast('Authenticated. Opening dashboard...', 'success');
    setTimeout(() => window.location.href = '/admin/dashboard', 1000);
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
