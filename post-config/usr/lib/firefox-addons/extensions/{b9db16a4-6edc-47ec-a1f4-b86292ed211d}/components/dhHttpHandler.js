/******************************************************************************
 *            Copyright (c) 2006 Michel Gutierrez. All Rights Reserved.
 ******************************************************************************/

/**
 * Constants.
 */

const NS_DH_HTTP_HANDLER_CID = Components.ID("{04bca399-a8df-451f-b16c-45ab86a0ed98}");
const NS_DH_HTTP_HANDLER_PROG_ID = "@mozilla.org/network/protocol;1?name=httpX";

/**
* Object constructor
*/
function DhHttpHandler(legacyHandler) {
	try {
		//dump("Class by ID: "+Components.classesByID['{4f47e42e-4d23-4dd3-bfda-eb29255e9ea3}']+"\n");
		this.legacyHandler = legacyHandler;
		//dump("DhHttpHandler: Got legacy service\n");
		this.legacyHPH=this.legacyHandler.QueryInterface(Components.interfaces.nsIHttpProtocolHandler);
		this.legacyO=this.legacyHandler.QueryInterface(Components.interfaces.nsIObserver);
		this.legacyPH=this.legacyHandler.QueryInterface(Components.interfaces.nsIProtocolHandler);
		this.legacyPPH=this.legacyHandler.QueryInterface(Components.interfaces.nsIProxiedProtocolHandler);
		this.legacyS=this.legacyHandler.QueryInterface(Components.interfaces.nsISupports);
		this.legacySWR=this.legacyHandler.QueryInterface(Components.interfaces.nsISupportsWeakReference);
		this.currentReqs={};
	} catch(e) {
		dump("DhHttpHandler: error getting legacy service: "+e+"\n");
	}
}

DhHttpHandler.prototype = {

	get appName() { return this.legacyHPH.appName; },
	get appVersion() { return this.legacyHPH.appVersion; },
	get defaultPort() { return this.legacyPH.defaultPort; },
	get language() { return this.legacyHPH.language; },
	set language(val) { this.legacyHPH.language=val; },
	get misc() { return this.legacyHPH.misc; },
	set misc(val) { this.legacyHPH.misc=val; },
	get oscpu() { return this.legacyHPH.oscpu; },
	get platform() { return this.legacyHPH.platform; },
	get product() { return this.legacyHPH.product; },
	set product(val) { this.legacyHPH.product=val; },
	get productComment() { return this.legacyHPH.productComment; },
	set productComment(val) { this.legacyHPH.productComment=val; },
	get productSub() { return this.legacyHPH.productSub; },
	set productSub(val) { this.legacyHPH.productSub=val; },
	get protocolFlags() { 
		try { 
			var pf=this.legacyHPH.protocolFlags; 
			dump("PF "+pf+"\n"); 
			return pf;
		} catch(e) {
			dump(""+e+"\n"); return 0;
		}
	},
	get scheme() { return this.legacyPH.scheme; },
	get userAgent() { return this.legacyHPH.userAgent; },
	get vendor() { return this.legacyHPH.vendor; },
	set vendor(val) { this.legacyHPH.vendor=val; },
	get vendorComment() { return this.legacyHPH.vendorComment; },
	set vendorComment(val) { this.legacyHPH.vendorComment=val; },
	get vendorSub() { return this.legacyHPH.vendorSub; },
	set vendorSub(val) { this.legacyHPH.vendorSub=val; },
	
	allowPort: function(port , scheme) { return this.legacyPH.allowPort(port,scheme); },
	GetWeakReference: function() { return this.legacySWR.GetWeakReference(); },
	newChannel: function(URI) {
		dump("DhHttpHandler: newChannel('"+URI.spec+"')\n");
		try { 

			var ioService=Components.classes["@mozilla.org/network/io-service;1"].
	            getService(Components.interfaces.nsIIOService);
			var m=/^http:\/\/[^\.\/]+\.downloadhelper\.net\/media\/(.*)$/.exec(URI.spec);
			if(m!=null && m.length==2) {
				var realURI=ioService.newURI("http://"+m[1],"utf-8",null);
				var realChannel=this.legacyPH.newChannel(realURI);
				var channel=new DhHttpChannel(realChannel,URI);
				return channel.QueryInterface(Components.interfaces.nsIChannel);
			}
		} catch(e) {
			dump("!!! DhHttpHandler: newChannel('"+URI.spec+"'): "+e+"\n");
		}
		return this.legacyPH.newChannel(URI);
	},
	newProxiedChannel: function(uri,proxyInfo) { return this.legacyPPH(uri,proxyInfo); },
	newURI: function( spec , originCharset , baseURI ) { return this.legacyPH.newURI(spec,originCharset, baseURI); },
	observe: function( subject , topic , data ) { return this.legacyO.observe(subject,topic,data); }

}

DhHttpHandler.prototype.QueryInterface = function(iid) {
    if(
    	iid.equals(Components.interfaces.nsIHttpProtocolHandler)==false &&
    	iid.equals(Components.interfaces.nsIObserver)==false &&
    	iid.equals(Components.interfaces.nsIProtocolHandler)==false &&
    	iid.equals(Components.interfaces.nsIProxiedProtocolHandler)==false &&
    	iid.equals(Components.interfaces.nsISupports)==false &&
    	iid.equals(Components.interfaces.nsISupportsWeakReference)==false
	) {
            throw Components.results.NS_ERROR_NO_INTERFACE;
        }
    return this;
}

var vDhHttpHandlerModule = {
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
        //dump("*** Registering DhHttpHandler\n");
        compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        compMgr.registerFactoryLocation(NS_DH_HTTP_HANDLER_CID,
                                        "DhHttpHandler",
                                        NS_DH_HTTP_HANDLER_PROG_ID, 
                                        fileSpec,
                                        location,
                                        type);
        //dump("*** Registered DhHttpHandler\n");
    },

	unregisterSelf: function(compMgr, fileSpec, location) {
    	compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    	compMgr.unregisterFactoryLocation(NS_DH_HTTP_HANDLER_CID, fileSpec);
	},

    /*
     * The GetClassObject method is responsible for producing Factory and
     * SingletonFactory objects (the latter are specialized for services).
     */
    getClassObject: function (compMgr, cid, iid) {
        if (!cid.equals(NS_DH_HTTP_HANDLER_CID)) {
	    	throw Components.results.NS_ERROR_NO_INTERFACE;
		}

        if (!iid.equals(Components.interfaces.nsIFactory)) {
	    	throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
		}

        return this.vDhHttpHandlerFactory;
    },

    /* factory object */
    vDhHttpHandlerFactory: {
        /*
         * Construct an instance of the interface specified by iid, possibly
         * aggregating it with the provided outer.  (If you don't know what
         * aggregation is all about, you don't need to.  It reduces even the
         * mightiest of XPCOM warriors to snivelling cowards.)
         */
        createInstance: function (outer, iid) {
            if (outer != null) {
				throw Components.results.NS_ERROR_NO_AGGREGATION;
	    	}
	
			//dump("DhHttpHandler: create instance\n");

			var prefService=Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService);
			var pref=prefService.getBranch("dwhelper.");
			
			var hook=false;
			try {
				hook=pref.getBoolPref("hook-media-source");
			} catch(e) {}
			
			var legacyHandler=Components.classesByID['{4f47e42e-4d23-4dd3-bfda-eb29255e9ea3}'].
					createInstance();
			if(hook) {
				return new DhHttpHandler(legacyHandler);
			} else {
            	return legacyHandler.QueryInterface(iid);
            }
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
    return vDhHttpHandlerModule;
}

function DhHttpChannel(channel,originalURI) {

	dump("DhHttpChannel: constructor\n");

	this.mChannel=channel.QueryInterface(Components.interfaces.nsIChannel);
	this.mHttpChannel=channel.QueryInterface(Components.interfaces.nsIHttpChannel);
	this.mRequest=channel.QueryInterface(Components.interfaces.nsIRequest);
	try {
		this.mSCC=channel.QueryInterface(Components.interfaces.nsISecurityCheckedComponent);
	} catch(e) {
		dump("!!! DhHttpChannel: constructor org channel does not support nsISecurityCheckedComponent\n");
	}
	try {
		this.mBRR=channel.QueryInterface(Components.interfaces.nsIByteRangeRequest);
	} catch(e) {
		dump("!!! DhHttpChannel: constructor org channel does not support nsIByteRangeRequest\n");
	}
	this.mOriginalURI=originalURI;		
}

DhHttpChannel.prototype = {

	// nsIChannel
	get LOAD_DOCUMENT_URI() {return this.mChannel.LOAD_DOCUMENT_URI},
	get LOAD_RETARGETED_DOCUMENT_URI() {return this.mChannel.LOAD_RETARGETED_DOCUMENT_URI},
	get LOAD_REPLACE() {return this.mChannel.LOAD_REPLACE},
	get LOAD_INITIAL_DOCUMENT_URI() {return this.mChannel.LOAD_INITIAL_DOCUMENT_URI},
	get LOAD_TARGETED() {return this.mChannel.LOAD_TARGETED},

	get contentCharset() { 
		dump("DhHttpChannel: contentCharset ("+this.mChannel.contentCharset+")\n");
		return this.mChannel.contentCharset; 
	},
	set contentCharset(val) { 
		dump("DhHttpChannel: contentCharset="+val+" ("+this.mChannel.contentCharset+")\n");
		this.mChannel.contentCharset=val; 
	},
	get contentLength() { 
		dump("DhHttpChannel: contentLength ("+this.mChannel.contentLength+")\n");
		return this.mChannel.contentLength;
	},
	set contentLength(val) { 
		dump("DhHttpChannel: contentLength="+val+" ("+this.mChannel.contentLength+")\n");
		this.mChannel.contentLength=val;
	},
	get contentType() { 
		dump("DhHttpChannel: contentType ("+this.mChannel.contentType+")\n");
		return this.mChannel.contentType;
		//return "application/octet-stream";
	},
	set contentType(val) { 
		dump("DhHttpChannel: contentType"+val+" ("+this.mChannel.contentType+")\n");
		this.mChannel.contentType=val;
	},
	get notificationCallbacks() {
		dump("DhHttpChannel: notificationCallbacks\n");
		return this.mChannel.notificationCallbacks;
		//return this.mMotificationCallbacks;
	},
	set notificationCallbacks(val) { 
		dump("DhHttpChannel: notificationCallbacks="+val+"\n");
		this.mChannel.notificationCallbacks=val;
		//this.mNotificationCallbacks=val;
	},
	get originalURI() { 
		dump("DhHttpChannel: originalURI ("+val.spec+")\n");
		return this.mOriginalURI; 
	},
	set originalURI(val) { 
		dump("DhHttpChannel: originalURI="+val+"("+val.spec+")\n");
		this.mOriginalURI=val; 
	},
	get owner() { return this.mChannel.owner; },
	set owner(val) { this.mChannel.owner=val; },
	get securityInfo() { return this.mChannel.securityInfo; },
	get URI() { 
		dump("DhHttpChannel: URI ("+this.mOriginalURI.spec+")\n");
		return this.mOriginalURI; 
	},

	asyncOpen: function(listener,context) {
		dump("DhHttpChannel: asyncOpen('"+listener+"','"+context+"')\n");
		
		
		try {
		dump("listener interfaces:\n");
		CheckInterfaces(listener);
		dump("original="+this.mChannel.LOAD_DOCUMENT_URI+"\n");
		dump("new="+this.LOAD_DOCUMENT_URI+"\n");
	        
			dump("DhHttpChannel: asyncOpen uri="+this.mChannel.URI.spec+"\n");
			this.mListener=listener;
	        this.mChannel.asyncOpen(this,context);
	        //this.mChannel.asyncOpen(listener,context);

		} catch(e) {
			dump("!!! DhHttpChannel: asyncOpen('"+listener+"','"+context+"') :"+e+"\n");
		}
	},
	open: function() {
		dump("DhHttpChannel: open()\n");
		return this.mChannel.open();
	},
	
	//nsIStreamListener
	onDataAvailable: function(request,context,inputStream,offset,count) {
    	//dump("DhHttpChannel: onDataAvailable(...,"+offset+","+count+")\n");
		try {
			/*
			var bistream = Components.classes["@mozilla.org/binaryinputstream;1"].
            	createInstance(Components.interfaces.nsIBinaryInputStream);
            bistream.setInputStream(inputStream);
            
			var n=0;
			while(n<count) {
				var ba=bistream.readByteArray(bistream.available());
				this.outputStream.writeByteArray(ba,ba.length);
				n+=ba.length;
			}
			//bistream.close();			
			*/

			this.mListener.onDataAvailable(this,context,inputStream,offset,count);

			
			
		} catch(e) {
			dump("[DhHttpChannel] onDataAvailable error: "+e+"\n");	
		}
	},
	
	//nsIRequestObserver
	onStartRequest: function(request,context) {
		dump("DhHttpChannel: onStartRequest("+request+","+context+")\n");
		dump("request succeeded: "+request.requestSucceeded+"\n");
		dump("status: "+request.responseStatus+"\n");
		dump("length: "+request.contentLength+"\n");
		dump("is channel="+(request==this.mRequest)+"\n");
		try {
			/*
			this.file = Components.classes["@mozilla.org/file/local;1"].
			            createInstance(Components.interfaces.nsILocalFile);
			this.file.initWithPath("/tmp/captured.flv");
			this.stream = Components.classes['@mozilla.org/network/file-output-stream;1'].
	    		createInstance(Components.interfaces.nsIFileOutputStream);
			this.stream.init(this.file,0x02 | 0x08 | 0x20, 0644, 0);

			this.outputStream = Components.classes["@mozilla.org/binaryoutputstream;1"].
	            	createInstance(Components.interfaces.nsIBinaryOutputStream);
			this.outputStream.setOutputStream(this.stream); 
			*/
	       	this.mListener.onStartRequest(this,context);
		} catch(e) {
			dump("[DhHttpChannel] onStartRequest error: "+e+"\n");
			
			try {
				var msg="";
				var location=e.location;
				while(location!=null) {
					msg+=location.filename+":"+location.lineNumber+"\n";
					location=location.caller;
				}
				dump(msg);
			} catch(e0) {
				return "[UtilService] error while getting exception frame: "+e0;
			}

									
		}
	},
	
	onStopRequest: function(request,context,status) {
		dump("DhHttpChannel: onStopRequest()\n");
		try {
				//this.outputStream.close();
		      	this.mListener.onStopRequest(this,context,status);
		} catch(e) {
			dump("[DhHttpChannel-MyListener] onStopRequest error: "+e+"\n");	
		}
	},

	// nsIHttpChannel	
	get allowPipelining() { 
		return this.mHttpChannel.allowPipelining; 
	},
	set allowPipelining(val) { 
		this.mHttpChannel.allowPipelining=val; 
	},
	get redirectionLimit() { 
		return this.mHttpChannel.redirectionLimit; 
	},
	set redirectionLimit(val) { 
		this.mHttpChannel.redirectionLimit=val; 
	},
	get referrer() { 
		return this.mHttpChannel.referrer; 
	},
	set referrer(val) { 
		this.mHttpChannel.referrer=val; 
	},
	get requestMethod() { 
		return this.mHttpChannel.requestMethod; 
	},
	set requestMethod(val) { 
		dump("DhHttpChannel: requestMethod="+val+" ("+this.mHttpChannel.requestMethod+")\n");
		this.mHttpChannel.requestMethod=val; 
	},
	get requestSucceeded() { 
		dump("DhHttpChannel: requestSucceeded ("+this.mHttpChannel.requestSucceeded+")\n");
		return this.mHttpChannel.requestSucceeded; 
	},
	set requestSucceeded(val) { 
		dump("DhHttpChannel: requestSucceeded="+val+" ("+this.mHttpChannel.requestSucceeded+")\n");
		this.mHttpChannel.requestSucceeded=val; 
	},
	get responseStatus() { 
		dump("DhHttpChannel: reponseStatus ("+this.mHttpChannel.responseStatus+")\n");
		return this.mHttpChannel.responseStatus; 
	},
	get responseStatusText() { 
		dump("DhHttpChannel: reponseStatusText ("+this.mHttpChannel.responseStatusText+")\n");
		return this.mHttpChannel.responseStatusText; 
	},
	
	getRequestHeader: function(header) { 
		var v="*missing*";
		try {
			v=this.mHttpChannel.getRequestHeader(header);
		} catch(e) {
		}
		dump("DhHttpChannel: getRequestHeader('"+header+"') <= "+v+"\n");
		return v;
	},
	
	getResponseHeader: function(header) {
		var v="*missing*";
		try {
			v=this.mHttpChannel.getResponseHeader(header);
		} catch(e) {
		}
		dump("DhHttpChannel: getResponseHeader('"+header+"') <= "+v+"\n");
		return v;
	},
	
	isNoCacheResponse: function() { 
		dump("DhHttpChannel: isNoCacheResponse()\n");
		return this.mHttpChannel.isNoCacheResponse; 
	},
	isNoStoreResponse: function() { 
		dump("DhHttpChannel: isNoStoreResponse()\n");
		return this.mHttpChannel.isNoStoreResponse; 
	},
	setRequestHeader: function(header,value,merge) {
		dump("DhHttpChannel: setRequestHeader('"+header+"','"+value+"',"+merge+")\n");
		this.mHttpChannel.setRequestHeader(header,value,merge);
	},
	setResponseHeader: function(header,value,merge) {
		dump("DhHttpChannel: setResponseHeader('"+header+"','"+value+"',"+merge+")\n");
		this.mHttpChannel.setResponseHeader(header,value,merge);
	},
	visitRequestHeaders: function(visitor) {
		try {
			dump("DhHttpChannel: visitRequestHeaders()\n");
			this.mHttpChannel.visitRequestHeaders(visitor);
		} catch(e) {
			dump("!!! DhHttpChannel: visitRequestHeaders(): "+e+"\n");
		}
	},
	visitResponseHeaders: function(visitor) {
		try {
			dump("DhHttpChannel: visitResponseHeaders()\n");
			this.mHttpChannel.visitResponseHeaders(visitor);
		} catch(e) {
			dump("!!! DhHttpChannel: visitResponseHeaders(): "+e+"\n");
		}
	},
	
/*
	getInterface: function(uuid,result) {
		dump("DhHttpChannel: getInterface("+uuid+","+result+")\n");
	},
*/
	
	// nsISecurityCheckedComponent
	canCallMethod: function(iid,methodName) {
		dump("DhHttpChannel: canCallMethod("+iid+","+methodName+")\n");
		if(this.mSCC)
			return this.mSCC.canCallMethod(iid,methodname);
		else 
			return "AllAccess";
	},
	canCreateWrapper: function(iid) {
		dump("DhHttpChannel: canCreateWrapper("+iid+")\n");
		if(this.mSCC) {
		try {
		var v=this.mSCC.canCreateWrapper(iid);
		dump("DhHttpChannel: canCreateWrapper("+iid+") <= "+v+"\n");
		return v;
		} catch(e) {
			dump("!!! DhHttpChannel: canCreateWrapper("+iid+"): "+e+"\n");
			throw e;
		}
		} else
			return "AllAccess";
	},
	canGetProperty: function(iid,propertyName) {
		dump("DhHttpChannel: canGetProperty("+iid+","+propertyName+")\n");
		if(this.mSCC)
			return this.mSCC.canGetProperty(iid,propertyName);
		else
			return "AllAccess";
	},
	canSetProperty: function(iid,propertyName) {
		dump("DhHttpChannel: canSetProperty("+iid+","+propertyName+")\n");
		if(this.mSCC)
			return this.mSCC.canSetProperty(iid,propertyName);
		else
			return "AllAccess";
	},

/*	
	setUploadStream: function(stream,contentType,contentLength) {
		dump("DhHttpChannel: setUploadStream()\n");
	},
	
	get baseChannel() { 
		dump("DhHttpChannel: baseChannel()\n");
		return this; 
	},
	get contentDisposition() { return this.mContentDisposition; },
	set contentDisposition(val) { this.mContentDisposition=val; },
	get isLastPart() { return true; },
	get partID() { return ""; },
*/

	//nsIByteRangeRequest	
	get endRange() { 
		dump("DhHttpChannel: endRange("+this.mBRR.startRange+")\n");
		return this.mBRR.endRage; 
	},
	get isByteRangeRequest() { 
		dump("DhHttpChannel: isByteRangeRequest("+this.mBRR.isByteRangeRequest+")\n");
		return this.mBRR.isByteRangeRequest; 
	},
	get startRange() { 
		dump("DhHttpChannel: startRange ("+this.mBRR.startRange+")\n");
		return this.mBRR.startRange; 
	},

	// nsIRequest
	get LOAD_NORMAL() { dump("@1\n"); return this.mRequest.LOAD_NORMAL; },
	get LOAD_BACKGROUND() { dump("@2\n"); return this.mRequest.LOAD_BACKGROUND; },
	get INHIBIT_CACHING() { dump("@3\n"); return this.mRequest.INHIBIT_CACHING; },
	get INHIBIT_PERSISTENT_CACHING() { dump("@4\n"); return this.mRequest.INHIBIT_PERSISTENT_CACHING; },
	get LOAD_BYPASS_CACHE() { dump("@5\n"); return this.mRequest.LOAD_BYPASS_CACHE; },
	get LOAD_FROM_CACHE() { dump("@6\n"); return this.mRequest.LOAD_FROM_CACHE; },
	get VALIDATE_ALWAYS() { dump("@7\n"); return this.mRequest.VALIDATE_ALWAYS; },
	get VALIDATE_NEVER() { dump("@8\n"); return this.mRequest.VALIDATE_NEVER; },
	get VALIDATE_ONCE_PER_SESSION() { dump("@9\n"); return this.mRequest.VALIDATE_ONCE_PER_SESSION; },
  	
	get loadFlags() { 
		dump("DhHttpChannel: loadFlags()\n");
		return this.mRequest.loadFlags; 
	},
	set loadFlags(val) { 
		dump("DhHttpChannel: set loadFlags()\n");
		this.mRequest.loadFlags=val; 
	},
	get loadGroup() { 
		dump("DhHttpChannel: loadGroup()\n");
		//return this.mRequest.loadGroup; 
		return this.mLoadGroup;
	},
	set loadGroup(val) { 
		dump("DhHttpChannel: set loadGroup()\n");
		try {
			//val.removeRequest(this.mRequest,null,0);
			//val.addRequest(this,null);
		} catch(e) {
			dump("!!! DhHttpChannel: set loadGroup(): "+e+"\n");
		}
		//this.mRequest.loadGroup=val;
		this.mLoadGroup=val; 
	},
	get name() { 
		dump("DhHttpChannel: name()\n");
		return this.mOriginalURI.spec; 
	},
	get status() { 
		dump("DhHttpChannel: status()\n");
		return this.mRequest.status; 
	},
	cancel: function(status) {
		dump("DhHttpChannel: cancel()\n");
		this.mRequest.cancel(status);
	},
	isPending: function() {
		dump("DhHttpChannel: isPending()\n");
		return this.mRequest.isPending();
	},
	resume: function() {
		dump("DhHttpChannel: resume()\n");
		this.mRequest.resume();
	},
	cancel: function() {
		dump("DhHttpChannel: cancel()\n");
		this.mRequest.cancel();
	},
	
}

DhHttpChannel.prototype.QueryInterface = function(iid) {
    if(
    	iid.equals(Components.interfaces.nsIHttpChannel)==false &&
    	iid.equals(Components.interfaces.nsIChannel)==false &&
/*
    	iid.equals(Components.interfaces.nsITimerCallback)==false &&
    	iid.equals(Components.interfaces.nsIInterfaceRequestor)==false &&
*/
    	iid.equals(Components.interfaces.nsISecurityCheckedComponent)==false &&
    	iid.equals(Components.interfaces.nsIRequest)==false &&
    	iid.equals(Components.interfaces.nsIRequestObserver)==false &&
    	iid.equals(Components.interfaces.nsIStreamListener)==false &&
/*
    	iid.equals(Components.interfaces.nsIUploadChannel)==false &&
    	iid.equals(Components.interfaces.nsIMultiPartChannel)==false &&
*/
    	iid.equals(Components.interfaces.nsIByteRangeRequest)==false &&
    	iid.equals(Components.interfaces.nsISupports)==false
	) {
			dump("!!! DhHttpChannel: requested interface "+iid+"\n");		
            throw Components.results.NS_ERROR_NO_INTERFACE;
        }
	//dump("DhHttpChannel: requested interface "+iid+"\n");		
    return this;
}

function CheckInterfaces(obj) {
	for(var interf in Components.interfaces) {
		try {
			obj.QueryInterface(Components.interfaces[interf]);
			dump("=> is "+interf+"\n");
		} catch(e) {
		}
	}
}

