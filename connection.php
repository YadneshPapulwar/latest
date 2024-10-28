<?php
$dbhost = "localhost";
$dbuser = "root";
$dbpass = ""; // No password specified
$dbname = "carpool";

$conn = mysqli_connect($dbhost, $dbuser, $dbpass, $dbname);

if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}
?>

