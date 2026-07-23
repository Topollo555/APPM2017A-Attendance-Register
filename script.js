// ===============================
// APPM2017A Attendance Register
// ===============================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx77CSArdgvret1DUQdlH1uEX-Bo55VhWj-Cx3OMMX_JVEsTopLXs9dhLc-Q5NXKeLU/exec";
const LECTURE_LAT = -26.188912;
const LECTURE_LON = 28.026473;
const ALLOWED_RADIUS = 100;
const STORAGE_KEY = "appm2017_attendance";
const ADMIN_PASSWORD = "APPM2017";

let adminLoggedIn = false;
let selectedDate = new Date();
let currentCalendarMonth = new Date();

// ===============================
// Initialize on Page Load
// ===============================
window.addEventListener('load', function() {
    initializeCanvas();
    loadAttendanceData();
    updateAdminStats();
    renderCalendar();
    updateCurrentDate();
});

// ===============================
// Dynamic Mathematical Canvas - Equations moving into space
// ===============================
function initializeCanvas() {
    const canvas = document.getElementById('mathCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Mathematical equations and symbols
    const equations = [
        '∫f(x)dx', '∑(n)', '∇·F', '∂u/∂t', 'e^(iπ)+1=0', 
        'P(A|B)', 'lim x→∞', '∏(1/n)', 'f(x)=mx+b', 'σ²',
        'α+β=γ', 'Δy/Δx', 'λφ=φλ', '∞', 'ℝ³',
        '∂²u/∂t²', 'e^x', 'π', 'φ=(1+√5)/2', 'log(x)'
    ];
    
    let particles = [];
    
    // Create particles at random positions across the screen
    function createParticle() {
        // Random starting position
        const startX = Math.random() * canvas.width;
        const startY = Math.random() * canvas.height;
        
        // Direction angles (arrows point into the scene)
        // Multiple directions to simulate 3D perspective convergence
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1.5 + 0.8; // Moderate speed
        
        return {
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            text: equations[Math.floor(Math.random() * equations.length)],
            opacity: Math.random() * 0.4 + 0.2,
            size: Math.random() * 10 + 8,
            life: 1.0,
            maxLife: 1.0
        };
    }
    
    // Initialize particles
    for (let i = 0; i < 20; i++) {
        particles.push(createParticle());
    }
    
    function animate() {
        // Clear canvas with semi-transparent fill for motion trail effect
        ctx.fillStyle = 'rgba(10, 14, 39, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            
            // Move particle
            p.x += p.vx;
            p.y += p.vy;
            
            // Fade out
            p.life -= 0.008;
            
            // Remove if off screen or faded
            if (p.x < -100 || p.x > canvas.width + 100 || 
                p.y < -100 || p.y > canvas.height + 100 || 
                p.life <= 0) {
                particles.splice(i, 1);
                particles.push(createParticle());
                continue;
            }
            
            // Draw particle with glow effect
            const alpha = p.opacity * p.life;
            
            ctx.save();
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = '#3498db';
            ctx.shadowColor = 'rgba(52, 152, 219, 0.8)';
            ctx.shadowBlur = 8;
            ctx.font = `bold ${p.size}px Arial`;
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

window.addEventListener('resize', function() {
    initializeCanvas();
});

// ===============================
// Admin Access Control
// ===============================
function validateAdminPassword() {
    const password = document.getElementById('adminPassword').value;
    const errorMsg = document.getElementById('loginError');
    
    if (password === ADMIN_PASSWORD) {
        adminLoggedIn = true;
        document.getElementById('adminLoginModal').classList.remove('active');
        document.getElementById('adminNavItem').style.display = 'block';
        document.getElementById('logoutItem').style.display = 'block';
        showMessage('Admin access granted!', 'success');
    } else {
        errorMsg.textContent = 'Invalid password';
    }
}

function logout() {
    adminLoggedIn = false;
    document.getElementById('adminNavItem').style.display = 'none';
    document.getElementById('logoutItem').style.display = 'none';
    switchView('student');
}

// ===============================
// View Switching
// ===============================
function switchView(view) {
    if (view === 'admin' && !adminLoggedIn) {
        document.getElementById('adminLoginModal').classList.add('active');
        document.getElementById('adminPassword').value = '';
        document.getElementById('loginError').textContent = '';
        return;
    }
    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    
    document.getElementById(view + 'View').classList.add('active');
    document.getElementById('nav-' + view).classList.add('active');
    
    if (view === 'admin') {
        loadAttendanceData();
        updateAdminStats();
    }
}

// ===============================
// Form Submission
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
            const distance = Math.round(getDistance(latitude, longitude, LECTURE_LAT, LECTURE_LON));
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

            saveAttendanceLocal(payload);

            fetch(SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            })
            .then(function() {
                let successMessage = `✅ Attendance Recorded<br>`;
                successMessage += `<strong>${surname}, ${initials}</strong><br>`;
                successMessage += `📍 Distance: ${distance}m<br>` + status;
                showMessage(successMessage, "success");
                document.getElementById("attendanceForm").reset();
                document.getElementById("locationInfo").style.display = "none";
            })
            .catch(function(error) {
                showMessage("✓ Saved locally.", "success");
                document.getElementById("attendanceForm").reset();
            })
            .finally(function() {
                button.disabled = false;
            });
        },
        function(error) {
            button.disabled = false;
            let errorMessage = "❌ Unable to get location. ";
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += "Enable location permission.";
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += "Location unavailable.";
                    break;
                case error.TIMEOUT:
                    errorMessage += "Timeout. Try again.";
                    break;
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
    records.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function loadAttendanceData() {
    let records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const tableBody = document.getElementById("tableBody");

    if (records.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="8">No records yet</td></tr>';
        return;
    }

    tableBody.innerHTML = records.map((record, index) => {
        const date = new Date(record.timestamp);
        return `
            <tr>
                <td>${records.length - index}</td>
                <td>${record.studentNumber}</td>
                <td>${record.surname}, ${record.initials}</td>
                <td>${record.lectureType}</td>
                <td class="${record.status.includes('Present') ? 'status-present' : 'status-absent'}">${record.status}</td>
                <td>${record.distance}</td>
                <td>${date.toLocaleDateString()}</td>
                <td>${date.toLocaleTimeString()}</td>
            </tr>
        `;
    }).join('');
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
// Calendar Management
// ===============================
function renderCalendar() {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    let html = `
        <div class="calendar-header">
            <button onclick="prevMonth()">&lt; Prev</button>
            <span>${monthNames[month]} ${year}</span>
            <button onclick="nextMonth()">Next &gt;</button>
        </div>
        <div class="calendar-days">
    `;
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        html += `<div class="calendar-day" style="opacity: 0.3;">${daysInPrevMonth - i}</div>`;
    }
    
    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        const hasRecords = hasAttendanceForDate(dateStr);
        const isToday = date.toDateString() === today.toDateString();
        const isSelected = date.toDateString() === selectedDate.toDateString();
        
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (hasRecords) classes += ' has-data';
        if (isSelected) classes += ' selected';
        
        html += `<div class="${classes}" onclick="selectDate(new Date(${year}, ${month}, ${day}))">${day}</div>`;
    }
    
    // Next month days
    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="calendar-day" style="opacity: 0.3;">${day}</div>`;
    }
    
    html += '</div>';
    document.getElementById('calendar').innerHTML = html;
    updateDateStats();
}

function prevMonth() {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + 1);
    renderCalendar();
}

function selectDate(date) {
    selectedDate = date;
    renderCalendar();
}

function hasAttendanceForDate(dateStr) {
    let records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return records.some(r => r.timestamp.split('T')[0] === dateStr);
}

function updateDateStats() {
    const dateStr = selectedDate.toISOString().split('T')[0];
    let records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const dateRecords = records.filter(r => r.timestamp.split('T')[0] === dateStr);
    
    const info = document.getElementById('selectedDateInfo');
    const attendance = document.getElementById('selectedDateAttendance');
    
    info.textContent = selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    if (dateRecords.length === 0) {
        attendance.textContent = 'No records';
    } else {
        const present = dateRecords.filter(r => r.status.includes('Present')).length;
        attendance.textContent = `✓ ${present}/${dateRecords.length}`;
    }
}

function updateCurrentDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = today.toLocaleDateString('en-US', options);
}

// ===============================
// Export & Clear Functions
// ===============================
function exportData() {
    let records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    if (records.length === 0) {
        alert('No data to export!');
        return;
    }

    let csv = 'Student Number,Name,Lecture Type,Status,Distance (m),Date,Time\n';
    records.forEach(record => {
        const date = new Date(record.timestamp);
        csv += `"${record.studentNumber}","${record.surname}, ${record.initials}","${record.lectureType}","${record.status}",${record.distance},"${date.toLocaleDateString()}","${date.toLocaleTimeString()}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function clearAllData() {
    if (confirm('Delete all attendance records? This cannot be undone.')) {
        localStorage.removeItem(STORAGE_KEY);
        loadAttendanceData();
        updateAdminStats();
        renderCalendar();
        alert('All data cleared!');
    }
}

// ===============================
// Utilities
// ===============================
function showMessage(message, type) {
    const messageDiv = document.getElementById("message");
    messageDiv.innerHTML = message;
    messageDiv.className = "message show " + type;
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}