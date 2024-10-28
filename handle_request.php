<?php
// handle_request.php

require 'connection.php'; // Include your database connection file

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $request_id = $_POST['request_id'];
    $action = $_POST['action']; // 'accept' or 'decline'

    if ($action === 'accept') {
        $status = 'accepted';
    } elseif ($action === 'decline') {
        $status = 'declined';
    } else {
        // Handle invalid action
        die("Invalid action");
    }

    // Update the ride request status
    $query = "UPDATE ride_requests SET status = ? WHERE request_id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("si", $status, $request_id);

    if ($stmt->execute()) {
        echo "Ride request {$status} successfully.";
    } else {
        echo "Error: " . $stmt->error;
    }

    $stmt->close();
}

$conn->close();
?>
