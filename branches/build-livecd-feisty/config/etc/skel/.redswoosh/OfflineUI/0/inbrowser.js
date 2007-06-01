/////////////////////////////////////////////////////////////////////////////
//
// inbrowser.js
// Updated: Apr 2007
// Copyright 2007, Red Swoosh (http://www.redswoosh.net)
// 
/////////////////////////////////////////////////////////////////////////////

var tm;
scripts = new Array(); // DON'T ADD 'var'! Variables declared with var can't be cleaned up with the 'delete' operator.
var timeout;

function cleanUpScripts(){
	var temp = new Array();
	var t = new Date();
	var now = t.getTime();
	for(var i = 0; i < scripts.length; i++){
		if(scripts[i].creationTime + 10000 > now) temp.push(scripts[i]);
		else scripts[i].parentNode.removeChild(scripts[i]);
		scripts[i] = null;
	}
	delete(scripts);
	scripts = temp;
}

function createScript(src){
	var s = document.createElement("script");
	s.setAttribute("type", "text/javascript");
	s.setAttribute("src", src);
	var t = new Date();
	s.creationTime = t.getTime();
	document.getElementsByTagName("HEAD")[0].appendChild(s);
	scripts.push(s);
}

function requestFileAttributes(url, isLong){
	var l = "short";
	if(isLong) l = "long";
	var r = Math.random();
	var request = "http://127.0.0.1:9421/jsio?r=" + r + "&f=getfileattributes&i=2&c=getFileAttributes&h=0&a0=" + url + "&a2=" + l;
	createScript(request);
}

function requestFileList(t){
	var r = Math.random();
	var request = "http://127.0.0.1:9421/jsio?r=" + r + "&f=getfilelist&i=2&c=getFileList&h=0";
	if(t) request += "&a0=" + t;
	createScript(request);
}

function requestTorrentList(){
	var r = Math.random();
	var request = "http://127.0.0.1:9421/jsio?r=" + r + "&f=gettorrentattributes&i=2&c=getTorrentList&h=0";
	createScript(request);
}

function getTorrentList(torrents){
	
	// Iterate across each torrent in the list returned by the client.
	var found = false;
	for(t in torrents){
		found = true;
		// Add each torrent to our master list of torrents in our Torrent manager. If the torrent already exists,
		// it will not be added twice. Instead, a reference to the already existing torrent object will be returned.
		var torrent = tm.addTorrent(t);
				
		// We update the attributes for this torrent.
		torrent.updateAttributes(
			torrents[t]["rs_download"],
			torrents[t]["rs_totalselecteduniquerecv"],
			torrents[t]["rs_totalselectedsize"],
			torrents[t]["rs_error"],
			torrents[t]["rs_name"],
			torrents[t]["rs_peers"],
			torrents[t]["rs_collapsed"]
		);
		
		// For torrents that aren't collapsed, we need to update their file lists.
		if(!torrent.collapsed) requestFileList(t);
	}
	if( !found )
	{
		// Advise the user they have no downloads and what to do
		$("note").innerHTML = "<br><br>You have no downloads. <a href=\"http://www.foxtorrent.com/exampledownloads\">You can find some here.</a>";
		$("note").show();
	}
	else
	{
		// Hide note if found one
		if( $("note").innerHTML == "<br><br>You have no downloads. <a href=\"http://www.foxtorrent.com/exampledownloads\">You can find some here.</a>" )
			$("note").hide( );
	}
}

function requestRSAttribute(attr){
	var r = Math.random();
	var request = "http://127.0.0.1:9421/jsio?r=" + r + "&f=getattribute&i=2&c=getRSAttribute&h=0&a0=" + attr;
	createScript(request);
}

function setTorrentAttribute(turl, attr, val){
	var r = Math.random();
	var request = "http://127.0.0.1:9421/jsio?r=" + r + "&f=settorrentattribute&i=2&c=trash&h=0&a0=" + turl + "&a1=" + attr + "&a2=" + val;
	createScript(request);
}

function trash(){ /* does nothing. */ }

function getRSAttribute(attrname, attrval){
	if(attrname == "rs_downloadrate")
	{
		if( attrval < 1024 ) attrval = 0;
		$("RS_DOWNLOAD_RATE").innerHTML = scaleBytes(attrval) + "/Sec";
	}
	else if(attrname == "rs_sharerate")
	{
		if( attrval < 1024 ) attrval = 0;
		$("RS_SHARE_RATE").innerHTML = scaleBytes(attrval) + "/Sec";
	}
	else if(attrname == "rs_downloadingtorrentfile" && attrval == true  ) { $("note").innerHTML = "Downloading Torrent File..."; $("note").show(); }
 	else if(attrname == "rs_downloadingtorrentfile" && attrval == false && $("note").innerHTML == "Downloading Torrent File..." ) { $("note").innerHTML = ""; $("note").hide(); }
	else if(attrname == "rs_isOnline" && attrval == false ){
		$("note").innerHTML = "You are offline. Please check your internet connection.";
		$("note").show();
	}
	else if(attrname == "rs_isOnline" && $("note").innerHTML == "You are offline. Please check your internet connection." && attrval == true ){
		$("note").hide();
	}
	clearTimeout( timeout );
	if( $("note").innerHTML.indexOf( "Lost Connection" ) != -1 ) $("note").hide();
}

function getFileAttributes(url, isLong, attr){

	var fileRow = tm.getTorrent(url.replace(/torrents\/([^\/]*)\/.*$/, "torrents/$1/")).getFile(url);
	
	fileRow.setEnabled(attr["rs_download"]);
	fileRow.setName(attr["rs_name"]);
	fileRow.setPeers(attr['rs_numtorrentpeers'], attr['rs_numswooshpeers']);
	fileRow.setPercentComplete(attr["rs_uniquerecv"] / attr["rs_size"]);
	fileRow.setLocalURL(attr["rs_localurl"]);
	fileRow.setSize(attr["rs_size"]);
	fileRow.setStatus(attr["rs_status"]);
}

function getFileList(list){
	var updates = new Array();
	var count = 0;
	var allComplete = true;
	for(url in list){
		var torrent = tm.getTorrent(url.replace(/torrents\/([^\/]*)\/.*$/, "torrents/$1/"));
		var file = torrent.addFile(url);
		if(file.status != list[url] || list[url] == "DOWNLOADING") requestFileAttributes(url, true);
		if( !file.isComplete ) allComplete = false;
		count++;
	}
	if( count == 1 ) file.controlCell.checkBox.style.visibility = "hidden";	
	if( allComplete || count == 1 ) torrent.hideCheckbox = true;
}

// Initialize the RS Client on page load.
Event.observe(window, 'load',function(){
	redswooshInitialize(function(s){
		$("note").hide();
		tm = new TorrentManager();
		mainLoop();
	}, 0, 2);
});

// Initailizes page elements and such.
Event.observe(window, "load", function(){
	
	// Register handler for the "open download folder" button.
	$("openFolderButton").onclick = function(){
		rsInternal_executeJSIOCall(2, "OpenTorrentFolder", function(s){if(!s) alert("Error: Couldn't open download folder.");}, 0);
	}
});

function mainLoop(){
	cleanUpScripts();
	requestRSAttribute("rs_downloadrate");
	requestRSAttribute("rs_sharerate");
	requestRSAttribute("rs_downloadingtorrentfile");
	requestRSAttribute("rs_isOnline");
	requestTorrentList();
	setTimeout(mainLoop, 2250);
	timeout = setTimeout(lostClient, 15000);
}

function lostClient()
{
	$("note").innerHTML = "Lost Connection to Red Swoosh client.";
	$("note").show()
}

//#####################################################################################################################
//################################################ ControlCell Class ##################################################
//#####################################################################################################################

var ControlCell = Class.create();
ControlCell.prototype = {
	
	initialize: function(p) {
		this.cell = document.createElement("td");
		this.parentObj = p;
		this.cell.addClassName("ControlCell");
				
		this.checkBox = document.createElement("input");
		this.checkBox.setAttribute("type", "checkbox");
		this.checkBox.setAttribute("title", "Do/Don't download this file");
		this.checkBox.setAttribute("id", "file" + this.parentObj.fileNumber);
		if(this.parentObj.enabled) this.checkBox.setAttribute("checked", "true");
		Event.observe(this.checkBox, 'click', this.clicked.bind(this));
		this.cell.appendChild(this.checkBox);
		this.update();
	},
	
	clicked: function(){		
		this.parentObj.enabled = !this.parentObj.enabled;
		var url = this.parentObj.url;
		if(this.parentObj.enabled) rsInternal_executeJSIOCall(2, "SetFileAttribute", function(){}, 0, url, "rs_download", true);
		else rsInternal_executeJSIOCall(2, "SetFileAttribute", function(){}, 0, url, "rs_download", false);

		this.update();
		this.parentObj.statusCell.update();
		this.parentObj.parentObj.updateCheckBox();
	},
	
	update: function(){
		if(this.parentObj.enabledValid){
			if(this.parentObj.enabled) this.checkBox.checked = true;
			else this.checkBox.checked = false;
			if(this.parentObj.isComplete) this.checkBox.setAttribute("disabled", true);
			else this.checkBox.removeAttribute("disabled");
		}
	}
};

//#####################################################################################################################
//################################################# OpenCell Class ####################################################
//#####################################################################################################################

var OpenCell = Class.create();
OpenCell.prototype = {
	
	initialize: function(p) {
		this.cell = document.createElement("td");
		Element.extend(this);
		this.parentObj = p;
		this.cell.addClassName("OpenCell");
		
		this.openButton = document.createElement("input");
		this.openButton.setAttribute("type", "button");
		this.openButton.setAttribute("Value", "Open");
		this.openButton.setAttribute("title", "Click to open the file");
		Event.observe(this.openButton, 'click', function() {this.clicked()}.bind(this));
		this.openButton.hide();
		this.cell.appendChild(this.openButton);
		
		this.update();
	},
	
	update: function(){
		if(this.parentObj.percentComplete > 0) this.openButton.show();
		if(isMediaFile(this.parentObj.fileName)){
			this.openButton.removeAttribute("disabled");
			if(this.parentObj.isComplete){
                this.openButton.setAttribute("value", "Play");
                this.openButton.setAttribute("title", "Play the file");
            }
			else {
                this.openButton.setAttribute("value", "Stream");
                this.openButton.setAttribute("title", "Play the file while it is still downloading!");
            }
		}
		else{
			this.openButton.setAttribute("value", "Open");
			if(this.parentObj.isComplete) this.openButton.removeAttribute("disabled");
			else this.openButton.setAttribute("disabled", true);
		}
	},
	
	clicked: function(){
		if(this.parentObj.url.match(/\.avi$/i)) window.location = "player.html?url=" + this.parentObj.localURL;
        else if(this.parentObj.url.match(/\.mp3$/i))
        {
            // Play inpage!
            $("note").innerHTML = "<embed width=300 height=27 autoPlay=true src=\"http://video.google.com/googleplayer.swf?autoPlay=true&audioUrl=" + this.parentObj.localURL + "\" ></embed>";
            $("note").show();
        }
		else rsInternal_executeJSIOCall(2, "PlayFile", function(s){if(!s)alert("No application is registered with this filetype. \nPlease register this filetype with an application." )}, 0, this.parentObj.url);
	}
};

//#####################################################################################################################
//################################################# NameCell Class ####################################################
//#####################################################################################################################

var NameCell = Class.create();
NameCell.prototype = {
	parentObj: null,
	cell: null,
	
	initialize: function(p) {
		this.parentObj = p;
		this.cell = document.createElement("td");
		this.content = document.createElement("label");
		this.content.setAttribute("for", "file" + this.parentObj.fileNumber);
		this.cell.appendChild(this.content);	
		this.cell.addClassName("NameCell");
		this.update();
	},
	
	update: function(){
		var tname = this.parentObj.fileName;
		if(tname.length > 50){
			tname = tname.substr(0,25) + "&hellip;" + tname.substr(-25, 25);
			this.content.setAttribute("title", this.parentObj.fileName);
		}
		else this.content.setAttribute("title", "");
		this.content.innerHTML = tname;
	}
};

//#####################################################################################################################
//############################################## StatusCell Class #####################################################
//#####################################################################################################################

var StatusCell = Class.create();
StatusCell.prototype = {
	
	initialize: function(p) {
		this.cell = document.createElement("td");
		Element.extend(this);
		this.parentObj = p;
		this.cell.addClassName("StatusCell");
		this.update();
	},

	update: function(){
		var qp = "Queued";
		if(!this.parentObj.parentObj.download) qp = "Paused";		
		if(this.parentObj.isComplete) this.cell.innerHTML = "Complete";
		else if(this.parentObj.isDownloading) this.cell.innerHTML = "Downloading";
		else if(this.parentObj.enabled) this.cell.innerHTML = qp;
		else this.cell.innerHTML = "";		
		if(this.parentObj.status.match(/DISK/i)) this.cell.innerHTML = "Disk Full";
	}
};

//#####################################################################################################################
//############################################## ProgressCell Class ###################################################
//#####################################################################################################################

var ProgressCell = Class.create();
ProgressCell.prototype = {
	initialize: function(p) {
		this.parentObj = p;
		this.cell = document.createElement("td");

		this.cell.addClassName("ProgressCell");
			
		this.bgText = document.createElement("div");
		this.container = document.createElement("div");
		this.fgText = document.createElement("div");
		this.progressBar = document.createElement("div");
		
		this.bgText.addClassName("ProgressBGText");
		this.container.addClassName("ProgressContainer");
		this.fgText.addClassName("ProgressFGText");
		this.progressBar.addClassName("ProgressBar");

		this.cell.appendChild(this.container);
		this.progressBar.appendChild(this.fgText);
		this.container.appendChild(this.bgText);
		this.container.appendChild(this.progressBar);
		
		this.update();
	},
	
	update: function(){
		var base = this.parentObj.percentComplete;
		if(isNaN(base)) base = 0;
		fPercent = Math.round(base * 10000) / 100;
		if(fPercent > 100) fPercent = 100; // Shouldn't need to be here.
		this.progressBar.style.width = fPercent + "%";
		this.bgText.innerHTML = this.fgText.innerHTML = fPercent + "%";
	}
};

//#####################################################################################################################
//################################################# SizeCell Class ####################################################
//#####################################################################################################################

var SizeCell = Class.create();
SizeCell.prototype = {
	parentObj: null,
	cell: null,
	
	initialize: function(p) {
		this.cell = document.createElement("td");
		Element.extend(this);
		this.parentObj = p;
		this.cell.addClassName("SizeCell");
		this.update();
	},
	
	update: function(){
		var units = new Array("Bytes", "KB", "MB", "GB", "TB");
		var unit = 0;
		var scaled = this.parentObj.size;
		while(scaled > 1024 && unit < units.length){
			scaled /= 1024;
			unit++;
		}
		this.cell.innerHTML = scaleBytes(this.parentObj.size);
	}
};

//#####################################################################################################################
//################################################# FileRow Class #####################################################
//#####################################################################################################################

var FileRow = Class.create();
FileRow.prototype = {
	
	// class variable, each row gets a new variable.
	count: 0,
	
	initialize: function(p, newURL) {
		
		this.isDownloading = false;
		this.isComplete = false;
		this.fileName = "";
		this.percentComplete = 0;
		this.speed = 0;
		this.peers = 0;
		this.size = 0;
		this.url = "";
		this.localURL = "";
		this.valid = true; // false when deleted.
		this.isTorrent = true;
		this.enabled = false;
		this.enabledValid = false;
		this.dltorrent = false;
		this.status = "";
		
		// class variable simulation.
		this.fileNumber = FileRow.prototype.count++;
		
		Element.extend(this);
		this.parentObj = p;
		this.url = newURL;
		this.row = document.createElement("tr");
		
		this.controlCell = new ControlCell(this);
		this.openCell = new OpenCell(this);
		this.nameCell = new NameCell(this);
		this.statusCell = new StatusCell(this);
		this.progressCell = new ProgressCell(this);
		this.sizeCell = new SizeCell(this);
		
		this.row.appendChild(this.controlCell.cell);
		this.row.appendChild(this.nameCell.cell);
		this.row.appendChild(this.sizeCell.cell);
		this.row.appendChild(this.statusCell.cell);
		
		this.row.appendChild(this.progressCell.cell);
		this.row.appendChild(this.openCell.cell);
	},
	
	setDLTorrent: function(dl){
		if(dl) this.dltorrent = true;
		else this.dltorrent = false;
		this.parentObj.paused = !this.dltorrent;
	},
	
	setName: function(name){
		if(name != this.fileName){
			this.fileName = name;
			this.nameCell.update();
		}
	},
	
	setDownloading: function(downloading){
		if(downloading != this.isDownloading){
			this.isDownloading = downloading;
			this.controlCell.update();
			this.statusCell.update();
			this.openCell.update();
		}
	},
	
	setComplete: function(complete){
		if(complete != this.isComplete){
			this.isComplete = complete;
			this.controlCell.update();
			this.statusCell.update();
			this.openCell.update();
		}
	},
	
	setPercentComplete: function(percent){
		if(percent != this.percentComplete){
			current = this.percentComplete;
			this.percentComplete = percent;
			this.progressCell.update();
			this.openCell.update();
		}
	},
	
	setSpeed: function(newspeed){
		if(newspeed != this.speed){
			this.speed = newspeed;
			this.speedCell.update();
		}
	},
	
	setPeers: function(s, t){
		if(isNaN(s)) s = 0;
		if(isNaN(t)) t = 0;
		this.peers = Number(t) + Number(s);
	},
	
	setSize: function(newsize){
		if(newsize != this.size){
			this.size = newsize;
			this.sizeCell.update();
		}
	},
	
	setLocalURL: function(newurl){
		if(newurl != this.localURL){
			this.localURL = newurl;
		}
	},
	
	hide: function(){
		this.row.hide();
	},
	
	show: function(){
		this.row.show();
	},
	
	setEnabled: function(e){
		this.enabledValid = true;
		this.enabled = e;
		this.controlCell.update();
		this.statusCell.update();
	},
	
	setStatus: function(s){
			if(s && this.status != s){
			this.status = s;
			if(s == "DOWNLOADING") this.setDownloading(true);
			if(s.match(/PAUSED|COMPLETE|WAITING/)) this.setDownloading(false);
			if(s == "COMPLETE") this.setComplete(true);
			if(s == "INSUFFICIENTDISKSPACE"){}
			this.statusCell.update();
		}
	}
};

//#####################################################################################################################
//################################################## Torrent Class ####################################################
//#####################################################################################################################

var Torrent = Class.create();
Torrent.prototype = {
	
	count: 0, // Simulation of a static variable. This allows each Torrent object to have a unique ID number.
	
	initialize: function(p, url) {
		
		// give this Torrent a unique ID number.
		this.torrentNumber = Torrent.prototype.count++;
		
		// Set the torrents parent object. This should be an instance of the TorrentManager class.
		this.manager = p;
		
		// The url for this torrent, as returned by the RS API 'getTorrentAttributes' call. Note that this is prefixed
		// with the CID and a ":".
		this.torrentURL = url;
		
		// An array containing a FileRow object for each file that's a part of this torrent. Files are added to this
		// array by calling addFile() on a Torrent object.
		this.files = new Array();
		
		// Torrent objects are marked valid until they're deleted, when they're marked invalid so they can be cleaned
		// up.
		this.valid = true;
		
		// Automatic updating of the "pause/resume" button is blocked for 10 seconds whenever the button is clicked.
		// This prevents the UI from flickering back and forth between the two states as it can take several seconds
		// for the RS client to update the state of the torrent and begin reporting the new state.
		this.blockAutoPauseUpdate = false;	
		
		this.blockAutoCollapseUpdate = false;
		
		// These are all the attributes returned by the 'getTorrentAttributes' RS API call.
		this.download = false;
		this.selectedRecv = 0;
		this.selectedSize = 1;
		this.error = null;
		this.name = null;
		this.peers = 0;
		this.collapsed = false;		
		
		// The rest of this contructor builds the UI for each Torrent object.
		this.checkBox = document.createElement("input");
		this.checkBox.setAttribute("type", "checkbox");
		this.checkBox.setAttribute("title", "Select/Deselect All");
		this.checkBox.setAttribute("id", "torrentCheckBox" + this.torrentNumber);
		Event.observe(this.checkBox, 'click', this.checkBoxClicked.bind(this));
		
		this.peerSpan = document.createElement("span");
		this.peerSpan.addClassName("peerSpan");
		
		this.errorSpan = document.createElement("span");
		this.errorSpan.addClassName("errorSpan");
		Event.observe(this.errorSpan, 'click', this.errorClicked.bind(this));
		
		this.table = document.createElement("table");
		this.header = document.createElement("div");
		this.header.addClassName("torrentHeader");
	
		this.tnameLabel = document.createElement("label");
		
		this.percentSpan = document.createElement("span");
		this.percentSpan.addClassName("percentSpan");
						
		this.header.appendChild(this.checkBox);
		this.header.appendChild(this.tnameLabel);
		this.header.appendChild(this.peerSpan);
		this.header.appendChild(this.percentSpan);
		this.header.appendChild(this.errorSpan);
		
		this.div = document.createElement("div");
		this.div.addClassName("torrent");
		this.div.appendChild(this.header);
		this.div.appendChild(this.table);
		
		this.deleteButton = document.createElement("input");
		this.deleteButton.setAttribute("type", "button");
		this.deleteButton.setAttribute("value", "Remove");
        this.deleteButton.setAttribute("title", "Remove torrent from list. (Keep files.)");
		this.deleteButton.setAttribute("class", "DeleteTorrentGroup");
		Event.observe(this.deleteButton, 'click', this.remove.bind(this));
		
		this.pauseButton = document.createElement("input");
		this.pauseButton.setAttribute("type", "button");
		this.pauseButton.setAttribute("value", "Pause");
        this.pauseButton.setAttribute("title", "Pause the entire torrent");
		this.pauseButton.setAttribute("class", "PauseTorrentGroup");
		Event.observe(this.pauseButton, 'click', this.pauseClicked.bind(this));
		
		this.collapseButton = document.createElement("input");
		this.collapseButton.setAttribute("type", "button");
		this.collapseButton.setAttribute("value", "Collapse");
		this.collapseButton.setAttribute("title", "Show/Hide all files for this torrent");
		this.collapseButton.setAttribute("class", "CollapseTorrentGroup");
		Event.observe(this.collapseButton, 'click', this.collapseClicked.bind(this));
		
		this.header.appendChild(this.deleteButton);
		this.header.appendChild(this.pauseButton);
		this.header.appendChild(this.collapseButton);		
	},
	
	remove: function(){
		var confMessage = "Are you sure you want to remove this torrent?\n";
		confMessage += "(The files will be kept on disk.)";
		if(confirm(confMessage)){
			this.valid = false;
			this.div.hide();
			setTorrentAttribute(this.torrentURL, "rs_removed", true );
			setTimeout(function(){this.manager.removeTorrent(this)}.bind(this), 5000);
		}
	},
	
	addFile: function(url){
		for(var i = 0; i < this.files.length; i++) if(this.files[i].url == url) return this.files[i];
		file = new FileRow(this, url);
		this.table.appendChild(file.row);
		this.files.push(file);
		return file;
	},
	
	// Returns the fileRow object with the specified URL if it exists in this torrent. Otherwise, returns null.
	getFile: function(url){
		for(var i = 0; i < this.files.length; i++) if(this.files[i].url == url) return this.files[i];
		return null;
	},
	
	collapseClicked: function(){
		this.collapsed = !this.collapsed;
		this.blockAutoCollapseUpdate = true;
		this.updateCollapsed(true);
		setTorrentAttribute(this.torrentURL, "rs_collapsed", this.collapsed);
		setTimeout(function(){this.blockAutoCollapseUpdate = false}.bind(this), 5000);
	},
	
	checkBoxClicked: function(){
		if(this.checkBox.checked){
			for(var i = 0; i < this.files.length; i++)
				if(!this.files[i].enabled) this.files[i].controlCell.clicked();
		}
		else{
			for(var i = 0; i < this.files.length; i++)
				if(this.files[i].enabled && !this.files[i].isComplete) this.files[i].controlCell.clicked();
		}
	},
	
	pauseClicked: function(){
		
		// Toggle the state of the 'download' flag.
		this.download = !this.download;
		
		// Set the value of the pause/resume button. We pass in 'true' to force a change in the button state,
		// even if it would normally be ingored due to a previous click happening in the last few seconds.
		this.updatePaused(true);

		// Then we actually construct the message to send to the RS client. First, we remove the CID from the beginning of the
		// torrentURL, then we send either a "DownloadFile" or "PauseFile" message to the RS client.
		var url = this.torrentURL.replace(/^\d+:/, "");
		if(this.download) rsInternal_executeJSIOCall(2, "DownloadFile", function(){}, 0, url);
		else rsInternal_executeJSIOCall(2, "PauseFile", function(){}, 0, url);
		
		// We set automatic update blocking to true, so that the value of the "pause/resume" button won't change in the next
		// few seconds while we wait for the client to finish pausing or starting the download.
		this.blockAutoPauseUpdate = true;
		
		// We want to enable automatic updates again in 10 seconds.
		setTimeout(function(){this.blockAutoPauseUpdate = false}.bind(this), 10000);
		
		// Finally we have to update the status message for all of the torrent's files, but only if this torrent isn't collapsed.
		if(!this.collapsed) for(var i = 0; i < this.files.length; i++) this.files[i].statusCell.update();
	},
	
	errorClicked: function(){
		if(this.errorMessageBox) this.errorMessageBox.errorMessage.innerHTML = this.error;
		else{
			this.errorMessageBox = document.createElement("div");
			this.errorMessageBox.addClassName("errorMessageBox");
			this.errorMessageBox.style.top = this.errorSpan.offsetTop + "px";
			this.errorMessageBox.style.left = this.errorSpan.offsetLeft + "px";
		
			var errorHeader = document.createElement("h1");
			errorHeader.innerHTML = "Error Details:";
			
			this.errorMessageBox.errorMessage = document.createElement("span");
			this.errorMessageBox.errorMessage.innerHTML = this.error;
		
			this.errorMessageBox.appendChild(errorHeader);
			this.errorMessageBox.appendChild(this.errorMessageBox.errorMessage);
			this.header.appendChild(this.errorMessageBox);
		
			// Clicking an error message should hide it.
			Event.observe(this.errorMessageBox, 'click', function(){
				this.header.removeChild(this.errorMessageBox);
				this.errorMessageBox = null;
			}.bind(this));
		
			// Automatically hide error messages after 10 seconds.
			setTimeout(function(){
				if(this.errorMessageBox){
					this.header.removeChild(this.errorMessageBox);
					this.errorMessageBox = null;
				}
			}.bind(this), 10000);
		}
	},
	
	updateCollapsed: function(force){
		if(!this.blockAutoCollapseUpdate || force){
			if(this.collapsed){
				this.table.hide();
				this.collapseButton.setAttribute("value", "Expand");
			}
			else{
				this.table.show();
				this.collapseButton.setAttribute("value", "Collapse");
			}
		}
	},
	
	updateName: function(){
		if(this.tnameLabel.innerHTML != this.name) this.tnameLabel.innerHTML = this.name;
	},
	
	// This takes the list of attributes returned from the 'getTorrentAttributes' RS API call and updates the
	// state of the Torrent object to match.
	updateAttributes: function(dld, unq, siz, err, nme, prs, clp){
		this.download = dld;
		this.selectedRecv = unq + 0;
		this.selectedSize = siz + 0;
		this.error = err;
		this.name =  nme;
		this.peers = prs;
		this.collapsed = clp;
		
		this.updatePaused();
		this.updateName();
		this.updatePeers();
		this.updateCollapsed();
		this.updateCheckBox();
		this.updatePercent();
		this.updateComplete();
		this.updateError(); // must be last.
	},
	
	updateError: function(){
		if(this.error && this.error != "") this.errorSpan.innerHTML = "Error!";
		else this.errorSpan.innerHTML = "";
	},
	
	// Updates the status of the checkbox to the left of the torrent name in the header of each torrent.
	// This should be checked when ALL files in the torrent are checked, and unchecked if ANY files in the
	// torrent are unchecked. It should not be visible when the torrent is collapsed.
	updateCheckBox: function(){
		if(this.collapsed || !this.files.length || this.hideCheckbox) this.checkBox.style.visibility = "hidden";
		else{
			this.checkBox.style.visibility = "visible";
			for(var i = 0; i < this.files.length; i++){
				if(!this.files[i].enabled){
					this.checkBox.checked = false;
					return;
				}
			}
			this.checkBox.checked = true;
		}
	},
	
	// Updates the status of the 'pause/resume' button for the torrent. Does nothing when 'blockAutoPauseUpdate' is set,
	// unless 'force' is set to 'true'.
	updatePaused: function(force){
		if(!this.blockAutoPauseUpdate || force){
			if(this.download){
				this.pauseButton.setAttribute("value", "Pause");
	            this.pauseButton.setAttribute("title", "Pause the entire torrent");
	        }
			else {
	            this.pauseButton.setAttribute("value", "Resume");
	            this.pauseButton.setAttribute("title", "Resume torrent downloading");
	        }
		}
	},
	
	updateComplete: function(){
		if(this.selectedRecv == this.selectedSize) this.pauseButton.hide();
		else this.pauseButton.show();
	},
	
	updatePercent: function(){
		var percent = Math.round((this.selectedRecv/this.selectedSize) * 10000) / 100;
		if(percent >= 100) this.percentSpan.innerHTML = "complete)";
		else this.percentSpan.innerHTML = percent + "%)";
	},
	
	// Updates the peer count displayed after the torrent name in the header.
	updatePeers: function(){
		var s = "";
		if(this.peers != 1) s = "s";
		if(this.download && this.selectedRecv < this.selectedSize)
			this.peerSpan.innerHTML = " (" + this.peers + " peer" + s + ", ";
        else this.peerSpan.innerHTML = " (";
	}
	
}

//#####################################################################################################################
//############################################## TorrentManager Class #################################################
//#####################################################################################################################

var TorrentManager = Class.create();
TorrentManager.prototype = {
	
	initialize: function() {
		this.torrents = new Array();
	},

	// url: url of the file in the torrent.
	addTorrent: function(url){
		
		$("none").hide();
				
		// Find the file if we've already got it.
		var torrent = this.getTorrent(url);

		// If we didn't find the proper torrent file, we need to create a new one and add it to our list.
		if(!torrent){
			torrent = new Torrent(this, url);
			var insertedElement = $("torrents").insertBefore(torrent.div, $("torrents").firstChild);
			this.torrents.unshift(torrent);
		}

		// Then we return the torrent.
		return torrent;
	},
	
	removeTorrent: function(torrent){
		for(var i = 0; i < this.torrents.length; i++){
			if(this.torrents[i] == torrent){
				this.torrents[i].div.parentNode.removeChild(this.torrents[i].div);
				this.torrents[i] = null;
			}
		}
		
		var allNull = true;
		for(var i = 0; i < this.torrents.length; i++) if(this.torrents[i] != null){
			allNull = false;
		}
		if(allNull) $("none").show();
	},
	
	// Looks up and returns the Torrent object with the given URL from the 'torrents' array.
	// If the given URL is not found, returns null.
	getTorrent: function(url){
		for(var i = 0; i < this.torrents.length; i++){
			if(this.torrents[i] && this.torrents[i].torrentURL == url){
				return this.torrents[i];
			}
		}
		return null;
	},
	
	getFile: function(url){
		for(var i = 0; i < this.torrents.length; i++){
			if(this.torrents[i]){
				var f = this.torrents[i].getFile(url);
				if(f) return f;
			}
		}
	}
	
};

//#####################################################################################################################
//############################################## Utility Functions ####################################################
//#####################################################################################################################

// Returns true if the given fileName appears to be a playable media file, false otherwise.
function isMediaFile(fileName){
	var mediaTypes = ["wm[va]?", "mpe?g", "asf", "qt", "mov", "avi", "rvmb", "mp[234]", "m4[vpa]"];
	for(var i = 0; i < mediaTypes.length; i++){
		var re = new RegExp("\." + mediaTypes[i] + "$", "i");
		if(re.test(fileName)) return true;
	}
	return false;
}

// Takes a number of bytes and scales it to the appropriate unit. Returns a string representing an approximate size.
// Note that units smaller than a gigabyte are rounded to the nearest whole number. Units of 1GB or larger are
// rounded to the nearest 100th of a unit.
function scaleBytes(b){
	var units = new Array("B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB");
	var unit = 0;
	while(b > 1024 && unit < units.length){
		b /= 1024;
		unit++;
	}
	if(unit <= 2) return Math.round(b) + units[unit];
	else return (Math.round(b * 100) / 100) + units[unit];
}

//#####################################################################################################################
//############################################ Feedback Form Functions ################################################
//#####################################################################################################################

Event.observe(window, 'load', initFeedback);

function initFeedback(){
	Event.observe($("sendFeedbackButton"), 'click', sendFeedback);
	Event.observe($("cancelFeedbackButton"), 'click', cancelFeedback);
	Event.observe($("feedbackText"), 'focus', enterFeedbackText);
	Event.observe($("feedbackText"), 'blur', leaveFeedbackText);
	Event.observe($("feedbackEmail"), 'focus', enterFeedbackEmail);
	Event.observe($("feedbackEmail"), 'blur', leaveFeedbackEmail);
	
	$("feedbackLink").setAttribute("href", "javascript://'send feedback.'");
	Event.observe($("feedbackLink"), 'click', function(){
		$("feedbackSending").hide();
		$("feedbackSent").hide();
		$("feedbackText").value = "Enter your comment here."
		$("feedbackBox").show();
		$("feedbackOverlay").show();
	});
}

function cancelFeedback(){
	$("feedbackOverlay").hide();
	$("feedbackText").value = "Enter your comment here.";
}

function sendFeedback(){
	
	var email = null;
	if($("feedbackEmail").value != "Enter your email (Optional)." && $("feedbackEmail").value != "")email = $("feedbackEmail").value;
	var url = "http://www.foxtorrent.com/feedback.php?m=" + encodeURI($("feedbackText").value);
	if(email) url += "&e=" + encodeURI(email);
	
	var s = document.createElement("script");
	s.setAttribute("type", "text/javascript");
	s.setAttribute("src", url);
	$("feedbackScripts").appendChild(s);
	
	$("feedbackBox").hide();
	$("feedbackSending").show();
}

function scriptSent(message){
	$("feedbackSending").hide();
	$("feedbackSent").show();
	$("feedbackScripts").innerHTML = "";
	setTimeout(function(){$("feedbackOverlay").hide()}, 1500);
	
}

function enterFeedbackText(){
	if($("feedbackText").value == "Enter your comment here.") $("feedbackText").value = "";
}

function leaveFeedbackText(){
	if($("feedbackText").value == "") $("feedbackText").value = "Enter your comment here.";
}

function enterFeedbackEmail(){
	if($("feedbackEmail").value == "Enter your email (Optional).") $("feedbackEmail").value = "";
}

function leaveFeedbackEmail(){
	if($("feedbackEmail").value == "") $("feedbackEmail").value = "Enter your email (Optional).";
}
