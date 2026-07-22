// ===============================
// APPM2017A Attendance Register
// ===============================

// Google Apps Script Web App URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx77CSArdgvret1DUQdlH1uEX-Bo55VhWj-Cx3OMMX_JVEsTopLXs9dhLc-Q5NXKeLU/exec";

// Lecture Hall Coordinates
const LECTURE_LAT = -26.188912;
const LECTURE_LON = 28.026473;

// Allowed distance (metres)
const ALLOWED_RADIUS = 100;

// ===============================
// Check In
// ===============================
function checkIn() {

    const studentNumber = document.getElementById("studentNumber").value.trim();
    const surname = document.getElementById("surname").value.trim();
    const initials = document.getElementById("initials").value.trim();
    const lectureType = document.getElementById("lectureType").value.trim();

    if (studentNumber === "" || surname === "" || initials === "" || lectureType === "") {

        document.getElementById("message").innerHTML =
            "❌ Please complete all fields.";

        return;
    }

    if (!navigator.geolocation) {

        document.getElementById("message").innerHTML =
            "❌ Your browser does not support location.";

        return;
    }

    document.getElementById("message").innerHTML =
        "Getting your location...";

    navigator.geolocation.getCurrentPosition(

        function(position){

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

            const status =
                distance <= ALLOWED_RADIUS
                ? "✅ Present"
                : "❌ Outside Allowed Area";

            const payload = {
                studentNumber: studentNumber,
                surname: surname,
                initials: initials,
                lectureType: lectureType,
                distance: distance,
                status: status
            };

            console.log("Sending:", payload);

            fetch(SCRIPT_URL,{

                method:"POST",

                mode:"no-cors",

                headers:{
                    "Content-Type":"text/plain;charset=utf-8"
                },

                body:JSON.stringify(payload)

            })

            .then(function(){

                document.getElementById("message").innerHTML =
                    "✅ Attendance Recorded<br>" +
                    "Distance: " + distance + " metres<br>" +
                    status;

                document.getElementById("studentNumber").value="";
                document.getElementById("surname").value="";
                document.getElementById("initials").value="";

            })

            .catch(function(error){

                console.error(error);

                document.getElementById("message").innerHTML =
                    "❌ Error saving attendance.";

            });

        },

        function(){

            document.getElementById("message").innerHTML =
                "❌ Please allow location access and try again.";

        }

    );

}

// ===============================
// Distance Formula
// ===============================
function getDistance(lat1, lon1, lat2, lon2) {

    const R = 6371000;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +

        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *

        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}