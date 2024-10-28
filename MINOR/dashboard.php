<?php
session_start();
include("connection.php");

// Check if the user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php"); // Redirect to login if not logged in
    exit;
}

$user_id = $_SESSION['user_id'];

// Fetch user's current rides
$query = "SELECT * FROM rides WHERE user_id = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
$rides = $result->fetch_all(MYSQLI_ASSOC);

// Fetch user's ride requests
$requestQuery = "SELECT * FROM ride_requests WHERE passenger_id = ?";
$requestStmt = $conn->prepare($requestQuery);
$requestStmt->bind_param("i", $user_id);
$requestStmt->execute();
$requestResult = $requestStmt->get_result();
$rideRequests = $requestResult->fetch_all(MYSQLI_ASSOC);

// Close the prepared statements and the database connection
$stmt->close();
$requestStmt->close();
$conn->close();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<nav class="navbar navbar-expand-sm navbar-dark bg-dark">
    <div class="container-fluid">
        <a class="navbar-brand" href="#">Carpool</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarsExample03" aria-controls="navbarsExample03" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="navbar-collapse collapse" id="navbarsExample03">
            <ul class="navbar-nav me-auto mb-2 mb-sm-0">
                <li class="nav-item">
                    <a class="nav-link" href="#">Home</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="index.html">Driver</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="passenger.html">Passenger</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link active" aria-current="page" href="#">Dashboard</a>
                </li>
            </ul>
            <ul class="navbar-nav ms-auto">
                <li class="nav-item">
                    <a class="nav-link active" aria-current="page" href="logout.php">Log Out</a>
                </li>
            </ul>
        </div>
    </div>
</nav>

<div class="navbar">
    <h1>Welcome to Your Dashboard</h1>
</div>

<div class="container">
    <h2>Your Current Rides</h2>
    <?php if (empty($rides)): ?>
        <p>You have no active rides at the moment.</p>
    <?php else: ?>
        <table class="table">
            <thead>
                <tr>
                    <th>Start Location</th>
                    <th>End Location</th>
                    <th>Start Time</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($rides as $ride): ?>
                    <tr>
                        <td data-lat="<?php echo htmlspecialchars($ride['start_lat']); ?>" data-lng="<?php echo htmlspecialchars($ride['start_lng']); ?>">Fetching address...</td>
                        <td data-lat="<?php echo htmlspecialchars($ride['end_lat']); ?>" data-lng="<?php echo htmlspecialchars($ride['end_lng']); ?>">Fetching address...</td>
                        <td><?php echo htmlspecialchars(date("d-m-Y H:i", strtotime($ride['start_datetime']))); ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>

    <h2>Your Ride Requests</h2>
    <?php if (empty($rideRequests)): ?>
        <p>You have no pending ride requests.</p>
    <?php else: ?>
        <table class="table">
            <thead>
                <tr>
                    <th>Request ID</th>
                    <th>Ride ID</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($rideRequests as $request): ?>
                    <tr>
                        <td><?php echo htmlspecialchars($request['request_id']); ?></td>
                        <td><?php echo htmlspecialchars($request['ride_id']); ?></td>
                        <td><?php echo htmlspecialchars($request['status']); ?></td>
                        <td>
                            <?php if ($request['status'] === 'pending'): ?>
                                <form action="handle_request.php" method="post" style="display:inline;">
                                    <input type="hidden" name="request_id" value="<?php echo htmlspecialchars($request['request_id']); ?>">
                                    <button type="submit" name="action" value="accept" class="btn btn-success btn-sm">Accept</button>
                                </form>
                                <form action="handle_request.php" method="post" style="display:inline;">
                                    <input type="hidden" name="request_id" value="<?php echo htmlspecialchars($request['request_id']); ?>">
                                    <button type="submit" name="action" value="decline" class="btn btn-danger btn-sm">Decline</button>
                                </form>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>
</div>

<script>
    const apiKey = 'LHb0PtgzKlGLpp4YTM6oHgQTcUnF4DuEb76reivs'; // Replace with your OlaMaps API key

    function reverseGeocode(lat, lng) {
        const geocodeUrl = `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${apiKey}`;

        return fetch(geocodeUrl, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'X-Request-Id': 'esha',
                'X-Correlation-Id': 'carpool',
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Reverse geocoding error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.results && data.results.length > 0) {
                return data.results[0].formatted_address;
            } else {
                return 'Address not found';
            }
        })
        .catch(error => {
            console.error('Error in reverse geocoding:', error);
            return 'Error fetching address';
        });
    }

    function updateRideAddresses() {
        const rideRows = document.querySelectorAll('tbody tr');

        rideRows.forEach(async (row) => {
            const startLocationCell = row.cells[0];
            const endLocationCell = row.cells[1];

            const startLat = startLocationCell.getAttribute('data-lat');
            const startLng = startLocationCell.getAttribute('data-lng');
            const endLat = endLocationCell.getAttribute('data-lat');
            const endLng = endLocationCell.getAttribute('data-lng');

            if (startLat && startLng) {
                const startAddress = await reverseGeocode(startLat, startLng);
                startLocationCell.innerText = startAddress;
            }

            if (endLat && endLng) {
                const endAddress = await reverseGeocode(endLat, endLng);
                endLocationCell.innerText = endAddress;
            }
        });
    }

    window.onload = updateRideAddresses;
</script>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
