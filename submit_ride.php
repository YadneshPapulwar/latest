<?php
// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "carpool";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Set the response header
header('Content-Type: application/json');

// Get the raw POST data
$data = json_decode(file_get_contents('php://input'), true);

// Prepare and bind
$stmt = $conn->prepare("INSERT INTO rides (user_id, start_lat, start_lng, end_lat, end_lng, start_datetime, passenger_count, custom_price, driver_name, vehicle_type, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param(
    "iddsssisiss", // Data types for the parameters
    $user_id,     // Assuming you have a user ID to associate the ride with
    $data['startLat'],
    $data['startLng'],
    $data['endLat'],
    $data['endLng'],
    $data['startDateTime'],
    $data['passengerCount'],
    $data['customPrice'],
    $data['driverName'],
    $data['vehicleType'],
    $data['phone']
);

// Assuming you have a way to get the user_id
$user_id = 1; // Change this to get the logged-in user's ID

// Execute the statement
if ($stmt->execute()) {
    echo json_encode(["message" => "Ride submitted successfully!"]);
} else {
    echo json_encode(["message" => "Error submitting ride: " . $stmt->error]);
}

// Close connections
$stmt->close();
$conn->close();
?>
