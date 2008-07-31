function toggle(div) {
document.getElementById(div).className = 'button_selected';
document.getElementById('plate').className = div;
}
function free(a, b, c){
document.getElementById(a).className = 'button';
document.getElementById(b).className = 'button';
document.getElementById(c).className = 'button';
}
function $()
{
  var elements = new Array();
  for (var i = 0; i < arguments.length; i++)
  {
    var element = arguments[i];
    if (typeof element == 'string')
      element = document.getElementById(element);
    if (arguments.length == 1)
      return element;
    elements.push(element);
  }
  return elements;
}

function system(input) {
netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect"); 
var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
file.initWithPath("/usr/local/bin/jswrapper");
var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
process.init(file);
var args = [input];
process.run(false, args, 1);

}

function update() {

sleep(50);

netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect"); 
var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
file.initWithPath("/tmp/jswrapper.log");

var data = "";
document.getElementById('info').innerHTML = "";
var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
var sstream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
fstream.init(file, -1, 0, 0);
sstream.init(fstream); 

var str = sstream.read(4096);
while (str.length > 0) {
  data += str;
  str = sstream.read(4096);
}

sstream.close();
fstream.close();

document.getElementById('info').innerHTML = data;
}

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

function confirm_off() {
tmp = window.confirm('Do you want to shutdown?'); 
if (tmp) { system('sudo poweroff -f'); }
}
