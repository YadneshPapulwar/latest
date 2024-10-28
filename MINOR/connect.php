<?php
session_start();
include("connection.php");


if (!isset($_SESSION['user_id'])) {
    header("Location: login.php"); 
    exit;
}
$user_id=$_SESSION['user_id'];

$data = json_decode(file_get_contents('php://input'), true);

$startLat = $data['startLat'];
$startLng = $data['startLng'];
$endLat = $data['endLat'];
$endLng = $data['endLng'];
$startDateTime = $data['startDateTime'];
$driverName = $data['driverName'];
$passengerCount = $data['passengerCount'];
$phone = $data['phone'];
$vehicleType = $data['vehicleType'];
$customPrice = $data['customPrice'];

$stmt = $conn->prepare("INSERT INTO rides (start_lat, start_lng, end_lat, end_lng, start_datetime, driver_name, passenger_count, phone, vehicle_type, custom_price, seats_available, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)");

$stmt->bind_param("ddddssissdii", $startLat, $startLng, $endLat, $endLng, $startDateTime, $driverName, $passengerCount, $phone, $vehicleType, $customPrice, $passengerCount, $user_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "error" => $stmt->error]);
}

$stmt->close();
$conn->close();
?>
