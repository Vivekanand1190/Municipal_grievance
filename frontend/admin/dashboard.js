Auth.requireAuth('admin');
const user = Auth.getUser();
document.getElementById('adminName').textContent = user.role === 'officer' ? `${user.name} (${user.department})` : user.name;

async function loadStats() {
  const res = await fetch('/api/complaints/stats', { headers: Auth.getAuthHeaders() });
  const { stats } = await res.json();
  document.getElementById('statTotal').textContent = stats.total;
  document.getElementById('statCitizens').textContent = stats.totalCitizens;
  document.getElementById('statPending').textContent = stats.byStatus.Pending;
  document.getElementById('statAvgTime').innerHTML = `${stats.avgResolutionDays} <span style="font-size:0.8rem">Days</span>`;
}

async function loadComplaints() {
  const status = document.getElementById('filterStatus').value;
  const category = document.getElementById('filterCategory').value;
  const priority = document.getElementById('filterPriority').value;
  const startDate = document.getElementById('filterStart').value;
  const endDate = document.getElementById('filterEnd').value;
  const search = document.getElementById('adminSearch').value.toLowerCase();

  const url = new URL('/api/complaints/all', window.location.origin);
  if (status) url.searchParams.append('status', status);
  if (category) url.searchParams.append('category', category);
  if (priority) url.searchParams.append('priority', priority);
  if (startDate) url.searchParams.append('startDate', startDate);
  if (endDate) url.searchParams.append('endDate', endDate);

  const res = await fetch(url, {
    headers: Auth.getAuthHeaders()
  });
  const data = await res.json();
  
  let list = data.complaints;
  if (search) {
    list = list.filter(c => c.complaint_id.toLowerCase().includes(search) || c.description.toLowerCase().includes(search));
  }

  renderTable(list);
}

function renderTable(list) {
  const body = document.getElementById('complaintsBody');
  body.innerHTML = list.map(c => `
    <tr>
      <td style="font-family:monospace; font-weight:700; color:var(--accent)">
        <span class="complaint-id-link" onclick="showDetails('${c.complaint_id}')">${c.complaint_id}</span>
      </td>
      <td>
        ${c.photo_url ? `<img src="${c.photo_url}" class="photo-cell" onclick="showDetails('${c.complaint_id}')">` : `<div class="photo-cell" style="background:#eee; display:flex; align-items:center; justify-content:center; font-size:10px" onclick="showDetails('${c.complaint_id}')">No Photo</div>`}
      </td>
      <td onclick="showDetails('${c.complaint_id}')" style="cursor:pointer">
        <div style="max-width:300px; font-size:0.9rem">${c.description.substring(0, 100)}${c.description.length > 100 ? '...' : ''}</div>
        <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:4px">Location: ${c.location || 'Unknown'}</div>
      </td>
      <td><span class="tag tag-${c.category.toLowerCase().replace(/\s+/g,'-')}">${c.category}</span></td>
      <td><span class="priority-badge ${c.priority === 'High' ? 'priority-high' : ''}">${c.priority}</span></td>
      <td><span class="badge badge-${c.status.toLowerCase().replace(/\s+/g,'')}">${c.status}</span></td>
      <td>
        <select class="form-control" style="width:130px; padding:4px 8px; font-size:0.8rem" onchange="updateStatus('${c.complaint_id}', this.value)">
          <option value="Pending" ${c.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="In Progress" ${c.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Resolved" ${c.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
          <option value="Rejected" ${c.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
        </select>
      </td>
    </tr>
  `).join('');
}

async function updateStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/complaints/${id}/status`, {
      method: 'PATCH',
      headers: { ...Auth.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) throw new Error('Update failed');
    showToast('Status updated successfully.', 'success');
    closeModal();
    loadStats();
    loadComplaints();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.className = `toast-${type} show`;
  toast.innerHTML = `<strong>${type === 'success' ? 'Success:' : 'Error:'}</strong> ${msg}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

/* Modal Logic */
async function showDetails(id) {
  try {
    const res = await fetch(`/api/complaints/${id}`, { headers: Auth.getAuthHeaders() });
    const { complaint } = await res.json();
    
    document.getElementById('modalId').textContent = complaint.complaint_id;
    document.getElementById('modalDesc').textContent = complaint.description;
    document.getElementById('modalLoc').textContent = complaint.location || 'Unknown';
    document.getElementById('modalCat').textContent = complaint.category;
    document.getElementById('modalDept').textContent = complaint.department;
    document.getElementById('modalCitizen').textContent = complaint.name;
    document.getElementById('modalAadhaar').textContent = complaint.aadhaar || 'N/A';
    document.getElementById('modalPhone').textContent = complaint.citizen?.phone || 'N/A';
    document.getElementById('modalEmail').textContent = complaint.email || complaint.citizen?.email || 'N/A';
    document.getElementById('modalStatus').innerHTML = `<span class="badge badge-${complaint.status.toLowerCase().replace(/\s+/g,'')}">${complaint.status}</span>`;
    
    const photoEl = document.getElementById('modalPhoto');
    const downloadBtn = document.getElementById('modalDownloadBtn');
    if (complaint.photo_url) {
      photoEl.src = complaint.photo_url;
      photoEl.style.display = 'block';
      downloadBtn.href = complaint.photo_url;
      downloadBtn.style.display = 'block';
    } else {
      photoEl.style.display = 'none';
      downloadBtn.style.display = 'none';
    }

    // Feedback
    const feedbackSection = document.getElementById('modalFeedbackSection');
    if (complaint.rating) {
      feedbackSection.style.display = 'block';
      document.getElementById('modalRating').textContent = `${complaint.rating}/5 Stars`;
      document.getElementById('modalFeedbackComment').textContent = complaint.feedback_comment ? `"${complaint.feedback_comment}"` : "No comment provided.";
    } else {
      feedbackSection.style.display = 'none';
    }

    // Timeline
    const timelineEl = document.getElementById('modalTimeline');
    timelineEl.innerHTML = (complaint.timeline || []).slice().reverse().map(item => `
      <div style="margin-bottom:8px">
        <div style="font-weight:600; color:var(--text-primary)">
          ${item.from ? `${item.from} -> ` : ''}${item.to}
        </div>
        <div style="font-size:0.7rem">
          Changed by <b>${item.changed_by}</b> on ${new Date(item.at).toLocaleString()}
        </div>
      </div>
    `).join('') || '<div style="font-style:italic">No timeline data</div>';

    // Assignment Data
    document.getElementById('modalAssignee').value = complaint.assigned_to || 'Unassigned';
    if (complaint.deadline) {
      document.getElementById('modalDeadline').value = new Date(complaint.deadline).toISOString().split('T')[0];
    } else {
      document.getElementById('modalDeadline').value = '';
    }

    // Save Assignment Logic
    document.getElementById('saveAssignmentBtn').onclick = async () => {
       const assigned_to = document.getElementById('modalAssignee').value;
       const deadline = document.getElementById('modalDeadline').value;
       
       try {
          const sRes = await fetch(`/api/complaints/${id}/assign`, {
            method: 'PATCH',
            headers: { ...Auth.getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ assigned_to, deadline })
          });
          if (!sRes.ok) throw new Error('Assignment failed');
          showToast('Grievance sent to officer successfully.', 'success');
          loadComplaints();
       } catch (err) {
          showToast(err.message, 'error');
       }
    };

    // Modal Action Buttons
    const rejectBtn = document.getElementById('modalRejectBtn');
    const resolveBtn = document.getElementById('modalResolveBtn');
    
    if (complaint.status === 'Resolved' || complaint.status === 'Rejected') {
      rejectBtn.style.display = 'none';
      resolveBtn.style.display = 'none';
    } else {
      rejectBtn.style.display = 'block';
      resolveBtn.style.display = 'block';
      rejectBtn.onclick = () => updateStatus(id, 'Rejected');
      resolveBtn.onclick = () => updateStatus(id, 'Resolved');
    }

    document.getElementById('detailsModal').classList.add('show');
  } catch (err) {
    showToast('Failed to load details', 'error');
  }
}

function closeModal() {
  document.getElementById('detailsModal').classList.remove('show');
}

// Close modal on escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

loadStats();
loadComplaints();
