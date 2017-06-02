/*
    Example code on how to remote control the RGB led on the Particle Photon.
    It listens to hue (0-359), saturation (0-255), brightness (0-255)
    Copyleft 01-06-2017 - http://www.KasperKamperman.com

    More in-depth information:
    https://www.kasperkamperman.com/blog/particle-photon-rgb-remote-local/
    https://www.kasperkamperman.com/blog/particle-photon-rgb-remote-cloud/

*/

#include "Particle.h"

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
char rgbString[43];

// pre-declare functions
int setHSB(String command);
void convertHSBtoRGB();

void setup() {
    Serial.begin(57600);
	Particle.function("setHSB", setHSB);
	Particle.variable("getRGB", rgbString);
}

void loop() {
	if(RGB.controlled()) {
		RGB.color(red, green, blue);
	}
}

// Particle Cloud Function
int setHSB(String command) {

	if(command != NULL) {

		// a buffer of 32 characters will do
		char inputCharArray[32];
	    command.toCharArray(inputCharArray,32);

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

		// and create a JSON formated string
		// we can get this with the getRGB variable
		// https://community.particle.io/t/using-spark-publish-with-simple-json-data/3469
		sprintf(rgbString,"{\"r\": %u, \"g\": %u, \"b\": %u}",red,green,blue);         //Convert RGB values to JSON format for easy processing.

	    //Serial.print("rgbTimeString : ");
	    //Serial.println(rgbTimeString);

		// if we don't have control yet over the RGB led
		// take control
		if(RGB.controlled() == false) {
			RGB.control(true);
		}

		// we return the time we have sent this from the browser.
		// so we can measure how long it takes.
		return receivedTime;
	}
	else {
		return -1;
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
