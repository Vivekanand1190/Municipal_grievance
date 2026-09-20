Auth.requireAuth('admin');

let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    // Set initial date
    const now = new Date();
    document.getElementById('monthSelect').value = now.getMonth();
    document.getElementById('yearSelect').value = now.getFullYear();
    
    loadAnalytics();
});

async function loadAnalytics() {
    const month = document.getElementById('monthSelect').value;
    const year = document.getElementById('yearSelect').value;

    try {
        // We use the python-stats endpoint which generates Matplotlib charts
        const res = await fetch(`/api/complaints/python-stats?month=${month}&year=${year}`, {
            headers: Auth.getAuthHeaders()
        });
        const data = await res.json();
        
        if (data.success) {
            updateMetrics(data.stats);
            
            if (data.charts) {
                // Show Python Charts (Images)
                showPythonChart('volume', data.charts.volume);
                showPythonChart('status', data.charts.status);
                showPythonChart('dept', data.charts.dept);
                showPythonChart('zone', data.charts.zone);
            } else {
                // Fallback to JS Charts
                renderJSCharts(data.stats);
            }
        }
    } catch (err) {
        console.error('Failed to load analytics:', err);
    }
}

function updateMetrics(data) {
    document.getElementById('valTotal').textContent = data.total;
    document.getElementById('valResolved').textContent = data.byStatus.Resolved || 0;
    document.getElementById('valPending').textContent = data.byStatus.Pending || 0;
    document.getElementById('valAvgDays').textContent = data.avgResolutionDays;
}

function showPythonChart(id, url) {
    const img = document.getElementById(`${id}ChartImg`);
    const canvas = document.getElementById(`${id}Chart`);
    
    img.src = url;
    img.style.display = 'block';
    if (canvas) canvas.style.display = 'none';
}

function renderJSCharts(stats) {
    // Fallback logic if Python fails
    document.querySelectorAll('canvas').forEach(c => c.style.display = 'block');
    document.querySelectorAll('img[id$="ChartImg"]').forEach(i => i.style.display = 'none');
    
    renderVolumeChart(stats.timeSeries);
    renderStatusChart(stats.byStatus);
    renderDeptChart(stats.byDepartment);
    renderZoneChart(stats.byZone);
}

// ... rest of the JS chart functions from previous version as fallback ...
function destroyChart(id) { if (charts[id]) charts[id].destroy(); }

function renderVolumeChart(dayData) {
    destroyChart('volume');
    const ctx = document.getElementById('volumeChart').getContext('2d');
    const labels = Object.keys(dayData).map(d => d.split('-')[2]);
    charts['volume'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: 'Complaints', data: Object.values(dayData), borderColor: '#003366', fill: true, tension: 0.4 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderStatusChart(statusData) {
    destroyChart('status');
    const ctx = document.getElementById('statusChart').getContext('2d');
    charts['status'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusData),
            datasets: [{ data: Object.values(statusData), backgroundColor: ['#856404', '#0c5460', '#155724', '#721c24'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderDeptChart(deptData) {
    destroyChart('dept');
    const ctx = document.getElementById('deptChart').getContext('2d');
    charts['dept'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(deptData),
            datasets: [{ label: 'Complaints', data: Object.values(deptData), backgroundColor: '#003366' }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderZoneChart(zoneData) {
    destroyChart('zone');
    const ctx = document.getElementById('zoneChart').getContext('2d');
    charts['zone'] = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: Object.keys(zoneData),
            datasets: [{ data: Object.values(zoneData), backgroundColor: ['#003366', '#FFD700', '#155724', '#721c24'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}
