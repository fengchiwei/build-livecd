const _ADBLOCK_CONTRACTID = "@mozilla.org/adblock;1";
const _ADBLOCK_CID = Components.ID('{34274bf4-1d97-a289-e984-17e546307e4f}');
const _CATMAN_CONTRACTID = "@mozilla.org/categorymanager;1";


/*
 * Module object
 */

var module = {
	console: Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService),
	log: function(msg) { this.console.logStringMessage(msg); },

	registerSelf: function(compMgr, fileSpec, location, type) {
		compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		compMgr.registerFactoryLocation(_ADBLOCK_CID, "Adblock content policy", _ADBLOCK_CONTRACTID, fileSpec, location, type);
		var catman = Components.classes[_CATMAN_CONTRACTID].getService(Components.interfaces.nsICategoryManager);
		catman.addCategoryEntry("content-policy", _ADBLOCK_CONTRACTID, _ADBLOCK_CONTRACTID, true, true);
		this.console = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
		if (typeof policy == 'undefined') this.policy.loadFromProfile();
		try {
			var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
			observerService.addObserver(this, "Adblock-LoadFromProfile", true);
		} catch (e) { this.log("Adblock content policy registration: exception when registering saveprefs observer: " + e + "\n"); }
	},
	unregisterSelf: function(compMgr, fileSpec, location) {
		compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		compMgr.unregisterFactoryLocation(_ADBLOCK_CID, fileSpec);
		var catman = Components.classes[_CATMAN_CONTRACTID].getService(Components.interfaces.nsICategoryManager);
		catman.deleteCategoryEntry("content-policy", _ADBLOCK_CONTRACTID, true);
	},
	getClassObject: function(compMgr, cid, iid) {
		if (!cid.equals(_ADBLOCK_CID))
			throw Components.results.NS_ERROR_NO_INTERFACE;
		if (!iid.equals(Components.interfaces.nsIFactory))
			throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
		
		if (typeof policy == 'undefined') this.policy.loadFromProfile();
		return (typeof policy !='undefined') ? factory : this;
	},
	canUnload: function(compMgr) {
		return true;
	},
	
	// nsIContentPolicy (placeholder)
	policy: {
		count: 0,
		loadFromProfile: #10=function(){  
			if (typeof policy == 'undefined') {
				try{ 
					var SubScriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].createInstance(Components.interfaces.mozIJSSubScriptLoader);
					SubScriptLoader.loadSubScript("chrome://adblock/content/component.js"); 
					this.shouldLoad = policy.shouldLoad, this.shouldProcess=policy.shouldProcess;
				}catch(e){ 
					//if (++this.count<10||(100%this.count==0 && this.count<2000)) 
					//	module.log('typeof policy: '+(typeof(policy))+" -> "+this.count+"\n"+e+'\n\ncaller: '+arguments.callee.caller);
				}
			}
			return 1;
		},
		shouldLoad: #10#,  shouldProcess: #10#,
		QueryInterface: function(iid) { 
			return (typeof policy !='undefined') ? policy : this; 
		}
	},
	// nsIFactory
	createInstance: function(outer, iid) {
		if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
		if (typeof policy == 'undefined') this.policy.loadFromProfile();
		return (typeof policy !='undefined') ? policy : this.policy;
	},
	// nsIObserver
	observe: function(subject, topic, prefName) { 
		if (topic == "Adblock-LoadFromProfile")
			if (typeof policy == 'undefined') this.policy.loadFromProfile();
	},
	QueryInterface: function(iid) {
		if (!iid.equals(Components.interfaces.nsISupports) &&
			!iid.equals(Components.interfaces.nsISupportsWeakReference) &&
			!iid.equals(Components.interfaces.nsIFactory) &&
			!iid.equals(Components.interfaces.nsIObserver)) {
			this.log("Adblock content policy factory object: QI unknown interface: " + iid + "\n");
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}
		return this;
	}
};

// module initialisation
function NSGetModule(comMgr, fileSpec) {
	return module;
}
