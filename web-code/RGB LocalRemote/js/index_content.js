// This file is only used if you use the non-redirect version and let the Photon
// serve the index file. 
//
// You need to add slashes en remove white space to embed HTML in Javascript
// http://addslashes.onlinephpfunctions.com
// http://www.textfixer.com/html/compress-html-compression.php 

document.addEventListener("DOMContentLoaded", function(e) {   
    newContent();
});

function newContent() {
      
          document.body.innerHTML = 
          "<div class=\"mdl-layout mdl-js-layout mdl-layout--fixed-header\"> <main class=\"mdl-layout__content\"> <div class=\"mdl-grid\"> <div class=\"mdl-cell mdl-cell--hide-phone mdl-cell--1-col-tablet mdl-cell--3-col-desktop\"> </div> <div class=\"mdl-cell mdl-cell--4-col-phone mdl-cell--6-col-tablet mdl-cell--6-col-desktop\"> <div class=\"mdl-card mdl-shadow--6dp\"> <div id=\"card_title\" class=\"mdl-card__title mdl-color--primary mdl-color-text--white\"> <h2 class=\"mdl-card__title-text\">Particle RGB Local Remote</h2> </div> <div class=\"mdl-card__supporting-text\"> <form action=\"#\"> <div class=\"mdl-textfield mdl-js-textfield\"> <p> <label class=\"slider-label\">Hue:</label> <label id=\"hue_value\" class=\"slider-value\"></label> </p> <input id=\"hue_slider\" class=\"mdl-slider mdl-js-slider\" type=\"range\" min=\"0\" max=\"359\" value=\"65\"> </div> <div class=\"mdl-textfield mdl-js-textfield\"> <p> <label class=\"slider-label\">Saturation:</label> <label id=\"sat_value\" class=\"slider-value\"></label> </p> <input id=\"sat_slider\" class=\"mdl-slider mdl-js-slider\" type=\"range\" min=\"0\" max=\"255\" value=\"255\"> </div> <div class=\"mdl-textfield mdl-js-textfield\"> <p> <label class=\"slider-label\">Brightness:</label> <label id=\"bri_value\" class=\"slider-value\"></label> </p> <input id=\"bri_slider\" class=\"mdl-slider mdl-js-slider\" type=\"range\" min=\"0\" max=\"255\" value=\"255\"> </div> <div class=\"mdl-textfield mdl-js-textfield\"> <label for=\"switch1\" class=\"mdl-switch mdl-js-switch\"> <input type=\"checkbox\" id=\"switch1\" class=\"mdl-switch__input\" checked> <span class=\"mdl-switch__label\">rate limit off/on</span> </label> </div> </form> </div> <div class=\"mdl-card__actions mdl-card--border\"> <button id=\"transmit\" class=\"mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect\">Transmit</button> <span class=\"mdl-chip\"> <span class=\"mdl-chip__text\">Duration :&nbsp;</span> <span id=\"duration_chip\" class=\"mdl-chip__text\">0</span> <span class=\"mdl-chip__text\">&nbsp;milliseconds</span> </span> </div> </div> </div> <div class=\"mdl-cell mdl-cell--hide-phone mdl-cell--1-col-tablet mdl-cell--3-col-desktop\"> </div> </div> </main> </div> <div id=\"snackbar_dialog\" class=\"mdl-js-snackbar mdl-snackbar\"> <div class=\"mdl-snackbar__text\"></div> <button class=\"mdl-snackbar__action\" type=\"button\"></button> </div>"
      
}