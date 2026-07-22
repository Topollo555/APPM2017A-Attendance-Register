// ===============================
// APPM2017A Attendance Register
// ===============================

// Google Apps Script Web App URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx77CSArdgvret1DUQdlH1uEX-Bo55VhWj-Cx3OMMX_JVEsTopLXs9dhLc-Q5NXKeLU/exec";

// Lecture Hall Coordinates (University of Johannesburg, Doornfontein Campus)
const LECTURE_LAT = -26.188912;
const LECTURE_LON = 28.026473;

// Allowed distance (metres)
const ALLOWED_RADIUS = 100;

// ===============================
// Form Submission Handler
// ===============================
function handleSubmit(event) {
    event.preventDefault();
    checkIn();
}

// ===============================
// Check In
// ===============================
function checkIn() {
    const studentNumber = document.getElementById("studentNumber").value.trim();
    const surname = document.getElementById("surname").value.trim();
    const initials = document.getElementById("initials").value.trim();
    const lectureType = document.getElementById("lectureType").value.trim();
    const messageDiv = document.getElementById("message");
    const button = document.querySelector(".btn-primary");

    // Validate all fields
    if (studentNumber === "" || surname === "" || initials === "" || lectureType === "") {
        showMessage("❌ Please complete all fields.", "error");
        return;
    }

    // Check if browser supports geolocation
    if (!navigator.geolocation) {
        showMessage("❌ Your browser does not support location services.", "error");
        return;
    }

    // Disable button and show loading message
    button.disabled = true;
    showMessage("📍 Getting your location...", "info");

    navigator.geolocation.getCurrentPosition(
        function(position) {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            // Calculate distance
            const distance = Math.round(
                getDistance(
                    latitude,
                    longitude,
                    LECTURE_LAT,
                    LECTURE_LON
                )
            );

            // Determine status
            const isPresent = distance <= ALLOWED_RADIUS;
            const status = isPresent ? "✅ Present" : "❌ Outside Allowed Area";

            // Display location info
            document.getElementById("distanceDisplay").textContent = distance;
            document.getElementById("locationInfo").style.display = "block";

            // Prepare payload
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
                // Show success message
                let successMessage = `✅ Attendance Recorded<br>`;
                successMessage += `<strong>${surname}, ${initials}</strong><br>`;
                successMessage += `📍 Distance: ${distance}m<br>`;
                successMessage += status;

                showMessage(successMessage, "success");

                // Clear form
                document.getElementById("attendanceForm").reset();
                document.getElementById("locationInfo").style.display = "none";
            })
            .catch(function(error) {
                console.error("Error:", error);
                showMessage("❌ Error saving attendance. Please try again.", "error");
            })
            .finally(function() {
                // Re-enable button
                button.disabled = false;
            });
        },
        function(error) {
            console.error("Geolocation error:", error);
            button.disabled = false;

            // Handle different error types
            let errorMessage = "❌ Unable to get your location. ";
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += "Please enable location permission in your browser settings.";
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += "Location information is unavailable.";
                    break;
                case error.TIMEOUT:
                    errorMessage += "Location request timed out. Please try again.";
                    break;
                default:
                    errorMessage += "An unknown error occurred.";
            }
            showMessage(errorMessage, "error");
        }
    );
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
// Calculates distance between two coordinates in metres
// ===============================
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in metres

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