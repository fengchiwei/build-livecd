function gs_gActions(ik, at, totalSpace, usedSpace, status) {
 this.cookiePath  = null;
 this.ik    = ik;
 this.at    = at;
 this.status  	= (status == -1) ? 1 : status;
 this.strStatus      = "";
 this.totalSpace  = totalSpace;
 this.usedSpace  = usedSpace;
 this.gFiles  	= new Array;
 this.loginTimer  = null;
 this.loginStatus	= -1;

 this.uploadStatus	= 0;
 this.uploadTimer	= null;

 this.downloadStatus	= 0;
 this.downloadTimer	= null;

 this.splitInfo	 = null;
 this.downSplitInfo  = null;

//	gs_gSession.bufSize  = 5000000;//15000000;
 this.currentExt  = "_gs";
 this.folderInfo  = null;
 this.enumRand  = 0;

 this.INIT   = 0;
 this.PROGRESS  = 1;
 this.COMPLETE  = 2;
 this.FAILED   = 3;
 this.UPLOADCOMPLETE = 4;
 this.DOWNLOADCOMPLETE = 5;

 this.FILE   = 0;
 this.FOLDER   = 1;
 this.NEWFOLDER  = 2;

 this.fileType = 0;
}

gs_gActions.prototype = {
 gEnumInfo : {
  startRec	: 0,
  endRec  : 1900000,
  numRecs  : 0,

  Reset   : function () {
             this.startRec = 0;
             this.endRec = 1900000;
             this.numRecs = 0;
            }
 },

 downloadStatusIndicator: {
  filePart : "",
  filePercent : 0,
  fileTotal : 1
 },

 uploadStatusIndicator : {
  tBeforeUpload : null,
  tAfterUpload : null,
  fileSize : 0,
  filePart : "",
  filePercent : 0,
  nSecsPerByte : 0.0007, //0.07, //31000,

  fileTotal : 1,
  progressTimer : null,
  filePercent : 0,

  start : function (nSecsPerByte, objAct)  {
           var objIndicator = this;
           this.stop();
           this.nSecsPerByte = nSecsPerByte;
           this.tBeforeUpload = new Date();
           this.filePercent = 0;
           var timeInterval;
           gs_Dump("ft = " + objAct.splitInfo.fileType + ", " + this.fileSize);
           if (objAct.splitInfo.fileType == objAct.FILE)
            timeInterval = Math.ceil(this.fileSize * this.nSecsPerByte);
           else
            timeInterval = 100;
           gs_Dump(timeInterval + ", " + this.fileSize + ", " + this.nSecsPerByte);

           this.progressTimer = setTimeout(function () { objIndicator.progressStatus(timeInterval, objAct); }, timeInterval);
          },

  progressStatus : function (timeInterval, objAct) {
                    var objIndicator = this;
                    if (objAct.uploadStatus == objAct.PROGRESS) {
                     this.filePercent++;
                     if (this.filePercent > 60)
                      timeInterval += Math.ceil(timeInterval * 0.01);
                     if (this.filePercent > 70)
                      timeInterval += Math.ceil(timeInterval * 0.05);
                     if (this.filePercent > 80)
                      timeInterval += Math.ceil(timeInterval * 0.1);
                     if (this.filePercent > 90)
                      timeInterval += Math.ceil(timeInterval * 0.1);
                     if (this.filePercent > 95)
                      timeInterval += Math.ceil(timeInterval * 0.5);
                     if (this.filePercent >= 99)
                      this.filePercent = 99;

                     this.progressTimer = setTimeout(function () { objIndicator.progressStatus(timeInterval, objAct); }, timeInterval);
                    } else {
                     this.filePercent = 100;
                     clearTimeout(this.progressTimer);
                    }
                   },

  stop : function () {
          if (this.progressTimer != null)
          clearTimeout(this.progressTimer);
         },

  setSecsPerByte : function () {
                    var tAfterUpload = new Date();
                    var totalTime = tAfterUpload - this.tBeforeUpload;
                    gs_gSession.mSecsPerByte = totalTime / (this.fileSize * 100);
                    gs_gPrefHandler.setPref(gs_gPrefNames.prefSpeed, gs_gSession.mSecsPerByte, "char");
                    this.stop();
                    gs_Dump("SET " + gs_gSession.mSecsPerByte);
     }
 },

 LoginUser : function (userName, passWord, funcAfterLogin) {
  var objAct = this;
  try {
   objAct.userName = userName;
   objAct.passWord = passWord;
   if (this.loginStatus == -1) this.loginStatus = 0;
   this.loginTimer = setInterval(function () { objAct.DoAsyncLogin(funcAfterLogin);  }, 200);
  } catch (ex) {
   this.strStatus = ex;
   this.status = 0;
  }
 },

 DoAsyncLogin : function (funcAfterLogin) {
  var objAct = this;
  if (objAct.loginStatus == -1) return;
  var objResp = new gs_WebResponse(0, "");
  var text = "", url = "";

  switch (this.loginStatus) {
   case 0:
    this.loginStatus = -1;
    if ( this.GetCookieValue(gs_gSession.cookieName, gs_gSession.cookieHost, gs_gSession.cookiePath) ) {
     var objResp = new gs_WebResponse(0, "");
     objResp = gs_xhttp.doAsyncGet("",
       function (objResp) {
        try {
         if (objResp.eId > 0)
         throw gs_jsUtils.GetPropertyString("previoususer") + objResp.eMesg;
         objAct.loginStatus = 1;
        } catch (ex) {
        		if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
        	} },  gs_gSession.logoutURL);
    } else
      objAct.loginStatus = 1;
   break;
   case 1: this.loginStatus = -1;
    var data = (gs_gSession.domainName == 'gmail.com' || gs_gSession.domainName == 'googlemail.com') ?
      "Email=__USER__@__DOMAIN__&Passwd=__PASSWORD__&service=mail&PersistentCookie=yes&rmShown=1" +
      "&passive=true&rm=false&continue=http%3A%2F%2Fmail.google.com%2Fmail%3Fui%3Dhtml%26zy%3Dl&ltmpl=wsad&ltmplcache=2" :
      "at=null&continue=http%3A%2F%2Fmail.google.com%2Fhosted%2F__DOMAIN__%DF&service=mail&userName=__USER__&password=__PASSWORD__";



    data = data.replace("__DOMAIN__", gs_gSession.domainName);
    data = data.replace("__USER__", gs_gSession.userName);
    data = data.replace("__PASSWORD__", gs_gSession.passWord);

    //data = "Email=" + escape(objAct.userName) + "&Passwd=" + escape(objAct.passWord) + "&service=mail&PersistentCookie=yes&rmShown=1&passive=true&rm=false&continue=http%3A%2F%2Fmail.google.com%2Fmail%3Fui%3Dhtml%26zy%3Dl&ltmpl=wsad&ltmplcache=2";

    objResp = gs_xhttp.doAsyncPost(data, "",
       function (objResp) {
        try {
         if (objResp.eId > 0) throw "Step 1 " + objResp.eMesg;
         objAct.loginStatus = 2;
        } catch (ex) {
        		if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
        	} }, gs_gSession.loginURL);
   break;
   case 2:
    this.loginStatus = -1;
    url = gs_gSession.mailURL;
    objResp = gs_xhttp.doAsyncGet("",
       function (objResp) {
        try {
         if (objResp.eId > 0) throw "Step 2 " + objResp.eMesg;
         objAct.loginStatus = 3;
        } catch (ex) {
        		if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
        	} }, url);
   break;
   case 3:
    this.loginStatus = -1;
    //step 3
    url = gs_gSession.mailURL + "&ui=1&ik=&search=inbox&view=tl&start=0&init=1";
    objResp = gs_xhttp.doAsyncGet("",
       function (objResp) {
        try {
         if (objResp.eId > 0)
          throw "Step 3 " + objResp.eMesg;
         if (!objAct.GetCookieValue(gs_gSession.cookieName, gs_gSession.cookieHost, gs_gSession.cookiePath))
          throw gs_jsUtils.GetPropertyString("cookiefailed");
         if (!objAct.HandleLogin_step4(objResp.auxObj))
          throw gs_jsUtils.GetPropertyString("settingikfailed");
         if (objAct.status != 1)
          throw gs_jsUtils.GetPropertyString("loginfailed");

         objAct.loginStatus = -1;
         clearInterval(objAct.loginTimer);
         setTimeout(funcAfterLogin, 10);
        } catch (ex) {
         objAct.strStatus = ex;
         objAct.status = 0;
         if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
         gs_viewHandler.ShowStatus("login-failed");
        }
       }, url);
   break;
  }
 },

 GetExistingCookieValue : function () {
  var name = 	'GMAIL_AT';
  var host = 'mail.google.com';

  var cookieManager = Components.classes["@mozilla.org/cookiemanager;1"]
                      .getService(Components.interfaces.nsICookieManager);

  var iter = cookieManager.enumerator;
  var gcookie = -1;
  while ( iter.hasMoreElements() ) {
   var cookie = iter.getNext();
   if ( (cookie instanceof Components.interfaces.nsICookie) && (cookie.name == name) && (cookie.host == host) ) {
    gcookie = cookie.value;
    this.cookiePath = cookie.path;
   }
  }
  if (gcookie != -1) {
//  	alert(this.cookiePath + "," + gcookie);
   this.at = gcookie;
   return true;
  } else {
   return false;
  }
 },

 GetCookieValue : function (name, host, path) {
  var cookieManager = Components.classes["@mozilla.org/cookiemanager;1"]
      	.getService(Components.interfaces.nsICookieManager);

  var iter = cookieManager.enumerator;
  var gcookie = -1;
  while (iter.hasMoreElements()) {
   var cookie = iter.getNext();
   if ( (cookie instanceof Components.interfaces.nsICookie) && (cookie.name == name) && (cookie.host == host) &&
         (!path || path=='' || cookie.path == path) ) {
         //path is optional
     gcookie = cookie.value;
   }
  }
  if (gcookie != -1) {
   this.at = gcookie;
   return true;
  } else {
   return false;
  }
 },

 HandleLogin_step4 : function (text) {
  var gspace_gEnumFrame = this.LoadEnumFrame(text);
  var ik = gspace_gEnumFrame.contentDocument.getElementById("ud");//regex.exec(text);
  var uName = gspace_gEnumFrame.contentDocument.getElementById("uname");//regex.exec(text);
  if (ik == null) {
   var udRegExpFilter = /.*D\(\[\"ud\",.*/g;
   var textmatched = text.match(udRegExpFilter)
   if ( textmatched.length == 1 ) {
    ik = {};
    ik.value = textmatched[0].split(/\",\"/)[3];
    uName = {};
    uName.value = textmatched[0].split(/\",\"/)[1];
   } else {
    return false;
   }
  }

  if (uName == null || uName.value == "") {
   return false;
  }

  gs_gSession.userName = uName.value;
  if (ik.value == "") {
   return false;
  }

  this.ik = ik.value;
  this.status = 1;

  this.FillProperties(gspace_gEnumFrame.contentDocument, false, "");
  this.RemoveEnumFrame(gspace_gEnumFrame);
  return true;
 },

 LoadEnumFrame : function (text) {
  this.enumRand = Math.ceil(Math.random() * 1000);
  var gEnumFrame1 = gs_get("gspace_gEnumFrame");
  var gspace_gEnumFrame = gEnumFrame1.cloneNode(true);
  gspace_gEnumFrame.setAttribute("id", "gspace_gEnumFrame" + this.enumRand);
  gs_get("gspace_tabbrowser").appendChild(gspace_gEnumFrame);
  var srcDoc = gspace_gEnumFrame.contentDocument;

  while ( srcDoc.body.firstChild ) {
   srcDoc.body.removeChild(srcDoc.body.firstChild);
  }
  var elemScript = srcDoc.createElement("script");
  var txtScript = this.GetFunctionString();
  elemScript.innerHTML = txtScript;
  srcDoc.body.appendChild(elemScript);

  var regex = /<script>D=.*<\/script>/i;
  text = text.replace(regex, "");
  var divTag = srcDoc.createElement("div");
  divTag.innerHTML = text;
  srcDoc.body.appendChild(divTag);
  return gspace_gEnumFrame;
 },

 RemoveEnumFrame : function(tgFrame) {
  if (tgFrame != null) {
   tgFrame.stop();
   gs_get("gspace_tabbrowser").removeChild(tgFrame);
  }
 },

 FillProperties : function (srcDoc, wantResults, path, isFolder) {
  var arrProp;
  var qu = srcDoc.getElementById("qu");//regex.exec(text);

  if (qu == null) {
   var quRegExpFilter = /.*D\(\[\"qu\",.*/g;
   var qutextmatched = srcDoc.body.childNodes.item(1).innerHTML.match(quRegExpFilter);
   if ( qutextmatched.length == 1 ) {
    qu = {};
    qu.value = qutextmatched[0].split(/\",\"/)[1]+";"+qutextmatched[0].split(/\",\"/)[2];
   }
  }
  if (qu != null) {
   arrProp = qu.value.split(";");
   if (arrProp.length == 2) {
    this.usedSpace = arrProp[0];
    this.totalSpace = arrProp[1];
   }
  }

  var t = srcDoc.getElementById("t");//regex.exec(text);
  if (t == null) {
   var joined=srcDoc.body.childNodes.item(1).innerHTML.split("\n").join("");
   var redone = joined.split("]);");
   var tRegExpFilter = /.*D\(\[\"t\",.*\]\);/g;
   var tRegExpExtractor = /.*D\((\[\"t\",.*\])\);/g;
   t = {};
   t.value = "";
   for (var j=0; j < redone.length; j++) {
    redone[j] += "]);";
    if (redone[j].match(tRegExpFilter)) {
     var extracted = redone[j].replace(tRegExpExtractor, "$1");
     var evaluated = eval(extracted);

     for(var k = 1; evaluated && (k < evaluated.length); k++) {
      t.value += evaluated[k][0] + ",,," + evaluated[k][6] + ",,," + evaluated[k][7]	+
              ",,," + evaluated[k][9] + ",,," + evaluated[k][4] + ",,," + evaluated[k][12]  + ";;;";
     }
    }
   }
  }
  if (t != null) {
   //gs_Dump(path + ", " + gs_gSession.enumType + " T = " + t.value);
   if (wantResults) {
    if (gs_gSession.enumType == "gs") {
     arrProp = t.value.split(";;;");
     for (var i = 0; i < arrProp.length; i++) {
      if (arrProp[i] != "") {
       //      gs_Dump("arr  = " + arrProp[i]);
       var fileProp = arrProp[i].split(",,,");
       var subSplit = fileProp[1].split("|");
       var fileName = subSplit[1].toString();
       fileName = fileName.replace(/&amp;/g, "&");
       var strFrom = fileProp[4].toString();
       var regex = new RegExp("_upro_(.*)\"", "gi");
       var arrFrom = regex.exec(strFrom);

       var tFrom = gs_gSession.userName;
       if (arrFrom != null && arrFrom.length == 2)
        tFrom = arrFrom[1];
       var fileIndex = this.fileExists(fileName, tFrom);
       if (isFolder)
        fileIndex = -1;

       //fileName is not found
       if (fileIndex == -1) {
        var isDir = false;
        if (!isNaN(subSplit[2]) && (parseInt(subSplit[2]) < 0) )
         isDir = true;

        var fileSize = subSplit[5];//fileProp[2].split(" ")[0];
        //this.setFileProperties(subSplit[6], fileIndex);
        var fileTotal = parseInt(subSplit[4]);
        var tgRemoteInfo = new gs_gRemoteFileInfo(fileName, fileProp[0], fileSize, fileProp[fileProp.length - 1],
                             subSplit[2], isDir, path + fileName, path, fileTotal);

        if (fileProp[3].split(",").length > 1)
         tgRemoteInfo.hasMetaData = true;

        if (arrFrom != null && arrFrom.length == 2)
         tgRemoteInfo.from = tFrom;

        if (fileTotal < 0)
         tgRemoteInfo.isReadonly = true;
        //gs_Dump("folder === " + isFolder + ", " + tgRemoteInfo.fileTotal);
        if (isFolder) {
         this.folderInfo = tgRemoteInfo;
         if (tgRemoteInfo.fileTotal < 0)
          this.folderInfo.isReadonly = true;
         return;
        } else
         this.gFiles.push(tgRemoteInfo);
       } else if (this.gFiles[fileIndex].randNum == subSplit[2]) {
        this.gFiles[fileIndex].fileNum++;
        if (this.gFiles[fileIndex].fileNum <= this.gFiles[fileIndex].fileTotal)
         this.gFiles[fileIndex].uid += "|" + fileProp[0];
       }
      }
     }
    } else if (gs_gSession.enumType == "gd") {
     arrProp = t.value.split(";;;");
     var gdPath = "GMAILFS: /" + path.replace("gs:/", "");

     for (var i = 0; i < arrProp.length; i++) {
      var isDir = false;
      if (arrProp[i] != "") {
	//      gs_Dump("arr  = " + arrProp[i]);
      	var fileProp = arrProp[i].split(",,,");

      	var fileName = "", fileSize = 0;
      	var strSub = fileProp[1].replace(gdPath, "");
      	strSub = strSub.replace("<b>", "");
      	strSub = strSub.replace("</b>", "");
      	var sIndex = strSub.indexOf("/");
      	if (sIndex != -1) {
         if (strSub.indexOf(". [14;a;1]") == -1 || strSub.indexOf(". [14;a;1]") != sIndex + 1) {
          continue;
         } else {
          isDir = true;
          fileName = strSub.substring(0, sIndex) + "/";
          fileSize = 0;
         }
      	}
      	if (!isDir) {
         var pIndex = strSub.indexOf("[");
         fileName =	strSub.substring(0, pIndex - 1);
         fileName = gs_jsUtils.trimWhitespace(fileName);

         if (fileName == ".")
          continue;
         var lastIndex = strSub.indexOf("]");
         var remainingStr = strSub.substr(pIndex + 1, lastIndex);
         var arrDetails = remainingStr.split(";");
         fileSize = Math.ceil(parseInt(arrDetails[0]) / 1000);
      	}

      	fileName = fileName.replace(/&amp;/g, "&");
      	var strFrom = fileProp[4].toString();
      	var regex = new RegExp("_upro_(.*)\"", "gi");
      	var arrFrom = regex.exec(strFrom);

      	var tFrom = gs_gSession.userName;
      	if (arrFrom != null && arrFrom.length == 2)
         tFrom = arrFrom[1];

      	//var fileSize = subSplit[5];//fileProp[2].split(" ")[0];
      	//this.setFileProperties(subSplit[6], fileIndex);

      	var tgRemoteInfo = new  gs_gRemoteFileInfo(fileName, fileProp[0], fileSize, fileProp[fileProp.length - 1], 1, isDir, path + fileName, path, 1);

      	if (fileProp[3].split(",").length > 1)
         tgRemoteInfo.hasMetaData = true;

      	if (arrFrom != null && arrFrom.length == 2)
         tgRemoteInfo.from = tFrom;

      	this.gFiles.push(tgRemoteInfo);
      }
     }
    }
   }
  }
  var ts = srcDoc.getElementById("ts");//regex.exec(text);
  if (ts == null) {
   var tsRegExpFilter = /.*D\(\[\"ts\",.*/g;
   var tstextmatched = srcDoc.body.childNodes.item(1).innerHTML.match(tsRegExpFilter);
   if ( tstextmatched.length == 1 ) {
    ts = {};
    ts.value = tstextmatched[0].split(/\",\"/)[1]+";"+tstextmatched[0].split(/\",\"/)[2]+";"+tstextmatched[0].split(/\",\"/)[3];
   }
  }
  if (ts != null) {
   arrProp = ts.value.split(";");
   if (arrProp.length == 3) {
    this.gEnumInfo.startRec = parseInt(arrProp[0]);
    this.gEnumInfo.numRecs = parseInt(arrProp[1]);
    this.gEnumInfo.endRec = parseInt(arrProp[2]);
   }
  }
 },

 GetFunctionString : function () {
  var strFun =	'	function D(arr) {'
      + '  try {'
      + '  	if (arr != null) {'
      + '    if (arr[0] == "ud") {'
      + '    	var ud = document.createElement("input");	'
      + '    	ud.setAttribute("type", "hidden");  	'
      + '    	ud.setAttribute("id", "ud");  	'
      + '    	ud.value = arr[3];      	'
      + '    	var uname = document.createElement("input");	'
      + '    	uname.setAttribute("type", "hidden");  	'
      + '    	uname.setAttribute("id", "uname");  	'
      + '    	uname.value = arr[1];      	'
      + '    	document.body.appendChild(ud);    	'
      + '    	document.body.appendChild(uname);    	'
      + '    }            '
      + '    if (arr[0] == "qu") {'
      + '    	var qu = document.createElement("input");	'
      + '    	qu.setAttribute("type", "hidden");  	'
      + '    	qu.setAttribute("id", "qu");  	'
      + '    	qu.value = arr[1] + ";" + arr[2];      '
      + '    	document.body.appendChild(qu);    	'
      + '    }            '
      + '    if (arr[0] == "t") {'
      + '    	var t = document.getElementById("t");    '
      + '    	if (t == null) {'
      + '      t = document.createElement("input");	'
      + '      t.setAttribute("type", "hidden");	'
      + '      t.setAttribute("id", "t");	'
      + '              '
      + '      document.body.appendChild(t);	'
      + '    	}        	'
      + '    	for (var i = 1; i < arr.length; i++) {'
      + '      if (arr[i] == null)    	'
      + '      	break;      	'
      + '      var arrDetails = arr[i];  	'
      + '      t.value += arrDetails[0] + ",,," + arrDetails[6] + ",,," + arrDetails[7]	'
      + '        	+ ",,," + arrDetails[9] + ",,," + arrDetails[4] + ",,," + arrDetails[12]  + ";;;";  '
      + '    	}          	'
      + '    }            '
      + '    if (arr[0] == "ts") {'
      + '    	var ts = document.createElement("input");	'
      + '    	ts.setAttribute("type", "hidden");  	'
      + '    	ts.setAttribute("id", "ts");    '
      + '    	ts.value = arr[1] + ";" + arr[2] + ";" + arr[3];	'
      + '    	document.body.appendChild(ts);      '
      + '    }            '
      + '  	}            	'
      + '  } catch (e) { '
      + '  	alert(e);'
      + '  } '
      + '	}';
  return strFun;

 },

 EnumerateFolder : function (path) {
  if (this.status != 1) {
   //setTimeout("this.Enumerate('gs:/')", 1000);
   return;
  } else {
   try  {
    delete this.folderInfo;
    this.folderInfo = null;
    if (path == "gs:/") return;
    var objResp;
    var folderName = path.substr(path.lastIndexOf("/", path.length - 2) + 1);
    var parentPath = path.substring(0, path.lastIndexOf("/", path.length - 2) + 1);
    var actFolderName = "\"" + folderName + "\"";
    var actpath = "\"" + parentPath + " d$" + "\"";

    var searchStr = "&search=adv&as_from=&as_to=" + encodeURIComponent(gs_gSession.userName) + "&as_subj=gspace AND " + encodeURIComponent(actFolderName) + " AND " + encodeURIComponent(actpath) + "&as_subset=&as_has=&as_hasnot=&as_attach=&as_within=1y&as_date=&view=tl&start=" + this.gEnumInfo.startRec;

    var url = "http://mail.google.com/mail/" + "?&ui=1&ik=" + gs_gSession.ik;
    url += searchStr;
    gs_Dump("url == " + url);
    objResp = gs_xhttp.doSyncGet("", url);
    if (objResp.eId > 0)
     throw objResp.eMesg + "-" + this.gEnumInfo.startRec;

    var gspace_gEnumFrame = this.LoadEnumFrame(objResp.auxObj);
    this.FillProperties(gspace_gEnumFrame.contentDocument, true, path, true);

    this.RemoveEnumFrame(gspace_gEnumFrame);
   } catch (ex) {
    	if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
   }
  }
 },

 Enumerate : function (path) {
  if (this.status != 1)
  {
  	//setTimeout("this.Enumerate('gs:/')", 1000);
  	return;
  }
  else
  {
  	try
  	{
    if (this.gFiles.length > 0)
    {
    	delete this.gFiles;
    	this.gFiles = new Array;
    }
    this.gEnumInfo.Reset();
    var objResp;

    this.EnumerateFolder(path);
    gs_gRemoteTreeView.curFolderInfo = null;
    gs_Dump("folderInfo = " + this.folderInfo);
    if (this.folderInfo && this.folderInfo.isReadonly)
    {
    	var objResp = new gs_WebResponse(0, "");
    	var text = "", url = "http://mail.google.com/mail/?view=att&disp=inline&attid=0.2&";
    	url += "th=" + this.folderInfo.uid;

    	objResp = gs_xhttp.doSyncGetText("", url);

    	if (objResp.eId == 0)
    	{
      var parser = new DOMParser();
      var doc = parser.parseFromString(objResp.auxObj, "text/xml");
      if (doc.documentElement.nodeName == "parsererror")
      {
      	gs_Dump("Error parsing XML");
      }
      else
      {
      	var objects = doc.getElementsByTagName("file")
      	for (var i = 0; i < objects.length; i++)
      	{
        var strFileInfo = objects[i].firstChild.nodeValue;

        var arrFileInfo = strFileInfo.split(";;");
        gs_Dump(strFileInfo + ", " + arrFileInfo[5]);
        var tgRemoteInfo = new gs_gRemoteFileInfo(arrFileInfo[0], arrFileInfo[1],
              arrFileInfo[2], arrFileInfo[3], arrFileInfo[4], arrFileInfo[5], arrFileInfo[6], arrFileInfo[7], arrFileInfo[8]);
        if (arrFileInfo[5] == "false")
        	tgRemoteInfo.isDirectory = false;
        else
        	tgRemoteInfo.isDirectory = true;
        this.gFiles.push(tgRemoteInfo);

      	}

      }
    	}
    }
    else
    {
    	var objAct = this;
    	//this.enumTimer = setInterval(function () { objAct.DoAsyncEnumerate(path);  }, 100);

    	while (this.gEnumInfo.startRec < this.gEnumInfo.endRec)
    	{
      var actpath = "\"" + path + " d$" + "\"";

      var searchStr = "&search=adv&as_from=&as_to=" + encodeURIComponent(gs_gSession.userName) + "&as_subj=gspace AND " + encodeURIComponent(actpath) + "&as_subset=&as_has=&as_hasnot=&as_attach=&as_within=1y&as_date=&view=tl&start=" + this.gEnumInfo.startRec;
      if (gs_gSession.enumType == "gd")
      	searchStr = "&search=adv&as_from=&as_to=" + encodeURIComponent(gs_gSession.userName) + "&as_subj=\"gmailfs:/\"" + "&as_subset=&as_has=&as_hasnot=&as_attach=&as_within=1y&as_date=&view=tl&start=" + this.gEnumInfo.startRec;

      var url = gs_gSession.mailURL + "&ui=1&ik=" + gs_gSession.ik;
      url += searchStr;

      objResp = gs_xhttp.doSyncGet("", url);
      if (objResp.eId > 0)
      	throw objResp.eMesg + "-" + this.gEnumInfo.startRec;

      var gspace_gEnumFrame = this.LoadEnumFrame(objResp.auxObj);
      this.FillProperties(gspace_gEnumFrame.contentDocument, true, path, false);

      this.RemoveEnumFrame(gspace_gEnumFrame);
      this.gEnumInfo.startRec += this.gEnumInfo.numRecs;
    	}
    }
  	}
  	catch (ex)
  	{
    	if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
  	}
  }
 },

 fileExists : function (fileName, from) {
  var found = -1;
  if (this.gFiles != null) {
   for (var i = 0; i < this.gFiles.length; i++) {
    if (this.gFiles[i].fileName == fileName && this.gFiles[i].from == from) {
     found = i;
     break;
    }
   }
  }
  return found;
 },

 DeleteMail : function (arrId) {
  var objAct = this;
  try {
   var t = "";
   for (var i = 0; i < arrId.length; i++) {
    t += "&t=" + arrId[i];
   }
   var url = gs_gSession.mailURL + "search=all&ui=1&ik=" + gs_gSession.ik;
   var postData = "&act=tr&at=" + gs_gSession.at + "&vp=&msq=&ba=false" + t;

   gs_Dump("trash url : " + url);
   var objResp = gs_xhttp.doSyncPost(postData, "", url);
   if (objResp.eId > 0)
    throw gs_jsUtils.GetPropertyString("deletefailed") + objResp.eMesg;

   url = gs_gSession.mailURL + "search=trash&ui=1&ik=" + gs_gSession.ik;
   postData = "&act=dl&at=" + gs_gSession.at + "&vp=&msq=&ba=false" + t;

   gs_Dump("delete url : " + url);
   objResp = gs_xhttp.doSyncPost(postData, "", url);
   if (objResp.eId > 0)
    throw gs_jsUtils.GetPropertyString("deletefailed") + objResp.eMesg;
  } catch (ex) {
   	if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
  }
 },

	DownloadFileObject : function (fName, isDirectory, strUid, toPath)
	{
  try
  {
  	if (isDirectory)
  	{
    //create a folder if it doesn't exists
    var file  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(toPath);
    fName = fName.substring(0, fName.lastIndexOf("/"));
    file.append(fName);
    if (!file.exists() || !file.isDirectory())  // if it doesn't exist, create
    {
    	file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
    }

    this.downloadStatus = this.COMPLETE;
  	}
  	else
  	{
    this.downloadStatus = this.INIT;
    if (this.downSplitInfo == null)
    	this.downSplitInfo = new gs_gSplitFileInfo;

    this.downSplitInfo.fileNum = 1;
    var fid = strUid.split("|");
    fid.reverse();
    this.downSplitInfo.arrUid = fid;
    this.downSplitInfo.fileTotal = fid.length;
    if (this.downSplitInfo.fileTotal > 1)
    	this.downSplitInfo.isLargeFile = true;
    this.downSplitInfo.toPath = toPath;
    this.downSplitInfo.fileName = fName;
    this.DownloadSplitFile();
  	}

  }
  catch (ex)
  {
  		if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
  }
	},

	DownloadSplitFile : function ()
	{

  var objAct = this;
	   	try
    	{
  	if (this.downloadStatus == this.PROGRESS)	//in progress
  	{
    //update indicator
    return;
  	}
  	else if (this.downloadStatus == this.INIT)	//start
  	{
    //start the upload process
    this.downloadStatus = this.PROGRESS;
    if (!this.downSplitInfo.isLargeFile)
    {
    	this.downSplitInfo.diskFileName = this.downSplitInfo.fileName;
    	this.downloadStatusIndicator.filePart = "";
    }
    else
    {
    	this.downloadStatusIndicator.filePart = 1;
    	this.downloadStatusIndicator.fileTotal = this.downSplitInfo.fileTotal;
    	this.downSplitInfo.diskFileName = this.downSplitInfo.fileName + this.currentExt + this.downSplitInfo.fileNum;
    }
    var isError = this.DownloadFile(this.downSplitInfo.arrUid[this.downSplitInfo.fileNum - 1], this.downSplitInfo.toPath, this.downSplitInfo.diskFileName);
    if (isError != 0)
    {
    	this.downloadStatus = this.FAILED;
    	throw isError;
    }
    this.downloadTimer = setInterval(function () { objAct.DownloadSplitFile();  }, 1000);
  	}
  	else if (this.downloadStatus == this.DOWNLOADCOMPLETE)
  	{
    this.downSplitInfo.fileNum++;
    if (this.downSplitInfo.fileNum > this.downSplitInfo.fileTotal)
    {
    	clearInterval(this.downloadTimer);
    	this.downloadStatus = this.COMPLETE;	//complete

    	if (this.downSplitInfo.isLargeFile)	//join file
      this.JoinFile();

    	delete this.downSplitInfo;
    	this.downSplitInfo = null;
    	return;
    }
    else	//upload split file
    {
    	this.downloadStatus = this.PROGRESS;
    	this.downSplitInfo.diskFileName = this.downSplitInfo.fileName + this.currentExt + this.downSplitInfo.fileNum;
    	this.downloadStatusIndicator.filePart = this.downSplitInfo.fileNum;
    	var isError = this.DownloadFile(this.downSplitInfo.arrUid[this.downSplitInfo.fileNum - 1], this.downSplitInfo.toPath, this.downSplitInfo.diskFileName);
    	if (isError != 0)
    	{
      this.downloadStatus = this.FAILED;
      throw isError;
    	}
    }
  	}
	    }
	    catch (ex)
	    {
  		if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
	        this.downloadStatus = this.FAILED;
            return;
	    }
	},


	DownloadFile	: function (uid, toPath, fname)
    {
                var objAct = this;
  const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
  try
  {
  	var headers = null;
  	var link = gs_gSession.mailURL + "view=att&disp=attd&attid=0.1&th=" + uid;
  	var file  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
  	file.initWithPath(toPath);
  	file.append(fname);
  	var j = 0;
  	while (file.exists())
  	{
    j++;
    file.initWithPath(toPath);
    file.append(j + "_" + fname);
  	}
  	//file.create(file.NORMAL_FILE_TYPE, 511);
  	var uri = Components.classes['@mozilla.org/network/standard-url;1'].createInstance(Components.interfaces.nsIURI);
  	uri.spec = link;

  	var persist = makeWebBrowserPersist();
  	persist.persistFlags = nsIWBP.PERSIST_FLAGS_NO_CONVERSION | nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES | nsIWBP.PERSIST_FLAGS_BYPASS_CACHE | nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
  	persist.progressListener = new gs_gDownProgressListener (this);
  	persist.saveURI(uri, null, null, null, headers, file);
  	return 0;
  }
	    catch (ex)
	    {
	        return ex;
	    }
	},

	UploadFileObject : function (filePath, toPath, arrOtherInfo)
	{
  this.uploadStatus = this.INIT;
  var objAct = this;
  var fpLocal  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
  fpLocal.initWithPath(filePath);

  if (!fpLocal.exists())
  {
  	throw fileName + " " + gs_jsUtils.GetPropertyString("filenotexists");
  }
	    if (this.splitInfo == null)
  	this.splitInfo = new gs_gSplitFileInfo;

  this.splitInfo.fileName = fpLocal.leafName;
  this.splitInfo.toPath = toPath;
  this.splitInfo.folderPath = fpLocal.parent.path;
  this.splitInfo.totalFileSize = Math.ceil(fpLocal.fileSize / 1000);

  if (fpLocal.isDirectory())
  	this.splitInfo.fileType = this.FOLDER;
  else
  	this.splitInfo.fileType = this.FILE;

  this.splitInfo.arrOtherInfo = arrOtherInfo;

  if (fpLocal.fileSize > gs_gSession.bufSize)
  {
  	this.splitInfo.isLargeFile = true;
  	gs_Dump("FileSize: " + Math.ceil(fpLocal.fileSize / gs_gSession.bufSize));
  	this.splitInfo.fileTotal = Math.ceil(fpLocal.fileSize / gs_gSession.bufSize);
  	this.splitInfo.diskFileName = this.splitInfo.fileName + this.currentExt + this.splitInfo.fileNum;
  	setTimeout(function () { objAct.FileSplit(fpLocal); }, 10);
  }
  if (fpLocal.fileSize <= gs_gSession.bufSize)
  {
  	this.splitInfo.isLargeFile = false;
  	this.splitInfo.diskFileName = this.ChangeExtension(fpLocal);
  	this.UploadSplitFile();
  }
	},

	CreateRemoteFolder : function (folderName, toPath, isReadonly)
	{

  var splitInfo = new gs_gSplitFileInfo;
  splitInfo.fileName = folderName;
  splitInfo.diskFileName = folderName;
  splitInfo.toPath = toPath;
  splitInfo.fileType = this.NEWFOLDER;
  splitInfo.totalFileSize = 0;
  if (isReadonly)
  {
  	//make it readonly
  	splitInfo.fileTotal = -1;
  }
  else
  {
  	//make it writable
  	splitInfo.fileTotal = 1;
  }
  var pSub = this.CreateSubject(false, null, splitInfo);
  this.AttachFileAndSend(gs_gSession.userName, gs_gSession.userName, pSub, 0, "blank.txt", true, splitInfo.strMetaXml);

	},

	ChangeExtension : function (fpLocal)
	{
  var fileName = this.splitInfo.fileName;
  try
  {
  	var found = false;
  	var strExtList = gs_gPrefHandler.getPref(gs_gPrefNames.prefHarmfulExtensions, "char");
  	strExtList = strExtList.toLowerCase();
  	var arrExtList = strExtList.split(",");
  	//var arrExtensions = [".exe", ".dll", ".zip", ".txt", ".vb"];
  	//var ext = this.splitInfo.fileName.substring(this.splitInfo.fileName.lastIndexOf("."), this.splitInfo.fileName.length);
  	//ext = ext.toLowerCase();

  	for (var i = 0; i < arrExtList.length; i++)
  	{
    var strExt = gs_jsUtils.trimWhitespace(arrExtList[i].toLowerCase());
    if (strExt == "")
    	continue;
    if (strExt.indexOf(".") != 0)
    	strExt = "." + strExt;
    if (fileName.toLowerCase().indexOf(strExt) != -1)
    	found = true;
  	}

  	if (found)
  	{
    try
    {
    	fpLocal.copyTo(fpLocal.parent, this.splitInfo.fileName + this.currentExt);
    }
    catch (ex)
    {
    }
    fileName = this.splitInfo.fileName + this.currentExt;
  	}
  }
  catch (ex)
  {
  }
  return fileName;
	},

	FileSplit	: function (fpLocal)
    {
  try
  {
  	try
  	{
    var tfpLocal1  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
    tfpLocal1.initWithPath(this.splitInfo.folderPath);
    tfpLocal1.append(this.splitInfo.fileName + this.currentExt + this.splitInfo.fileNum);

    var foStream1 = Components.classes["@mozilla.org/network/file-output-stream;1"]
      	.createInstance(Components.interfaces.nsIFileOutputStream);
    foStream1.init(tfpLocal1, 0x02 | 0x08 | 0x20, 0664, 0); // write, create, truncate
  	}
  	catch (ex1)
  	{
    if (ex1.name == "NS_ERROR_FILE_ACCESS_DENIED")
    {
    	var tempFile = Components.classes["@mozilla.org/file/directory_service;1"]
        .getService(Components.interfaces.nsIProperties)
        .get("TmpD", Components.interfaces.nsIFile);
    	this.splitInfo.folderPath = tempFile.path;
    }
    else
    {
    		if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex1);
    }
  	}

  	gs_Dump(this.splitInfo.folderPath);
  	var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
      	.createInstance(Components.interfaces.nsIFileInputStream);
  	fstream.init(fpLocal, 1, 0, false);
  	fstream.QueryInterface(Components.interfaces.nsIInputStream);

  	for (var i = this.splitInfo.fileNum; i <= this.splitInfo.fileTotal; i++)
  	{
    try
    {
    	var tfpLocal  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
    	tfpLocal.initWithPath(this.splitInfo.folderPath);
    	tfpLocal.append(this.splitInfo.fileName + this.currentExt + i);

    	var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
        .createInstance(Components.interfaces.nsIFileOutputStream);
    	var sstream = Components.classes["@mozilla.org/network/buffered-output-stream;1"]
      	.createInstance(Components.interfaces.nsIBufferedOutputStream);
    	sstream.init(foStream, gs_gSession.bufSize);
    	foStream.init(tfpLocal, 0x02 | 0x08 | 0x20, 0664, 0); // write, create, truncate
    }
    catch (ex1)
    {
    		if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex1);
    	return;
    }
    var remSize = gs_gSession.bufSize;
    if (i == this.splitInfo.fileTotal)
    	remSize = fpLocal.fileSize - ((i - 1) * gs_gSession.bufSize);
    sstream.writeFrom(fstream, remSize);
    sstream.close();
    foStream.close();
  	}
  	fstream.close();

  	this.UploadSplitFile();
  } catch (ex) { 	if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex); }
 },

 DeleteSplitFiles : function () {
  try {
   for (var i = 1; i <= this.splitInfo.fileTotal; i++) {
    var file  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
    file.initWithPath(this.splitInfo.folderPath);
    file.append(this.splitInfo.fileName + this.currentExt + i);
    //gs_Dump(this.splitInfo.folderPath + ", " + this.splitInfo.fileName + this.currentExt + i);
    if (file.exists())
     file.remove(true);
   }
  } catch (ex) { 	if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex); }
  delete this.splitInfo;
 },

 UploadSplitFile : function () {
  var objAct = this;
  try {
   //in progress
   if (this.uploadStatus == this.PROGRESS) {
    //update indicator
    return;
   } else if (this.uploadStatus == this.INIT) { //start
    //start the upload process
    this.uploadStatus = this.PROGRESS;
    var filePath;
    if (this.splitInfo.fileType != this.FILE) {
     filePath = "blank.txt";
    } else {
     var fpLocal  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
     fpLocal.initWithPath(this.splitInfo.folderPath);
     fpLocal.append(this.splitInfo.diskFileName);
     filePath = fpLocal.path;

     if (this.splitInfo.isLargeFile) {
      this.uploadStatusIndicator.filePart = 1;
      this.uploadStatusIndicator.fileTotal = this.splitInfo.fileTotal;
     } else {
      this.uploadStatusIndicator.filePart = "";
     }
     this.uploadStatusIndicator.fileSize = fpLocal.fileSize;
    }
    gs_Dump(filePath);
    var pSub = this.CreateSubject(false, fpLocal, this.splitInfo);

    this.uploadStatusIndicator.start(gs_gSession.mSecsPerByte, objAct);
    this.AttachFileAndSend(gs_gSession.userName, gs_gSession.userName, pSub, this.splitInfo.totalFileSize.toString(), filePath, false, this.splitInfo.strMetaXml);
    this.uploadTimer = setInterval(function () { objAct.UploadSplitFile();  }, 1000);
   } else if (this.uploadStatus == this.UPLOADCOMPLETE) {
    this.splitInfo.fileNum++;
    gs_Dump(this.splitInfo.fileNum + ", " + this.splitInfo.fileType);
    if (this.splitInfo.fileType == this.FILE)
     this.uploadStatusIndicator.setSecsPerByte();
    if (this.splitInfo.fileNum > this.splitInfo.fileTotal) {
     clearInterval(this.uploadTimer);
     this.uploadStatus = this.COMPLETE;	//complete
     if (this.splitInfo.isLargeFile) {
      this.DeleteSplitFiles();
     } else {
      if (this.splitInfo.fileType == this.FILE && this.splitInfo.fileName != this.splitInfo.diskFileName) {
       var fpLocal  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
       fpLocal.initWithPath(this.splitInfo.folderPath);
       fpLocal.append(this.splitInfo.diskFileName);
       if (fpLocal.exists())
        fpLocal.remove(true);
      }
     }
     delete this.splitInfo;
     this.splitInfo = null;
     return;
    } else { //upload split file
     this.uploadStatus = this.PROGRESS;
     var fpLocal  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
     fpLocal.initWithPath(this.splitInfo.folderPath);
     fpLocal.append(this.splitInfo.fileName + this.currentExt + this.splitInfo.fileNum);
     this.uploadStatusIndicator.filePart = this.splitInfo.fileNum;
     this.uploadStatusIndicator.fileSize = fpLocal.fileSize;
     this.uploadStatusIndicator.start(gs_gSession.mSecsPerByte, objAct);

     var pSub = this.CreateSubject(false, fpLocal, this.splitInfo);
     this.AttachFileAndSend(gs_gSession.userName, gs_gSession.userName, pSub, this.splitInfo.totalFileSize.toString(), fpLocal.path, false, this.splitInfo.strMetaXml);
    }
   }
  } catch (ex) {
   	if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
   this.uploadStatus = this.FAILED;
   if (this.splitInfo.isLargeFile) this.DeleteSplitFiles();
   return;
  }
 },

 CreateMetaData : function (splitInfo, fpLocal, toPath) {
  try {
   var arrInfo = (splitInfo.arrOtherInfo == null) ? new Array() : splitInfo.arrOtherInfo;
   if (fpLocal == null)
    arrInfo['ST'] = gs_jsUtils.GetDateString(new Date());
   else
    arrInfo['ST'] = gs_jsUtils.GetDateString(fpLocal.lastModifiedTime);

   if (arrInfo['GSCT'] == null)
    arrInfo['GSCT'] = gs_jsUtils.GetDateString(new Date());

   arrInfo['PATH'] = toPath;
   splitInfo.arrOtherInfo = arrInfo;
  } catch (ex) { 	if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex); }
 },

 CreateSubject : function(isTransfer, fpLocal, splitInfo) {
  var fileName = splitInfo.fileName;
  var toPath = splitInfo.toPath;
  if (splitInfo.randNum == -1 || splitInfo.randNum == null)
   splitInfo.randNum = Math.ceil(Math.random() * 10000);

  var pSub;
  if (splitInfo.fileType != this.FILE) {
   if (fileName.lastIndexOf("/") != fileName.length - 1 )
    fileName += "/";
   splitInfo.randNum *= -1;
   splitInfo.totalFileSize = 0;
  }

  if (splitInfo.fileNum == 1) {
   this.CreateMetaData(splitInfo, fpLocal, toPath);
   splitInfo.strMetaXml = this.MakeMetaDataXml(splitInfo);
  }

  if (!isTransfer)
   pSub = "GSPACE|" + fileName + "|" + splitInfo.randNum + "|" + splitInfo.fileNum + "|" + splitInfo.fileTotal + "|" + splitInfo.totalFileSize.toString() + "|" + toPath  + " d$" ;
  return pSub;
 },

 MakeMetaDataXml : function (splitInfo) {
  var arrInfo = splitInfo.arrOtherInfo;
  var strXml = "";
  for (var name in arrInfo) {
   strXml += "<" + name + "><![CDATA[";
   strXml += arrInfo[name];
   strXml += "]]></" + name + ">";
  }

  if (splitInfo.fileTotal < 0) {
   //make it readonly
   var xmlFileInfo = "";
   //(fileName, uid, fileSize, uploadTime, randomNumber, isDir, path, folderPath, fileTotal, from, hasMetaData, isReadonly)

   var arrFileInfo = this.gFiles;

   for (var i = 0; i < arrFileInfo.length; i++) {
    var fileInfo = arrFileInfo[i];
    var strFileInfo =  "" + fileInfo.fileName + ";;" + fileInfo.uid + ";;" + fileInfo.fileSizeInKb
        	+ ";;" + fileInfo.uploadTime + ";;" + fileInfo.randNum + ";;" + fileInfo.isDirectory
        	+ ";;" + fileInfo.filePath + ";;" + fileInfo.folderPath + ";;" + fileInfo.fileTotal
        	+ ";;" + fileInfo.from + ";;" + fileInfo.hasMetaData + ";;" + fileInfo.isReadonly + "";
    xmlFileInfo += "<file><![CDATA[" + strFileInfo + "]]></file>";
   }
   strXml += "<objects>" + xmlFileInfo + "</objects>";
  }

  strXml = "<metadata>" + strXml + "</metadata>";
  return strXml;
 },

 AttachFileAndSend : function (pFrom, pTo, pSub, pBody, pFile, isNewFolder, strMetaXml) {
  var objAct = this;
  try {
   var pAction = gs_gSession.mailURL + "&ui=1&ik=" + gs_gSession.ik + "&cmid=2&autosave=0&ov=cm&newatt=0&rematt=0";
   const BOUNDARY="---------------------------32191240128922";

   const MULTI = "@mozilla.org/io/multiplex-input-stream;1";
   const FINPUT = "@mozilla.org/network/file-input-stream;1";
   const STRINGIS = "@mozilla.org/io/string-input-stream;1";
   const BUFFERED = "@mozilla.org/network/buffered-input-stream;1";

   const nsIMultiplexInputStream = Components.interfaces.nsIMultiplexInputStream;
   const nsIFileInputStream = Components.interfaces.nsIFileInputStream;
   const nsIStringInputStream = Components.interfaces.nsIStringInputStream;
   const nsIBufferedInputStream = Components.interfaces.nsIBufferedInputStream;

   var fileName  = "";
   var buf = null;
   var fin = null;

   if (pFile != "blank.txt") {
    var fpLocal  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
    fpLocal.initWithPath(pFile);

    fileName = fpLocal.path;
    fin = Components.classes[FINPUT].createInstance(nsIFileInputStream);
    fin.init(fpLocal, 1, 0, false);
    buf = Components.classes[BUFFERED].createInstance(nsIBufferedInputStream);
    buf.init(fin, 19000000);
   } else {
    buf = Components.classes[STRINGIS].createInstance(nsIStringInputStream);
    buf.setData("0", 1);
    fileName = pFile;
   }
   var sheader = "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"from\"\r\n\r\n" + pFrom ;
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"ik\"\r\n\r\n" + gs_gSession.ik ;
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"cmid\"\r\n\r\n2";
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"th\"\r\n\r\n";
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"rm\"\r\n\r\n";
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"to\"\r\n\r\n" + pTo;
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"at\"\r\n\r\n" + gs_gSession.at ;
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"subject\"\r\n\r\n" + pSub ;
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"msgbody\"\r\n\r\n" + pBody ;
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"ishtml\"\r\n\r\n1";
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"view\"\r\n\r\nsm";
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"file0\";filename=\"" + fileName +  "\"\r\n";
   sheader += "Content-Type: application/octet-stream\r\n\r\n";

   sheader = endcodeToUtf8(sheader);//Fixed charset encoding problem by qxodream@gmail.com

   var hsis = Components.classes[STRINGIS].createInstance(nsIStringInputStream);
   hsis.setData(sheader,sheader.length);

   var strNewFile = "\r\n";
   strNewFile += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"file1\";filename=\"metadata.txt\"\r\n";
   strNewFile += "Content-Type: text/xml\r\n\r\n";

   var dt = new Date();
   strNewFile += strMetaXml;

   var nfsis = Components.classes[STRINGIS].createInstance(nsIStringInputStream);
   nfsis.setData(strNewFile, strNewFile.length);

   var endsis = Components.classes[STRINGIS].createInstance(nsIStringInputStream);
   var bs = new String("\r\n--" + BOUNDARY + "--\r\n");
   endsis.setData(bs, bs.length);

   var uploadStream = Components.classes[MULTI].createInstance(nsIMultiplexInputStream);
   uploadStream.appendStream(hsis);
   uploadStream.appendStream(buf);
   uploadStream.appendStream(nfsis);
   uploadStream.appendStream(endsis);

   var xmlhttp = gs_xhttp.init();
   xmlhttp.open("POST", pAction, true);
   xmlhttp.setRequestHeader("Content-Type","multipart/form-data; boundary=" + BOUNDARY);
   xmlhttp.setRequestHeader("Content-Length", (uploadStream.available()));

   var objAct = this;
   xmlhttp.onload = function (evt) {
                     buf.close();
                     hsis.close();
                     if (fin != null) fin.close();
                     uploadStream.close();
                     gs_Dump("UC " + pFile);
                     if (!isNewFolder)
                      objAct.uploadStatus = objAct.UPLOADCOMPLETE;
                    }

   xmlhttp.send(uploadStream);
  } catch (ex) { 	if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex); }
 },

 JoinFile : function () {
  var fileName = this.downSplitInfo.fileName;
  var toPath = this.downSplitInfo.toPath;
  var fpLocal  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
  fpLocal.initWithPath(toPath);
  fpLocal.append(fileName);

  var j = 0;
  while (fpLocal.exists()) {
   j++;
   fpLocal.initWithPath(toPath);
   fpLocal.append(j + "_" + fileName);
  }

  var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                 .createInstance(Components.interfaces.nsIFileOutputStream);
  var sstream = Components.classes["@mozilla.org/network/buffered-output-stream;1"]
                .createInstance(Components.interfaces.nsIBufferedOutputStream);
  sstream.init(foStream, gs_gSession.bufSize);
  foStream.init(fpLocal, 0x02 | 0x08 | 0x20, 0664, 0); // write, create, truncate

  var fileTotal = this.downSplitInfo.fileTotal;

  for (var i = 1; i <= fileTotal; i++) {
   var tfpLocal  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
   tfpLocal.initWithPath(toPath);
   tfpLocal.append(fileName + this.currentExt + i);
   gs_Dump("Download FileName = " + fileName + this.currentExt + i);
   var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                 .createInstance(Components.interfaces.nsIFileInputStream);
   fstream.init(tfpLocal, 1, 0, false);
   fstream.QueryInterface(Components.interfaces.nsIInputStream);

   sstream.writeFrom(fstream, fstream.available());
   fstream.close();
   tfpLocal.remove(true);
  }
  sstream.close();
  foStream.close();
 },

 SendAttachment : function (pFrom, pTo, pSub, pBody, pUid, callbackFunc, strXmlData) {
  var objAct = this;
  try {
   var objResp = new gs_WebResponse(0, "");

   var pAction = gs_gSession.mailURL + "&ui=1&ik=" + gs_gSession.ik + "&cmid=2&autosave=0&ov=cm&newatt=0&rematt=0";
   const BOUNDARY="---------------------------32191240128922";

   const MULTI = "@mozilla.org/io/multiplex-input-stream;1";
   const FINPUT = "@mozilla.org/network/file-input-stream;1";
   const STRINGIS = "@mozilla.org/io/string-input-stream;1";
   const BUFFERED = "@mozilla.org/network/buffered-input-stream;1";

   const nsIMultiplexInputStream = Components.interfaces.nsIMultiplexInputStream;
   const nsIFileInputStream = Components.interfaces.nsIFileInputStream;
   const nsIStringInputStream = Components.interfaces.nsIStringInputStream;
   const nsIBufferedInputStream = Components.interfaces.nsIBufferedInputStream;

   var fileName  = "";
   var buf = null;
   var fin = null;

   var pAttach = pUid + "_" + pUid + "_0.1_-1"

   var sheader = "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"from\"\r\n\r\n" + pFrom ;
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"ik\"\r\n\r\n" + gs_gSession.ik ;
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"cmid\"\r\n\r\n2";
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"th\"\r\n\r\n" + pUid;
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"rm\"\r\n\r\n" + pUid;
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"to\"\r\n\r\n" + pTo;
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"at\"\r\n\r\n" + gs_gSession.at ;
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"subject\"\r\n\r\n" + pSub ;
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"msgbody\"\r\n\r\n" + pBody ;
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"ishtml\"\r\n\r\n1";
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"view\"\r\n\r\nsm";
   sheader += "\r\n";
   sheader += "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"attach\"\r\n\r\n" + pAttach;
   sheader += "\r\n";

   sheader = endcodeToUtf8(sheader);//Fixed charset encoding problem by qxodream@gmail.com

   var strNewFile = "--" + BOUNDARY + "\r\nContent-disposition: form-data;name=\"f_elrbqz3w\";filename=\"metadata.txt\"\r\n";
   strNewFile += "Content-Type: text/xml\r\n\r\n";

   var dt = new Date();
   strNewFile += strXmlData;

   var hsis = Components.classes[STRINGIS].createInstance(nsIStringInputStream);
   hsis.setData(sheader,sheader.length);

   var endsis = Components.classes[STRINGIS].createInstance(nsIStringInputStream);
   var bs = new String("\r\n--" + BOUNDARY + "--\r\n");
   endsis.setData(bs, bs.length);

   var nfsis = Components.classes[STRINGIS].createInstance(nsIStringInputStream);
   nfsis.setData(strNewFile, strNewFile.length);

   var uploadStream = Components.classes[MULTI].createInstance(nsIMultiplexInputStream);
   uploadStream.appendStream(hsis);
   uploadStream.appendStream(nfsis);
   uploadStream.appendStream(endsis);

   var xmlhttp = gs_xhttp.init();
   xmlhttp.open("POST", pAction, true);
   xmlhttp.setRequestHeader("Content-Type","multipart/form-data; boundary=" + BOUNDARY);
   xmlhttp.setRequestHeader("Content-Length", (uploadStream.available()));
   xmlhttp.send(uploadStream);

   var objAct = this;
   xmlhttp.onreadystatechange = function() {
    if (xmlhttp.readyState != 4)
     return;
    if (xmlhttp.status == 200) {
     if (callbackFunc != null) {
      objResp.auxObj = xmlhttp.responseText;
      objResp.headers = xmlhttp.getAllResponseHeaders();
      setTimeout(callbackFunc, 10);
     }
    } else {
     throw "Error occurred while retrieving from the server!";
    }
   }

  } catch (ex) { 	if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex); }
 },

 CreateCopySubject : function(splitInfo) {
  var fileName = splitInfo.fileName;
  var toPath = splitInfo.toPath;

  if (splitInfo.randNum == -1 || splitInfo.randNum == null)
   splitInfo.randNum = Math.ceil(Math.random() * 10000);
  var pSub;

  if (splitInfo.fileType != this.FILE) {
   if (fileName.lastIndexOf("/") != fileName.length - 1 )
    fileName += "/";
   splitInfo.randNum *= -1;
   splitInfo.totalFileSize = 0;
  }

  pSub = "GSPACE|" + fileName + "|" + splitInfo.randNum + "|" + splitInfo.fileNum + "|" + splitInfo.fileTotal + "|" + splitInfo.totalFileSize.toString() + "|" + toPath  + " d$" ;
  return pSub;
 }
}

function gs_gDownProgressListener (gAct) {
 this.gAct = gAct;
}

gs_gDownProgressListener.prototype =  {
 QueryInterface: function(aIID) {
  if ( aIID.equals(Components.interfaces.nsIWebProgressListener) ||
       aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
       aIID.equals(Components.interfaces.nsITransfer) ||
       aIID.equals(Components.interfaces.nsISupports))
   return this;
  throw Components.results.NS_NOINTERFACE;
 },

 onStateChange: function(aProgress, aRequest, aFlag, aStatus) {
  if (aFlag & Components.interfaces.nsIWebProgressListener.STATE_START) {
   this.gAct.downloadStatus = this.gAct.PROGRESS;
  } else if (aFlag & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
   this.gAct.downloadStatusIndicator.filePercent = 100;
   this.gAct.downloadStatus = this.gAct.DOWNLOADCOMPLETE;
  }
  return 0;
 },

 onLocationChange: function(aProgress, aRequest, aURI) {
  return 0;
 },

 // For definitions of the remaining functions see XulPlanet.com
 onProgressChange: function(aProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {
  if (aMaxSelfProgress == -1)
   aMaxSelfProgress = aCurSelfProgress;
  //gs_Dump(this.rowIndex + ":" + aCurSelfProgress + ", " + aMaxSelfProgress + ", " + aCurTotalProgress + ", " + aMaxTotalProgress);
  this.gAct.downloadStatusIndicator.filePercent = Math.round(aCurSelfProgress / aMaxSelfProgress * 100);
  return 0;
 },

 onStatusChange: function() {return 0;},
 onSecurityChange: function() {return 0;},
 onLinkIconAvailable: function() {return 0;}
}

if (typeof endcodeToUtf8 == 'undefined') {
 function endcodeToUtf8(oStr) {
  var utfStr = oStr;
  var uConv = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
  uConv.charset = "UTF-8";
  utfStr = uConv.ConvertFromUnicode (oStr);
  return utfStr
 }
}
