/*  Communicate with Particle Variables and Functions in Vanilla JS 
    (so no other frameworks like jQuery needed). 
    
    Copyleft 01-06-2017 - http://www.kasperKamperman.com
    
    More info:
    https://www.kasperkamperman.com/blog/particle-photon-rgb-remote-cloud/
*/

// take in account that if you share this site public, your accessToken and deviceId will also be public.
// that won't be a good idea, since everyone can take over your Photon. 
// so use this only on your local computer. 

var deviceId    = "";    // <<your deviceId goes here>>
var accessToken = ""; // <<your access token goes here>>

var isDeviceOnline = false;

// Store DOM elements in variables
var hueSlider;
var hueValueLabel;
var satSlider;
var satValueLabel;
var briSlider;
var briValueLabel;
var directTransmit; 
var transmitButton;
var durationChip;
var snackbarDialog;

var showSnackbar = showSnackbarClosure();

// Store values set with the sliders
var hue;
var saturation;
var brightness;

// variables for rate limit
// we set the cloud limit at 2 times a second (500ms)
var rateLimitPerSecond = 2;
var rateLimitTimeStep  = 1000/rateLimitPerSecond;
var rateLimitStartTime;
var rateLimitTimeOut;

// Functions used to communicate with the Particle Cloud ----------------------------

function ajaxRequest(requestType, url, params, callBackFunction) {
    
    // You can use jQuery or other libraries. Nonetheless most modern browsers
    // support the standard Javascript XMLHttpRequest. 
    // Further explanation:
    // https://www.w3schools.com/xml/ajax_xmlhttprequest_response.asp
    // http://www.openjs.com/articles/ajax_xmlhttp_using_post.php

    var xhttp = new XMLHttpRequest();
    
    xhttp.timeout = 4000;
        
    xhttp.ontimeout = function(e) {
        showSnackbar('Time Out: Is your Particle device (still) online?'); 
    }

    xhttp.onreadystatechange = function() {
        //console.log(this.responseText);  

        if (this.readyState == 4) {
            if (this.status == 200) {
                callBackFunction(this);
            }
            if(this.status == 404) {
                // particle returns error information in JSON format
                var json = JSON.parse(xhttp.responseText);
    
                // show errors
                if(json.ok == false) {
                    showSnackbar(json.error);
                }
            };
        }
    };

    if(requestType == "POST") {
        xhttp.open("POST", url, true);
        xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhttp.send(params);
    }

    if(requestType == "GET") {
        xhttp.open("GET", url+"?"+params, true);
        xhttp.send();
    }
  
}

function callParticleFunction(functionName, command, callbackFunction) {
    
    // we need to call a Particle Function with POST
    // https://docs.particle.io/reference/firmware/photon/#particle-function-
    
    var url    = "https://api.particle.io/v1/devices/"+deviceId+"/"+functionName+"/";
    var params = "access_token="+accessToken+"&arg="+command;
    ajaxRequest("POST", url, params, callbackFunction);
    
}

function callParticleVariable(variableName, callbackFunction) {
    
    // we need to call a Particle Variable with GET
    // https://docs.particle.io/reference/firmware/photon/#particle-variable-
    
    var url    = "https://api.particle.io/v1/devices/"+deviceId+"/"+variableName+"/";
    
    // if we don't add a variable name we get the device information
    // https://docs.particle.io/reference/api/#get-device-information
    if(!Boolean(variableName)) {
       url    = "https://api.particle.io/v1/devices/"+deviceId+"/";
    }
    
    var params = "access_token="+accessToken;
    ajaxRequest("GET", url, params, callbackFunction);
    
}

// Functions used to transfer our data and receive data ----------------------------

/*  The function submitHSB is called when we move a slider.
    It sends the hue, saturation, brightness data our Particle Cloud function "setHSB".
    On the Particle it's converted to RGB data (and show on the status LED).
    The RGB values are stored in the Cloud variable "getRGB".
    So we can get that string by calling this Particle Variable
    We call  "getRGB" when we got a successfull confirmation of the callBackHSB function.
    When the "getRGB" is returned we use it to change the background color of the card title. 
    
    rateLimitedSubmitHSB makes sure that we don't call submitHSB to often. Because a moved slider
    will generate events on 60fps (so each 16ms), this is to fast for the cloud. We could also use
    an onChange handler (triggers when you release the slider handle). 
*/

function rateLimitedSubmitHSB() {
    
	// If there is a timeout cancel it. 
	if( rateLimitTimeOut ) {
		clearTimeout(rateLimitTimeOut);
	}

	// Check if the eventhandler is called for the first time. If so:
	// - Set a startTime and call the submitHSB
	if( rateLimitStartTime == undefined ) {
		rateLimitStartTime = Date.now();
        submitHSB();
	}
    
	// Calculate the wait. currentTime - startTime
	var wait = rateLimitTimeStep - (Date.now() - rateLimitStartTime);

	// if the wait is smaller than 0:
	// - Set a new start time and call the submitHSB
	if( wait <= 0 ) {
		rateLimitStartTime = Date.now();
        submitHSB();
	}
	// If the wait is not smaller than 0 set a time out. This makes sure there is always one last update. 
    // If the input is changed before the time out is executed, the time out will be cancelled.
	else {
		rateLimitTimeOut = setTimeout( rateLimitedSubmitHSB, rateLimitTimeStep );
	}

}

function submitHSB() {
    
    // comma seperated is easy to parse on an embedded system
    // no JSON libraries needed on the Particle
    var command = hue + "," + saturation + "," + brightness + "," + Math.round(performance.now());
    //console.log(command); 
    
    // we don't keep track if the device stays online
    // so if it was online on page load and the device goes offline in between
    // then we don't notice that.
    if(isDeviceOnline == false) {
        checkIfDeviceIsConnected();
    } 
    else {
        callParticleFunction("setHSB", command, callBackHSB);
    }
    
}

function callBackHSB(xhttp) {
    
    
    // console.log(xhttp.responseText);
    // parse the returned data (Particle Cloud always sends JSON formatted data)
    var json = JSON.parse(xhttp.responseText);
    console.log(json);
    
    // the time we have set in subHSB will be returned als integer
    // so we need to parse the return JSON data to get that value back. 
    var returnedValue = json.return_value;
    // calculate time difference between the time send and the current time.
    var durationInMillis = Math.round(performance.now()) - parseInt(returnedValue);

    // display it in the durationChip
    durationChip.innerHTML = durationInMillis.toString();

    // get the rgb color from the Photon
    // we will do a request to a Particle Variable for that.
    callParticleVariable("getRGB", callBackRGB); 
    
} 

function callBackRGB(xhttp) {

    // The getRGB variable is a a JSON formated String
    // This is the most easy to parse (easier then comma seperated), with standard JS functions.
    
    console.log(xhttp.responseText);
    var json   = JSON.parse(xhttp.responseText);
    //console.log(json);
    var result = JSON.parse(json.result);
    //console.log(result);
    
    // make a string like rgb(255,255,255) for CSS
    var rgbString = "rgb("+result.r+","+result.g+","+result.b+")";
    
    // set the card title background property
    // we added important to override the standard background property in the mdl (material design light) css
    document.getElementById("card_title").style.setProperty ("background-color", rgbString, "important");
    
}

function checkIfDeviceIsConnected() {
    
    // the information if a Particle device is connected or not is not updated
    // realtime.
    
    if(Boolean(deviceId) && Boolean(accessToken)) {
        callParticleVariable("", callBackConnected); 
    }
    else {
        showSnackbar('Add deviceId and accessToken to the index.js code');
    }
}

function callBackConnected(xhttp) {
    
    var json   = JSON.parse(xhttp.responseText);
    //console.log(json);
    // This value doesn't seem always up to date. 
    // So when you unplug your device it still can return connected. 
    // That we we use a TimeOut in the XMLhttp requests.  
    isDeviceOnline = json.connected;
    
    if(isDeviceOnline) {
        showSnackbar('Your Particle device is online.');
    }
    else {
        showSnackbar('Your Particle device seems offline...');
    }
    
}

// Configure the DOM and add EventListeners ------------------------------
//
// MDL 1.3.0 has a bug and doesn't support change in Chrome.
// not really a problem (we use input for realtime update now).
// https://github.com/google/material-design-lite/issues/5064

document.addEventListener("DOMContentLoaded", function(e) {
    
    //console.log("DOM fully loaded and parsed");
    checkIfDeviceIsConnected();
    
    hueSlider       = document.getElementById("hue_slider");
    hueValueLabel   = document.getElementById("hue_value");

    satSlider       = document.getElementById("sat_slider");
    satValueLabel   = document.getElementById("sat_value");

    briSlider       = document.getElementById("bri_slider");
    briValueLabel   = document.getElementById("bri_value");

    rateLimitSwitch = document.getElementById("switch1");
    transmitButton  = document.getElementById("transmit");
    durationChip    = document.getElementById("duration_chip");
    
    snackbarDialog  = document.getElementById("snackbar_dialog");
    
    // Set the labels and the variables to the default value (set in the html)
    hueValueLabel.innerHTML = hue        = hueSlider.value;// = 180;
    satValueLabel.innerHTML = saturation = satSlider.value;// = 255;
    briValueLabel.innerHTML = brightness = briSlider.value;// = 255;
    
    //range-slider touch fix (doesn't seem to do anything...)
    //https://github.com/sampotts/rangetouch
    window.rangetouch.set("thumbWidth", 32);
    
    hueSlider.addEventListener("input", function(e) {
        hue = hueSlider.value;
        hueValueLabel.innerHTML = hue;
        
        if(rateLimitSwitch.checked) rateLimitedSubmitHSB(); 
        else                        submitHSB();
    });

    satSlider.addEventListener("input", function(e) {
        saturation = satSlider.value;
        satValueLabel.innerHTML = saturation;
        
        if(rateLimitSwitch.checked) rateLimitedSubmitHSB(); 
        else                        submitHSB();
    });

    briSlider.addEventListener("input", function(e) {
        brightness = briSlider.value;
        briValueLabel.innerHTML = brightness;
        
        if(rateLimitSwitch.checked) rateLimitedSubmitHSB(); 
        else                        submitHSB();
    });
    
    transmitButton.addEventListener("click", function(e) {
        
        if(rateLimitSwitch.checked) rateLimitedSubmitHSB(); 
        else                        submitHSB();
    });
});

/* experiment with a closure to show the snackbar/toast message.
   https://www.w3schools.com/js/js_function_closures.asp
   Actually I needed this only because I can't seem to access the display or visibility property of the 
   snackbar_dialog div. Suggestions are welcome.
*/

function showSnackbarClosure() {
    
    var snackbarDialogVisibility = false;
    var timeOut = 3500;
    
    function setFalseAgain() {
       //console.log("execute setFalseAgain");
	   snackbarDialogVisibility = false;	
	}
    
    return function( message ){
        
        //console.log("call");
    
        if(snackbarDialogVisibility == false) {
            
            //console.log("execute");
            
            snackbarDialog.MaterialSnackbar.showSnackbar({message: message, timeout: timeOut});

            // set snackbarDialogVisibility to true to prevent triggering again (on slider movements)
            snackbarDialogVisibility = true;
            // make sure we set the visibility to false after the timeOut
            setTimeout(setFalseAgain, timeOut);
        }   
        
    }
}