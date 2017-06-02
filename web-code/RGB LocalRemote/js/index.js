/*  Communicate with Local Webserver on the Photon in Vanilla JS (so no other frameworks like jQuery needed). 
    
    Material Design Light (https://getmdl.io) is used for the layout.
    
    HTML5 input sliders don't really work on touch screens. 
    I've added rangetouch.js (https://rangetouch.com), however that doesn't
    seem to have much effect right now. Maybe it conflict with the Material Design Light code. 
    
    Copyleft 26-05-2017 - http://www.kasperKamperman.com

*/

// no acces_tokens needed because we don't communicate with the Particle Cloud

/* By default we assume you use the example that has the myphoton.local address. 
   Take in account mDNS doesn't always work on windows (installing iTunes might help) in that
   case use the local ip-address of the Photon.
   
   We overwrite this photonServerURL if we have the ip parameter in checkCallURL();
*/
var photonServerURL = "http://myphoton.local/";  

// variables for rate limit
// we set the local limit on 50ms (20 times a second)
var rateLimitTimeStep = 50;
var rateLimitStartTime;
var rateLimitTimeOut;

// Store DOM elements in variables
var hueSlider;
var hueValueLabel;
var satSlider;
var satValueLabel;
var briSlider;
var briValueLabel;
var rateLimitSwitch; 
var transmitButton;
var durationChip;
var snackbarDialog;

var showSnackbar = showSnackbarClosure();

// Store values set with the sliders
var hue;
var saturation;
var brightness;

// --- Functions used to communicate with the Particle Cloud ----------------------------

function ajaxRequest(requestType, url, params, callBackFunction) {
    
    /* You could use jQuery or other libraries. Nonetheless most modern browsers
       support the standard Javascript XMLHttpRequest. 
       Further explanation:
       - https://www.w3schools.com/xml/ajax_xmlhttprequest_response.asp
       - http://www.openjs.com/articles/ajax_xmlhttp_using_post.php
    */
    
    var xhttp = new XMLHttpRequest();

    xhttp.timeout = 1500;
        
    xhttp.ontimeout = function(e) {
        showSnackbar('Is your Particle device online?'); 
    }
    
    xhttp.onreadystatechange = function() {

        //console.log(this.readyState); 
        //console.log(this.status);

        if (this.readyState == 4 && this.status == 200) {
          callBackFunction(this);
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

function postCommand(url, command, callbackFunction) {
    
    var url = photonServerURL+url;
    var params = "cmd="+command;
    //console.log(Math.round(performance.now()) + " - " +url+" - "+params);
    
    ajaxRequest("POST", url, params, callbackFunction);
}

// --- Functions used to transfer our data and receive data ----------------------------

/*  The function submitHSB is called when we move a slider.
    It sends the hue, saturation, brightness data our Particle Cloud function "setHSB".
    On the Particle it's converted to RGB data (and show on the status LED).
    The RGB values are stored in the Cloud variable "getRGB".
    So we can get that string by calling this Particle Variable
    We call  "getRGB" when we got a successfull confirmation of the callBackHSB function.
    When the "getRGB" is returned we use it to change the background color of the card title. 
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
    
    if(Boolean(photonServerURL)) {
        postCommand("sethsb/", command, callBackHSB);    
    }
    else {
        showSnackbar();
    }
        
    //console.log(command);   
}

function callBackHSB(xhttp) {
    
    // we will get a JSON string back, with r, g and b and the time. 
    // we don't need the extra call, with callBackRGB like in the cloud
    
    // the time we have set in subHSB will be returned als integer
    // so we need to parse the return JSON data to get that value back. 
    console.log(xhttp.responseText);
    
    var result = JSON.parse(xhttp.responseText);
    //console.log(result);
    
    // make a string like rgb(255,255,255) for CSS
    var rgbString = "rgb("+result.r+","+result.g+","+result.b+")";
    
    // calculate time difference between the time send and the current time.
    var durationInMillis = Math.round(performance.now()) - parseInt(result.t);
    
    // display it in the durationChip
    durationChip.innerHTML = durationInMillis.toString();
    
    // set the card title background property
    // we added important to override the standard background property in the mdl (material design light) css
    document.getElementById("card_title").style.setProperty ("background-color", rgbString, "important");
    
} 

// --- Functions to check parameters send with the URL ----------------------------

// Function to get passed parameters
// https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript/5158301#5158301
function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

//https://stackoverflow.com/questions/4460586/javascript-regular-expression-to-check-for-ip-addresses
//https://stackoverflow.com/questions/2814002/private-ip-address-identifier-in-regular-expression

function validatePrivateIPaddress(ipaddress) {  
    // test if it's a valid IP    
    if (/^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/.test(ipaddress)) { 
        
        // check if it's an IP in the private ranges
        if (/(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)/.test(ipaddress)) {
           return (true);
        }
           
    } 
    
    return (false);
    
} 

function checkParameters() {
    
    // if we are redirect from a photon itself we 'd like to send our messages to that Photon. 
    // for now we use the ip (this always works) 
    // we use a get, because then we can bookmark our controller
    
    var passedMDNSUrl = getParameterByName('url');
    var passedIP      = getParameterByName('ip');
    
    if(Boolean(passedMDNSUrl) == true) {
        passedMDNSUrl = 'http://'+passedMDNSUrl+'.local/';
    }
    
    if(Boolean(passedIP) == true) {
        
        // prevent sending data to public IP addresses. 
        if(validatePrivateIPaddress(passedIP)) {
            photonServerURL = 'http://'+passedIP+'/';
            console.log(photonServerURL);
        }
        
    }
    
}

// Setup the screen with the right values and addEventListeners.

// MDL 1.3.0 has a bug and doesn't support change in Chrome.
// not really a problem (we use input for realtime update now).
// https://github.com/google/material-design-lite/issues/5064

document.addEventListener("DOMContentLoaded", function(e) {
    
    //range-slider touch fix (doesn't seem to do anything...)
    //https://github.com/sampotts/rangetouch
    window.rangetouch.set("thumbWidth", 32);
    
    // check added parameters to the url
    checkParameters();
    
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
    hueValueLabel.innerHTML = hue        = hueSlider.value;
    satValueLabel.innerHTML = saturation = satSlider.value;
    briValueLabel.innerHTML = brightness = briSlider.value;
    
    // update current values one time
    rateLimitedSubmitHSB(); 
     
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
    var timeOut = 2500;
    
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

