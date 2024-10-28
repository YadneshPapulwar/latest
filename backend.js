const olaMaps = new OlaMapsSDK.OlaMaps({
    apiKey: 'LHb0PtgzKlGLpp4YTM6oHgQTcUnF4DuEb76reivs'
});
const api_key = 'LHb0PtgzKlGLpp4YTM6oHgQTcUnF4DuEb76reivs';
const myMap = olaMaps.init({
    style: "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json",
    container: 'map',
    center: [72.8777, 19.0760],
    zoom: 12,
});

document.getElementById('getRoute').onclick = () => {
    const startLocation = document.getElementById('start').value;
    const endLocation = document.getElementById('end').value;
    const meetingLocation = document.getElementById('meeting').value;
    const startDateTime = document.getElementById('startDateTime').value; 
    getCoordinates(startLocation, meetingLocation, endLocation, startDateTime, false); 
};

document.getElementById('submitRide').onclick = () => {
    const startLocation = document.getElementById('start').value;
    const endLocation = document.getElementById('end').value;
    const meetingLocation = document.getElementById('meeting').value;
    const startDateTime = document.getElementById('startDateTime').value; 
    getCoordinates(startLocation, meetingLocation, endLocation, startDateTime, true); 
};

function getCoordinates(start, meeting, end, startDateTime, shouldStore) {
    const geocodeUrls = [
        `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(start)}&language=English&api_key=${api_key}`,
        `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(meeting)}&language=English&api_key=${api_key}`,
        `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(end)}&language=English&api_key=${api_key}`
    ];

    Promise.all(
        geocodeUrls.map(url => 
            fetch(url, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'X-Request-Id': 'esha',
                    'X-Correlation-Id': 'carpool',
                },
            }).then(response => response.json())
        )
    )
    .then(([startData, meetingData, endData]) => {
        const startCoords = startData?.geocodingResults[0]?.geometry?.location;
        const meetingCoords = meetingData?.geocodingResults[0]?.geometry?.location;
        const endCoords = endData?.geocodingResults[0]?.geometry?.location;

        // Set the meeting input placeholder to the name of the place
        if (meetingData.geocodingResults[0]) {
            const meetingPlaceName = meetingData.geocodingResults[0].formatted_address;
            document.getElementById('meeting').placeholder = meetingPlaceName;
        }

        if (startCoords && meetingCoords && endCoords) {
            calculateDistance(startCoords, meetingCoords, endCoords).then(distance => {
                const estimatedPrice = calculatePrice(distance);
                document.getElementById('estimatedPrice').textContent = estimatedPrice;
                getOptimizedRoute(startCoords, meetingCoords, endCoords, startDateTime, shouldStore, estimatedPrice);
            });
        } else {
            console.error('Start, meeting, or end location not found');
        }
    })
    .catch(error => {
        console.error('Error fetching coordinates:', error);
    });
}

function getOptimizedRoute(startCoords, meetingCoords, endCoords, startDateTime, shouldStore, price) {
    const start = `${startCoords.lat},${startCoords.lng}`;
    const meeting = `${meetingCoords.lat},${meetingCoords.lng}`;
    const end = `${endCoords.lat},${endCoords.lng}`;

    const url = `https://api.olamaps.io/routing/v1/directions?origin=${encodeURIComponent(start)}&destination=${encodeURIComponent(end)}&waypoints=${encodeURIComponent(meeting)}&mode=driving&alternatives=false&steps=true&overview=full&language=en&traffic_metadata=false&api_key=${api_key}`;

    fetch(url, {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'X-Request-Id': 'esha',
            'X-Correlation-Id': 'carpool',
        },
    })
    .then(response => response.json())
    .then(data => {
        plotRoute(data);
        if (shouldStore) {
            storeRideData(startCoords, meetingCoords, endCoords, startDateTime, price);
        }
    })
    .catch(error => {
        console.error('Error fetching route:', error);
    });
}

function storeRideData(startCoords, meetingCoords, endCoords, startDateTime, price) {
    const driverName = document.getElementById('driverName').value;
    const passengerCount = document.getElementById('passengerCount').value;
    const phone = document.getElementById('phone').value;
    const vehicleType = document.getElementById('vehicleType').value;

    const data = {
        startLat: startCoords.lat,
        startLng: startCoords.lng,
        meetingLat: meetingCoords.lat,
        meetingLng: meetingCoords.lng,
        endLat: endCoords.lat,
        endLng: endCoords.lng,
        startDateTime: startDateTime,
        driverName: driverName,
        passengerCount: passengerCount,
        phone: phone,
        vehicleType: vehicleType,
        customPrice: price
    };

    fetch('connect.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Data stored successfully:', data);
        window.location.href = './passenger.html';
    })
    .catch(error => {
        console.error('Error storing data:', error);
    });
}

function calculateDistance(startCoords, meetingCoords, endCoords) {
    const url = `https://api.olamaps.io/routing/v1/distanceMatrix?origins=${startCoords.lat},${startCoords.lng}|${meetingCoords.lat},${meetingCoords.lng}&destinations=${meetingCoords.lat},${meetingCoords.lng}|${endCoords.lat},${endCoords.lng}&mode=driving&api_key=${api_key}`;

    return fetch(url, {
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'X-Request-Id': 'esha',
            'X-Correlation-Id': 'carpool',
        },
    })
    .then(response => response.json())
    .then(data => {
        const distanceStartToMeeting = data.rows[0].elements[1].distance;
        const distanceMeetingToEnd = data.rows[1].elements[1].distance;
        return ((distanceStartToMeeting + distanceMeetingToEnd) / 1000).toFixed(2);
    })
    .catch(error => {
        console.error('Error fetching route data:', error);
        return null;
    });
}

function calculatePrice(distance) {
    const customPrice = document.getElementById('customPrice').value || 0;
    return (distance * customPrice).toFixed(2);
}

function plotRoute(data) {
    const routeCoordinates = data.routes[0].geometry.coordinates.map(coord => ({
        lat: coord[1],
        lng: coord[0]
    }));
    myMap.addPolyline({
        path: routeCoordinates,
        color: '#007bff',
        weight: 5
    });
}
