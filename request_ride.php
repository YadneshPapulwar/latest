<?php
session_start();

// Database connection settings
$servername = "localhost"; // Update with your database server
$username = "root"; // Update with your database username
$password = ""; // Update with your database password
$dbname = "carpool"; // Update with your database name

// Create a connection to the database
$conn = new mysqli($servername, $username, $password, $dbname);

// Check the connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Ensure the request method is POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get the ride_id from the request
    $ride_id = isset($_POST['ride_id']) ? intval($_POST['ride_id']) : 0;

    // Get the passenger_id from session (assuming the user is logged in)
    if (isset($_SESSION['user_id'])) {
        $passenger_id = $_SESSION['user_id'];

        // Prepare the SQL statement to insert the ride request
        $stmt = $conn->prepare("INSERT INTO ride_requests (ride_id, passenger_id, status) VALUES (?, ?, 'pending')");
        $stmt->bind_param("ii", $ride_id, $passenger_id);

        // Execute the statement and check for success
        if ($stmt->execute()) {
            echo "Ride request submitted successfully!";
        } else {
            echo "Error submitting ride request: " . $stmt->error;
        }

        // Close the statement
        $stmt->close();
    } else {
        echo "Error: User not logged in.";
    }
} else {
    echo "Invalid request method.";
}

// Close the database connection
$conn->close();
?>
