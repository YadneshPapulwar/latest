<?php
function checkLogin($con)
{
    if(isset($_SESSION['username']))
    {
        $name=$_SESSION['username'];
        $query = "select * from user where username = '$name' limit 1";
        $result=mysqli_query($con, $query);
        if($result && mysqli_num_rows($result)>0)
        {
            $user_data=mysqli_fetch_assoc($result);
            return $user_data;
        }
    }

header("Location: index.php");
die;
}
?>