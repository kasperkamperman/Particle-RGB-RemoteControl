<?php
// just to test the script. Gives back a JSON string. Nothing responsive on the sliders though.

header("Content-type:application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

$json = utf8_encode ("{ \"r\":255,\"b\":0,\"g\":0 }");
echo $json;
?>