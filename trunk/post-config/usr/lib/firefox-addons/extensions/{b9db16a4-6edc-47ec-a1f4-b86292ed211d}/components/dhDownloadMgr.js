/******************************************************************************
 *            Copyright (c) 2006 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

/**
 * Constants.
 */

const NS_DH_DOWNLOAD_MGR_CID = Components.ID("{b45e0779-74ee-41d6-9dd0-76930783388e}");
const NS_DH_DOWNLOAD_MGR_PROG_ID = "@downloadhelper.net/download-manager;1";
const DHNS = "http://downloadhelper.net/1.0#";

var Util=null;

/**
* Object constructor
*/
function DhDownloadMgr() {
	try {
		this.datasource=Components.classes
		      	['@mozilla.org/rdf/datasource;1?name=in-memory-datasource'].
	    	      	createInstance(Components.interfaces.nsIRDFDataSource);
		var prefService=Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService);
		this.pref=prefService.getBranch("dwhelper.");
		this.current=null;
		this.counters=[];
		//dump("[DhDownloadMgr] constructor\n");
	} catch(e) {
		dump("!!! [DhDownloadMgr] constructor: "+e+"\n");
	}
}

DhDownloadMgr.prototype = {}

DhDownloadMgr.prototype.doDownload=function(url,file,shouldBypassCache,
                      referrer, skipPrompt, pageUrl, orgFileName, format) {
	//dump("[DhDownloadMgr] doDownload("+url+","+file.path+","+pageUrl+")\n");
    try {

	if (skipPrompt == undefined)
    	skipPrompt = false;

	var orgFile;
	if(format) {
	 	orgFile=Components.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties)
	        .get("TmpD", Components.interfaces.nsIFile);
		orgFile.append(orgFileName);
		orgFile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0644);
	} else {
		orgFile=file;
	}

	var fileURL = makeFileURI(orgFile);
	
	var persist = makeWebBrowserPersist();
	
	const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
	const flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
	if (shouldBypassCache)
		persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_BYPASS_CACHE;
	else
		persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;
	persist.persistFlags |= nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
	
	var tr = Components.classes["@mozilla.org/transfer;1"].createInstance(Components.interfaces.nsITransfer);

	var progress=new Progress(tr,this,orgFile,file,format);

	persist.progressListener = progress;

	if(referrer!=null) {
		var refStr=referrer;	
    	referrer = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
    	referrer.spec = refStr;
    }

	persist.saveURI(url,
	                null, referrer, null, null,
	                fileURL);
	tr.init(url,fileURL, "", null, null, null, persist);

	} catch(e) {
		dump("!!! [dbDownloadMgr] doDownload: "+e+"\n");
	}    

}

DhDownloadMgr.prototype.addDownload=function(url,file,shouldBypassCache,
                      referrer, skipPrompt, pageUrl, orgFileName, format) {
	//dump("[DhDownloadMgr] addDownload("+url+","+file.path+","+pageUrl+",...,"+format+")\n");

	try {
		var entry=Util.createAnonymousNodeS(this.datasource,"urn:root");
		Util.setPropertyValueRS(this.datasource,entry,DHNS+"url",url.spec);
		Util.setPropertyValueRS(this.datasource,entry,DHNS+"file",escape(file.path));
		Util.setPropertyValueRS(this.datasource,entry,DHNS+"filename",file.leafName);
		if(referrer!=null)
			Util.setPropertyValueRS(this.datasource,entry,DHNS+"referer",referrer);
		if(pageUrl!=null)
			Util.setPropertyValueRS(this.datasource,entry,DHNS+"pageurl",pageUrl.spec);
		if(orgFileName!=null)
			Util.setPropertyValueRS(this.datasource,entry,DHNS+"orgfilename",orgFileName);
		if(format!=null)
			Util.setPropertyValueRS(this.datasource,entry,DHNS+"format",format);
		Util.setPropertyValueRS(this.datasource,entry,DHNS+"status","queued");
		this.checkTransfer();	
	} catch(e) {
		dump("!!! [DhDownloadMgr] addDownload("+url+","+file.path+"): "+e+"\n");
	}
}

DhDownloadMgr.prototype.getEntryData=function(entry) {
	var url=Util.getPropertyValueRS(this.datasource,entry,DHNS+"url");
	var uri = Components.classes["@mozilla.org/network/standard-url;1"].
		createInstance(Components.interfaces.nsIURI);
 	uri.spec = url;
 	var filename=Util.getPropertyValueRS(this.datasource,entry,DHNS+"file");
 	var file=Components.classes["@mozilla.org/file/local;1"].
     	createInstance(Components.interfaces.nsILocalFile);
 	file.initWithPath(unescape(filename));
 	var referer=Util.getPropertyValueRS(this.datasource,entry,DHNS+"referer");
 	var pageUrl=Util.getPropertyValueRS(this.datasource,entry,DHNS+"pageurl");
	var puri=null;
	if(pageUrl) {
		var puri = Components.classes["@mozilla.org/network/standard-url;1"].
			createInstance(Components.interfaces.nsIURI);
	 	puri.spec = pageUrl;
	}
	var orgFileName=Util.getPropertyValueRS(this.datasource,entry,DHNS+"orgfilename");
	var format=Util.getPropertyValueRS(this.datasource,entry,DHNS+"format");
 	return {
 		uri: uri,
 		file: file,
 		referer: referer,
 		pageUrl: puri,
 		orgFileName: orgFileName,
 		format: format
 	}
}

DhDownloadMgr.prototype.checkTransfer=function() {
	var entries=Util.getChildResourcesS(this.datasource,"urn:root",{});
	if(DWHUtil.getDownloadMode(this.pref)=="onebyone") {
		if(this.current==null) {
			if(entries.length>0) {
			//dump("[DhDownloadMgr] checkTransfer: starting download of "+this.current.file.path+"\n");
				var entry=entries[0];
				var data=this.getEntryData(entry);
				Util.setPropertyValueRS(this.datasource,entry,DHNS+"status","downloading");
				this.doDownload(data.uri,data.file,false,data.referer,true,data.pageUrl,data.orgFileName,data.format);
				this.current=entry;
			}
		}
	} else {
		for(var i in entries) {
			var entry=entries[i];
			var data=this.getEntryData(entry);
			this.doDownload(data.uri,data.file,false,data.referer,true,data.pageUrl,data.orgFileName,data.format);
			Util.removeChildSR(this.datasource,"urn:root",entry);
			Util.removeReference(this.datasource,entry);			
		}
		this.current=null;
	}
	var count=entries.length;
	for(var i in this.counters) {
		if(count==0)
			this.counters[i].setAttribute("value","");
		else
			this.counters[i].setAttribute("value","("+count+")");
	}
}

DhDownloadMgr.prototype.transferDone=function(status,request) {

	var code=0;
	try {
		var hc=request.QueryInterface(Components.interfaces.nsIHttpChannel);
		code=hc.responseStatus;
	} catch(e) {}

	try {

	if(status==0 && code==200) {
		var dwcount=0;
		try {
			dwcount=this.pref.getIntPref("download-count");
		} catch(e) {
		}
		dwcount++;
		if(dwcount%100==0) {
			this.donate(dwcount);
		}
		this.pref.setIntPref("download-count",dwcount);
		DWHUtil.setDWCountCookie(this.pref);
	}

	if(this.current!=null) {
		Util.removeChildSR(this.datasource,"urn:root",this.current);
		Util.removeReference(this.datasource,this.current);			
	}
	this.current=null;
	this.checkTransfer();
	
	} catch(e) {
		dump("!!! [DhDownloadMgr] transferDone "+e+"\n");
	}
}

DhDownloadMgr.prototype.getDataSource=function() {
	return this.datasource;
}

DhDownloadMgr.prototype.addCounter=function(counter) {
	this.counters.push(counter);
}

DhDownloadMgr.prototype.removeCounter=function(counter) {
	for(var i=this.counters.length-1;i>=0;i--) {
		if(this.counters[i]==counter)
			this.counters.splice(i,1);
	}
}

DhDownloadMgr.prototype.donate=function(count) {
	var notAgain=false;
	try {
		notAgain=this.pref.getBoolPref("donate-not-again");
	} catch(e) {
	}
	if(notAgain)
		return;
    var options="chrome,centerscreen,modal";
    var data={ count: count }    
    try {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                  .getService(Components.interfaces.nsIWindowMediator);
		var w = wm.getMostRecentWindow("navigator:browser");
	    var rc=w.openDialog('chrome://dwhelper/content/donate.xul','dwhelper-dialog',options, 
 			data);
 		if(data.ok) {
			w.content.location.href="http://www.downloadhelper.net/donate.php";
		}
	} catch(e) {
		dump("!!! [DhDownloadMgr] donate() "+e+"\n");
	}
}

DhDownloadMgr.prototype.getDefaultDir=function() {
	var file=null;
	try {
		file = Components.classes["@mozilla.org/file/directory_service;1"]
	                     .getService(Components.interfaces.nsIProperties)
	                     .get("Home", Components.interfaces.nsIFile);
	} catch(e) {
    	try {
			file=Components.classes["@mozilla.org/file/directory_service;1"]
		    	.getService(Components.interfaces.nsIProperties)
		        .get("TmpD", Components.interfaces.nsIFile);
		} catch(e) {
		}
	}
	if(!file.exists()) {
		throw(DWHUtil.getText("error.nohome"));
	}
	file.append("dwhelper");
	return file;
}

DhDownloadMgr.prototype.getMainDir=function() {
	var fileName=null;
	try {
		fileName=this.pref.getCharPref("storagedirectory");
	} catch(e) {
	}
	var file;
	if(fileName==null || fileName.length==0) {
		file=this.getDefaultDir();
	} else {
	    file=Components.classes["@mozilla.org/file/local;1"].
	        createInstance(Components.interfaces.nsILocalFile);
	    file.initWithPath(fileName);
	    if(file.exists()==false || file.isWritable()==false || file.isDirectory()==false)
	    	file=this.getDefaultDir();
	}
	if(!file.exists()) {
		file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0775);
	}
	this.pref.setCharPref("storagedirectory",file.path);
	return file;
}

DhDownloadMgr.prototype.getUniqueFile=function(filename) {
	//dump("[DhDownloadMgr] getUniqueFile("+filename+")\n");	
	try {
	var dir=this.getMainDir();
	var file=dir.clone();
	file.append(filename);
	if(!file.exists())
		return file;
	var fileParts=/^(.*?)(?:\-([0-9]+))?(\.[a-zA-Z0-9]+)?$/.exec(filename);
	var baseName=fileParts[1];
	var index=fileParts[2];
	if(index==null)
		index=1;
	var suffix=fileParts[3];
	if(suffix==null)
		suffix="";
	while(true) {
		var file=dir.clone();
		filename=baseName+"-"+index+suffix;
		file.append(filename);
		if(!file.exists())
			return file;
		index++;
	}
	} catch(e) {
		dump("!!! [DhDownloadMgr] getUniqueFile: "+e+"\n");	
		return null;
	}
}

DhDownloadMgr.prototype.removeDownloads=function(entries,length) {
	for(var i in entries) {
		var entry=entries[i];
		var status=Util.getPropertyValueRS(this.datasource,entry,DHNS+"status");
		if(status=="queued") {
			Util.removeChildSR(this.datasource,"urn:root",entry);
			Util.removeReference(this.datasource,entry);			
		}
	}
}
 

DhDownloadMgr.prototype.QueryInterface = function(iid) {
	//dump("[DhDownloadMgr] QueryInterface("+iid+")\n");
    if(
    	iid.equals(Components.interfaces.dhIDownloadMgr)==false &&
    	iid.equals(Components.interfaces.nsISupports)==false
	) {
            throw Components.results.NS_ERROR_NO_INTERFACE;
        }
    return this;
}

var vDhDownloadMgrModule = {
    firstTime: true,
    
    /*
     * RegisterSelf is called at registration time (component installation
     * or the only-until-release startup autoregistration) and is responsible
     * for notifying the component manager of all components implemented in
     * this module.  The fileSpec, location and type parameters are mostly
     * opaque, and should be passed on to the registerComponent call
     * unmolested.
     */
    registerSelf: function (compMgr, fileSpec, location, type) {

        if (this.firstTime) {
            this.firstTime = false;
            throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
        }
        compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        compMgr.registerFactoryLocation(NS_DH_DOWNLOAD_MGR_CID,
                                        "DhDownloadMgr",
                                        NS_DH_DOWNLOAD_MGR_PROG_ID, 
                                        fileSpec,
                                        location,
                                        type);
    },

	unregisterSelf: function(compMgr, fileSpec, location) {
    	compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    	compMgr.unregisterFactoryLocation(NS_DH_DH_DOWNLOAD_MGR_CID, fileSpec);
	},

    /*
     * The GetClassObject method is responsible for producing Factory and
     * SingletonFactory objects (the latter are specialized for services).
     */
    getClassObject: function (compMgr, cid, iid) {
        if (!cid.equals(NS_DH_DOWNLOAD_MGR_CID)) {
	    	throw Components.results.NS_ERROR_NO_INTERFACE;
		}

        if (!iid.equals(Components.interfaces.nsIFactory)) {
	    	throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
		}

        return this.vDhDownloadMgrFactory;
    },

    /* factory object */
    vDhDownloadMgrFactory: {
        /*
         * Construct an instance of the interface specified by iid, possibly
         * aggregating it with the provided outer.  (If you don't know what
         * aggregation is all about, you don't need to.  It reduces even the
         * mightiest of XPCOM warriors to snivelling cowards.)
         */
        createInstance: function (outer, iid) {
			//dump("[dhDownloadMgr] createInstance\n");
            if (outer != null) {
				throw Components.results.NS_ERROR_NO_AGGREGATION;
	    	}
	
	    	if(Util==null)  {
	    		Util=Components.classes["@downloadhelper.net/util-service;1"]
					.getService(Components.interfaces.dhIUtilService);
				try {
				var jsLoader=Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
					.getService(Components.interfaces.mozIJSSubScriptLoader);
				jsLoader.loadSubScript("chrome://dwhelper/content/dwhutil.js");
				jsLoader.loadSubScript("chrome://global/content/contentAreaUtils.js");
				} catch(e) {
					dump("!!! [dhDownloadMgr] createInstance: "+e+"\n");
				}
			}

			return new DhDownloadMgr().QueryInterface(iid);
        }
    },

    /*
     * The canUnload method signals that the component is about to be unloaded.
     * C++ components can return false to indicate that they don't wish to be
     * unloaded, but the return value from JS components' canUnload is ignored:
     * mark-and-sweep will keep everything around until it's no longer in use,
     * making unconditional ``unload'' safe.
     *
     * You still need to provide a (likely useless) canUnload method, though:
     * it's part of the nsIModule interface contract, and the JS loader _will_
     * call it.
     */
    canUnload: function(compMgr) {
		return true;
    }
};

function NSGetModule(compMgr, fileSpec) {
    return vDhDownloadMgrModule;
}

//------------------------------------------------------------------------------


/******************************************************************************
 *            Copyright (c) 2006 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

function Progress(tr,observer,orgFile,targetFile,format) {
	this.tr=tr;
	this.observer=observer;
	this.orgFile=orgFile;
	this.targetFile=targetFile;
	this.format=format;
}

Progress.prototype.onLocationChange=function(webProgress, request, location ) {
	this.tr.onLocationChange(webProgress, request, location);
}

Progress.prototype.onProgressChange=function(webProgress, request, curSelfProgress, maxSelfProgress, curTotalProgress, maxTotalProgress ) {
	this.tr.onProgressChange(webProgress, request, curSelfProgress, maxSelfProgress, curTotalProgress, maxTotalProgress );
}

Progress.prototype.onSecurityChange=function(webProgress, request, state ) {
	this.tr.onSecurityChange(webProgress, request, state );
}

Progress.prototype.onStateChange=function(webProgress, request, stateFlags, status ) {
	this.tr.onStateChange(webProgress, request, stateFlags, status );
	if(stateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP) {
		this.observer.transferDone(status,request);
		if(status==0) {
			if(this.format) {
				var convertMgr=Components.classes["@downloadhelper.net/convert-manager-component"]
					.getService(Components.interfaces.dhIConvertMgr);
				convertMgr.addConvert(this.orgFile,this.targetFile,this.format,true);
			}
		}
	}
}

Progress.prototype.onStatusChange=function(webProgress, request, status, message ) {
	this.tr.onStatusChange(webProgress, request, status, message );
}

