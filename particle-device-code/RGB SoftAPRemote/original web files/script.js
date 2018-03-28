document.addEventListener('DOMContentLoaded', function(e) {
    
    var url = '192.168.0.1/set/';
    // hue, saturation, bright
    var params = [0, 255, 255];
    
    var xhttp;

    function getRequest(url, params, callBackFunction) {

        xhttp = new XMLHttpRequest();

        xhttp.timeout = 4000;

        xhttp.ontimeout = function(e) {
            //console.log('Time Out'); 
        }

        xhttp.onreadystatechange = function() {

            if (this.readyState == 4) {
                if (this.status == 200) {
                    callBackFunction(this);
                }
            }
        };

        xhttp.open("GET", url+"?"+params, true);
        xhttp.send();
    }    

    function callBack(xhttp) {

        // The getRGB variable is a a JSON formated String
        // This is the most easy to parse (easier then comma seperated), with standard JS functions.

        //console.log(xhttp.responseText);

        var result = JSON.parse(xhttp.responseText);
        //console.log(result);

        // make a string like rgb(255,255,255) for CSS
        var rgbString = "rgb("+result.r+","+result.g+","+result.b+")";
        
        var backgroundRGBString = lightenDarkenColor(result.r,result.g,result.b, 8);
  
        document.getElementById("body").style.setProperty ("background-color", backgroundRGBString, "important");
        
        //https://www.quirksmode.org/dom/w3c_css.html    
        //document.styleSheets[0].deleteRule(0);
        //document.styleSheets[0].insertRule('input[type=range]::-webkit-slider-thumb { background-color:' + rgbString + ' !important; }', 0);
        
    }
       
    var sliderArr;
    
    // https://www.sitepoint.com/community/t/addeventlistener-and-closures/41044
    (function init(){    
        sliderArr = document.getElementsByClassName('sldr');
        
        for(var i=0; i<sliderArr.length; i++) {
            sliderArr[i].addEventListener('input', sliderHandler(i));
        }
        
    })();
    
    function sliderHandler(n) {
        return function() {
            params[n] = sliderArr[n].value;
            //console.log(params.join());
            getRequest(url, params, callBack);
        }
    }
    
    //https://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
    function lightenDarkenColor(r,g,b,amt) {

        amt = maxmin(amt, -255, 255);

        var r = maxmin(r + amt, 0, 255);
        var g = maxmin(g + amt, 0, 255);
        var b = maxmin(b + amt, 0, 255);

        return "rgb("+r+","+g+","+b+")";
    }

    function maxmin(val, min, max) {
        if (val > min) {
          if (val < max) {
            return val;
          } else return max;
        } else return min
    }
    
});    