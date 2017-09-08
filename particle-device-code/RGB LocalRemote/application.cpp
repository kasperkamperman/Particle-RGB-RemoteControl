/*
    Example code on how to remote control the RGB led on the Particle Photon.
    It listens to hue (0-359), saturation (0-255), brightness (0-255)
    Copyleft 01-06-2017 - http://www.KasperKamperman.com

    This code runs a local webserver.
    You can either use a re-direct (by default in this code) or host the index_html on this Photon. 
    
    You can reach the Photon through http://<ip-address>/ or going to http://myphoton.local
    Take in account that mDNS (.local) doesn't work always on Windows (installing iTunes
    might help.)

    More in-depth information:
    https://www.kasperkamperman.com/blog/particle-photon-rgb-remote-local/
    https://www.kasperkamperman.com/blog/particle-photon-rgb-remote-cloud/

    Used sources:
    https://www.hackster.io/wgbartley/iot-device-management-with-mdns-and-webduino-93982a
		https://github.com/mrhornsby/spark-core-mdns
		https://github.com/m-mcgowan/Webduino
		https://community.particle.io/t/photon-running-simple-webserver-local-communication/20677/7
*/

// see WebDuino.h for documentation of the defines.
#define WEBDUINO_OUTPUT_BUFFER_SIZE 40
#define WEBDUINO_FAVICON_DATA ""    // no favicon

#include <Particle.h>
#include <MDNS/MDNS.h>
#include <WebDuino.h>

// You can use this mode to only use WiFi and not connect to the Cloud
// of course the local server also works together with the cloud connection.
// not a smart idea to turn the cloud off in case you are using build.particle.io
// SYSTEM_MODE(SEMI_AUTOMATIC);

const String hostname   = "myphoton";
const String remote_url = "http://dev.kasperkamperman.com/localremote/";

// Uncomment the code below if you don't want to use the re-direct. We then host the index_html on the Photon itself.
// We load all the data from webserver externally, so we use as less memory on the Photon as possible. 

// const unsigned char index_html[] =
// "<!DOCTYPE html> <html > <head> <meta charset=\"UTF-8\"> <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
// "<title>Particle Photon RGB LOCAL Remote</title> <script src=\"https://storage.googleapis.com/code.getmdl.io/1.3.0/material.min.js\"></script>"
// "<link rel=\"stylesheet\" href=\"https://storage.googleapis.com/code.getmdl.io/1.3.0/material.grey-amber.min.css\">"
// "<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/icon?family=Material+Icons\">"
// "<link rel=\"stylesheet\" href=\"https://dev.kasperkamperman.com/localremote/css/style.css\">"
// "<script src=\"https://dev.kasperkamperman.com/localremote/js/index_content.js\"></script>"
// "<script src=\"https://dev.kasperkamperman.com/localremote/js/index.js\"></script>"
// "</head> <body>"
// "<script src=\"https://dev.kasperkamperman.com/localremote/js/rangetouch.js\"></script>"
// "</body> </html>";

MDNS mdns;
WebServer webserver("", 80);

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

void webIndex(WebServer &server, WebServer::ConnectionType type, char *, bool) {

    server.httpSeeOther(remote_url + "?url=" + hostname + "&ip=" + (const char*)WiFi.localIP().toString());

    //if you would like to serve the index from the Photon itself. Comment the re-direct line above.
    //and uncomment the two lines below and the index_html[] array (above).
    //server.httpSuccess();
    //server.write(index_html, sizeof(index_html));

}

void parseCmd(WebServer &server, WebServer::ConnectionType type, char *, bool) {

    bool receivedCmd = false;

    if (type == WebServer::POST) {

          bool repeat;
          char name[16], value[32];

      	do
          {
            // readPOSTparam returns false when there are no more parameters
            // to read from the input.  We pass in buffers for it to store
            // the name and value strings along with the length of those
            // buffers.
            repeat = server.readPOSTparam(name, 16, value, 32);

            // this is a standard string comparison function.  It returns 0
            // when there's an exact match.  We're looking for a parameter
            // named args
            if (strcmp(name, "cmd") == 0) {
      		receivedCmd = true;
      		// in the setHSB function we parse the value
      		setHSB(value);
            }

          } while (repeat);

      }

    if(receivedCmd) {
      // reply with the JSON formatted string
      server.httpSuccess("application/json");
    	server.print(rgbTimeString);
    }
    else {
    	server.httpNoContent();
    }

    return;

}

void setup() {

    // de-comment the three lines below and the SYSTEM_MODE(SEMI_AUTOMATIC) line on
    // top if you don't want the Cloud connection. Only do this if you build your applications
    // local (no cloud, is no upload possiblity in build.particle.io)
    // WiFi.on();
    // WiFi.connect(WIFI_CONNECT_SKIP_LISTEN);
    // waitUntil(WiFi.ready);

  	// give your device a local url
  	bool mdns_success = mdns.setHostname(hostname);

  	if(mdns_success) {
  			mdns.addService("tcp", "http", 80, hostname);
  			mdns.begin();
        mdns.processQueries();
  	}

  	// webserver
  	webserver.setDefaultCommand(&webIndex);
  	webserver.addCommand("index.html", &webIndex);
  	webserver.addCommand("sethsb/", &parseCmd);
      // just point to the main page in case of another page call
  	webserver.setFailureCommand(&webIndex);

  	webserver.begin();

}

void loop() {

    mdns.processQueries();

    // default buffer of 32 is enough. if you would like to send
    // more data create a buffer yourself.
    char buff[64];
    int len = 64;
    webserver.processConnection(buff, &len);

    if(RGB.controlled()) {
      RGB.color(red, green, blue);
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
	  int	receivedTime = atoi(token);

	  // directly convert to rgb
	  convertHSBtoRGB();

	  //Convert RGB values to JSON format for easy processing at the browser side
	  sprintf(rgbTimeString,"{\"r\": %u, \"g\": %u, \"b\": %u, \"t\": %u}",red,green,blue,receivedTime);

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
