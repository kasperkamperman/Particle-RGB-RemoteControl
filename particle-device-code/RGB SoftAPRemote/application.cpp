/*
    Example code on how to remote control the RGB led on the Particle Photon
    with the SoftAP.
    It listens to hue (0-359), saturation (0-255), brightness (0-255)
    Copyleft 25-04-2018 - http://www.KasperKamperman.com

    This code uses build in SoftAP Webserver to serve a webpage to control
    to RGB led. This means that the Photon never connects to the cloud and
    is always in "listen" mode. See other alternatives if you'd like to connect to
    the cloud

    More in-depth information on other control options:
    https://www.kasperkamperman.com/blog/particle-photon-rgb-remote-local/
    https://www.kasperkamperman.com/blog/particle-photon-rgb-remote-cloud/

    Used sources:
    https://docs.particle.io/reference/firmware/photon/#softap-http-pages
    https://community.particle.io/t/webpages-on-photon-softap/13314/90
    https://jscompress.com
    https://cssminifier.com
    http://addslashes.onlinephpfunctions.com

*/

#include <Particle.h>
#include "softap_http.h"

SYSTEM_THREAD(ENABLED);
SYSTEM_MODE(MANUAL);

int hue;
int saturation;
int brightness;

int red;
int green;
int blue;

// store red, green and blue in a character array
// we added time in this version
// because in local host we respond directly with this string.
char rgbTimeString[43];

// pre-declare functions
void setHSB(char*);
void convertHSBtoRGB();
void myPage(const char*, ResponseCallback*, void*, Reader*, Writer*, void*);

struct Page
{   const char* url;
    const char* mime_type;
    const char* data;
};

const char index_html[] = "<!DOCTYPE html> <html> <head> <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> <link rel=\'stylesheet\' type=\'text/css\' href=\'style.css\'> </head> <body id=\"body\"> <h1>RGB Control</h1> <div class=\"slidecontainer\"> <label for=\"h\">Hue</label> <div class=\"range\"> <input class=\"sldr\" type=\"range\" min=\"1\" max=\"359\" value=\"0\" id=\"h\"> </div> <label for=\"s\">Saturation</label> <div class=\"range\"> <input class=\"sldr\" type=\"range\" min=\"1\" max=\"255\" value=\"255\" id=\"s\"> </div> <label for=\"b\">Brightness</label> <div class=\"range\"> <input class=\"sldr\" type=\"range\" min=\"1\" max=\"255\" value=\"255\" id=\"b\"> </div> </div> <script src=\'script.js\'></script> </body> </html>";

const char style_css[] = "body{-webkit-font-smoothing:antialiased;background-color:#ddd;font-family:Roboto,Arial,sans-serif}.slidecontainer{width:100%;-webkit-user-select:none;user-select:none}.slidecontainer label{display:inline-block;margin-bottom:0;padding:5px 10px;font-size:12px;font-size:.75rem;font-weight:600;text-transform:uppercase}.range{margin:10px 0;padding:15px;background:rgba(52,63,74,.25)}.range,.slidecontainer label{background:rgba(52,63,74,.25);border-radius:100px;-webkit-box-shadow:inset 0 1px 1px rgba(52,63,74,.1),0 1px 0 rgba(255,255,255,.15);box-shadow:inset 0 1px 1px rgba(52,63,74,.1),0 1px 0 rgba(255,255,255,.15)}input[type=range]{-webkit-appearance:none;width:100%;height:10px;border-radius:10px;background:#d3d3d3;outline:0}input[type=range]:focus{outline:0}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:30px;height:30px;border-radius:50%;background:#000;cursor:pointer}.container{display:block;position:relative;padding-left:35px;margin-bottom:12px;cursor:pointer;font-size:22px}";

const char script_js[] = "document.addEventListener(\"DOMContentLoaded\",function(t){var e,n,o=\"192.168.0.1/set/\",r=[0,255,255];function u(t){var e=JSON.parse(t.responseText),n=(e.r,e.g,e.b,function(t,e,n,o){o=s(o,-255,255);var t=s(t+o,0,255),e=s(e+o,0,255),n=s(n+o,0,255);return\"rgb(\"+t+\",\"+e+\",\"+n+\")\"}(e.r,e.g,e.b,8));document.getElementById(\"body\").style.setProperty(\"background-color\",n,\"important\")}function a(t){return function(){var a,s,i;r[t]=n[t].value,a=o,s=r,i=u,(e=new XMLHttpRequest).timeout=4e3,e.ontimeout=function(t){},e.onreadystatechange=function(){4==this.readyState&&200==this.status&&i(this)},e.open(\"GET\",a+\"?\"+s,!0),e.send()}}function s(t,e,n){return t>e?t<n?t:n:e}!function(){n=document.getElementsByClassName(\"sldr\");for(var t=0;t<n.length;t++)n[t].addEventListener(\"input\",a(t))}()});";

Page myPages[] = {
     { "/index.htm", "text/html", index_html },
     { "/style.css", "text/css", style_css },
     { "/script.js", "application/javascript", script_js },
     { nullptr }
};

STARTUP(softap_set_application_page_handler(myPage, nullptr));

// brightness perception of the eye is not linair.
// so we use a LookUpTable to for the correct eye response.
// https://gist.github.com/kasperkamperman/3c3f72208366ed885f2f
const uint8_t luminanceLUT[] = {
  0,   0,   0,   0,   0,   0,   0,   0,   1,   1,   1,   1,   1,   1,   1,   1,
  1,   1,   2,   2,   2,   2,   2,   2,   2,   2,   2,   3,   3,   3,   3,   3,
  3,   3,   4,   4,   4,   4,   4,   5,   5,   5,   5,   5,   6,   6,   6,   6,
  6,   7,   7,   7,   7,   8,   8,   8,   8,   9,   9,   9,   10,  10,  10,  11,
  11,  11,  12,  12,  12,  13,  13,  13,  14,  14,  14,  15,  15,  16,  16,  16,
  17,  17,  18,  18,  19,  19,  20,  20,  21,  21,  22,  22,  23,  23,  24,  24,
  25,  25,  26,  26,  27,  28,  28,  29,  29,  30,  31,  31,  32,  33,  33,  34,
  35,  35,  36,  37,  37,  38,  39,  40,  40,  41,  42,  43,  44,  44,  45,  46,
  47,  48,  49,  49,  50,  51,  52,  53,  54,  55,  56,  57,  58,  59,  60,  61,
  62,  63,  64,  65,  66,  67,  68,  69,  70,  71,  72,  73,  75,  76,  77,  78,
  79,  80,  82,  83,  84,  85,  87,  88,  89,  90,  92,  93,  94,  96,  97,  99,
  100, 101, 103, 104, 106, 107, 108, 110, 111, 113, 114, 116, 118, 119, 121, 122,
  124, 125, 127, 129, 130, 132, 134, 135, 137, 139, 141, 142, 144, 146, 148, 149,
  151, 153, 155, 157, 159, 161, 162, 164, 166, 168, 170, 172, 174, 176, 178, 180,
  182, 185, 187, 189, 191, 193, 195, 197, 200, 202, 204, 206, 208, 211, 213, 215,
  218, 220, 222, 225, 227, 230, 232, 234, 237, 239, 242, 244, 247, 249, 252, 255
};

void setup() {

    WiFi.on();
    WiFi.listen();

}

void loop() {

    if(RGB.controlled()) {
      RGB.color(red, green, blue);
    }
}

void myPage(const char* url, ResponseCallback* cb, void* cbArg, Reader* body, Writer* result, void* reserved) {

    String urlString = String(url);
    //Serial.printlnf("handling page %s", url);
    //char* data = body->fetch_as_string();
    //Serial.println(String(data));
    //free(data);

    if (strcmp(url,"/index")==0) {
        Serial.println("sending redirect");
        Header h("Location: /index.htm\r\n");
        cb(cbArg, 0, 301, "text/plain", &h);
        return;
    }

   if (urlString.indexOf("/set") != -1) {

        //Header h("Location: /set\r\n");
        cb(cbArg, 0, 200, "application/json", nullptr);

        //Serial.println(urlString);
        int queryIndex = urlString.indexOf('?');

        String secondValue = urlString.substring(queryIndex + 1);
        //Serial.println(secondValue);

        char inputCharArray[16];
        secondValue.toCharArray(inputCharArray,16);

        setHSB(inputCharArray);

        result->write(rgbTimeString);

        return;
    }

    int8_t idx = 0;
    for (;;idx++) {
        Page& p = myPages[idx];
        if (!p.url) {
            idx = -1;
            break;
        }
        else if (strcmp(url, p.url)==0) {
            break;
        }
    }

    if (idx==-1) {
        cb(cbArg, 0, 404, nullptr, nullptr);
        //Header h("Location: /index.html\r\n");
        //cb(cbArg, 0, 301, "text/plain", &h);
    }
    else {
        cb(cbArg, 0, 200, myPages[idx].mime_type, nullptr);
        result->write(myPages[idx].data);
    }
}

void setHSB(char * inputCharArray) {

    // http://www.cplusplus.com/reference/cstring/strtok/
	  char *token = strtok(inputCharArray,",");

    // atoi converts a string to int
	  // constrain makes sure the value stays in the right range
    // strtok breaks string in apart based on the set delimiter (,)
	  hue        = constrain(atoi(token),0,359);
    token      = strtok(NULL,",");

    saturation = constrain(atoi(token),0,255);
    token      = strtok(NULL,",");

    brightness = constrain(atoi(token),0,255);
    token      = strtok(NULL,",");

    // store the time variable
	  //int	receivedTime = atoi(token);

	  // directly convert to rgb
	  convertHSBtoRGB();

	  //Convert RGB values to JSON format for easy processing at the browser side
	  sprintf(rgbTimeString,"{\"r\": %u, \"g\": %u, \"b\": %u}",red,green,blue);//,receivedTime);

    //Serial.print("rgbTimeString : ");
    //Serial.println(rgbTimeString);

	  // if we don't have control yet over the RGB led
	  // take control
	  if(RGB.controlled() == false) {
		    RGB.control(true);
	  }

}

// Slightly modified:
// https://www.kasperkamperman.com/blog/arduino/arduino-programming-hsb-to-rgb/
void convertHSBtoRGB() {
  // convert hue, saturation and brightness ( HSB/HSV ) to RGB

  int base;

  if (saturation == 0) { // Acromatic color (gray). Hue doesn't mind.
    red   = brightness;
    green = brightness;
    blue  = brightness;
  }
  else {

    base = ((255 - saturation) * brightness)>>8;

    switch(hue/60) {

        case 0:
            red   = brightness;
            green = (((brightness-base)*hue)/60)+base;
            blue  = base;
        break;

        case 1:
            red   = (((brightness-base)*(60-(hue%60)))/60)+base;
            green = brightness;
            blue  = base;
        break;

        case 2:
            red   = base;
            green = brightness;
            blue  = (((brightness-base)*(hue%60))/60)+base;
        break;

        case 3:
            red   = base;
            green = (((brightness-base)*(60-(hue%60)))/60)+base;
            blue  = brightness;
        break;

        case 4:
            red   = (((brightness-base)*(hue%60))/60)+base;
            green = base;
            blue  = brightness;
        break;

        case 5:
            red   = brightness;
            green = base;
            blue  = (((brightness-base)*(60-(hue%60)))/60)+base;
        break;

    }
  }

  // brightness curve correction through LookUpTable
  red   = luminanceLUT[red];
  green = luminanceLUT[green];
  blue  = luminanceLUT[blue];

}
