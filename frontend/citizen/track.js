let map;

async function trackComplaint() {
  const id = document.getElementById('trackId').value.trim();
  if (!id) return;

  document.getElementById('statusCard').style.display = 'none';
  document.getElementById('noMatch').style.display = 'none';

  try {
    const res = await fetch(`/api/complaints/${id}`);
    const data = await res.json();
    
    if (!res.ok) throw new Error();

    const c = data.complaint;
    document.getElementById('resId').textContent = c.complaint_id;
    document.getElementById('resStatus').textContent = c.status;
    document.getElementById('resStatus').className = `badge badge-${c.status.toLowerCase().replace(/\s+/g,'')}`;
    document.getElementById('resDesc').textContent = c.description;
    document.getElementById('resCat').textContent = c.category;
    document.getElementById('resDept').textContent = c.department;

    document.getElementById('statusCard').style.display = 'block';

    if (c.lat && c.lng) {
      document.getElementById('trackMap').style.display = 'block';
      if (!map) {
        map = L.map('trackMap').setView([c.lat, c.lng], 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
      } else {
        map.setView([c.lat, c.lng], 15);
      }
      L.marker([c.lat, c.lng]).addTo(map);
      setTimeout(() => map.invalidateSize(), 200);
    } else {
      document.getElementById('trackMap').style.display = 'none';
    }

  } catch (err) {
    document.getElementById('noMatch').style.display = 'block';
  }
}
