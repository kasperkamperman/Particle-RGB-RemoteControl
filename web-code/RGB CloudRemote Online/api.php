<?php

/*  Proxy implementation to:
    - get a variable value (GET)
    - call a function (POST)
    
    In this implementation the access_token and the deviceID are hidden from the user. 
    You define them in this code. 
    The JSON data that you'll get back from the cloud, contains the deviceID as well, so 
    that's filtered also (just the result or return_value is passed through). 
    
    Improvements and suggestion are welcome. 
    I noticed that a function call to particle without this costs about 200-300ms. While using this
    it will cost more then the double (around 500-700ms).
    
    Any suggestions to speed up are welcome. This implementation uses cURL in PHP, because I've read
    that it's mostly faster then file_get_contents (I didn't test it though). 
    
    This forum post was a great help:
    https://community.particle.io/t/simple-spark-php-proxy/
    
    kasperkamperman.com - 28-11-2017
*/

// fill in this information!

define('ACCESS_TOKEN', '');
define('DEVICE_ID', '');

header('Access-Control-Allow-Origin: api.particle.io');
header('Access-Control-Allow-Methods: GET, POST');
header("Access-Control-Allow-Headers: X-Requested-With");

header('Content-type: application/json');

// Security check!
if(!isset($_SERVER['HTTP_REFERER']) || substr_count($_SERVER['HTTP_REFERER'], $_SERVER['SERVER_NAME'])==0)
        die(json_encode(array(
                'error' => 'Invalid request'
)));

//https://stackoverflow.com/questions/15102796/when-to-use-filter-input

// we only let the JSON pass-through that we need.
// normal callback contains the deviceID
$filterOutput = true;

if($_GET['var']) {
    if(filterOutput) {
        $json = json_decode(callParticleAPI($_GET['var'], ""));
        echo json_encode(array ("result" => $json->result));  
    }
    else echo callParticleAPI($_GET['var'], "");
}
else if($_GET['func']) {
    if(filterOutput) {
        $json = json_decode(callParticleAPI($_GET['func'],$_POST['arg']));
        echo json_encode(array ("return_value" => $json->return_value));  
    }
    else echo callParticleAPI($_GET['var'], "");
}
else {
    if(filterOutput) {
        $json = json_decode(callParticleAPI("",""));
        echo json_encode(array ("connected" => $json->connected));
    }
    else echo callParticleAPI($_GET['var'], "");
}

function callParticleAPI($call, $args) {
    $device_id = DEVICE_ID;
    
    $url = "https://api.particle.io/v1/devices/".$device_id."/".$call;
    
    //open connection
    $ch = curl_init();
    
    if(!empty($args)) {
        //$fields_string = 'args='.urlencode($args).'&';
        $fields_string = 'args='.$args.'&';
        $fields_string = $fields_string.'access_token='.ACCESS_TOKEN;
        
        curl_setopt_array($ch, array(
            CURLOPT_URL => $url,
            CURLOPT_POST => 1,
            CURLOPT_POSTFIELDS => $fields_string,
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_TIMEOUT_MS => 5000
            )
        );
    }
    else {
        $url = $url.'?access_token='.ACCESS_TOKEN;
        
        curl_setopt_array($ch, array(
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_TIMEOUT_MS => 5000
            )
        );
    }

    //set the url, number of POST vars, POST data
    //curl_setopt($ch,CURLOPT_URL, $url);
    //curl_setopt($ch,CURLOPT_POST, 1);//count($fields));
    //curl_setopt($ch,CURLOPT_POSTFIELDS, $fields_string);
    //curl_setopt($ch, CURLOPT_TIMEOUT_MS, 2000);
    //curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

    if(!$result = curl_exec($ch)){
        die(json_encode(array(
                'error' => curl_error($ch),
                'errorcode' => curl_errno($ch)
        )));
        //die('Error: "' . curl_error($ch) . '" - Code: ' . curl_errno($ch));
    }

    //close connection
    curl_close($ch);
    
    return $result;
};

?>