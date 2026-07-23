// ===============================
// APPM2017A Attendance Register
// ===============================

// Google Apps Script Web App URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx77CSArdgvret1DUQdlH1uEX-Bo55VhWj-Cx3OMMX_JVEsTopLXs9dhLc-Q5NXKeLU/exec";

// Lecture Hall Coordinates
const LECTURE_LAT = -26.188912;
const LECTURE_LON = 28.026473;
const ALLOWED_RADIUS = 100;

// Local Storage Key
const STORAGE_KEY = "appm2017_attendance";

// Initialize on page load
window.addEventListener('load', function() {
    loadAttendanceData();
    updateAdminStats();
});

// ===============================
// View Switching
// ===============================
function switchView(view) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

    // Show selected view
    document.getElementById(view + 'View').classList.add('active');
    document.getElementById('nav-' + view).classList.add('active');

    // Refresh admin data if admin view
    if (view === 'admin') {
        loadAttendanceData();
        updateAdminStats();
    }
}

// ===============================
// Form Submission Handler
// ===============================
function handleSubmit(event) {
    event.preventDefault();
    checkIn();
}

// ===============================
// Check In Function
// ===============================
function checkIn() {
    const studentNumber = document.getElementById("studentNumber").value.trim();
    const surname = document.getElementById("surname").value.trim();
    const initials = document.getElementById("initials").value.trim();
    const lectureType = document.getElementById("lectureType").value.trim();
    const button = document.querySelector(".btn-primary");

    if (studentNumber === "" || surname === "" || initials === "" || lectureType === "") {
        showMessage("❌ Please complete all fields.", "error");
        return;
    }

    if (!navigator.geolocation) {
        showMessage("❌ Your browser does not support location services.", "error");
        return;
    }

    button.disabled = true;
    showMessage("📍 Getting your location...", "info");

    navigator.geolocation.getCurrentPosition(
        function(position) {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            const distance = Math.round(
                getDistance(
                    latitude,
                    longitude,
                    LECTURE_LAT,
                    LECTURE_LON
                )
            );

            const isPresent = distance <= ALLOWED_RADIUS;
            const status = isPresent ? "✅ Present" : "❌ Outside Allowed Area";

            document.getElementById("distanceDisplay").textContent = distance;
            document.getElementById("locationInfo").style.display = "block";

            const payload = {
                studentNumber: studentNumber,
                surname: surname,
                initials: initials,
                lectureType: lectureType,
                distance: distance,
                status: status,
                latitude: latitude,
                longitude: longitude,
                timestamp: new Date().toISOString()
            };

            console.log("Sending attendance data:", payload);

            // Save to local storage
            saveAttendanceLocal(payload);

            // Send to Google Apps Script
            fetch(SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify(payload)
            })
            .then(function() {
                let successMessage = `✅ Attendance Recorded<br>`;
                successMessage += `<strong>${surname}, ${initials}</strong><br>`;
                successMessage += `📍 Distance: ${distance}m<br>`;
                successMessage += status;

                showMessage(successMessage, "success");

                document.getElementById("attendanceForm").reset();
                document.getElementById("locationInfo").style.display = "none";
            })
            .catch(function(error) {
                console.error("Error:", error);
                showMessage("✓ Attendance saved locally. Please try again.", "success");
                document.getElementById("attendanceForm").reset();
            })
            .finally(function() {
                button.disabled = false;
            });
        },
        function(error) {
            console.error("Geolocation error:", error);
            button.disabled = false;

            let errorMessage = "❌ Unable to get your location. ";
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += "Please enable location permission.";
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += "Location information unavailable.";
                    break;
                case error.TIMEOUT:
                    errorMessage += "Location request timed out. Try again.";
                    break;
                default:
                    errorMessage += "An unknown error occurred.";
            }
            showMessage(errorMessage, "error");
        }
    );
}

// ===============================
// Local Storage Management
// ===============================
function saveAttendanceLocal(record) {
    let records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    record.id = records.length + 1;
    record.savedTime = new Date().toLocaleString();
    records.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function loadAttendanceData() {
    let records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const tableBody = document.getElementById("tableBody");

    if (records.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="7">No records yet</td></tr>';
        return;
    }

    tableBody.innerHTML = records.map((record, index) => `
        <tr>
            <td>${records.length - index}</td>
            <td>${record.studentNumber}</td>
            <td>${record.surname}, ${record.initials}</td>
            <td>${record.lectureType}</td>
            <td class="${record.status.includes('Present') ? 'status-present' : 'status-absent'}">
                ${record.status}
            </td>
            <td>${record.distance}</td>
            <td>${new Date(record.timestamp).toLocaleTimeString()}</td>
        </tr>
    `).join('');
}

function updateAdminStats() {
    let records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    
    const total = records.length;
    const present = records.filter(r => r.status.includes('Present')).length;
    const absent = records.filter(r => r.status.includes('Outside')).length;
    const rate = total === 0 ? '-' : Math.round((present / total) * 100) + '%';

    document.getElementById('totalCheckins').textContent = total;
    document.getElementById('presentCount').textContent = present;
    document.getElementById('absentCount').textContent = absent;
    document.getElementById('attendanceRate').textContent = rate;
}

// ===============================
// Export Data as CSV
// ===============================
function exportData() {
    let records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    
    if (records.length === 0) {
        alert('No data to export!');
        return;
    }

    let csv = 'Student Number,Name,Lecture Type,Status,Distance (m),Time\n';
    records.forEach(record => {
        csv += `"${record.studentNumber}","${record.surname}, ${record.initials}","${record.lectureType}","${record.status}",${record.distance},"${new Date(record.timestamp).toLocaleString()}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// ===============================
// Clear All Data
// ===============================
function clearAllData() {
    if (confirm('Are you sure? This will delete all attendance records.')) {
        localStorage.removeItem(STORAGE_KEY);
        loadAttendanceData();
        updateAdminStats();
        alert('All data cleared!');
    }
}

// ===============================
// Show Message Helper
// ===============================
function showMessage(message, type) {
    const messageDiv = document.getElementById("message");
    messageDiv.innerHTML = message;
    messageDiv.className = "message show " + type;
}

// ===============================
// Haversine Distance Formula
// ===============================
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}