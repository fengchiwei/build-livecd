/***** BEGIN LICENSE BLOCK *****

    FlashGot - a Firefox extension for external download managers integration
    Copyright (C) 2004-2008 Giorgio Maone - g.maone@informaction.com

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
                             
***** END LICENSE BLOCK *****/

const CI = Components.interfaces;
const CC = Components.classes;
const NS_BINDING_ABORTED = 0x804b0002;


// Utilities
var DOMUtils = {
  getDocShellFromWindow: function(window) {
    try {
      return window.QueryInterface(CI.nsIInterfaceRequestor)
                   .getInterface(CI.nsIWebNavigation)
                   .QueryInterface(CI.nsIDocShell);
    } catch(e) {
      return null;
    }
  },
  getChromeWindow: function(window) {
    try {
      return this.getDocShellFromWindow(window)
        .QueryInterface(CI.nsIDocShellTreeItem).rootTreeItem
        .QueryInterface(CI.nsIInterfaceRequestor)
        .getInterface(CI.nsIDOMWindow).top;
    } catch(e) {
      return null;
    }
  },
  updateStyleSheet: function(sheet, enabled) {
    
    const sssClass = CC["@mozilla.org/content/style-sheet-service;1"];
    if (!sssClass) return;
      
    const sss = sssClass.getService(CI.nsIStyleSheetService);
    const uri = CC['@mozilla.org/network/io-service;1'].getService(CI.nsIIOService)
        .newURI("data:text/css," + sheet, null, null);
    if (sss.sheetRegistered(uri, sss.USER_SHEET)) {
      if (!enabled) sss.unregisterSheet(uri, sss.USER_SHEET);
    } else {
      try {
        if (enabled) sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
      } catch(e) {
        dump("Error registering stylesheet " + uri + ": " + e + "\n"); 
      }
    }
  }
};

// *****************************************************************************
// START DMS CLASSES
// *****************************************************************************

const ASK_NEVER = [false, false, false];

// *** Base/Windows DMS ********************************************************
function FlashGotDM(name) {
  if (arguments.length > 0) {
    this._init(name);
  }
}

FlashGotDM.init = function(service) {
  FlashGotDM.cleanup();
  FlashGotDM.dms = [];
  FlashGotDM.dmtests = {};
  FlashGotDM.executables = {};
  FlashGotDM.renewableExes = [];
  FlashGotDM.initDMS(service); 
};

FlashGotDM.cleanup = function() {
  for (f in FlashGotDM.renewableExes) {
    if (f instanceof CI.nsIFile) {
      try { f.remove(true); } catch(ex) {}
    }
  }
};

FlashGotDM.prototype = {
  _init: function(name) {
    this.name = name;
    const dms = FlashGotDM.dms;
    var pos = dms.length;
    if (name in dms) {
      var other = dms[name];
      for (var j = pos; j-- > 0;) {
        if (dms[j] == other) {
          pos=j;
          break;
        }
      }
    }
    dms[name] = dms[pos] = this;
  }
,
  _service: null,
  _cookieManager: null,
  _exeFile: false,
  _supported: null,
  custom: false,
  disabledLink: false,
  disabledSel: false,
  disabledAll: false,
  exeName: "FlashGot.exe",
  renewExe: true,
  askPath: ASK_NEVER,
  cookieSupport: true,
  postSupport: false,
  priority: ""
,  
  _codeName: null,
  get codeName() {
    return this._codeName || (this._codeName = this.name.replace(/\W/g,"_"));
  },
  
  getPref: function(name, def) {
    return this.service.getPref("dmsopts." + this.codeName + "." + name, def);
  },
  setPref: function(name, value) {
    this.service.setPref("dmsopts." + this.codeName + "." + name, value);
  },
  
  get asciiFilter() {
    return this.getPref("asciiFilter", false);
  },
  
  get shownInContextMenu() {
    return this.getPref("shownInContextMenu", false);
  },
  set shownInContextMenu(b) {
    this.setPref("shownInContextMenu", b);
    return b;
  }
,
  get service() {
    return this._service || (this._service =
      CC[SERVICE_CTRID].getService(CI.nsISupports).wrappedJSObject);
  }
,
  get cookieManager() {
    return this._cookieManager?this._cookieManager:this._cookieManager=
      CC["@mozilla.org/cookiemanager;1"
        ].getService(CI.nsICookieManager);
  }
,
  get exeFile() {
    if (typeof(this._exeFile) == "object") return this._exeFile;
    const exeName = this.exeName;
    if (!exeName) return this._exeFile = null;
    if (typeof(FlashGotDM.executables[exeName]) == "object") {
      return this._exeFile = FlashGotDM.executables[exeName];
    }
    try {
      const exeFile = CC["@mozilla.org/file/local;1"].createInstance(CI.nsILocalFile);
      exeFile.initWithPath(this.service.profDir.path);
      exeFile.append(exeName);
      if (this.renewExe && exeFile.exists()) {
        try { exeFile.remove(true); } catch(ex) { this.log(ex.message); }
        FlashGotDM.renewableExes.push(exeFile);
      }
      this._exeFile = this.checkExePlatform(exeFile);
      if (this._exeFile != null && this.createExecutable()) {
        this.log(this._exeFile.path + " created");
      }
    } catch(ex) {
      this._exeFile=null;
      this.log("Can't init " + exeName + ":\n" + ex.message);
    }
    return FlashGotDM.executables[exeName] = this._exeFile;
  }
,
  checkExePlatform: function(exeFile) {
    return (FlashGotDMMac.isMac || /(\/.*\.exe)|(\\.*\.sh)$/i.test(exeFile.path)) ? null : exeFile;
  }
,
  get supported() {
    if (typeof(this._supported) == "boolean") return this._supported;
    if (this.customSupportCheck) {
      return this._supported = this.customSupportCheck();
    }
    return this.baseSupportCheck();
  },
  
  baseSupportCheck: function() {
    if (!this.exeName) return true;
    if (!this.exeFile) return false;
    
    var dmtest;
    if (typeof(FlashGotDM.dmtests[this.exeName]) != "string") {
      const dmtestFile = this.service.tmpDir.clone();
      dmtestFile.append(this.exeName + ".test");
      try {
        if (dmtestFile.exists()) {
          try { dmtestFile.remove(false); } catch(rex) {}
        }
        this.launchSupportTest(dmtestFile);
        this.log(dmtest = this.service.readFile(dmtestFile)); 
      } catch(ex) {
        this.log(ex.message);
        dmtest = "";
      }
      FlashGotDM.dmtests[this.exeName] = dmtest;
    } else dmtest = FlashGotDM.dmtests[this.exeName];
    return this._supported = dmtest.indexOf(this.name+"|OK")>-1;
  }
  
,
  launchSupportTest: function (testFile) {
    this.runNative(["-o", testFile.path], true);
  },
  
  shouldList: function() {
    return this.supported;
  }
,
  log: function(msg) {
    this.service.log(msg);
  }
,
  updateProgress: function(links, idx, len) {
    if (!links.progress) return;
    if ((idx % 100) == 0) {
      if (!len) {
        links.progress.update(100);
        return;
      }
      links.progress.update(70 + 29 * idx / len);
    }
  }
,
  isValidLink: null
,
  createJobHeader: function(links, opType) {
    return links.length+";" + this.name + ";" +
      (this.service.getPref(this.codeName + ".quiet." + opType, false)
        ? this.service.OP_QET : opType)
      + ";" + links.folder + ";\n"
  }
,
  createJobBody: function(links) {
    var job="";
    var l, url;
    const len=links.length;
    this.checkCookieSupport();
    var postData = links.postData || "";
 
    for (var j=0; j<len; j++) {
      job += "\n" + (url=(l=links[j]).href) + "\n" +
           l.description + "\n" +
           this.getCookie(l, links) + "\n"
           + postData;
      this.updateProgress(links, j, len);
    }
    return job;
  }
,
  createJob: function(links,opType) {
    var job=this.createJobHeader(links,opType) 
    + this.getReferrer(links)
    + this.createJobBody(links)+"\n";
     if (job.substring(job.length-1)!="\n") {
      job+="\n";
     }
    if (typeof(links.document)=="object") {
      job += links.document.referrer+ "\n" + links.document.cookie;
    } else {
      job+="\n";
    }
    return job;
  }
,
  _bgJob: true,
  get bgJob() {
    return this._bgJob && this.service.bgProcessing; 
  }
,
  download: function(links, opType) {
    try {
      links.folder = links.folder || (links.length > 0 ? this.selectFolder(links, opType) : ""); 
      this.performDownload(links, opType);
    } catch(ex) {
      this.log(ex.message);
    } finally {
      this.updateProgress(links, 0); // 100%
    }
  }
,
  // best override point
  performDownload: function(links, opType) {
    this.performJob(this.createJob(links, opType));
  }
,
  getReferrer: function(links) {
    if (links.redirProcessedBy) {
      for (p in links.redirProcessedBy) {
        if (this.service.getPref("redir.anonymous." + p, false)) return "";
      }
    }
    return this.service.getPref("autoReferrer", true) ?
      (links.referrer || 
        typeof(links.document) == "object" && links.document.URL ||
        links[0] && links[0].href || 
        "about:blank"
      ) : this.service.getPref("fakeReferrer", "");
  }
,
  checkCookieSupport: function() {
    this.getCookie = this.cookieSupport && !this.service.getPref("omitCookies")
    ? this._getCookie
    :function() { return ""; }
    ;
  }
,
  getCookie: function() { return ""; }
,
  _getCookie: function(link,links) {
    if (!this.cookieSupport) return (this.getCookie = function() { return ""; })();
    
    var host, cookies;
    if (cookies = links.cookies) {
      host=link.host;
      if (host) {
        var c = cookies[host];
        return c ? c : "";
      }
      return "";
    }
    
    var j, objCookie;
    const hostCookies = {};
    
    var l, parts;
    for (j=links.length; j-->0;) {
      l = links[j];
      parts = l.href.match(/http[s]{0,1}:\/\/([^\/]+\.[^\/]+)/i); // host?
      if (parts) {
        host = parts[1];
        var hpos = host.indexOf("@");
        if (hpos > -1) host = host.substring(hpos + 1);
        hostCookies[l.host = host] = "";
      } else {
        l.host=null;
      }
    }
    
    var cookieHost,cookieTable,tmpCookie;
    const domainCookies={};

    for (var iter = this.cookieManager.enumerator; iter.hasMoreElements();) {
      if ((objCookie=iter.getNext()) instanceof CI.nsICookie) {
        cookieHost=objCookie.host;
        if (cookieHost.charAt(0)==".") {
          cookieHost=cookieHost.substring(1);
          cookieTable=domainCookies;
          if (typeof(tmpCookie=domainCookies[cookieHost])!="string") {
            tmpCookie="";
          }
        } else {
          if (typeof(tmpCookie=hostCookies[cookieHost])!="string") continue;
          cookieTable=hostCookies;
        }
        cookieTable[cookieHost]=tmpCookie.concat(objCookie.name+"="+objCookie.value+"; ");
      }
    }
    
   
    for (cookieHost in hostCookies) {
      var dotPos;
      for (host=cookieHost; (dotPos=host.indexOf('.'))>=0; ) { 
        if (tmpCookie=domainCookies[host]) {
          hostCookies[cookieHost]+=tmpCookie;
        }
        host=host.substring(dotPos+1);
      }
    }
    
    links.cookies = hostCookies;
    return this.getCookie(link, links);
  }
,
  createJobFile: function(job) {
    const jobFile = this.service.tmpDir.clone();
    jobFile.append("flashgot.fgt");
    jobFile.createUnique(0, 0700);
    this.service.writeFile(jobFile, job);
    return jobFile;
  }
, 
  _waitForNative: true,
  get waitForNative() {
    return this._waitForNative && this.service.bgProcessing;
  }
,
  performJob: function(job) {
    const jobFile = this.createJobFile(job);
    this.runNative([jobFile.path], this.waitForNative);
  }
,
  createExecutable: function() {
    const exeFile = this.exeFile;
    if (!exeFile) return false;

    const ios = CC['@mozilla.org/network/io-service;1'].getService(CI.nsIIOService);
    const bis = CC['@mozilla.org/binaryinputstream;1'].createInstance(CI.nsIBinaryInputStream);
    
    var channel;
    bis.setInputStream((
      channel =
        ios.newChannel("chrome://flashgot/content/" + this.exeName, null, null)
    ).open())
    ;
    const bytesCount = channel.contentLength;
    
    const os = CC["@mozilla.org/network/file-output-stream;1"].createInstance(
      CI.nsIFileOutputStream);
    
    try {
      
      os.init(exeFile,0x02 | 0x08, 0700, 0);
      const bos=CC['@mozilla.org/binaryoutputstream;1'].createInstance(CI.nsIBinaryOutputStream);
      bos.setOutputStream(os);
      bos.writeByteArray(bis.readByteArray(bytesCount),bytesCount);
      bos.close();

    } catch(ioErr) { // locked?
      try {
        if (exeFile.exists()) { // security check: it must be the right exe!
          const testBis=CC['@mozilla.org/binaryinputstream;1'].createInstance(
            CI.nsIBinaryInputStream);
          testBis.setInputStream(
            (channel = ios.newChannelFromURI(ios.newFileURI(exeFile))).open());
          const error=new Error("Old, corrupt or unlegitemately modified "
            + exeFile.path
            + ".\nThe file is locked: please delete it manually\n");
            + ioErr.message;
          if (channel.contentLength != bytesCount) throw error;
         
          const legitimateData = bis.readByteArray(bytesCount);
          const testData=testBis.readByteArray(bytesCount);
          for (var j = bytesCount; j-->0;) {
            if (legitimateData[j] != testData[j]) throw new error;
          }
        } else throw ioErr;
      } catch(unrecoverableErr) {
         this.log("Error creating native executable\n"+exeFile.path+"\n"+unrecoverableErr.message);
      }
    } finally {
      os.close();
      bis.close();
    }
    
    return true;
  }
,
  runNative: function(args, blocking, exeFile) {
    try {
      if (typeof(exeFile)=="object"
        || (exeFile = this.exeFile).exists()
        || this.createExecutable()) {
        const proc=CC['@mozilla.org/process/util;1'].createInstance(
          CI.nsIProcess);
        proc.init(exeFile);
        this.log("Running " + exeFile.path + " " + args.join(" ") + " -- " +(blocking ? "blocking" : "async") );
        proc.run(blocking,args,args.length,{});
        if (blocking && proc.exitValue != 0) {
          this.log("Warning: native invocation of\n"
            +exeFile.path
            +"\nwith arguments <"
            +args.join(" ")
            +">\nreturned "+proc.exitValue);
        }
        return proc.exitValue;
      } else {
        this.log("Bad executable "+exeFile);
      }
    } catch(err) {
      this.log("Error running native executable:\n" + exeFile.path + 
        " "+args.join(" ")+"\n"+err.message);
    }  
    return 0xffffffff;
  }
,
  getWindow: function() {
    return this.service.getWindow();
  }
,
  selectFolder: function(links, opType) { 


    const autoPref_FF = "browser.download.useDownloadDir";
    const autoPref_Moz = "browser.download.autoDownload";
    
    var initialDir = null;
    var downloadDir = null;
    links.quickDownload = false;
    
    const pref = CC["@mozilla.org/preferences-service;1"].getService(CI.nsIPrefBranch);
    
    function findDownloadDir(prefName) {
      try {
        downloadDir = initialDir = pref.getComplexValue(prefName, CI.nsILocalFile);
        return prefName;
      } catch(ex) {
        return "";
      }
    }
    const isMulti = opType != this.service.OP_ONE;
    const multiDirPref = "flashgot.multiDir";
    var downloadDirPref = 
                    (isMulti && findDownloadDir(multiDirPref)) ||
                    findDownloadDir("browser.download.dir") ||
                    findDownloadDir("browser.download.downloadDir") || 
                    findDownloadDir("browser.download.defaultFolder") ||
                    "browser.download.dir"; 
    
    if (isMulti) downloadDirPref = multiDirPref;
    
    try {
      links.quickDownload = pref.getBoolPref(autoPref_FF);
    } catch(noFFEx) {
      try {
        links.quickDownload = pref.getBoolPref(autoPref_Moz);
      } catch(noMozEx) {}
    }
   
    if (!this.askPath[opType]) return "";
    
    if (((!isMulti) || this.service.getPref("multiQuiet", false)) && 
        downloadDir && downloadDir.exists() && downloadDir.isDirectory()  && 
        links.quickDownload) {
      return downloadDir.path;
    }
    
    var title;
    try {
      var bundle = CC["@mozilla.org/intl/stringbundle;1"].getService(CI.nsIStringBundleService);
      bundle = bundle.createBundle("chrome://mozapps/locale/downloads/unknownContentType.properties");
      title = bundle.GetStringFromName("myDownloads");
    } catch(ex) {
      title="Download directory";
    }
    title = "FlashGot (" + this.name + ") - " + title;
    
    const fp = CC["@mozilla.org/filepicker;1"].createInstance(CI.nsIFilePicker);
    const win = this.getWindow();
    fp.init(win, title, CI.nsIFilePicker.modeGetFolder);
    try {
      if (initialDir &&  initialDir.exists() && initialDir.isDirectory()) {
        fp.displayDirectory = initialDir;
      }
    } catch (ex) { this.log(ex); }
    
    fp.appendFilters(CI.nsIFilePicker.filterAll);

    if (fp.show()==CI.nsIFilePicker.returnOK) {
      var localFile = fp.file.QueryInterface(CI.nsILocalFile);
      pref.setComplexValue(downloadDirPref, CI.nsILocalFile, localFile);
      var path=new String(localFile.path);
      path._fgSelected=true;
      return path;
    }
    
    throw new Error("Download cancelled by user");
  },
  sanitizeWinArg: function(a) {
    return a.replace(/([\|\(\) &\^])/g, "^$1"); 
  },
  supportURLList: function(links, argsTemplate) {
    if (/\[[^\]]*UFILE[^\]]*\]/.test(argsTemplate) && links.length) {
      // we must create a file list
      var sep = this.service.isWindows ? "\r\n" : "\n";
      var urlList = "";
      for (j = 0; j < links.length; j++) {
        urlList += links[j].href + sep;
      }
      links.length = 1;
      return this.createJobFile(urlList).path
    }
    return null;
  },
  nativeUI: null,
  hideNativeUI: function(document) {
    if (!(this.nativeUI && this.getPref("hideNativeUI", true))) return;
    this.service.hideNativeUI(document, this.nativeUI);
  }
}




// *** Unix-like DMS ***********************************************************
function FlashGotDMX(name,cmd,argsTemplate) {
  if (arguments.length != 0) {
    this._init(name);
    const cmds = FlashGotDMX.prototype.unixCmds;
    cmds[cmds.length] = {longName: name, shortName: cmd};
    this.unixCmd = cmd;
    if (argsTemplate) this.argsTemplate = argsTemplate;
  }
  if (FlashGotDMMac.isMac) {
    this.createJobFile = FlashGotDMMac.prototype.createJobFile;
  }
}
FlashGotDMX.prototype = new FlashGotDM();
FlashGotDMX.constructor = FlashGotDMX;
FlashGotDMX.prototype.exeName = "flashgot.sh";
FlashGotDMX.prototype.cookieSupport = false;
FlashGotDMX.prototype.askPath = [true, true, true];
FlashGotDMX.prototype.unixCmds = [];
FlashGotDMX.prototype._unixShell = null;
FlashGotDMX.prototype.__defineGetter__("unixShell", function() {
  if(this._unixShell) return this._unixShell;
  const f = CC["@mozilla.org/file/local;1"].createInstance(
    CI.nsILocalFile);
  try {
    f.initWithPath("/bin/sh");
    if (f.exists()) {
      return FlashGotDMX.prototype._unixShell = f;
    }
    this.log(f.path + " not found");
  } catch(ex) {
    this.log(ex.message);
  }
  return null;
});

FlashGotDMX.prototype.argsTemplate = "[URL]";
FlashGotDMX.prototype.launchSupportTest = function(testFile) {
  const cmds = this.unixCmds;
  var script="(\n";
  var cmd;
  for (var j = cmds.length; j-->0;) {
    cmd=cmds[j];
    script+=" [ -x \"`which '"+cmd.shortName+"'`\" ] && echo '"
      +cmd.longName+"|OK' || echo '"+cmd.longName+"|KO'\n"; 
  }
  script+=") > '"+ testFile.path + "'\n"; 
  this.performJob(script, true);
};

FlashGotDMX.prototype.createCmdLine = function(parms) {
  return this.unixCmd + " " +
    this.argsTemplate.replace(/\[(.*?)(URL|REFERER|COOKIE|FOLDER|POST|UFILE)(.*?)\]/g,
      function(all, before, parm, after) {
          v = parms[parm]; 
          return typeof(v) != "undefined" && v != null
            ? before + v + after
            : "";
      }
   ) +" &\n";
};
FlashGotDMX.prototype.shellEsc = function(s) {
  return s?s.replace(/([\\\*\?\[\]\$&<>\|\(\)\{\};"'`])/g,"\\$1").replace(/\s/g,"\\ "):null;
};
FlashGotDMX.prototype.createJob = function(links, opType) {
  const shellEsc = this.shellEsc;
  // basic implementation

  const folder = shellEsc(links.folder);
  const referrer = shellEsc(this.getReferrer(links));
  const postData = shellEsc(links.postData);
  var job = "";
  var l, url;
  this.checkCookieSupport();
  var urlListFile = this.supportURLList(links, this.argsTemplate);
  for (var j = 0, len = links.length; j < len; j++) {
    l = links[j];
    url = l.href;
    job += this.createCmdLine({
      URL: shellEsc(url), 
      REFERER: referrer, 
      COOKIE: shellEsc(this.getCookie(l, links)), 
      FOLDER: folder, 
      POST: postData,
      UFILE: shellEsc(urlListFile)
    });
    this.updateProgress(links, j, len);
  }
  return job;
};
FlashGotDMX.prototype.performJob = function(job, blocking) {
  const jobFile = this.createJobFile("#!" + this.unixShell.path + "\n" + job);
  jobFile.permissions = 0700;
  var exeFile = FlashGotDMMac.isMac ? FlashGotDMMac.exeFile : jobFile;
  this.runNative([],
    this.waitForNative || (typeof(blocking) != "undefined" && blocking),
    exeFile);
};
FlashGotDMX.prototype.checkExePlatform = function(exeFile) {
  return this.unixShell && exeFile;
};
FlashGotDMX.prototype.createExecutable = function() {
  return false;
};



// *** Mac OS X DMS ************************************************************
function FlashGotDMMac(name, creatorId, macAppName) {
  if (arguments.length != 0) {
    this._initMac(name, creatorId, macAppName);
  }
}
FlashGotDMMac.exeFile = null;
FlashGotDMMac.appleScriptFile = null;
FlashGotDMMac.appleScriptName = "flashgot-mac-script";
FlashGotDMMac.OSASCRIPT = "/usr/bin/osascript";
FlashGotDMMac.isMac = (function() {
  const f = CC["@mozilla.org/file/local;1"].createInstance(CI.nsILocalFile);
  try {
    f.initWithPath(FlashGotDMMac.OSASCRIPT);
    return f.exists();
  } catch(ex) {
  }
  return false;
})();
FlashGotDMMac.prototype = new FlashGotDM();
FlashGotDMMac.constructor = FlashGotDMMac;
FlashGotDMMac.prototype.exeName = "FlashGot";
FlashGotDMMac.prototype.renewExe = false;

FlashGotDMMac.prototype.cookieSupport=false;
FlashGotDMMac.prototype.macCreators = [];
FlashGotDMMac.prototype._initMac=function(name, creatorId, macAppName) {
  this._init(name);
 
  if (creatorId) {
    const creators=FlashGotDMMac.prototype.macCreators;
    creators[creators.length] = {name: name, id: creatorId};
  }
  this.macAppName = macAppName ? macAppName : name;
  if (!FlashGotDMMac.appleScriptFile) {
    (FlashGotDMMac.appleScriptFile = this.service.tmpDir.clone())
      .append(FlashGotDMMac.appleScriptName);
  }
   FlashGotDMMac.exeFile = this.exeFile;
};
FlashGotDMMac.prototype.shellEscape = function(s) {
  return "'" + s.replace(/'/g, '"\'"') + "'"; 
}
FlashGotDMMac.prototype.createScriptLauncher = function() {
  return "#!/bin/sh\n" +
    "SCRIPT=" + this.shellEscape(FlashGotDMMac.appleScriptFile.path) + "\n" +
    "USCRIPT=\"$SCRIPT.$$\"\n" + 
    "mv \"$SCRIPT\" \"$USCRIPT\" || exit 1\n" +
    "head -n 1 \"$USCRIPT\" | grep '#!' >/dev/null &&  \"$USCRIPT\" || " +
    FlashGotDMMac.OSASCRIPT + " \"$USCRIPT\"";
};
FlashGotDMMac.prototype.checkExePlatform = function(exeFile) {
  return FlashGotDMMac.isMac && exeFile || null;
};
FlashGotDMMac.prototype.createExecutable = function() {
  const exeFile = this._exeFile;
  if (!exeFile) return false;
  try {
   var scriptLauncher = this.createScriptLauncher();
   var mustCreate = true;
   if (exeFile.exists()) {
     if (this.service.readFile(exeFile) == scriptLauncher) {
       exists = true;
       if (exeFile.isExecutable()) return false;
       mustCreate = false;
     } else {
       this.log(exeFile.path + " is corrupted or obsolete, replacing it...");
       try { exeFile.remove(true); } catch(rex) {} 
     }
   } else {
     this.log(exeFile.path + " not found, creating it...");
   }
   if (mustCreate) {
     this.log("Creating Mac executable");
     exeFile.create(0, 0700);
     this.service.writeFile(exeFile, scriptLauncher);
   }
   this.log("Setting executable permissions on " + exeFile.path);
   exeFile.permissions = 0700;
   return mustCreate;
  } catch(ex) {
    this.log("Cannot create Mac executable: " + ex.message);
  }
  return false;
};
FlashGotDMMac.prototype.launchSupportTest = function(testFile) {
  const creators = FlashGotDMMac.prototype.macCreators;
  const RESP = "    do shell script \"echo >>'" 
    + testFile.path + 
    "' '\" & theName & \"|";
  function response(msg) {
    return RESP + msg + "'\"\n";
  }
  var s = "on test(theName, theCreator)\n"
       +" tell app \"Finder\"\n"
       +"  set theResponse to \"KO\"\n"
       +"  try\n"
       +"   get name of application file id theCreator\n"
       +"   if result contains theName then\n"
       +"     set theResponse to \"OK\"\n"
       +"   end if\n"
       +"  on error\n"
       +"  end try\n"
       +"  do shell script \"echo >>'"+testFile.path+"' '\" & theName & \"|\" & theResponse & \"'\"\n"
       +" end tell\n"
       +"end test\n"
       +"\n";
  for (var j = creators.length; j-- > 0; ) {
     s += 'get test("' + creators[j].name + '","' +creators[j].id + '")\n'; 
   }
   this.performJob(s, true);
};
FlashGotDMMac.prototype.createJobFile = function(job) {
  const jobFile = FlashGotDMMac.appleScriptFile;
  try {
    jobFile.remove(true);
  } catch(ex) {}
  try {
    jobFile.create(0, 0600);
    this.service.writeFile(jobFile, job);
    return jobFile;
  } catch(ex) {
    this.log("Cannot write " + (jobFile && jobFile.path) + ex.message);
  }
  return null;
}
FlashGotDMMac.prototype.performJob = function(job, blocking) {
  if (this.createJobFile(job)) 
    this.runNative([], 
        typeof(blocking) == "boolean" ? blocking : this.waitForNative, 
        this.exeFile);
};

FlashGotDMMac.prototype.createJob = function(links,opType) {
  const referrer = this.getReferrer(links);
  var job = "tell application \""+ this.macAppName+ "\"\n";
  for (var j = 0, len = links.length; j < len; j++) {
    job += 'GetURL "' + links[j].href + '" from "' + referrer  + "\"\n";
    this.updateProgress(links, j, len);
  }
  job += "end tell\n";
  return job;
};



// *** Custom DMS **************************************************************
function FlashGotDMCust(name) {
  if (arguments.length == 0 || (!name) || (!name.length)) return;
  name = name.replace(/,/g, " ");
  this._init(name);
  this.prefsBase = "custom." + this.codeName + ".";
}

FlashGotDMCust.init = function(service) {
  const names = service.getPref("custom", "").split(/\s*,\s*/);
  for (var j = names.length; j-->0;) {
    new FlashGotDMCust(names[j]);
  }
}

FlashGotDMCust.persist = function(service) {
  const dms = FlashGotDM.dms;
  const cdms = [];
  for (var j = dms.length; j-->0;) {
    if (dms[j].custom) cdms.push(dms[j].name);
  }
  service.setPref("custom", cdms.join(","));
}

FlashGotDMCust.prototype = new FlashGotDM();
FlashGotDMCust.constructor = FlashGotDM;

delete FlashGotDMCust.prototype.launchSupportTest;
delete FlashGotDMCust.prototype.exeFile;
FlashGotDMCust.prototype.PLACEHOLDERS = ["URL", "REFERER", "COOKIE", "FOLDER", "POST", "UFILE", "CFILE"];

FlashGotDMCust.prototype.custom = true;
FlashGotDMCust.prototype. _supported = true;
FlashGotDMCust.prototype.cookieSupport = false;
FlashGotDMCust.prototype.postSupport = true;
FlashGotDMCust.prototype.askPath = [true, true, true];

FlashGotDMCust.prototype.__defineGetter__("exeFile",function() {
  try {
    return this.service.prefs.getComplexValue(this.prefsBase + "exe", 
      CI.nsILocalFile);
  } catch(ex) {
    return null;
  }
});
FlashGotDMCust.prototype.__defineSetter__("exeFile",function(v) {
  try {
    if (v) {
      this.service.prefs.setComplexValue(this.prefsBase + "exe", 
          CI.nsILocalFile,v);
      return v;
    }
  } catch(ex) {
    return null;
  }
});

FlashGotDMCust.prototype.__defineGetter__("argsTemplate", function() {
  if (this.forcedTemplate) return this.forcedTemplate;
  var t = this.service.getPref(this.prefsBase+"args", "[URL]");
  return /['"`]/.test(t) ? this.argsTemplate = t : t;
});
FlashGotDMCust.prototype.__defineSetter__("argsTemplate",function(v) {
  if (!v) {
    v = "";
  } else {
    v=v.replace(/['"`]/g,"");
  }
  this.service.setPref(this.prefsBase + "args", v);
  return v;
});


FlashGotDMCust.prototype.download = function(links, opType) {
  const t = this.argsTemplate;
  this.cookieSupport = /\[.*?COOKIE.*?\]/.test(t);
  this.askPath[opType] = /\[.*?FOLDER.*?\]/.test(t);
  var exeFile = this.exeFile;
  // portable hacks
  if (exeFile && !exeFile.exists()) {
    // try changing the first part of path
    var path = exeFile.path;
    var profPath = this.service.profDir.path;
    var pos1, pos2;g
    if (path[1] == ":" && profPath[1] == ":") { 
      // easy, it's Windows, swap drive letter
      path = profPath[0] + path.substring(1);
    } else if(path.indexOf("/mount/") == 0 && profPath.indexOf("/mount/") == 0) {
      pos1 = path.indexOf("/", 7);
      pos2 = profPath.indexOf("/", 7);
      path = "/mount/" + profPath.substring(7, pos2) + path.substring(pos1); 
    } else if((pos1 = path.indexOf("/",1)) > 0 && (pos2 = profPath.indexOf("/", 1)) > 0) {
      path = profPath.substring(0, pos2) + path.substring(pos1);
    } else exeFile = null;
    if (exeFile) {
      exeFile = exeFile.clone().QueryInterface(CI.nsILocalFile).initWithPath(path);
      if (!exeFile.exists()) exeFile = null;
    }
  }
  links.exeFile= (exeFile || 
    (exeFile=this.exeFile=this.locateExeFile())) ? exeFile : null;
  FlashGotDM.prototype.download.call(this, links, opType);
};

FlashGotDMCust.prototype.locateExeFile = function(name) {


  if (!name) name=this.name;
  var title=this.service.getString("custom.exeFile");
  title='FlashGot (' + name + ') - ' + title;
  
  const fp = CC["@mozilla.org/filepicker;1"].createInstance(CI.nsIFilePicker);
  const win = this.getWindow();
  fp.init(win, title, CI.nsIFilePicker.modeOpen);
  fp.appendFilters(CI.nsIFilePicker.filterApps);
  fp.appendFilters(CI.nsIFilePicker.filterAll);

  if (fp.show() == CI.nsIFilePicker.returnOK) {
    var file = fp.file.QueryInterface(CI.nsILocalFile);
    if (file.exists()) {
      return file;
    }
  }
  return null;
};

FlashGotDMCust.prototype._addParts=function(a, s) {
  var parts=s.split(/\s+/);
  var k, p;
  for (k in parts) {
    if ((p = parts[k])) {
      a[a.length] = p;
    }
  }
};

FlashGotDMCust.prototype.makeArgs = function(parms) {
  const args = [];
  var t = this.argsTemplate;
  var j, v, len, s;
  
  var idx;
  
  for (var m; 
      m = t.match( /\[([\s\S]*?)(\S*)\b(URL|REFERER|COOKIE|FOLDER|POST|CFILE|UFILE)\b(\S*?)([\s\S]*?)\]/); 
      t = t.substring(idx + m[0].length) 
     ) {

    if ((idx = m.index) > 0) {
      this._addParts(args, t.substring(0, idx));
    }
    
    v = parms[m[3]];
    if (!v) continue;
    
    this._addParts(args, m[1]);
    args[args.length] = m[2] + v + m[4];
    this._addParts(args, m[5]);
  }
  
  if (t.length) {
    this._addParts(args, t);
  }
  return args;
};

FlashGotDMCust.prototype.createJob = function(links, opType) {
  return { links: links, opType: opType };
};

FlashGotDMCust.prototype.performJob = function(job) {
  const links = job.links;
  const exeFile = links.exeFile;
  if (links.length < 1 || !exeFile) return;
  
  const folder=links.folder;
  const referrer = this.getReferrer(links);
  const postData = links.postData;
  
  this.checkCookieSupport();
  var cookieFile;
  if (this.service.getPref("omitCookies")) {
    cookieFile = null;
  } else {
    cookieFile = this.service.profDir.clone();
    cookieFile.append("cookies.txt");
    cookieFile = cookieFile.path;
  }
 
  var urlListFile = this.supportURLList(links, this.argsTemplate);
  var maxLinks = this.service.getPref(this.prefsBase + "maxLinks", 0);
  if (maxLinks > 0 && links.length > maxLinks) {
    this.log("Too many links (" + links.length + "), cutting to " 
        + this.prefsBase + "maxLinks (" + maxLinks + ")");
    links.length = maxLinks;
  }
  var l;
  for (var j = 0, len = links.length; j < len; j++) {
    l = links[j];
    this.runNative(
      this.makeArgs({
        URL: l.href, 
        REFERER: referrer, 
        COOKIE: this.getCookie(l, links), 
        FOLDER: folder, 
        POST: postData,
        CFILE: cookieFile,
        UFILE: urlListFile
       }),
       false, exeFile);
    this.updateProgress(links, j, len);
  }
};
FlashGotDMCust.prototype.checkExePlatform = function(exeFile) {
  return exeFile;
};
FlashGotDMCust.prototype.createExecutable = function() {
  return false;
};
// End FlashGotDMCust.prototype

// *****************************************************************************
// END DMS CLASSES
// *****************************************************************************

// DMS initialization

FlashGotDM.initDMS = function(service) {
  const isWin = service.isWindows;
  var dm;

  new FlashGotDM("BitComet");

  dm = new FlashGotDM("Download Accelerator Plus");
  dm.nativeUI = "#dapctxmenu1, #dapctxmenu2";
  
  new FlashGotDM("Download Master");
  
  for each (dm in [new FlashGotDM("DTA"), new FlashGotDM("DTA (Turbo)")]) {
    dm.__defineGetter__("supported", 
      function() { 
        return  "dtaIFilterManager" in CI || "@downthemall.net/privacycontrol;1" in CC 
    });
    dm.turboDTA = /Turbo/.test(dm.name);
    dm.nativeUI = dm.turboDTA
      ? "#context-dta-savelinkt, #context-tdta, #dtaCtxTDTA, #dtaCtxSaveT"
      : "#context-dta-savelink, #context-dta, #dtaCtxDTA, #dtaCtxSave";
      
    dm.performDownload = function(links, opType) {
      if(!links.document) {
        this.log("No document found in " + links);
        return;
      }
      var w = links.browserWindow || DOMUtils.getChromeWindow(links.document.defaultView.top);
      if(!(w && w.DTA_AddingFunctions && w.DTA_AddingFunctions.saveLinkArray)) {
        this.log("DTA Support problem: " + w + ", " + (w && w.DTA_AddingFunctions) + ", tb:" +
          w.gBrowser + ", wl:" + w.location + ", wo:" + w.wrappedJSObject + ", " +
            (w && w.DTA_AddingFunctions && w.DTA_AddingFunctions.saveLinkArray));
        return;
      }
      var mlSupport = w.DTA_getLinkPrintMetalink;
      var turbo = this.turboDTA;
      var cs = links.document.characterSet;
      var anchors = [], images = [], l, arr;
      var hash, ml;
      var referrer = this.getReferrer(links);
      var tag;
      var single = opType == this.service.OP_ONE;
      for (var j = 0, len = links.length; j < len; j++) {
        l = links[j];
        arr = single || !(tag = l.tagName) || tag.toLowerCase() == "a" ? anchors : images;
        arr.push({ 
            url: w.DTA_URL ? new w.DTA_URL(l.href, cs) : l.href,
            description: l.description,
            ultDescription: '',
            referrer: referrer
        });
        
        if (arr == anchors && mlSupport && l.href.indexOf("#") > 0) {
          hash = l.href.match(/.*#(.*)/)[1];
          ml = mlSupport(l.href);
          if (ml) {
            arr.push({
              url: w.DTA_URL ? new w.DTA_URL(ml, cs) : ml,
              description: '[metalink] http://www.metalinker.org/',
              ultDescription: '',
              referrer: referrer,
              metalink: true
            });
          }
        }
        this.updateProgress(links, j, len);
      }
      
      w.DTA_AddingFunctions.saveLinkArray(turbo, anchors, images);
    }
  }
  
  new FlashGotDM("FlashGet");
  
  dm = new FlashGotDM("Free Download Manager");
  dm._waitForNative=false;
  
  new FlashGotDM("FreshDownload");
  
  dm=new FlashGotDM("GetRight");
  dm.supportsMetalink = true;
  dm.super_download = FlashGotDM.prototype.download;
  dm.super_createJob = FlashGotDM.prototype.createJob;
  dm.download=function(links, opType) {
    const service = this.service;
    if (opType == service.OP_ONE && !service.getPref("GetRight.quick")) {
      opType = service.OP_SEL;
    }
    this.super_download(links, opType);
  };
  dm.createJob = function(links, opType) {
    const service=this.service;
    var folder=links.folder;
    if (!(folder && folder._fgSelected)) folder = false;
    
    var referrer = this.getReferrer(links);
    
    switch (opType) {
      case service.OP_ONE:
        var job = this.super_createJob(links, opType).replace(/; /g, ";");
        if (this.service.getPref("GetRight.old")) job+="\nold";
        return job;
      case service.OP_SEL:
      case service.OP_ALL:
        var urlList = "";
        var referrerLine = (referrer && referrer.length > 0) ? "\r\nReferer: " + referrer + "\r\n" : "\r\n";
        var l, k, len, decodedURL, urlParts, fileSpec, cookie;
        for (var j = 0; j < links.length; j++) {
          l=links[j];
          
          if (folder) {
            decodedURL=l.href;
            try { decodedURL=decodeURI(decodedURL) } catch(ex) {};
            urlParts = decodedURL.match(/\/\/.+[=\/]([^\/]+\.\w+)/);
            if (!urlParts) urlParts=l.href.match(/.*\/(.*\w+.*)/);
            if (urlParts && (fileSpec=urlParts[1])
              // && (links.length==1 ||  !/\.(php|[\w]?htm[l]?|asp|jsp|do|xml|rdf|\d+)$/i.test(fileSpec))
             ) {  
              urlParts=fileSpec.match(/(.*\.\w+).*/);
              if (urlParts) fileSpec=urlParts[1];
              fileSpec="File: "+folder+"\\"+fileSpec.replace(/[^\w\.-]/g,'_')+"\r\n";
            } else continue;
          } else fileSpec="";
          
          urlList+="URL: "+l.href
            +"\r\nDesc: "+l.description + "\r\n" + fileSpec;
          
            if (l.md5) {
            urlList += "MD5: " + l.md5 + "\r\n";
          }
          if (l.sha1) {
            urlList += "SHA1: " + l.sha1+ "\r\n";
          }
          if (l.metalinks) {
            for (k = 0, len = Math.min(16, l.metalinks.length); k < len; k++) {
              urlList += "Alt: " + l.metalinks[k] + "\r\n";
            }
          } else {
            urlList += referrerLine;
            if (cookie = this.getCookie(l, links)) {
              urlList += "Cookie: " + cookie + "\r\n";
            }
          }
          this.updateProgress(links, j, len);
        }
        var file = service.tmpDir.clone();
        file.append("flashgot.grx");
        file.createUnique(0,0600);
        var charset=null;
        try {
          charset=service.getPref("GetRight.charset",
            service.prefService.QueryInterface(CI.nsIPrefBranch
            ).getComplexValue("intl.charset.default",
              CI.nsIPrefLocalizedString).data);
        } catch(ex) {}
        service.writeFile(file, urlList, charset);
        referrer = file.path;
        break;
    }
    var cmdOpts="/Q";
    if (service.getPref("GetRight.autostart",false)) { // CHECK ME!!!
      cmdOpts+="\n /AUTO";
    }
    return this.createJobHeader({ length: 0, folder: "" },opType) +
      referrer + "\n" + cmdOpts;
  };
  dm.askPath=[false,true,true];
  
  new FlashGotDM("GigaGet");
  
  new FlashGotDM("HiDownload");
  new FlashGotDM("InstantGet");
  
  dm = new FlashGotDM("iGetter Win");
  dm.nativeUI = "#all-igetter, #igetter-link";
  dm.__defineGetter__("supported", function() { return  "nsIGetterMoz" in CI; });
  dm.createJob = function(links, opType) {
    var job = this.getReferrer(links) + "\r\n";
    for (var j=0; j < links.length; j++) {
      job += links[j].href + "\r\n" + links[j].description + "\r\n";
    }
    return job;
  };
  dm.performJob = function(job) {
    const file = this.createJobFile(job);
    delete job;
    CC["@presenta/iGetter"]
              .getService(CI.nsIGetterMoz)
              .NewURL(file.path);
    if (file.exists()) file.remove(0);
  };
  
  new FlashGotDM("Internet Download Accelerator");
  (new FlashGotDM("Internet Download Manager")).postSupport = true;

  var lg2002 = new FlashGotDM("LeechGet 2002");
  var lg2004 = new FlashGotDM("LeechGet");
  lg2004._bgJob = lg2002._bgJob=false;
  lg2004.super_createJob=lg2002.super_createJob=FlashGotDM.prototype.createJob;
  lg2004.createJob=lg2002.createJob = function(links, opType) {
    const service=this.service;
    var referrer;
    switch (opType) {
      case service.OP_ONE:
        return this.super_createJob(links, links.quickDownload?service.OP_ONE:service.OP_SEL);
      case service.OP_SEL:
        var htmlDoc="<html><head><title>FlashGot selection</title></head><body>";
        var l;
        for (var j=0, len=links.length; j<len; j++) {
          l = links[j];
          var des = l.description;
          var tag = l.tagName ? l.tagName.toLowerCase() : "";
          htmlDoc = htmlDoc.concat(tag == "img"
            ? '<img src="' + l.href + '" alt="' + des
              + '" width="' + l.width + '" height="' + l.height +
              "\" />\n"
            : "<a href=\"" + l.href + "\">" + des + "</a>\n");
          this.updateProgress(links, j, len);
        }
        referrer = service.httpServer.addDoc(
          htmlDoc.concat("</body></html>")
        );
        break;
       default:
        referrer = links.document.URL;
        if (referrer.match(/^\s*file:/i)) { // fix for local URLs
          // we serve local URLs through built-in HTTP server...
          return this.createJob(links,service.OP_SEL);
        }
    }
    return this.createJobHeader({ length: 0, folder: "" },opType)+referrer+"\n";
  };
 
  new FlashGotDM("Net Transport");
  new FlashGotDM("Net Transport 2");
  new FlashGotDM("NetAnts");
  new FlashGotDM("Mass Downloader");
  new FlashGotDM("Orbit");
  
  dm = new FlashGotDM("ReGet");
  dm.postSupport = true;
  if("@reget.com/regetextension;1" in CC) {
    try {
      dm.reGetService = CC["@reget.com/regetextension;1"].createInstance(CI.IRegetDownloadFFExtension);
      if (dm.reGetService.isExtensionEnabled()) {
        dm._supported = true;
        dm.performJob = function() {};
        dm.createJob = function(links, opType) {
          this.checkCookieSupport();
          const rg = this.reGetService;
          var l;
          var len = links.length;
          var ref = links.referrer;
          if (len == 1) {
            l = links[0];
            rg.setUrl(l.href);
            rg.setInfo(l.description);
            rg.setCookie(this.getCookie(l, links));
            rg.setReferer(ref);
            rg.setPostData(links.postData);
            rg.setConfirmation(true);
            rg.addDownload();
            return;
          }
          for (var j = 0; j < len; j++) {
            l = links[j];
            rg.addToMassDownloadList(
              l.href,
              ref,
              this.getCookie(l, links),
              l.description,
              "");
            this.updateProgress(links, j, len);
          }
          rg.runMassDownloadList();
        }
      }
    } catch(rgEx) {}
  }
  
  if (isWin) {
    dm = new FlashGotDMCust("Retriever");
    dm.cookieSupport = true;
    dm.askPath = ASK_NEVER;
    dm.custom = false;
    dm._supported = null;
    
    if (service.getPref(dm.prefsBase + "maxLinks", -1000) == -1000) {
      service.setPref(dm.prefsBase + "maxLinks", 10);
    }
    dm.customSupportCheck = function() {
      var wrk;
      try {
        wrk = CC["@mozilla.org/windows-registry-key;1"]
                        .createInstance(CI.nsIWindowsRegKey);
        wrk.open(wrk.ROOT_KEY_CLASSES_ROOT,
             "Retriever.Retriever.jar.HalogenWare\\shell\\Open\\command",
             wrk.ACCESS_READ);
        var cmd = wrk.readStringValue("");
        wrk.close();
        this.jarPath = cmd.replace(/.*-jar "?(.*?\.jar).*/, "$1");
        this.argsTemplate = "[URL] [Referer:REFERER] [Cookie:COOKIE] [post:POST]";
        
        var exeFile = CC["@mozilla.org/file/directory_service;1"].getService(CI.nsIProperties)
          .get("WinD", CI.nsIFile);
        exeFile.append("System32");
        exeFile.append("javaw.exe");
        this.exeFile = exeFile;
        
        return true;
      } catch(e) {
        return false;
      } finally {
        try { wrk.close() } catch(e) {}
      }
    };
    
    dm.makeArgs = function(parms) {
      return ["-jar", this.jarPath].concat(
        FlashGotDMCust.prototype.makeArgs.apply(this, arguments)
      );
    };
  }
  
  const httpFtpValidator = function(url) {
    return /^(http:|ftp:)/.test(url);
  };
  dm = new FlashGotDM("Star Downloader");
  dm.cookieSupport = false;
  dm.isValidLink = httpFtpValidator;
  dm._waitForNative = false;
  
  dm = new FlashGotDM("TrueDownloader");
  dm.isValidLink = httpFtpValidator;
  dm._waitForNative = false;
  
  new FlashGotDM("Thunder");
  new FlashGotDM("Thunder (Old)");
  
  
  if (isWin) {
    dm = new FlashGotDM("WellGet");
    dm.getRelativeExe = function() {
      try {
        return this.service.prefs.getComplexValue("WellGet.path", CI.nsILocalFile);
      } catch(ex) {}
      return null;
    };
    dm.customSupportCheck = function() {
      var wellGetExe = this.getRelativeExe();
      try {
         var currentPath = wellGetExe.path;
         if(wellGetExe.exists() && wellGetExe.isExecutable()) return true;
         
         wellGetExe.initWithPath(this.service.profDir.path.substring(0,2) +
           currentPath.substring(2));
         if (wellGetExe.exists() && wellGetExe.isExecutable()) {
           if(wellGetExe.path != currentPath) {
              this.service.prefs.setComplexValue("WellGet.path",  CI.nsILocalFile, wellGetExe);
           }
           return true;
         }
         return false;
      } catch(ex) {
      }
      
      return !wellGetExe && this.baseSupportCheck();
    };
    dm.createJob = function(links, opType) {
      var job = FlashGotDM.prototype.createJob.call(this, links, opType);
      var wellGetExe = this.getRelativeExe();
      if (wellGetExe) job += "\n" + wellGetExe.path;
      return job;
    };
    dm.shouldList = function() { return true; }
  }
  
  dm = new FlashGotDMX("Aria", "aria", "[-r REFERER] [-d FOLDER] -g [URL]");
  dm.createJob = function(links,opType) {
    return FlashGotDMX.prototype.createJob.call(this,links,opType) + "\nsleep 4\n" + this.unixCmd+" -s &\n";
  };
  dm._waitForNative = false;
  
  dm = new FlashGotDMX("Downloader 4 X (nt)", "nt");
  dm.createJob = function(links,opType) {
    return this.unixCmd + "&\nsleep 1\n" +
      (links.folder && links.folder._fgSelected
      ? this.unixCmd + " -d '" + links.folder + "'\n"
      :"") + 
      FlashGotDMX.prototype.createJob.call(this,links,opType);
  };
  
  dm = new FlashGotDMX("Downloader 4 X","d4x","[--referer REFERER] [--directory FOLDER] [-a URL] [--al POST] [COOKIE]");
  dm.askPath = [false, true, true];
  dm.postSupport = true;
  dm.createJob = function(links, opType) {
    const service = this.service;
    const shellEsc = this.shellEsc;
    const referrer = shellEsc(this.getReferrer(links));
    const folder = links.folder._fgSelected && links.folder || null;
    const quiet = service.getPref(this.codeName + ".quiet",false);
    const len = links.length;
    var job;
    
    if (len>0) {
      
       var urls="";
       for (var j = 0; j < len; j++) {
         urls += " " + shellEsc(links[j].href);
         this.updateProgress(links, j, len);
       }

       var promptURLs_fakePost = null;
       var quietURLs_fakeCookie = null;
       
       if (quiet) {
         quietURLs_fakeCookie = urls;
         urls = null;
       } else if(len>1) {
         promptURLs_fakePost = urls;
         urls = null;
       }
       job = this.createCmdLine({
          URL: urls, 
          REFERER: referrer,
          COOKIE: quietURLs_fakeCookie || null,
          FOLDER: folder,
          POST: promptURLs_fakePost
       });
    } else job = "";
    
    return job;
  };
  
  dm = new FlashGotDMX("GNOME Gwget","gwget");
  dm.askPath = ASK_NEVER;
  dm.createJob=function(links, opType) {
    if (opType == service.OP_ALL) {
      links.length = 1;
      links[0].href = links.document.URL;
      opType = service.OP_ONE;
    }
    return FlashGotDMX.prototype.createJob.call(this, links, opType)
  } 
  
  dm=new FlashGotDMX("KDE KGet","kget");
  dm.askPath = ASK_NEVER;
  
  if (isWin) {
    new FlashGotDM("wxDownload Fast");
  } else {
    dm=new FlashGotDMX("wxDownload Fast", "wxdfast", "[-reference REFERER] [-destination FOLDER] [-list UFILE]");
    dm.askPath = ASK_NEVER;
  }

  dm =new FlashGotDMX("cURL","curl", '-L -O [--referer REFERER] [-b COOKIE] [-d POST] [URL]');
  dm.postSupport = true;
  dm.createJob=function(links,opType) {
    var job="[ -x \"`which 'xterm'`\" ] &&  CURL_CMD='xterm -e curl' || CURL_CMD='curl'\n";
    if (links.folder) job += "cd '" + links.folder + "'\n";
    this.unixCmd = "$CURL_CMD";
    return job + FlashGotDMX.prototype.createJob.call(this,links,opType);
  };
  
  dm =new FlashGotDMX("Wget","wget", '-c [--directory-prefix=FOLDER] [--referer=REFERER] [--post-data=POST] [--load-cookies=CFILE] [--header=Cookie:COOKIE] [--input-file=UFILE]');
  dm.postSupport = true;
  dm.createJob=function(links,opType) {
    var job="[ -x \"`which 'xterm'`\" ] &&  WGET_CMD='xterm -e wget' || WGET_CMD='wget'\n";
    this.unixCmd = "$WGET_CMD";
    return job + FlashGotDMX.prototype.createJob.call(this,links,opType);
  };

  function FlashGotDMSD(version) {
    this._initMac(version > 3 ? "Speed Download" : ("Speed Download " + version), "Spee");
    this.version = version;
    if (version > 2) {
      this.cookieSupport = true;
      this.postSupport = true;
    }
  };
  
  FlashGotDMSD.prototype=new FlashGotDMMac();
  FlashGotDMSD.prototype.createJob = function(links,opType) {
    var job = "tell app \""+ this.macAppName+ "\" to AddURL {";
    var urlList = [];
    var cookieList = [];
    var l;
    for (var j=0,len=links.length; j<len; j++) {
      l=links[j];
      urlList[urlList.length] = '"'+l.href+'"';
      if (this.cookieSupport) {
        cookieList[cookieList.length] = '"'+this.getCookie(l,links)+'"';
      }
      this.updateProgress(links, j, len);
    }
    job+=urlList.join(',')+"}";
    if (this.postSupport) {
      if (links.postData) { 
        job+=' with form data "'+links.postData+'"';
      }
      const referer=this.getReferrer(links);
      if (referer && referer.length) {
        job+=' from "'+referer+'"';
      }
      if (cookieList.length) {
        job+=' with cookies {' + cookieList.join(',') + '}';
      }
    }  
    return job;
  };
  
  new FlashGotDMSD(2);
  new FlashGotDMSD(3);
  new FlashGotDMSD(3.5);
  
  new FlashGotDMMac("iGetter", "iGET");
  
  if ("nsIDownloadManager" in CI) {
    dm = new FlashGotDM("(Built In)");
    dm._supported = true;
    dm.priority = "zzz"; // put on the bottom of the list
    dm.internalRenaming = true;
    dm.askPath = [true, true, true];
    dm.performDownload = function(links, opType) {
      var ios = CC["@mozilla.org/network/io-service;1"].getService(CI.nsIIOService);
      const persistFlags = CI.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
      const dType = CI.nsIDownloadManager.DOWNLOAD_TYPE_DOWNLOAD;
      var postData = links.postStream || null;
      var cs = links.document.characterSet;
      var ref = this.getReferrer(links);
      var refURI = ref && ios.newURI(ref, cs, null) || null;
      var uri, folder, file, m;
      var persist, args;
      var now = Math.round(Date.now() / 1000);
      var dm = CC["@mozilla.org/download-manager;1"].getService(CI.nsIDownloadManager);
      folder = CC["@mozilla.org/file/local;1"].createInstance(CI.nsILocalFile);
      folder.initWithPath(links.folder);
      var mozAddDownload;
      if(dm.startBatchUpdate) {
        mozAddDownload = typeof(dType) == "undefined" 
          ? function(src, dest, des, persist) { return dm.addDownload(src, dest, des, null, now, null, persist); }
          : function(src, dest, des, persist) { return dm.addDownload(dType, src, dest, des, null, null, now, null, persist); }
          ;
        dm.startBatchUpdate();
      } else {
        mozAddDownload = function(src, dest, des, persist) { return dm.addDownload(dType, src, dest, des, null, now, null, persist); };
      }
      var dl;
      for(var j = 0, len = links.length, l; j < len; j++) {
        l = links[j];
        try {
          uri = ios.newURI(l.href, cs, null);
          if(!(uri instanceof CI.nsIURL)) continue;
          file = folder.clone();
          file.append(uri.fileName || uri.filePath.replace(/.*?([^\/]*)\/?$/, '$1') || uri.host);
          if(this.internalRenamig)
            for (;;) {
              if(!file.exists()) {
                file.create(0, 0644);
                break;
              } else { // rename
                m = file.leafName.match(/(.*?)(?:\((\d+)\))?(\.[^\.]+$|$)/);
                file.leafName = m[1] + "(" + ((m[2] && parseInt(m[2]) || 0) + 1) + ")" + m[3]; 
              }
            }
          persist = CC["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(CI.nsIWebBrowserPersist);
          persist.persistFlags = persistFlags;
          
          persist.progressListener = dl = 
            mozAddDownload(uri, ios.newFileURI(file), l.description, persist)
              .QueryInterface(CI.nsIWebProgressListener);
          persist.saveURI(uri, null, // cachekey
                  refURI, postData, null, file);
          this.updateProgress(links, j, len);
        } catch (e) {
          this.service.log("Skipping link " + l.href + ": " + e);
        }
      }
      if(dm.endBatchUpdate) dm.endBatchUpdate();
      if(dm.flush) dm.flush();
      if(this.getPref("showDM", true) && dm.open) { // we skip this for Fx 3 (enough feedback by default)
        try { // SeaMonkey
          dm.open(links.browserWindow, dl);
        } catch(e1) {
          try { // Firefox 2
            links.browserWindow.document.getElementById("Tools:Downloads").doCommand();
          } catch(e2) {}
        }
      }
    };
  }
  
  FlashGotDMCust.init(service);
  
  service.sortDMS();
  
  dm = null;
};

// *****************************************************************************
// HTTP interceptor (nsIURIContentListener + http-on-modify-request observer)
// *****************************************************************************

function HttpInterceptor(service) {
  this.service = service;

  CC["@mozilla.org/uriloader;1"].getService(
    CI.nsIURILoader).registerContentListener(this);
}

HttpInterceptor.prototype = {
  service: null,
  
  autoStart: false,
  interceptAll: true,
  bypassAutoStart: false,
  forceAutoStart: false,
  
  lastPost: null, // last uploadChannel
 
  interfaces: [
    CI.nsIURIContentListener,
    CI.nsIObserver, 
    CI.nsISupportsWeakReference,
    CI.nsISupports
  ],
  
  QueryInterface: function(iid) {
     xpcom_checkInterfaces(iid, this.interfaces, Components.results.NS_ERROR_NO_INTERFACE);
     return this;
  },
  
  setup: function() { // profile initialization
    this.autoStart = this.service.getPref("autoStart", false);
    this.interceptAll = this.service.getPref("interceptAll", true);
  },
  
  dispose: function() {
    CC["@mozilla.org/uriloader;1"].getService(
        CI.nsIURILoader).unRegisterContentListener(this);
  },
  
  log: function(msg) {
    this.service.log(msg);
  },
  
  _shouldIntercept: function(contentType) {
    dump("FG: _shouldIntercept("+contentType+")\n");
    if (this.bypassAutoStart) return false;
    const service = this.service;
    if (!(service.DMS && service.DMS.found)) return false;
    if (this.forceAutoStart) return true;
    
    if (!this.autoStart) return false;
    
    if (this.interceptAll &&
      !/\bxpinstall|text|xml|vnd\.mozilla\b/.test(contentType)) {
      return true;
    }

    if (contentType == "application/x-unknown-content-type" || /\b(?:xml|rss)\b/.test(contentType)) return false;
    var ms = CC['@mozilla.org/uriloader/external-helper-app-service;1']
                     .getService(CI.nsIMIMEService);
    const exts = service.extensions;
    for (var j = exts.length; j-- > 0;) {
      try{
        if (contentType == ms.getTypeFromExtension(exts[j])) return true;
      } catch(e) {}
    }
  }
, 
  _willHandle: function(url, contentType) {
    if (!/^(http|https|ftp|sftp|rtsp|mms):/i.test(url) ) {
      if ((/^\s*javascript/i).test(url)) this.log("JavaScript url intercepted: "+url);
      return false;
    }
    return true;
  }
,
  extractPostData: function(channel, res) {
    res = res || {};
    res.postData = res.postStream = null;
    if (channel instanceof CI.nsIUploadChannel &&
       channel.uploadStream instanceof CI.nsISeekableStream) {
      this.log("Extracting post data...");
      try {
        res.postStream = channel.uploadStream;
        res.postStream.seek(0, 0);
        const sis=CC['@mozilla.org/scriptableinputstream;1'].createInstance(CI.nsIScriptableInputStream);
        sis.init(res.postStream);
        var postData  = sis.read(sis.available()).replace(/\s$/,'').split(/[\r\n]/);
        res.postStream.seek(0, 0);
        res.postData = postData[postData.length - 1];
      } catch(ex) {
        this.log(ex.message);
      } finally {
         sis.close();
      }
    }
    return res;
  },
  /* nsIURIContentListener */
  
  canHandleContent: function(contentType, isContentPreferred, desiredContentType) {
    dump("FG: canHandleContent "+contentType+")\n");
    return this._shouldIntercept(contentType);
  }
,
  lastRequest: null,
  doContent: function(contentType, isContentPreferred, channel, contentHandler) {

    channel.QueryInterface(CI.nsIChannel);
    const uri = channel.URI;
    dump("FG: doContent " +contentType + " " + uri.spec + "\n");
    if (!this._willHandle(uri.spec, contentType)) {
      throw new Error("FlashGot not interested in " + contentType + " from " + uri.spec);
    }
    
    this.log("Intercepting download...");

    const pathParts=uri.path.split(/\//);
    var links = [ {
     href: channel.URI.spec, 
     description: pathParts[pathParts.length-1],
    } ];
    
    
    
    
    if (channel instanceof CI.nsIHttpChannel) {
      links.referrer = channel.referrer && channel.referrer.spec || "";
      this.extractPostData(channel, links);
      try {
        links.document = channel.notificationCallbacks.QueryInterface(
            CI.nsIInterfaceRequestor).getInterface(
            CI.nsIDOMWindow).document;
        links.browserWindow = DOMUtils.getChromeWindow(document.defaultView.top);
      } catch(e) {
        this.log("Can't set referrer document for " + links[0].href + " from " + links.referrer);
      }
    } 
    var firstAttempt;
    if (contentHandler) {
      this.lastRequest = null;
      firstAttempt = true;
      this.forceAutoStart = false;
    } else {
      var requestLines = [ channel.requestMethod, links[0].href, links.referrer || "", links.postData || ""].join("\n\n");
      firstAttempt = this.lastRequest != requestLines;
      this.lastRequest = requestLines;
    }
    
    if (firstAttempt) {
       var self = this;
       this.service._delay(function() {
          self.forceAutoStart = false;
          if(self.service.download(links))
            self.log("...interception done!");
        }, 10);
    } else {
      dump("Second attempt, skipping.\n");
      this.lastRequest = null;
      this.forceAutoStart = false;
    }
    
    if (!channel.isPending()) { 
      try {
        channel.requestMethod = "HEAD";
        channel.loadFlags = CI.nsIChannel.LOAD_RETARGETED | CI.nsIChannel.LOAD_RETARGETED_DOCUMENT_URI | CI.nsICachingChannel.LOAD_ONLY_FROM_CACHE;
      } catch(e) {}
    }
    channel.cancel(NS_BINDING_ABORTED); 

    this.log("Original request cancelled.");
    
    return true;
  },
  contentHandler: {
      onStartRequest: function(request, context) { 
        throw "cancelled"; 
      }, 
      onStopRequest: function() {}, 
      onDataAvailable: function() {}
   }
,
  isPreferred: function(contentType, desiredContentType) {
    dump("FG: isPreferred("+contentType+","+desiredContentType+")\n");
    return this._shouldIntercept(contentType);
  }
,
  onStartURIOpen: function(uri) {
    dump("FG: onStartURIOpen "+ uri + (uri && uri.spec) + "\n");
    return false;
  }
,
  /* http-on-modify-request Observer */
  observe: function(channel, topic, data) {
    if (channel instanceof CI.nsIHttpChannel) {
      
      if (this.forceAutoStart) {
        this.doContent("flashgot/forced", true, channel, null);
        return;
      }
      if (channel instanceof CI.nsIUploadChannel) {
        this.lastPost = channel;
      }
    }
  }
}




// *****************************************************************************
// XPCOM Service
// *****************************************************************************

const SHUTDOWN = "profile-before-change";
const STARTUP = "profile-after-change";

function FlashGotService() {
  
  const osvr=CC['@mozilla.org/observer-service;1'].getService(
    CI.nsIObserverService);
  
  osvr.addObserver(this, SHUTDOWN, false);
  osvr.addObserver(this, "xpcom-shutdown", false);
  osvr.addObserver(this, STARTUP, false);
  
  this.interceptor = new HttpInterceptor(this);
  osvr.addObserver(this.interceptor, "http-on-modify-request", true);
  
  
}

FlashGotService.prototype = {
  OP_ONE: 0, 
  OP_SEL: 1,
  OP_ALL: 2,
  OP_QET: 3
,
  VERSION: "0.8.1"
,
  domUtils: DOMUtils,
  get wrappedJSObject() {
    return this;
  }
,
  unregister: function() {
    try {
      const osvr=CC['@mozilla.org/observer-service;1'].getService(
      CI.nsIObserverService);
      osvr.removeObserver(this, SHUTDOWN);
      osvr.removeObserver(this, "xpcom-shutdown");
      osvr.removeObserver(this, STARTUP);
      osvr.removeObserver(this.interceptor, "http-on-modify-request");
      this.interceptor.dispose();
      this.interceptor = null;
    } catch(ex) {
      this.log("Error unregistering service as observer: "+ex);
    }
  }
,
  QueryInterface: function(iid) {
     xpcom_checkInterfaces(iid, SERVICE_IIDS, Components.results.NS_ERROR_NO_INTERFACE);
     return this;
  }
,
  /* nsIObserver */  
  observe: function(subject, topic, data) {
    if (subject == this.prefs) {
      this.syncPrefs(data);
    } else {
      switch (topic) {
        case "xpcom-shutdown":
          this.unregister();
          break;
        case SHUTDOWN: 
          this.cleanup();
          break;
        case STARTUP:
          this.initGlobals();
          this.interceptor.setup();
          break;
      }
    }
  }
,
  syncPrefs: function(name) {
    this.logEnabled = this.getPref("logEnabled", true);
    if (name) {
      switch (name) {
        case "hide-icons":
          var w;
          for (var wins = this.windowMediator.getEnumerator(null); wins.hasMoreElements();) {
             w=wins.getNext();
             if (typeof(w.gFlashGot)=="object" && w.gFlashGot.toggleMainMenuIcon) {
               w.gFlashGot.toggleMainMenuIcon();
             }
          }
        break;
        
        case "autoStart":
        case "interceptAll":
          this.interceptor[name] = this.getPref(name);
        break;
      }
    }
  }
,
  
  get defaultDM() {
    return this.getPref("defaultDM",null);
  }
,
  set defaultDM(name) {
    this.setPref("defaultDM", name);
    return name;
  }
,
  get tmpDir() {
    return this.globals.tmpDir; 
  }
,
  get profDir() {
    return this.globals.profDir; 
  }
,

  get isWindows() {
    return ("nsIWindowsShellService" in CI) || ("@mozilla.org/winhooks;1" in CC);
  }
,
  get DMS() {
    return this.globals.DMS;
  }
,
  get extensions() {
    var s = this.getPref("extensions", "");
    return s ? s.split(',') : [];
  }
,
  set extensions(v) {
    var arr=null;
    var s = typeof(v)=="string" 
      ? v : typeof(v)=="object" && typeof(v.join) == "function" 
        ? (arr=v).join(',').replace(/[^\w\-,]/g,"") : "";
    this.setPref("extensions", s);
    return arr ? arr:[];
  }
,
  extractIds: function(css) {
    var ids = css.match(/#[^ ,]+/g);
    for(var j = ids.length; j-- > 0; ids[j] = ids[j].substring(1));
    return ids;
  },
  hideNativeUI: function(document, selectors) {
    var s = selectors + " {display: none !important}";
    if("nsIDownloadManagerUI" in CI) { // Toolkit, sync stylesheets
      this.domUtils.updateStyleSheet(s, true);
    } else {
      for each (var id in this.extractIds(selectors)) try {
        document.getElementById(id).style.display = "none";
      } catch(e) {}
    }
    (document._FlashGot_NativeUI_styleSheets || 
      (document._FlashGot_NativeUI_styleSheets = [])
    ).push(s);
  },
  restoreNativeUIs: function(document) {
     var ss = document._FlashGot_NativeUI_styleSheets;
     if(!ss) return;
     var toolkit = "nsIDownloadManagerUI" in CI;
     var id;
     for each (var s in ss) {
       if(toolkit) {
         this.domUtils.updateStyleSheet(s, false);
       } else {
          for each (id in this.extractIds(s)) try {
            document.getElementById(id).style.display = "";
          } catch(e) {}
       }
     }
     document._FlashGot_NativeUI_styleSheets = null;
  },
  
  addExtension: function(ext) {
    if (ext) {
      var extensions = this.extensions;
      if (!this.extensionExists(ext, extensions)) {
        extensions[extensions.length] = ext;
        extensions.sort();
        this.extensions=extensions;
        return true;
      }
    }
    return false;
  }
,
  removeExtension: function(ext) {
    var extensions = this.extensions;
    var j=this.indexOfExtension(ext,extensions);
    if (j>-1) {
      extensions.splice(j,1);
      this.extensions=extensions;
      return true;
    }
    return false;
  }
,
  extensionExists: function(ext,extensions) {
    return this.indexOfExtension(ext,extensions)>-1;
  }
,
  indexOfExtension: function(ext, extensions) {
    var ext = ext.toLowerCase();
    if (typeof(extensions) != "object") extensions = this.extensions;
    for (var j=extensions.length; j-->0;) {
      if (extensions[j].toLowerCase() == ext) return j;
    }
    return -1;
  }
,
  _httpServer: null,
  get httpServer() {
    if (typeof(FlashGotHttpServer) != "function") {
      CC["@mozilla.org/moz/jssubscript-loader;1"]
          .getService(CI.mozIJSSubScriptLoader)
          .loadSubScript("chrome://flashgot/content/flashgotHttpServer.js", null);
    }
    return ((!this._httpServer) || this._httpServer.isDown) ?
       this._httpServer=new FlashGotHttpServer(this)
      :this._httpServer;
  }

,
  download: function(links, opType, dmName) {
    
    switch (links.length) {
      case 0: 
        return false;
      case 1: 
        opType = this.OP_ONE; 
        break;
      default:
        if (!opType) opType = this.OP_SEL;
    }
    
    if (!dmName) dmName=this.defaultDM;
    const dm = this.DMS[dmName];
    if (!dm) {
      this.log("FlashGot error: no download manager selected!");
      return false;
    }
    
    // surrogate missing attributes
    
    if (!links.progress) {
      links.progress = { update: function() {} };
    } else {
      links.progress.update(12);
    }
    
   
    var service = this;
    this._delay(function(t) { service._downloadDelayed(links, opType, dm); }); 
    return true;
  },
  
  _downloadDelayed: function(links, opType, dm) {
    
     if (!links.postData) { 
      links.postData = null;
    } else if(!dm.postSupport) {
      // surrogate POST parameters as query string
      links[0].href += (links[0].href.indexOf("?") > -1 ?  "&" : "?") + links.postData;
    }

    const encodedURLs = this.getPref(dm.codeName+".encode", this.getPref("encode", true));

    const extFilter = this.getPref("extfilter", false) && !this.interceptor.interceptAll ?
        new RegExp("\.(" +
          this.extensions.join("|").replace(/[^\w-|]/,"") + 
          ")\\b", "i") : null;
    
    var logMsg = "Processing "+links.length+" links ";
    if (this.logEnabled && typeof(links.startTime) == "number") {
      logMsg += "scanned in ms" + (Date.now() - links.startTime);
    }
    
    

    if (!links.startTime) links.startTime = Date.now();
    const pg = links.progress;
    
    const escapeCheckNo=/(%[0-9a-f]{2,4})/i;
    const escapeCheckYes=/[\s]+/;
    
    var len = links.length;
    
    var filters = null;
    
    if (len > 1) {
      filters = [];
      
      const isValid = dm.isValidLink; 
      if (isValid)  filters.push(function() { return isValid(href) });
      
      if (extFilter) filters.push(function() { return extFilter.test(href) });
      
      if (filters.length) {
        filters.doFilter = function(href) {
          for (var j = this.length; j-- > 0;) if(!this[j](href)) return false;
          return true;
        }
      } else {
        filters = null;
      }
    }

    const map = {};
    
    var k, j, l, href, ol, pos1, pos2;
    var jCount;
    // divide et impera :)
    var chunkLen = 100;
    const chunks = Math.ceil(len / chunkLen); 
    j = 0;
    for (k = 1; k <= chunks; k++) {
      if (k == chunks) chunkLen = len % chunkLen;
      if (j > 0) {
        pg.update(10 + 20 * j / len);
      }
     
      for (jCount = j + chunkLen; j < jCount; j++) {
        l = links[j];
        l._pos = j;
        href = l.href;
        if ((!filters) || filters.doFilter(href)) {
          ol = map[href];
          if (ol) { // duplicate, keep the longest description
            if (ol.description.length < l.description.length) {
              map[href] = l;
              l.href = ol.href; // keep sanitizations
            }
          } else {
            map[href] = l;
            
            // encoding checks
            try {
              if (encodedURLs) { 
                if (escapeCheckYes.test(href) || !escapeCheckNo.test(href)) { 
                  href = encodeURI(href);
                }
                // workaround for malformed hash urls
                while ((pos1 = href.indexOf("#")) > -1 // has fragment?
                  && href[pos1 + 1] != "!" // skip metalinks!
                  && (href.indexOf("?") > pos1 || pos1 != href.lastIndexOf('#')) // fragment before query or double fragment ? 
                ) {
                  href = href.substring(0, pos1) + '%23' + href.substring(pos1 + 1);
                }
                l.href = href;
              } else {  
                l.href = decodeURI(href);
              }
            } catch(e) {
              dump("Problem "
                + ( encodedURLs ? "escaping" : "unescaping")
                + " URL " + href + ": "+ e.message + "\n");
            }
          }
        }
      }
    }
    
    links.length = 0;
    for (href in map) links[links.length] = map[href];
    
    if(dm.asciiFilter) {
      for(j = links.length; j-- > 0;) {
        l = links[j];
        if(l.description) 
          l.description = l.description.replace(/[^\u0020-\u007f]/g, "") || l.href;
      }
    }
    this._processRedirects(links, opType, dm);
  },
  
  _processRedirects: function(links, opType, dm) {
    links.progress.update(30);
    var service = this;
    this._delay(function() {
      new RedirectContext(links, opType, dm, function(processedBy) {
        links.redirProcessedBy = processedBy;
        service._sendToDM(links, opType, dm);
        service = null;
      }).process();
    });
  },
  
  get _redirectContext() { return RedirectContext }, // ease debug
  
  _sendToDM: function(links, opType, dm) {
    
    if (this.getPref("httpauth", false)) {
      dm.log("Adding authentication info");
      this._addAuthInfo(links);
    }
    
    if (dm.supportsMetalink && this.getPref("metalink", true)) {
      dm.log("Adding metalink info");
      if (this._processMetalinks(links)) {
        opType = this.OP_SEL; // force "ask path"
      }
    }
    
    if (links.length>1) {
      dm.log("Sorting again "+links.length+" links");
      links.sort(function(a,b) {
        a=a._pos; b=b._pos;
        return a>b?1:a<b?-1:0;
      });
    }

    links.progress.update(70);
    
    dm.log("Preprocessing done in ms" + (Date.now() - links.startTime) );
    
    // "true" download
    this._delay(function(t) {
        dm.log("Starting dispatch");
        var startTime = Date.now();
    
        dm.download(links, opType);

        var now = Date.now();
        var logMsg = "Dispatch done in ms" + (now - startTime);
        if (typeof(links.startTime) == "number") { 
          logMsg += "\nTotal processing time: ms" + (now - links.startTime);
        }  
        dm.log(logMsg);
      });
  },
  
  _addAuthInfo: function(links) {
    const httpAuthManager = CC['@mozilla.org/network/http-auth-manager;1']
                              .getService(CI.nsIHttpAuthManager);
    const ioService = CC["@mozilla.org/network/io-service;1"]
                        .getService(CI.nsIIOService);
    var uri;
    var udom = {};
    var uname = {};
    var upwd = {};
    var l;
    for (var j = links.length; j-- > 0;) {
      l = links[j];
      try {
        uri = ioService.newURI(l.href, null, null);
        if (l.userPass && l.userPass.indexOf(":") > -1) continue;
        httpAuthManager.getAuthIdentity(uri.scheme, uri.host, uri.port < 0 ? (uri.scheme == "https" ? 443 : 80) : uri.port, null, null, uri.path, udom, uname, upwd);
        this.log("Authentication data for " + uri + " added.");
        l.href = uri.scheme + "://" + uname.value + ":" + upwd.value + "@" + 
                 uri.host + (uri.port < 0 ? "" : (":" + uri.port)) + uri.spec.substring(uri.prePath.length);
      } catch(e) {}
    }
  },
  _processMetalinks: function(links) {
    var hasMetalinks = false;
    var l, k, href, pos, parts, couple, key;
    for (var j = links.length; j-- > 0;) {
       l = links[j];
       href = l.href;
       pos = href.indexOf("#!");
       if (pos < 0) continue;
       parts = href.substring(pos + 2).split("#!");
       if (parts[0].indexOf("metalink3!") == 0) continue; // per Ant request
       
       hasMetalinks = true;
       l.metalinks = [];
       for (k = 0; k < parts.length; k++) {
         couple = parts[k].split("!");
         if (couple.length != 2) continue;
         key = couple[0].toLowerCase();
         switch (key) {
           case "md5": case "sha1":
             l[key] = couple[1];
             break;
           case "metalink":
            if (/^(https?|ftp):/i.test(couple[1])) {
              l.metalinks.push(couple[1]);
            }
            break;
         }
       }
    }
    return links.hasMetalinks = hasMetalinks;
  }
,
  _delay: function(callback, time) {
     var timerCallback = { notify: callback }; 
     CC["@mozilla.org/timer;1"].createInstance(CI.nsITimer)
              .initWithCallback(timerCallback, time || 0, CI.nsITimer.TYPE_ONE_SHOT);
  }
,
  yield: function() {
    try {
      const eqs = CI.nsIEventQueueService;
      if (eqs) {
        CC["@mozilla.org/event-queue-service;1"]
          .getService(eqs).getSpecialEventQueue(eqs.UI_THREAD_EVENT_QUEUE)
          .processPendingEvents();
      } else {
        const curThread = CC["@mozilla.org/thread-manager;1"].getService().currentThread;
        while (curThread.hasPendingEvents()) curThread.processNextEvent(false);
      }
    } catch(e) {}
  },
  
  
  
  get bgProcessing() {
    return false;
      // this.getPref("bgProcessing", true);
  }
,
  get prefService() {
    return CC["@mozilla.org/preferences-service;1"].getService(
      CI.nsIPrefService);
  }
,
  savePrefs: function() {
    return this.prefService.savePrefFile(null);
  }
,
  getPref: function(name, def) {
    const IPC = CI.nsIPrefBranch;
    const prefs = this.prefs;
    try {
      switch (prefs.getPrefType(name)) {
        case IPC.PREF_STRING:
          return prefs.getCharPref(name);
        case IPC.PREF_INT:
          return prefs.getIntPref(name);
        case IPC.PREF_BOOL:
          return prefs.getBoolPref(name);
      }
    } catch(e) {}
    return def;
  }
,
  setPref: function(name,value) {
    const prefs=this.prefs;
    switch (typeof(value)) {
      case "string":
          prefs.setCharPref(name,value);
          break;
      case "boolean":
        prefs.setBoolPref(name,value);
        break;
      case "number":
        prefs.setIntPref(name,value);
        break;
      default:
        throw new Error("Unsupported type "+typeof(value)+" for preference "+name);
    }
  }
,
  _bundle: null,
  get bundle() {
    if (!this._bundle) {
      function getBundle(url) {
        try {
          var bundle = bs.createBundle(url);
          bundle.GetStringFromName("flashgot");
        } catch(ex) {
          dump("\n"+ex+"\n");
          bundle = null;
        }
        return bundle;
      }
      
      var bs = CC["@mozilla.org/intl/stringbundle;1"].getService(
        CI.nsIStringBundleService);
      if (! ( 
            (this._bundle=getBundle("chrome://flashgot/locale/flashgot.properties") )
            || (this._bundle=bs.createBundle("chrome://flashgot/content/en-US/flashgot.properties"))
            )
        ) {
        this._bundle = {
          formatStringFromName: function(name,parms) {
            return name+" ["+parms.join(',')+"]"
          },
          GetStringFromName: function(name) {
            return name;
          }
        };
      }
    }
    return this._bundle;
  }
,
  getString: function(name,parms) {
    const bundle=this.bundle;
    try {
      return (parms
          ?bundle.formatStringFromName(name,parms,parms.length)
          :bundle.GetStringFromName(name));
    } catch(ex) {
      return "???";
    }
  }
,
  _logFile: null,
  get logFile() {
    if (this._logFile==null) {
      this._logFile=this.profDir.clone();
      this._logFile.append("flashgot.log");
    }
    return this._logFile;
  }
,
  logStream: null,
  logEnabled: false,
  log: function(msg) {
    if (this.logEnabled) {
      try {
        if (!this.logStream) {
          const logFile=this.logFile;
          const logStream=CC["@mozilla.org/network/file-output-stream;1"
            ].createInstance(CI.nsIFileOutputStream );
          logStream.init(logFile, 0x02 | 0x08 | 0x10, 0600, 0 );
          this.logStream=logStream;
          const header="*** Log start at "+new Date().toGMTString()+"\n";
          this.logStream.write(header,header.length);
        }
        
        if (msg!=null) {
          msg+="\n";
          this.logStream.write(msg,msg.length);
        }
        this.logStream.flush();
      } catch(ex) {
        dump(ex.message+"\noccurred logging this message:\n"+msg);
      }
    }
  }
,
  dumpStack: function(msg) {
    dump( (msg?msg:"")+"\n"+new Error().stack+"\n");
  }
,
  clearLog: function() {
    try {
      if (this.logStream) {
        try {
          this.logStream.close();
        } catch(eexx) {
          dump(eexx.message);
        }
      }
      if (this.logFile) this.logFile.remove(true);
      this.logStream=null;
      this.log(null);
    } catch(ex) { dump(ex.message); }
  } 
,
  get windowMediator() {
    return CC["@mozilla.org/appshell/window-mediator;1"
      ].getService(CI.nsIWindowMediator);
  }
,
  getWindow: function() {
    return this.windowMediator.getMostRecentWindow(null);
  }
,
  _globals: null,
  get globals() {
    if (!this._initialized) {
      this.initGlobals();
    }
    return this._globals;
  }
,
  PREFS_BRANCH: "flashgot."
,
  _prefs: null,
  get prefs() {
    return this._prefs || (this._prefs = this.prefService.getBranch(this.PREFS_BRANCH).QueryInterface(CI.nsIPrefBranchInternal));
  }
,
  _initialized: false,
  initGlobals: function() {
    if (this._globals || this._initialized) return;
    
    function prepareTmp(t) {
      t.append("flashgot."+encodeURI(profDir.leafName).replace(/%/g,"_"));
      if (t.exists()) {
       if (!t.isDirectory()) t.createUnique(1, 0700);
      } else {
        t.create(1,0700);
      }
      return t;
    }
    
    try {
      const startTime = Date.now();
      const prefs = this.prefs;

      
      const fileLocator = CC["@mozilla.org/file/directory_service;1"].getService(
        CI.nsIProperties);
      const profDir = fileLocator.get("ProfD",CI.nsIFile);
     
      var tmpDir;
      try {
        tmpDir = prepareTmp(prefs.getComplexValue("tmpDir", CI.nsILocalFile));
      } catch(ex) {
        tmpDir = prepareTmp(fileLocator.get("TmpD", CI.nsILocalFile));
      }
       
      this._globals={
        tmpDir: tmpDir,
        profDir: profDir,
        prefs: prefs
      };
      
      prefs.addObserver("", this, false);
      this.syncPrefs();
      
      this.log("Per-session init started");
        
      this._setupLegacyPrefs();

      this._globals.DMS = this.checkDownloadManagers(true, false);
      this.log("Per-session init done in " + (Date.now() - startTime) + "ms");
    } catch(initEx) {
      this._initException = initEx;
      try { this.log(initEx); } catch(e) {}
    }
    this._initialized=true; 
  }
,
  dispose: function() {
    this.prefs.removeObserver("",this);
    this._prefs=null;
    this._initialized=false;
    this._globals=null;
  }
,
  createCustomDM: function(name) {
    const dm = new FlashGotDMCust(name);
    if (name && name.length) {
      FlashGotDMCust.persist(this);
      this.sortDMS();
      this.checkDownloadManagers(false, false);
    }
    return dm;
  }
,
 removeCustomDM: function(name) {
   const dms = FlashGotDM.dms;
   for (var j = dms.length; j-->0;) {
     if (dms[j].custom && dms[j].name == name) {
       dms.splice(j, 1);
       delete dms[name];
     }
   }
   FlashGotDMCust.persist(this);
   this.checkDownloadManagers(false, false);
 }
,
  sortDMS: function() {
    FlashGotDM.dms.sort(function(a,b) { 
      a = a.priority || a.name.toLowerCase(); 
      b = b.priority || b.name.toLowerCase();
      return a > b ? 1 : a < b ?-1 : 0; 
    });
  }
, 
  checkDownloadManagers: function(init, detect) {
    
    if (init || detect) FlashGotDM.init(this);
    
    const dms = FlashGotDM.dms;
    dms.found = false;
    var defaultDM = this.defaultDM;
    if (!dms[defaultDM]) defaultDM = null;
    
    detect = detect || this.getPref("detect.auto", true);
 
    var j, dm;
    var cache;
    
    if (!detect) {
      cache = this.getPref("detect.cache", "").split(",");
      for (j = dms.length; j-- > 0;) {
        dm = dms[j];
        if (!dm.custom) dm._supported = false;
      }
      var name;
      for (j = cache.length; j-- > 0;) {
        name = cache[j];
        if (name.length && typeof(dm = dms[name])=="object" && dm.name == name) {
          dm._supported = true;
        }
      }
    }
    
    cache = [];
    var exclusive;
    var firstSupported=null;
    for (j = dms.length; j-- >0;) {
      dm=dms[j];
      if (dm.supported) {
        dms.found = true;
        cache[cache.length] = firstSupported = dm.name;
        if (dm.exclusive) exclusive=true;
      } else {
        this.log("Warning: download manager " + dm.name + " not found");
        if (defaultDM == dm.name) {
          defaultDM = null;
          this.log(dm.name + " was default download manager: resetting.");
        }
      }
    }
    
    this.setPref("detect.cache", cache.join(","));
    
    if ((!defaultDM) && firstSupported != null) {
      this.defaultDM = firstSupported;
      this.log("Default download manager set to " + this.defaultDM);
    } else if(!dms.found) {
      this.log("Serious warning! no supported download manager found...");
    } 
    if (exclusive) {
      for (j=dms.length; j-->0;) {
        if (! (dms[j].custom || dms[j].supported) ) {
          dms.splice(j,1);
        }
      }
    }
    
    return dms;
  }
,
  _referrerSpoofer: null,
  get referrerSpoofer() {
    if (typeof(ReferrerSpoofer) != "function") {
      CC["@mozilla.org/moz/jssubscript-loader;1"]
          .getService(CI.mozIJSSubScriptLoader)
          .loadSubScript("chrome://flashgot/content/referrerSpoofer.js", null);
    }
    return (!this._httpServer) ? this._referrerSpoofer = new ReferrerSpoofer() :this._referrerSpoofer;
  }
,
  _cleaningup: false
,
  cleanup: function() {
    if (this._cleaningup) return;
    try {
      this._cleaningup = true;
      this.log("Starting cleanup");
      if (this._httpServer) {
        this._httpServer.shutdown();
      }
      
      try {
        FlashGotDM.cleanup();
      } catch(eexx) {
        dump(eexx.message);
      }
      
      if (this._globals && this._globals.tmpDir.exists()) {
        try {
          this._globals.tmpDir.remove(true);
        } catch(eexx) {
          this.log("Can't remove " + this._globals.tmpDir.path + ", maybe still in use: " + eexx);
        }
      }
      this._bundle = null;
      this.log("Cleanup done");
      if (this._logFile) try {
        if (this.logStream) this.logStream.close();
        var maxLogSize=Math.max(Math.min(this.getPref('maxLogSize',100000),1000000),50000);
        const logFile=this.logFile;
        const logSize=logFile.fileSize;
        if (logSize>maxLogSize) { // log rotation
          dump("Cutting log (size: "+logSize+", max: "+maxLogSize+")");


          const logBak=logFile.clone();
          logBak.leafName=logBak.leafName+".bak";
          if (logBak.exists()) logBak.remove(true);
          logFile.copyTo(logBak.parent, logBak.leafName);
          const is=CC['@mozilla.org/network/file-input-stream;1'].createInstance(
            CI.nsIFileInputStream);
          is.init(logBak,0x01, 0400, null);
          is.QueryInterface(CI.nsISeekableStream);
          is.seek(CI.nsISeekableStream.NS_SEEK_END,-maxLogSize);
          const sis=CC['@mozilla.org/scriptableinputstream;1'].createInstance(
          CI.nsIScriptableInputStream);
          sis.init(is);
          var buffer;
          var content="\n";
          var logStart=-1;
          while (buffer=sis.read(5000)) {
            content+=buffer;
            if ((logStart=content.indexOf("\n*** Log start at "))>-1) { 
              content=content.substring(logStart);
              break;
            }
            content=buffer;
          }
          if (logStart>-1) {
             const os=CC["@mozilla.org/network/file-output-stream;1"].createInstance(
              CI.nsIFileOutputStream);
            os.init(logFile,0x02 | 0x08 | 0x20, 0700, 0);
            os.write(content,content.length);
            while (buffer=sis.read(20000)) {
              os.write(buffer,buffer.length);
            } 
            os.close();
          }
          sis.close();
        }
      } catch(eexx) {
        dump("Error cleaning up log: "+eexx);
      }
      this.logStream=null;
    } catch(ex) {
       this.log(ex);
    }
    this._cleaningup=false;
    this.dispose();
  }
,
  readFile: function(file) {
    const is = CC["@mozilla.org/network/file-input-stream;1"].createInstance(
          CI.nsIFileInputStream );
    is.init(file ,0x01, 0400, null);
    const sis = CC["@mozilla.org/scriptableinputstream;1"].createInstance(
      CI.nsIScriptableInputStream );
    sis.init(is);
    const res=sis.read(sis.available());
    is.close();
    return res;
  }
,
  writeFile: function(file, content, charset) {
    const unicodeConverter = CC["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(
    CI.nsIScriptableUnicodeConverter);
    try {
      unicodeConverter.charset = charset ? charset : "UTF-8";
    } catch(ex) {
      unicodeConverter.charset = "UTF-8";
    }
    content=unicodeConverter.ConvertFromUnicode(content);
    const os=CC["@mozilla.org/network/file-output-stream;1"].createInstance(
      CI.nsIFileOutputStream);
    os.init(file, 0x02, 0700, 0);
    os.write(content,content.length);
    os.close();
  }
,
  _lookupMethod: null,
  get lookupMethod() {
    return this._lookupMethod?this._lookupMethod:(this._lookupMethod = 
      (Components.utils && Components.utils.lookupMethod)
        ?Components.utils.lookupMethod:Components.lookupMethod);
  }
,
  _setupLegacyPrefs: function() {
    // check and move flashgot.flashgot.dmsopts branch from previous bug
    try {
      for each (var key in this.prefs.getChildList("flashgot.dmsopts.", {})) {
        this.setPref(key.replace(/^flashgot\./, ""), this.getPref(key));
      }
      this.prefs.deleteBranch("flashgot.dmsopts.");
    } catch(e) {
      dump(e + "\n");
    }
  }
,
  showDMSReference: function() {
    this.getWindow().open("http://www.flashgot.net/dms","_blank");
  }
, 
  dirtyJobsDone: false
}

var RedirectContext = function(links, opType, dm, onfinish) {
  this.links = links;
  this.opType = opType;
  this.dm = dm;
  this.onfinish = onfinish || function() {};
  this.processedBy = {};
  this.redirects = 0;
  this.maxRedirects = 1;
};

RedirectContext.prototype = {
  process: function(links) {
    if(!links) links = this.links;
    try {
      this.start();
      for (j = links.length; j-- > 0;) {
        this.processLink(links[j]);
      }
    } catch(e) {
      dump("FlashGot Error: " + e + "\n");
    } finally {
      this.done();
    }
  },
  
  processLink: function(l) {
    const processors = this.processors;
    for (var p = 0, plen = processors.length, j; p < plen; p++) {
      try {
        processors[p](l, this);
      } catch(e) {
        dump("FlashGot Error on " + p + ": " + e);
      }
    }
  },
  
  start: function() {
    this.redirects++;
  },
  done: function() {
    if(this.redirects > this.maxRedirects) this.maxRedirects = this.redirects;
    if (--this.redirects <= 0) {
      this.onfinish(this.processedBy);
    }
    if(this.redirects >= 0) {
      this.links.progress.update(
          40 + 30 * (this.maxRedirects - this.redirects) / this.maxRedirects);
    }
  },
  change: function(l, newURL) {
    this.processedBy[arguments.callee.caller.name] = true;
    if(l.href != newURL) {
      l.href = newURL;
      this.processLink(l); // recursive processing
    }
  },
  createReq: function() {
    return CC["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(CI.nsIXMLHttpRequest);
  },
  processors: [
    function anonym_to(l, context) {
      var m = l.href.match(/^http:\/\/anonym\.to(?:\/?.*?)?\?.*?(http.*)/);
      if (m) {
        context.change(l, m[1]);
      }
    },
    
    function depositfiles_com(l, context) {
      if (!/^http:\/\/depositfiles\.com\//.test(l.href)) return;
      var req = context.createReq();
      req.open("GET", l.href, true);
      req.onreadystatechange = function() {
        if (req.readyState == 4) {
          try {
            var m;
            if (req.status == 200 && 
                (m = req.responseText.match(/var dwnsrc\s*=\s*["']([^"']+)/))
            ) {
              context.change(l, m[1]);
            }
          } catch(e) {
          } finally {
            context.done();
          }
        }
      }
      context.start();
      try {
        req.send("tiny=" + l.href.replace(/.*lix\.in\//, "") + "&submit=continue"); 
      } catch(e) {
        context.done();
      }
    },
    
    function lix_in(l, context) {
      if (!/^http:\/\/lix\.in\//.test(l.href)) return;
      var req = context.createReq();
      req.open("POST", l.href, true);
      req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      req.onreadystatechange = function() {
        if (req.readyState == 4) {
          try {
            var m;
            if (req.status == 200 && 
                (m = req.responseText.match(/<iframe[^>]*src\s*=\s*['"]([^"']+).*/))
            ) {
              context.change(l, m[1]);
            }
          } catch(e) {
          } finally {
            context.done();
          }
        }
      }
      context.start();
      try {
        req.send("tiny=" + l.href.replace(/.*lix\.in\//, "") + "&submit=continue"); 
      } catch(e) {
        context.done();
      }
    },

    function link_protector_com(l, context) {
      if (!/^http:\/\/link-protector\.com\//.test(l.href)) return;
      var req = context.createReq();
      req.open("GET", l.href, true);
      req.onreadystatechange = function() {
        switch (req.readyState) {
          case 1:
            if (context.links.referrer) 
              req.setRequestHeader("Referer", context.links.referrer);
            break;
          case 4:
          try {
            if (req.status != 200) return;
            
            var m = req.responseText.match(/yy\[i\]\s*-(\d+)[\S\s]+stream\(['"]([^'"]+)/);
            if (m) {
              function decode(t, x) {
                function stream(prom){var yy=new Array();for(i=0; i*4 <prom.length; i++){yy[i]=prom.substr(i*4,4);}yy.reverse();var xstream=new String;for (var i = 0; i < yy.length; i++){xstream+=String.fromCharCode(yy[i]-x);}return xstream;}
                return stream(t);
              }
              context.change(l, decode(m[2], m[1]).match(/="(https?:[^" ]+)/)[1]); 
            } else if((m = req.responseText.match(/<a href="(https?:[^" ]+)/))) {
              context.change(l, m[1]);
            }
          } catch(e) {
          } finally {
            context.done();
          }
          break;
        }
        
      }
      context.start();
      try {
        if (context.links.referrer) 
          req.setRequestHeader("Referer", context.links.referrer); // should work, but it doesn't... we'll set it on readystate 1
        req.send(null); 
      } catch(e) {
        context.done();
      }
    },
    
    function stealth_to(l, context) {
      var doc = context.links.document;
      if(!doc) return;
      
            var rx = /http:\/\/stealth.to\/.*\?id=/;
      if (!(rx.test(l.href) || 
          !context.stealth_to_topChecked && doc && rx.test(doc.URL))) 
        return;
      
      var stealth_to = arguments.callee;
      if(!context.stealth_to_topChecked) {
         context.stealth_to_topChecked = true;
         if(doc && rx.test(doc.URL) && 
            checkList(doc.documentElement.innerHTML)) 
           return;
      }
      var req = context.createReq();
      var method, encoding;
      var postData = context.links.postData || l.href.match(/txtCode=.*/) || null;
      if(postData) {
        method = "POST";
        encoding = "application/x-www-form-urlencoded";
        l.href = l.href.replace(/&txtCode.*/, '');
        postData = postData.toString();
      } else {
        method = "GET";
        encoding = null;
      }

      req.open(method, l.href, true);
      if(encoding) req.setRequestHeader("Content-type", encoding);

      req.onreadystatechange = function() {
        if (req.readyState == 4) {
          if (req.status != 200) return;
          try {
            checkAll(req.responseText);
          } catch(e) {
          } finally {
            context.done();
          }
        }
      }
      context.start();
      try {
        req.send(postData); 
      } catch(e) {
        context.done();
      }
      
      function checkAll(html) {
        return checkPopup(html) || checkCaptcha(html) || checkList(html);
      }
      
      function checkPopup(html) {
        if (/\/popup\.php\?id=\d+/.test(l.href)) {
          var div = doc.createElement("div");
          div.innerHTML = html; 
          context.change(l, div.getElementsByTagName("iframe")[0].src);
          return true;
        }
        return false;
      }
      
      function checkCaptcha(html) {
        if (/<input.*txtCode/.test(html)) { // captcha page
          var docURL = l.href.replace(/&.*/, '') + "#FlashGot_Form";
          var ee, j, f;
          var renew = null;
          if(docURL == doc.URL) {
           renew = doc;
          } else {
            ee = doc.getElementsByTagName("iframe");
          
            for(j = ee.length; j-- > 0;) 
              if(ee[j].src == docURL) break;
            
            if(j >= 0) {
             f = ee[j];
             renew = f.contentDocument;
            } else {
              ee = doc.getElementsByTagName("a");
              for(var j = ee.length; j-- > 0;)
                if(ee[j].href == l.href) break;
       
              var a = j < 0 ? doc.body : ee[j];
              var f = doc.createElement("iframe");
              f.style.width="100%";
              f.style.height="300px";
              f.style.borderStyle = "solid";
              f.style.borderColor = "orange";
              f.style.borderWidth = "2px";
              f.src = docURL;
              a.appendChild(f);
            }
          }
          
          if(renew) {
            // renew captcha
            ee = renew.getElementsByTagName("img");
             for(j = ee.length; j-- > 0;) 
               ee[j].src = ee[j].src + "?" + new Date().getTime();
          }
          
          context.links.splice(context.links.indexOf(l), 1); 
          return true;
        }
        return false;
      }
      
      function checkList(html) {
        var m = html.match(/\bpopup\.php\?id=\d+(?=["'])/g);
        if (m) {
          
          var nl, args, p;
          args = [ context.links.indexOf(l), 1 ]; // Array.splice parameters
          for each (var href in m) {
            // copy link;
            nl = {};
            for(p in l) nl[p] = l[p];
            nl.href = "http://stealth.to/" + href;  
            stealth_to(nl, context);
            args.push(nl); 
          }
          Array.prototype.splice.apply(context.links, args); // replace parent link with children
          if(/#FlashGot_Form$/.test(doc.URL))
          {
            // close iframe
            var ee = doc.defaultView.parent.document.getElementsByTagName("iframe");
            for(var j = ee.length; j-- > 0;) {
              if(ee[j].contentDocument == doc) {
                ee[j].parentNode.removeChild(ee[j]);
              }
            }
          }
          return true;
        }
        return false;
      }
    },
    
    function tiny_url(l, context) {
      if (!/^http:\/\/tinyurl\.com\//.test(l.href)) return;
      
      var ch = CC["@mozilla.org/network/io-service;1"].getService(CI.nsIIOService
        ).newChannel(l.href , null, null);
      if(!(ch instanceof CI.nsIHttpChannel)) return;
      ch.requestMethod = "HEAD";
      ch.asyncOpen(context.redirSniffer, { 
         context: context, 
         l: l,
         get wrappedJSObject() { return this; }
      });
      context.start();
    }
  ],
  
  redirSniffer: {
    onStartRequest: function(req, ctx) {
      req.cancel(NS_BINDING_ABORTED);
    },
    onDataAvailable: function(req, ctx , stream , offset , count ) {},
    onStopRequest: function(req, ctx) {
      ctx = ctx.wrappedJSObject;
      if(req instanceof CI.nsIHttpChannel) {
        ctx.context.change(ctx.l, req.URI.spec);
      }
      ctx.context.done();
    }
  }
  
};


// XPCOM Scaffolding code

// component defined in this file

const SERVICE_NAME="FlashGot Service";
const SERVICE_CID =
    Components.ID("{2a55fc5c-7b31-4ee1-ab15-5ee2eb428cbe}");
const SERVICE_CTRID =
    "@maone.net/flashgot-service;1";
    
const SERVICE_CONSTRUCTOR=FlashGotService;
const SERVICE_FLAGS = 3; // SINGLETON | THREADSAFE

// interfaces implemented by this component
const SERVICE_IIDS = 
[ 
CI.nsISupports,
CI.nsISupportsWeakReference,
CI.nsIClassInfo,
CI.nsIObserver,
CI.nsIURIContentListener
];

// Factory object
const SERVICE_FACTORY = {
  _instance: null,
  createInstance: function (outer, iid) {
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;

    xpcom_checkInterfaces(iid,SERVICE_IIDS,Components.results.NS_ERROR_INVALID_ARG);
    // kept this for flexibility sake, but we're really adopting an
    // early instantiation and late init singleton pattern
    return this._instance==null?this._instance=this._create():this._instance;
  },
  _create: function() {
    var obj=new SERVICE_CONSTRUCTOR();
    obj.__defineGetter__("classDescription",function() { return SERVICE_NAME; });
    obj.__defineGetter__("classID",function() { return SERVICE_CID; });
    obj.__defineGetter__("classIDNoAlloc",function() { return SERVICE_CTRID; });
    obj.__defineGetter__("contractID",function() { return SERVICE_CTRID; });
    obj.__defineGetter__("flags",function() { return SERVICE_FLAGS; });
    obj.__defineGetter__("implementationLanguage",function() { return 2; });
    obj.getHelperForLanguage = function() { return null; };
    obj.getInterfaces = function(count) { 
      count.value = 0; 
      return null; 
    };
    return obj;
  }
};

function xpcom_checkInterfaces(iid,iids,ex) {
  for (var j=iids.length; j-- >0;) {
    if (iid.equals(iids[j])) return true;
  }
  throw ex;
}

// Module

var Module = new Object();
Module.firstTime=true;
Module.registerSelf = function (compMgr, fileSpec, location, type) {
  if (this.firstTime) {
   
    debug("*** Registering "+SERVICE_CTRID+".\n");
    
    compMgr.QueryInterface(CI.nsIComponentRegistrar
      ).registerFactoryLocation(SERVICE_CID,
      SERVICE_NAME,
      SERVICE_CTRID, 
      fileSpec,
      location, 
      type);
      
    CC['@mozilla.org/categorymanager;1'].getService(
      CI.nsICategoryManager
     ).addCategoryEntry("app-startup",
        SERVICE_NAME, "service," + SERVICE_CTRID, true, true, null);
      
    this.firstTime=false;
  } 
}
Module.unregisterSelf = function(compMgr, fileSpec, location) {
  compMgr.QueryInterface(CI.nsIComponentRegistrar
    ).unregisterFactoryLocation(SERVICE_CID, fileSpec);
  CC['@mozilla.org/categorymanager;1'].getService(
      CI.nsICategoryManager
     ).deleteCategoryEntry("app-startup",SERVICE_NAME, true);
}

Module.getClassObject = function (compMgr, cid, iid) {
  if (cid.equals(SERVICE_CID))
    return SERVICE_FACTORY;

  if (!iid.equals(CI.nsIFactory))
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  
  throw Components.results.NS_ERROR_NO_INTERFACE;
    
}

Module.canUnload = function(compMgr) {
  return true;
}

// entrypoint
function NSGetModule(compMgr, fileSpec) {
  return Module;
}

