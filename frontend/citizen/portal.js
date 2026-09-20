Auth.requireAuth("citizen");
document.getElementById("userName").textContent = Auth.getUser().name;

let map, marker;
const defaultCoords = [28.6139, 77.209]; // Delhi

function initMap() {
  map = L.map("map").setView(defaultCoords, 13);
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution: "&copy; OpenStreetMap contributors",
    },
  ).addTo(map);

  marker = L.marker(defaultCoords, { draggable: true }).addTo(map);

  marker.on("dragend", function () {
    const pos = marker.getLatLng();
    updateCoords(pos.lat, pos.lng);
  });

  map.on("click", function (e) {
    marker.setLatLng(e.latlng);
    updateCoords(e.latlng.lat, e.latlng.lng);
  });
}

function updateCoords(lat, lng) {
  document.getElementById("lat").value = lat;
  document.getElementById("lng").value = lng;
}

// Photo Handling
const dropZone = document.getElementById("dropZone");
const photoInput = document.getElementById("photoInput");
const previewBox = document.getElementById("previewBox");
const previewImg = document.getElementById("previewImg");
const uploadHint = document.getElementById("uploadHint");

dropZone.onclick = () => photoInput.click();

photoInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
};

async function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewBox.style.display = "block";
    uploadHint.style.display = "none";
  };
  reader.readAsDataURL(file);

  // Extract EXIF Data
  try {
    const gps = await exifr.gps(file);
    if (gps && gps.latitude && gps.longitude) {
      console.log("GPS found in photo:", gps.latitude, gps.longitude);
      const lat = gps.latitude;
      const lng = gps.longitude;
      
      // Update Marker and Inputs
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], 16);
      updateCoords(lat, lng);
      
      showToast("Location updated from photo!", "success");
    } else {
      console.log("No GPS data found in this photo.");
    }
  } catch (err) {
    console.warn("EXIF extraction failed:", err);
  }
}

function clearPhoto(e) {
  e.stopPropagation();
  photoInput.value = "";
  previewBox.style.display = "none";
  uploadHint.style.display = "block";
}

// Form Submission
document.getElementById("complaintForm").onsubmit = async (e) => {
  e.preventDefault();
  
  // Advanced Feature: Check for nearby duplicates first
  const category = document.getElementById("categoryHint").value;
  const lat = document.getElementById("lat").value;
  const lng = document.getElementById("lng").value;

  if (category && lat && lng) {
    try {
      const checkRes = await fetch("/api/complaints/check-nearby", {
        method: "POST",
        headers: { ...Auth.getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ category, lat, lng })
      });
      const { duplicate } = await checkRes.json();
      if (duplicate) {
        return showDuplicateModal(duplicate);
      }
    } catch (err) { console.error("Nearby check failed:", err); }
  }

  submitGrievance();
};

async function submitGrievance() {
  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  const formData = new FormData();
  formData.append("description", document.getElementById("description").value);
  formData.append("location", document.getElementById("locationText").value);
  formData.append("lat", document.getElementById("lat").value);
  formData.append("lng", document.getElementById("lng").value);
  if (photoInput.files[0]) { formData.append("photo", photoInput.files[0]); }

  try {
    const res = await fetch("/api/complaints", {
      method: "POST",
      headers: Auth.getAuthHeaders(),
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast("Grievance filed successfully!", "success");
    setTimeout(() => (window.location.href = "/citizen/my-complaints"), 1500);
  } catch (err) {
    showToast(err.message, "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Grievance";
  }
}

function showDuplicateModal(complaint) {
  document.getElementById('duplicateId').textContent = complaint.complaint_id;
  document.getElementById('duplicateDesc').textContent = complaint.description;
  document.getElementById('duplicateModal').style.display = 'flex';
  window.activeDuplicateId = complaint.complaint_id;
}

function closeDuplicateModal() {
  document.getElementById('duplicateModal').style.display = 'none';
}

async function supportExisting() {
  try {
    const res = await fetch(`/api/complaints/${window.activeDuplicateId}/support`, {
      method: 'POST',
      headers: Auth.getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) {
      showToast("You have supported this complaint!", "success");
      setTimeout(() => window.location.href = "/citizen/my-complaints", 1000);
    } else {
      showToast(data.error, "error");
    }
  } catch (err) {
    showToast("Failed to support complaint", "error");
  }
}

function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.className = `toast-${type} show`;
  toast.innerHTML = `<strong>${type === "success" ? "Success:" : "Error:"}</strong> ${msg}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

async function loadUserStats() {
  try {
    const res = await fetch("/api/complaints/mine", {
      headers: Auth.getAuthHeaders(),
    });
    const data = await res.json();
    const list = data.complaints || [];
    document.getElementById("countTotal").textContent = list.length;
    document.getElementById("countPending").textContent = list.filter(
      (c) => c.status === "Pending",
    ).length;
    document.getElementById("countResolved").textContent = list.filter(
      (c) => c.status === "Resolved",
    ).length;
    document.getElementById("countRejected").textContent = list.filter(
      (c) => c.status === "Rejected",
    ).length;
  } catch (err) {}
}

initMap();
loadUserStats();
updateCoords(defaultCoords[0], defaultCoords[1]);
