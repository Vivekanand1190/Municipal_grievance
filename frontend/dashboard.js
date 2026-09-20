// dashboard.js - Admin dashboard logic
let allComplaints = [];
let categoryChart = null;
let refreshTimer = null;

const CATEGORY_COLORS = {
  Road:        'rgba(245,158,11,0.8)',
  Water:       'rgba(59,130,246,0.8)',
  Electricity: 'rgba(234,179,8,0.8)',
  Sanitation:  'rgba(16,185,129,0.8)',
  General:     'rgba(168,85,247,0.8)'
};

const STATUS_ICONS = {
  'Pending':     '🟡',
  'In Progress': '🔵',
  'Resolved':    '🟢',
  'Rejected':    '🔴'
};

async function loadData() {
  try {
    const [complaintsRes, statsRes] = await Promise.all([
      fetch('/api/complaints'),
      fetch('/api/complaints/meta/stats')
    ]);
    const complaintsData = await complaintsRes.json();
    const statsData = await statsRes.json();

    allComplaints = complaintsData.complaints || [];
    updateStatCards(statsData.stats || {});
    updateChart(statsData.stats?.byCategory || {});
    updateDeptList(statsData.stats?.byDepartment || {});
    applyFilter();
  } catch (err) {
    console.error('Failed to load data:', err);
    showToast('Failed to load data. Is the server running?', 'error');
  }
}

function updateStatCards(stats) {
  document.getElementById('statTotal').textContent = stats.total || 0;
  document.getElementById('statPending').textContent = stats.byStatus?.Pending || 0;
  document.getElementById('statProgress').textContent = stats.byStatus?.['In Progress'] || 0;
  document.getElementById('statResolved').textContent = stats.byStatus?.Resolved || 0;
}

function updateChart(byCategory) {
  const labels = Object.keys(byCategory);
  const data = Object.values(byCategory);
  const colors = labels.map(l => CATEGORY_COLORS[l] || 'rgba(150,150,150,0.7)');

  if (categoryChart) {
    categoryChart.data.labels = labels;
    categoryChart.data.datasets[0].data = data;
    categoryChart.data.datasets[0].backgroundColor = colors;
    categoryChart.update();
    return;
  }

  const ctx = document.getElementById('categoryChart').getContext('2d');
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: 'rgba(10,10,26,0.8)',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#9898b8',
            font: { family: 'Inter', size: 11 },
            padding: 14,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: '#1a1a3a',
          titleColor: '#f0f0ff',
          bodyColor: '#9898b8',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1
        }
      },
      cutout: '65%'
    }
  });
}

function updateDeptList(byDepartment) {
  const container = document.getElementById('deptList');
  if (!Object.keys(byDepartment).length) {
    container.innerHTML = '<p style="color:var(--text-secondary);font-size:0.8rem">No data yet</p>';
    return;
  }
  const sorted = Object.entries(byDepartment).sort((a, b) => b[1] - a[1]);
  container.innerHTML = sorted.map(([dept, count]) => `
    <div class="dept-item">
      <span>${dept}</span>
      <span class="dept-count">${count}</span>
    </div>
  `).join('');
}

function applyFilter() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const category = document.getElementById('filterCategory').value;

  let filtered = allComplaints.filter(c => {
    const matchSearch = !search || 
      c.complaint_id.toLowerCase().includes(search) ||
      c.name.toLowerCase().includes(search) ||
      c.description.toLowerCase().includes(search) ||
      (c.location || '').toLowerCase().includes(search);
    const matchStatus = !status || c.status === status;
    const matchCat = !category || c.category === category;
    return matchSearch && matchStatus && matchCat;
  });

  renderTable(filtered);
}

function renderTable(complaints) {
  const tbody = document.getElementById('complaintsTable');

  if (!complaints.length) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>No complaints found. Adjust your filters or <a href="/" style="color:var(--accent)">submit one</a>.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = complaints.map(c => {
    const catKey = c.category.toLowerCase().replace(/[^a-z]/g, '');
    const statusKey = c.status.toLowerCase().replace(/\s+/g, '');
    const date = new Date(c.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    return `
      <tr>
        <td><span class="complaint-id">${c.complaint_id}</span></td>
        <td>
          <div style="font-weight:500;font-size:0.85rem">${escHtml(c.name)}</div>
          <div style="font-size:0.75rem;color:var(--text-secondary)">${escHtml(c.email)}</div>
        </td>
        <td class="td-desc" title="${escHtml(c.description)}">${escHtml(c.description)}</td>
        <td><span class="tag tag-${catKey}">${STATUS_ICONS[c.category] || ''} ${c.category}</span></td>
        <td style="font-size:0.78rem;color:var(--text-secondary)">${escHtml(c.department)}</td>
        <td>
          <select class="badge badge-${statusKey} status-select" onchange="updateStatus('${c.complaint_id}', this.value)" title="Click to change status">
            ${['Pending','In Progress','Resolved','Rejected'].map(s =>
              `<option value="${s}" ${c.status === s ? 'selected' : ''}>${STATUS_ICONS[s]} ${s}</option>`
            ).join('')}
          </select>
        </td>
        <td style="font-size:0.78rem;color:var(--text-secondary);white-space:nowrap">${date}</td>
      </tr>
    `;
  }).join('');
}

async function updateStatus(complaintId, newStatus) {
  try {
    const res = await fetch(`/api/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) throw new Error('Update failed');
    showToast(`Status updated to "${newStatus}"`, 'success');
    await loadData(); // refresh all
  } catch (err) {
    showToast('Failed to update status', 'error');
  }
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.className = `toast-${type}`;
  toast.innerHTML = `<strong>${type === 'success' ? '✅' : '❌'}</strong> ${msg}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// Initial load + auto-refresh every 15s
loadData();
refreshTimer = setInterval(loadData, 15000);
