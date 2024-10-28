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
    const startDateTime = document.getElementById('startDateTime').value; 
    getCoordinates(startLocation, endLocation, startDateTime, false); 
};
document.getElementById('submitRide').onclick = () => {
    const startLocation = document.getElementById('start').value;
    const endLocation = document.getElementById('end').value;
    const startDateTime = document.getElementById('startDateTime').value; 
    getCoordinates(startLocation, endLocation, startDateTime, true); 
};
function getCoordinates(start, end, startDateTime, shouldStore) {
    const geocodeStartUrl = `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(start)}&language=English&api_key=${api_key}`;
    const geocodeEndUrl = `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(end)}&language=English&api_key=${api_key}`;

    Promise.all([
        fetch(geocodeStartUrl, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'X-Request-Id': 'esha',
                'X-Correlation-Id': 'carpool',
            },
        }).then(response => response.json()),

        fetch(geocodeEndUrl, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'X-Request-Id': 'esha',
                'X-Correlation-Id': 'carpool',
            },
        }).then(response => response.json())
    ])
    .then(([startData, endData]) => {
        console.log(startData);
        const startCoords = startData?.geocodingResults[0]?.geometry?.location;
        const endCoords = endData?.geocodingResults[0]?.geometry?.location;
        console.log('Start Coordinates:', startCoords);
        console.log('End Coordinates:', endCoords);

        if (startCoords && endCoords) {
            calculateDistance(startCoords, endCoords).then(distance => {
                console.log(`Calculated Distance: ${distance}`); // Log calculated distance

                if (distance) { // Check if distance is valid
                    const estimatedPrice = calculatePrice(distance);
                    console.log(`Estimated Price: ${estimatedPrice}`);
                    document.getElementById('estimatedPrice').textContent = estimatedPrice;
                    getOptimizedRoute(startCoords, endCoords, startDateTime, shouldStore, estimatedPrice);
                } else {
                    console.error("Failed to calculate distance");
                }
            });
        } else {
            console.error('Start or end location not found');
        }
    })
    .catch(error => {
        console.error('Error fetching coordinates:', error);
    });
}

function getOptimizedRoute(startCoords, endCoords, startDateTime, shouldStore, price) {
    const start = `${startCoords.lat},${startCoords.lng}`;
    const end = `${endCoords.lat},${endCoords.lng}`;
    console.log(start);
    
    const url = `https://api.olamaps.io/routing/v1/directions?origin=${encodeURIComponent(start)}&destination=${encodeURIComponent(end)}&mode=driving&alternatives=false&steps=true&overview=full&language=en&traffic_metadata=false&api_key=${api_key}`;

    console.log(url);
    fetch(url, {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'X-Request-Id': 'esha',
            'X-Correlation-Id': 'carpool',
        },
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log('API Response:', data);
        plotRoute(data);
        myMap.flyTo({
            center: [endCoords.lng, endCoords.lat],
            zoom: 14,    
            speed: 1.2, 
            curve: 1.42, 
            essential: true 
        });
        if (shouldStore) {
            storeRideData(startCoords, endCoords, startDateTime, price);
        }
    })
    .catch(error => {
        console.error('Error fetching route:', error);
    });
}

function plotRoute(routeData) {
    if (!routeData || !routeData.routes || routeData.routes.length === 0) {
        console.error('No routes found in API response');
        return;
    }

    const route = routeData.routes[0];
    if (!route || !route.overview_polyline) {
        console.error('Route overview_polyline not found');
        return;
    }

    const coordinates = route.overview_polyline;

    // Remove existing layer and source if they exist
    if (myMap.getLayer('optimized-route')) {
        myMap.removeLayer('optimized-route');
        myMap.removeSource('optimized-route-source');
    }

    // Add new layer for the route
    myMap.addSource('optimized-route-source', {
        type: 'geojson',
        data: {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: decodePolyline(coordinates),
            }
        }
    });

    myMap.addLayer({
        id: 'optimized-route',
        type: 'line',
        source: 'optimized-route-source',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#3b9ddd',
            'line-width': 4
        }
    });

    // Check and add markers for start and end locations
    if (route.geocoded_waypoints && route.geocoded_waypoints.length >= 2) {
        const startWaypoint = route.geocoded_waypoints[0];
        const endWaypoint = route.geocoded_waypoints[1];

        addCustomMarker(startWaypoint.geometry.location.lng, startWaypoint.geometry.location.lat); // Start marker
        addCustomMarker(endWaypoint.geometry.location.lng, endWaypoint.geometry.location.lat); // End marker
    } else {
        console.error('Geocoded waypoints not found or insufficient data');
    }
}

function decodePolyline(encoded) {
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        points.push([(lng * 1e-5), (lat * 1e-5)]);
    }

    return points;
}

function addCustomMarker(lng, lat) {
    const marker = new OlaMapsSDK.Marker()
        .setLngLat([lng, lat])
        .addTo(myMap);
}
function storeRideData(startCoords, endCoords, startDateTime) {
    const data = {
        startLat: startCoords.lat,
        startLng: startCoords.lng,
        endLat: endCoords.lat,
        endLng: endCoords.lng,
        startDateTime: startDateTime,
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
    })
    .catch(error => {
        console.error('Error storing data:', error);
    });
}
function calculateDistance(startCoords, endCoords) {
    const url = `https://api.olamaps.io/routing/v1/distanceMatrix?origins=${startCoords.lat},${startCoords.lng}&destinations=${endCoords.lat},${endCoords.lng}&mode=driving&api_key=${api_key}`;

    return fetch(url, { // Return the fetch promise
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'X-Request-Id': 'esha',
            'X-Correlation-Id': 'carpool',
        },
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log("API Response: ", data); // Log the entire response

        // Check if the status indicates success
        if (data.status !== 'SUCCESS') {
            console.error(`API Error: ${data.status}`);
            return null; // Return null if there's an error
        }

        // Access the distance from the elements array
        if (data.rows && data.rows.length > 0 && data.rows[0].elements.length > 0) {
            const element = data.rows[0].elements[0];
            if (element.status === 'OK') {
                const distance = element.distance; // Distance in meters
                console.log(`Distance covered by the route: ${(distance / 1000).toFixed(2)} km`); 
                return (distance / 1000).toFixed(2); // Return distance in km
            } else {
                console.error("No valid route found");
                return null; // Return null if no valid route
            }
        } else {
            console.error("No elements found in the response");
            return null; // Return null if no elements found
        }
    })
    .catch(error => {
        console.error('Error fetching route data:', error);
        return null; // Return null on error
    });
}



function calculatePrice(distance) {
    const customPriceInput = document.getElementById('customPrice').value;
    const pricePerKm = customPriceInput ? parseFloat(customPriceInput) : 7; // Default price in INR per km
    return (distance * pricePerKm).toFixed(2); // Return price as string with 2 decimal points
}

function storeRideData(startCoords, endCoords, startDateTime, price) {
    const driverName = document.getElementById('driverName').value;
    const passengerCount = document.getElementById('passengerCount').value;
    const phone = document.getElementById('phone').value;
    const vehicleType = document.getElementById('vehicleType').value;
    const data = {
        startLat: startCoords.lat,
        startLng: startCoords.lng,
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