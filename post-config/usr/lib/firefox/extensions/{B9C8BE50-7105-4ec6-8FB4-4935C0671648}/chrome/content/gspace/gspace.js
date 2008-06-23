// copyright Gspace, LLC

//controls the number of times a status message is displayed
var gs_StatusController =
{
	imageClick : 1,
	clickOnFile : 1,
	imgPanelClick : 1,
	uploadFailed : 1
}


//web response object to handle communication with the server
function gs_WebResponse(eId, eMesg)
{
    this.eId = eId;
    this.eMesg = eMesg;
    this.results = null;
	this.auxObj = null;
	this.headers = null;

	function SetError(eId, eMesg)
	{
		this.eId = eId;
		this.eMesg = eMesg;
	}
}

//main object that holds the current session information
var gs_gSession =
{
	userName		: "",
	passWord		: "",
	ik				: -1,
	at				: -1,
	status			: 0,
	timesLoaded		: 0,

	setDetails		: function (userName, passWord)
	{
		this.userName = userName;
		this.passWord = passWord;
	},
	totalSpace		: 0,
	usedSpace		: 0,
	workingDir		: "",
	gAct			: null,
	gFiles			: new Array,

	enumType	: "gs",

    mSecsPerByte    : 0.0007,	//used in display of the network speed

	domainName          : "gmail.com",

	bufSize			: 19000000,
	isFirstTime		: false,

	modeIndex		: -1,
	alertGmailDrive	: true,

	isOverlay		: false,

	cookiePath		: "",

    RefreshStatus   : function ()
    {
		if (gs_gSession.isOverlay)
		{
			switch (this.status)
			{
				case 0 :  gs_get("gspace_status").value = gs_jsUtils.GetPropertyString("logout"); break;
				case 1 :  gs_get("gspace_status").value = this.userName ; break;
			}
		}
		else
		{
			switch (this.status)
			{
				case 0 :  gs_get("gspace_gStatus").label = gs_jsUtils.GetPropertyString("logout"); break;
				case 1 :  gs_get("gspace_gStatus").label = gs_jsUtils.GetPropertyString("logged"); break;
			}

			if (this.status != 1)
			{
				this.totalSpace	= "";
				this.usedSpace	= "";
				this.userName	= "";
			}
			else
			{
				this.totalSpace	= this.gAct.totalSpace;
				this.usedSpace	= this.gAct.usedSpace;

			}
			gs_get("gspace_gLoginUserName").label = this.userName;
			gs_get("gspace_gLoginUsedSpace").label = this.usedSpace;
			gs_get("gspace_gLoginTotalSpace").label = this.totalSpace;
		}
    },

    ManageAccounts : function ()
    {
		window.openDialog("chrome://gspace/content/gspaceActManager.xul", "Gspace Accounts",
					"chrome,centerscreen,modal,width=350,height=350");
		gs_gSession.loadAccounts();
    },

    SetDomain : function (userName)
    {
		var usSplit = userName.split('@');
		gs_gSession.userName = usSplit[0].toString();
		gs_gSession.domainName = usSplit[1].toString();

		gs_gSession.mailURL  = (gs_gSession.domainName == 'gmail.com' || gs_gSession.domainName == 'googlemail.com') ? "http://mail.google.com/mail/?" : "http://mail.google.com/hosted/__DOMAIN__/?";
		gs_gSession.loginURL = (gs_gSession.domainName == 'gmail.com' || gs_gSession.domainName == 'googlemail.com') ? "https://www.google.com/accounts/ServiceLoginAuth" : "https://www.google.com/a/__DOMAIN__/LoginAction";
		gs_gSession.logoutURL= (gs_gSession.domainName == 'gmail.com' || gs_gSession.domainName == 'googlemail.com') ? "http://mail.google.com/mail/?logout&hl=en" : "http://mail.google.com/hosted/__DOMAIN__/?logout&hl=en";

		gs_gSession.mailURL = gs_gSession.mailURL.replace("__DOMAIN__", gs_gSession.domainName);
		gs_gSession.loginURL = gs_gSession.loginURL.replace("__DOMAIN__", gs_gSession.domainName);
		gs_gSession.logoutURL = gs_gSession.logoutURL.replace("__DOMAIN__", gs_gSession.domainName);

		gs_gSession.cookieHost = 'mail.google.com';
		gs_gSession.cookieName = 'GMAIL_AT';
		gs_gSession.cookiePath = (gs_gSession.domainName == 'gmail.com' || gs_gSession.domainName == 'googlemail.com') ? '/mail' : '/hosted/__DOMAIN__';
		gs_gSession.cookiePath = gs_gSession.cookiePath.replace("__DOMAIN__", gs_gSession.domainName);
    },

    SetDomainUsingPath : function (path)
    {
		var type = "regular";
		if (path.indexOf("hosted") != -1)
		{
			type = "hosted";
			var domainIndex = path.indexOf("hosted/") + 7;
			gs_gSession.domainName = path.substring(domainIndex);
		}

		gs_gSession.mailURL  = (type == "regular") ? "http://mail.google.com/mail/?" : "http://mail.google.com/hosted/__DOMAIN__/?";
		gs_gSession.loginURL = (type == "regular")  ? "https://www.google.com/accounts/ServiceLoginAuth" : "https://www.google.com/a/__DOMAIN__/LoginAction";
		gs_gSession.logoutURL= (type == "regular") ? "http://mail.google.com/mail/?logout&hl=en" : "http://mail.google.com/hosted/__DOMAIN__/?logout&hl=en";

		gs_gSession.mailURL = gs_gSession.mailURL.replace("__DOMAIN__", gs_gSession.domainName);
		gs_gSession.loginURL = gs_gSession.loginURL.replace("__DOMAIN__", gs_gSession.domainName);
		gs_gSession.logoutURL = gs_gSession.logoutURL.replace("__DOMAIN__", gs_gSession.domainName);

		gs_gSession.cookieHost = 'mail.google.com';
		gs_gSession.cookieName = 'GMAIL_AT';
		gs_gSession.cookiePath = (type == "regular") ? '/mail' : '/hosted/__DOMAIN__';
		gs_gSession.cookiePath = gs_gSession.cookiePath.replace("__DOMAIN__", gs_gSession.domainName);
    },

 LoginUser : function(funcAfterLogin) {
  gs_viewHandler.HidePanel();
  if (funcAfterLogin == null || funcAfterLogin == "")
   funcAfterLogin = "gs_gSession.OnSuccessfulLogin()";

  var userid  = "";
  try {
   userid = gs_gPrefHandler.getPref(gs_gPrefNames.prefLastUserName, "char");
  } catch (ex) { return null; }
  if (userid == "") {
   alert(gs_jsUtils.GetPropertyString("emailempty"));
   return null;
  }
  var host = "chrome://gspace/";

  var pwdManager = Components.classes["@mozilla.org/passwordmanager;1"].createInstance(Components.interfaces.nsIPasswordManagerInternal);
  var existingHost = {value:""};
  var existingUser = {value:""};
  var existingPwd = {value:""};

  try {
   pwdManager.findPasswordEntry(host, userid, "", existingHost, existingUser, existingPwd);
  } catch(e) {;}
  var userpwd = "";
  if (existingPwd.value == "") {
   var promptPwd = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                   .getService(Components.interfaces.nsIPromptService);
   var objPasswd = {value:""};
   var objCheck = {value:""};
   var chkPwd = promptPwd.promptPassword(window, "Password", gs_jsUtils.GetPropertyString("givethepassword") + " " + userid, objPasswd, "", objCheck);
   if (chkPwd)
    userpwd = objPasswd.value;
  } else {
   userpwd = existingPwd.value;
  }
  if (gs_jsUtils.trimWhitespace(userpwd) == "") {
   alert(gs_jsUtils.GetPropertyString("pwdempty"));
   return null;
  }
  gs_gSession.setDetails(userid, userpwd);
  this.gAct = this.GetActionInstance();

  gs_viewHandler.ShowMesg(gs_jsUtils.GetPropertyString("wait"), -1);
  gs_viewHandler.ShowStatus("process-login");
  gs_gRemoteTreeView.SetDefaultPath();
  if (gs_jsUtils.trimWhitespace(userid) != "" && gs_jsUtils.trimWhitespace(userpwd) != "") {
   this.gAct.status = 0;
   this.SetDomain(userid);
   this.gAct.LoginUser(userid, userpwd, funcAfterLogin);
   if (this.gAct.status == 0)
    return false;
  }
  return true;
 },

 OnSuccessfulLogin : function () {
try {
  document.getElementById('gspace-broadcaster-connection-status').setAttribute("conn", "on");
  document.getElementById('gspace_remotePath').setAttribute("disabled", false);
  var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIWebNavigation)
                   .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIDOMWindow) ;
  mainWindow.document.getElementById('gspace-broadcaster-connection-status').setAttribute("conn", "on");

  this.ik = this.gAct.ik;
  this.at = this.gAct.at;
  this.totalSpace = this.gAct.totalSpace;
  this.usedSpace	= this.gAct.usedSpace;
  this.status = this.gAct.status;
  gs_viewHandler.ShowMesg('', -1);
  gs_viewHandler.ShowStatus("after-login");
  gs_viewHandler.ShowStatus("get-files");

  if (this.status != 0) {
   this.SetAttachmentSize();
   this.SetSpeed();
   gs_viewHandler.ShowStatus("file-properties");

   //StorePassword(this.userName, this.passWord);
   if (!gs_gSession.isOverlay) {
    gs_viewHandler.SetLocalTreeView();
    gs_gLocalTreeView.RefreshFolder();
   }
   gs_viewHandler.SetRemoteTreeView();
   gs_gRemoteTreeView.isTreeSorted = false;
   gs_gRemoteTreeView.RefreshFolder();
   gs_viewHandler.SetActionTreeView();
   gs_gPrefHandler.setPref(gs_gPrefNames.prefLastUserName, gs_gSession.userName, "char");
   gs_gSession.loadAccounts(true);

   //VICTOR-> Annotate hit in statcounter
   gs_xhttp.doSyncGet("", "http://c34.statcounter.com/3061396/0/ef97da5b/0/");
  }
}catch(e){alert(e);}
 },

 getStatus : function() {
  if (this.status == 1) {
   if (this.gAct.status != 1 || !this.gAct.GetCookieValue(this.cookieName, this.cookieHost, this.cookiePath) ) {
    alert(gs_jsUtils.GetPropertyString("loggedout"));
    gs_viewHandler.DoLogout();
    // this.gAct.status=0;
   }
  }
  return(this.status);
 },

 SetSpeed : function () {
  try {
   this.bufSize = parseFloat(gs_gPrefHandler.getPref(gs_gPrefNames.prefAttachmentSize, "char"));
   if (isNaN(this.bufSize))
    throw "set size";
  } catch (ex) {
   this.bufSize = 19000000;
   gs_gPrefHandler.setPref(gs_gPrefNames.prefAttachmentSize, "19000000", "char");
  }
 },

 SetAttachmentSize : function () {
  try {
			this.mSecsPerByte = parseFloat(gs_gPrefHandler.getPref(gs_gPrefNames.prefSpeed, "char"));
			if (isNaN(this.mSecsPerByte))
				throw "set size";
  } catch (ex) {
   this.mSecsPerByte = 0.0007;
   gs_gPrefHandler.setPref(gs_gPrefNames.prefSpeed, "0.0007", "char");
  }
 },

 GetActionInstance : function() {
  var gAct = new gs_gActions(this.ik, this.at, this.totalSpace, this.usedSpace, this.status);
  return gAct;
 },

 loadAccounts : function (afterLogin) {
  this.acctName = "";
  document.getElementById("gspace_accountsList").removeAllItems();

  if (gs_gPrefHandler.isExists(gs_gPrefNames.prefUserNames)) {
   var strNames = gs_gPrefHandler.getPref(gs_gPrefNames.prefUserNames);
   this.arrNames = strNames.split(";;");
  } else {
   this.arrNames = null;
  }
  if (gs_gPrefHandler.isExists(gs_gPrefNames.prefLastUserName)) {
   this.acctName = gs_gPrefHandler.getPref(gs_gPrefNames.prefLastUserName);
  }
  var found = false;
  if (this.arrNames != null) {
   if (this.arrNames.length == 0)
    document.getElementById("gspace_accountsList").insertItemAt(0, " " , " ", "");
   for (var i = 0; i < this.arrNames.length; i++) {
    document.getElementById("gspace_accountsList").insertItemAt(i, this.arrNames[i], this.arrNames[i], "");
    if (this.acctName == this.arrNames[i]) {
     document.getElementById("gspace_accountsList").selectedIndex = i;
     found = true;
    }
   }
   if (!found && afterLogin && this.acctName != "") {
    alert(gs_jsUtils.GetPropertyString("loggedinas") + this.acctName);
   }
  } else {
   document.getElementById("gspace_accountsList").insertItemAt(0, " " , " ", "");
  }
 },

 changeAccounts : function () {

		if (gs_gSession.arrNames != null)
		{
			if (document.getElementById("gspace_accountsList").selectedIndex == -1)
				document.getElementById("gspace_accountsList").selectedIndex = 0;

			if (document.getElementById("gspace_accountsList").selectedIndex != -1)
				gs_gPrefHandler.setPref(gs_gPrefNames.prefLastUserName, this.arrNames[document.getElementById("gspace_accountsList").selectedIndex]);

			//this.loadAccountInfo(this.arrNames[document.getElementById("gspace_accountsList").selectedIndex]);

		}
		else
			gs_gPrefHandler.setPref(gs_gPrefNames.prefLastUserName, "");

    },



    gInitialize: function (isOverlay)
	{
		if (gs_gSession.timesLoaded == 0)
		{
			if (!gs_gPrefHandler.isExists(gs_gPrefNames.prefAttachmentSize))
			{
				gs_gSession.isFirstTime = true;
			}
			gs_initPrefs();

			var strExtList = gs_gPrefHandler.getPref(gs_gPrefNames.prefHarmfulExtensions, "char");
			strExtList = strExtList.toLowerCase();

			gs_gSession.isOverlay = isOverlay;

			var arrExtList = strExtList.split(",");
			//var arrExtensions = [".exe", ".dll", ".zip", ".txt", ".vb"];
			//var ext = this.splitInfo.fileName.substring(this.splitInfo.fileName.lastIndexOf("."), this.splitInfo.fileName.length);
			//ext = ext.toLowerCase();

			for (var i = 0; i < arrExtList.length; i++)
			{
				var strExt = gs_jsUtils.trimWhitespace(arrExtList[i].toLowerCase());
				if (strExt == "")
				{
					arrExtList.splice(i, 1);
					i--;
					continue;
				}
				if (strExt.indexOf(".") != 0)
					strExt = "." + strExt;
				if (strExt == ".txt" || strExt == ".html" || strExt == ".htm")
				{
					arrExtList.splice(i, 1);
					i--;
				}
			}
			strExtList = arrExtList.join(",");

			gs_gPrefHandler.setPref(gs_gPrefNames.prefHarmfulExtensions, strExtList, "char");

			var isNew = gs_gPrefHandler.getPref(gs_gPrefNames.prefIsNew, "char");
			if (isNew == "yes")
			{

				alert(gs_jsUtils.GetPropertyString("firstmesg"));

				window.open("http://www.getgspace.com/faq.html", "Tutorial");
				gs_gPrefHandler.setPref(gs_gPrefNames.prefIsNew, "no", "char");
			}

			setTimeout(function () { gs_viewHandler.ShowStatus("before-login"); }, 10);

			if (gs_gSession.isFirstTime)
				gs_viewHandler.ShowStatus("first-time");
			gs_gSession.timesLoaded++;

		    if (!gs_gSession.isOverlay)
	        	gs_gSession.InitMode();


			this.gAct = this.GetActionInstance();

			if (this.gAct.GetExistingCookieValue())
			{
				this.cookiePath = this.gAct.cookiePath;

				if (this.cookiePath != "")
				{
					this.SetDomainUsingPath(this.cookiePath);
					var	funcAfterLogin = "gs_gSession.OnSuccessfulLogin()";
					gs_viewHandler.ShowMesg(gs_jsUtils.GetPropertyString("wait"), -1);
					gs_viewHandler.ShowStatus("process-login");
					gs_gRemoteTreeView.SetDefaultPath();

					this.gAct.loginStatus = 3;
					this.gAct.LoginUser("", "", funcAfterLogin);
				}

			}

			gs_gSession.loadAccounts();

			gs_gSession.changeAccounts();

		// gs_gSession.GetDomain();

			try
			{
				if("@maone.net/noscript-service;1" in Components.classes)
				{
					(Components.classes["@maone.net/noscript-service;1"]
						.getService().wrappedJSObject)
						.setJSEnabled("about:blank", true);
				}
			}
			catch(ex)
			{
				gs_Dump("Error allowing JS on about:blank - " + ex + "\n");
			}

		        if (!gs_gSession.isOverlay)
		        {
					gs_viewHandler.SetLocalTreeView();
					gs_gLocalTreeView.isTreeSorted = false;
					gs_gLocalTreeView.RefreshFolder();

					gs_gSession.RefreshStatus();

					gs_gSession.ChangeMode();
				}
				else
				{
					gs_gSession.modeIndex = "TransferMode";
				}

		}
	},

	InitMode : function ()
	{
		if (gs_gSession.isOverlay)
			return;
		gs_get("gspace_visualMode").selectedIndex = 0;

		gs_get("gspace_gImg").setAttribute("src", "chrome://gspace/content/img.htm");
		gs_get("gspace_songBrowser").setAttribute("src", "chrome://gspace/content/player.htm");
		gs_gSession.ChangeMode();

	},

	ChangeMode : function ()
	{
		var index = gs_get("gspace_visualMode").selectedIndex;

		if (index == 0)
		{
			gs_gSession.modeIndex = "TransferMode";
			gs_get("gspace_modeHolder").selectedIndex = 0;
			gs_get("gspace_remoteTreeChildren").setAttribute("context", "gspace_remoteContextMenu");
			gs_get("gspace_btnUpload").hidden = false;
			gs_get("gspace_btnDownload").hidden = false;
			gs_get("gspace_btnAddPlaylist").hidden = true;
			gs_get("gspace_actionTreeHolder").removeAttribute("collapsed");
			gs_get("gspace_gAdHolder").hidden = true;
			gs_get("gspace_adSplitter").hidden = true;
			gs_get("gspace_actSplitter").hidden = false;
			gs_get("gspace_photoPanelSplitter").hidden = true;
			gs_get("gspace_photoPanel").setAttribute("collapsed", "true");
			if (gs_gSession.enumType != "gs")
			{
				gs_gSession.enumType = "gs";
				gs_gRemoteTreeView.RefreshFolder();
			}

		}
		else if (index == 1)
		{
			gs_gSession.modeIndex = "SongMode";
			gs_get("gspace_modeHolder").selectedIndex = 1;
			gs_get("gspace_remoteTreeChildren").setAttribute("context", "gspace_playlistRemoteContextMenu");
			gs_get("gspace_btnUpload").hidden = true;
			gs_get("gspace_btnDownload").hidden = true;
			gs_get("gspace_btnAddPlaylist").hidden = false;
			gs_get("gspace_playlistTree").view = gs_gPlaylistTreeView;
			gs_get("gspace_actionTreeHolder").setAttribute("collapsed", "true");

			/*gs_get("gspace_gAdHolder").hidden = false;
			gs_get("gspace_gAdHolder").height = "90px";
			gs_get("gspace_gAdHolder").removeAttribute("collapsed");
			gs_get("gspace_adSplitter").hidden = true;
			gs_get("gspace_actSplitter").hidden = true;
			gs_get("gspace_photoPanel").setAttribute("collapsed", "true");*/

			var pDoc = gs_get("gspace_songBrowser").contentDocument;
			var flashFound = false;
			for (var i = 0; i < navigator.plugins.length; i++)
			{
				var desc = navigator.plugins[i].description;
				if (desc.indexOf("Shockwave Flash") != -1)
				{
					var version = desc.charAt(desc.indexOf(".") - 1);
					if (parseInt(version) > 6)
						flashFound = true;
				}
			}

			var mesgNode = gs_get("mesg", pDoc);
			if (mesgNode != null)
			{
				if (flashFound)
					mesgNode.innerHTML = gs_jsUtils.GetPropertyString("playermode1") + " " + gs_jsUtils.GetPropertyString("playermode2");
				else
					mesgNode.innerHTML = gs_jsUtils.GetPropertyString("playermode3") + '<a set="yes" href="http://www.adobe.com/shockwave/download/alternates/">http://www.adobe.com/shockwave/download/alternates/</a> "';
			}
		}
		else if (index == 2)
		{

			gs_get("gspace_modeHolder").selectedIndex = 2;
			gs_get("gspace_actionTreeHolder").setAttribute("collapsed", "true");
			gs_get("gspace_remoteTreeChildren").removeAttribute("context");

			//gs_get("gspace_gAdHolder").hidden = false;

			//hide the upload, download, playlist buttons
			gs_get("gspace_btnUpload").hidden = true;
			gs_get("gspace_btnDownload").hidden = true;
			gs_get("gspace_btnAddPlaylist").hidden = true;

			gs_get("gspace_adSplitter").hidden = false;
			gs_get("gspace_actSplitter").hidden = true;
			gs_gSession.modeIndex = "PhotoMode";

			gs_gRemoteTreeView.loadThumbnails();
			gs_viewHandler.ImageLoad();

		}
		else if (index == 3)
		{
			if (gs_gSession.alertGmailDrive)
			{
				alert(gs_jsUtils.GetPropertyString("gmaildrive"));
				gs_gSession.alertGmailDrive = false;
			}
			gs_gSession.modeIndex = "GmailDrive";
			gs_get("gspace_modeHolder").selectedIndex = 0;
			gs_get("gspace_remoteTreeChildren").setAttribute("context", "gspace_remoteContextMenu");
			gs_get("gspace_btnUpload").hidden = true;
			gs_get("gspace_btnDownload").hidden = false;
			gs_get("gspace_btnAddPlaylist").hidden = true;
			gs_get("gspace_actionTreeHolder").removeAttribute("collapsed");
			//gs_get("gspace_gAdHolder").hidden = true;
			gs_get("gspace_adSplitter").hidden = true;
			gs_get("gspace_actSplitter").hidden = false;
			gs_get("gspace_photoPanelSplitter").hidden = true;
			gs_get("gspace_photoPanel").setAttribute("collapsed", "true");
			if (gs_gSession.enumType != "gd")
			{
				gs_gSession.enumType = "gd";
				gs_gRemoteTreeView.RefreshFolder();
			}
		}

	}
};


var gs_viewHandler =
{

	SetLocalTreeView : function ()
	{
		gs_get("gspace_localTree").view = gs_gLocalTreeView;
	},

	SetRemoteTreeView : function ()
	{
		gs_get("gspace_remoteTree").view = gs_gRemoteTreeView;
	},

	SetActionTreeView : function()
	{
		gs_get("gspace_actionTree").view = gs_gActionTreeView;
	},


 DoLogout : function () {
  if (gs_gSession.status != 1)
   return;

  var objResp = new gs_WebResponse(0, "");
  var text = "", url = "";
  try {
   gs_gSession.setDetails(null, null);
   if (gs_gSession.gAct && gs_gSession.gAct.status == 1 && gs_gSession.logoutURL) {
    objResp = gs_xhttp.doSyncGet("", gs_gSession.logoutURL);
    if (objResp.eId > 0)
     throw "Step 1" + objResp.eMesg;
   }
   if (gs_gSession.isOverlay) {
    gs_get("gspace-uploadprogress").value = 0;
    gs_get("gspace-file-name").value = "";
    gs_get("gspace-file-status").value = "";
   }
   gs_gSession.status = 0;
   gs_gSession.gAct.status = 0;
   gs_gRemoteTreeView.ClearItems();
   gs_gActionTreeView.ClearItems();
   gs_gPlaylistTreeView.ClearItems();
   gs_gSession.RefreshStatus();
   gs_viewHandler.HidePanel();
   gs_gSession.InitMode();

  document.getElementById('gspace-broadcaster-connection-status').setAttribute("conn", "off");
  document.getElementById('gspace_remotePath').setAttribute("disabled", true);
  var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIWebNavigation)
                   .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                   .rootTreeItem
                   .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   .getInterface(Components.interfaces.nsIDOMWindow);
  mainWindow.document.getElementById('gspace-broadcaster-connection-status').setAttribute("conn", "off");
  } catch (ex) { 	if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex); }
 },

 opengSpace : function () {
  var url = "chrome://gspace/content/gspaceWindow.xul";
  // TM modif for blank tab
  var currBlank = ( getBrowser() &&  (getBrowser().mCurrentTab.linkedBrowser &&
                    (getBrowser().mCurrentTab.linkedBrowser.contentDocument.location == "about:blank")) ||
                  (!getBrowser().mCurrentTab.linkedBrowser && (getBrowser().mCurrentTab.label == "(Untitled)")));
  if (currBlank) {
   getBrowser().selectedTab = loadURI(url);
  } else {
    getBrowser().selectedTab = getBrowser().addTab(url);
  }
 },

 OpenPreferences : function () {
  window.openDialog("chrome://gspace/content/options.xul", "", "chrome,modal,centerscreen", gs_gSession);
 },

 ShowStatus : function (aMesgId, arrParams) {
  if (gs_gSession.isOverlay)
   return;
  var aText = "";
  switch (aMesgId) {
   case "before-login" :
    aText = gs_jsUtils.GetPropertyString("beforelogin");
    aText += " <font color='orange'>Rahul Jonna / tnarik / FON Labs</font>)";
    gs_viewHandler.HighlightElement("gspace_login", null, 15);
   break;
   case "login-failed" :
    aText = gs_jsUtils.GetPropertyString("loginfailed2");
   break;
   case "logout" :
    aText = gs_jsUtils.GetPropertyString("logoutsuccessful");
   break;
   case "process-login" :
    aText = gs_jsUtils.GetPropertyString("processlogin");
   break;
   case "after-login" :
    aText = gs_jsUtils.GetPropertyString("afterlogin");
   break;
   case "get-files" :
    aText = gs_jsUtils.GetPropertyString("getfiles");
   break;
   case "file-properties":
    if (gs_StatusController.clickOnFile <= 0)
     return;
    aText = gs_jsUtils.GetPropertyString("fileproperties");
    gs_StatusController.clickOnFile--;
   break;
   case "img-panel-click":
    if (gs_StatusController.imgPanelClick <= 0)
     return;
    aText = gs_jsUtils.GetPropertyString("imgpanelclick");
    gs_StatusController.imgPanelClick--;
   break;
   case "upload-failed":
    if (gs_StatusController.uploadFailed <= 0)
     return;
    aText = gs_jsUtils.GetPropertyString("uploadfailed");
    gs_StatusController.uploadFailed--;
   break;
   case "after-copy" :
    aText = arrParams[1] + " " + gs_jsUtils.GetPropertyString("aftercopy") + " " + arrParams[0];
   break;
   case "after-rename" :
    aText = arrParams[1] + " " + gs_jsUtils.GetPropertyString("afterrename") + " " + arrParams[0];
   break;
   case "after-paste" :
    aText = gs_jsUtils.GetPropertyString("afterpaste1") + "<br>";
    aText += gs_jsUtils.GetPropertyString("afterpaste2");
   break;
   case "paste-complete" :
    aText = gs_jsUtils.GetPropertyString("aftercomplete");
   break;
   case "first-time" :
    aText = gs_jsUtils.GetPropertyString("firsttime1") + "<br>";
    aText += gs_jsUtils.GetPropertyString("firsttime2") + " <font color='Orange'>";
    aText += gs_jsUtils.GetPropertyString("firsttime3") + "</font> ";
    aText += gs_jsUtils.GetPropertyString("firsttime4") + "<br>";
    aText += gs_jsUtils.GetPropertyString("firsttime5") + "<br>";
    aText += gs_jsUtils.GetPropertyString("firsttime6") + "<br>";
    aText += "4. <a href='http://www.getgspace.com/' target='_blank'>"
    aText += gs_jsUtils.GetPropertyString("firsttime7") + "</a>";
   break;
  }
  aText = "<div style='font-size:10px;font-weight:bold;font-family:verdana'>" + aText + "</div>";
  var doc = document.getElementById("gspace_gProp").contentWindow.document;
  doc.getElementById("status").innerHTML = aText + "<BR>" + doc.getElementById("status").innerHTML;
 },

 HighlightElement : function (elemId, flasher, numTimes) {
		if ("@mozilla.org/inspector/flasher;1" in Components.classes)
		{
			if (numTimes <= 0)
			{
				flasher.repaintElement(gs_get(elemId));
				return;
			}
			if (flasher == null)
			{
				flasher = Components.classes["@mozilla.org/inspector/flasher;1"].
							getService(Components.interfaces.inIFlasher);

				flasher.color = "#CC0000";
				flasher.thickness = "2";
				flasher.invert = false;
			}
			if (numTimes % 2 == 0)
				flasher.drawElementOutline(gs_get(elemId));
			else
				flasher.repaintElement(gs_get(elemId));
			if (numTimes > 0)
			{
				numTimes--;
				setTimeout(function () { gs_viewHandler.HighlightElement(elemId, flasher, numTimes); }, 200);
			}
		}
 },


 ShowMesg : function (aMessage, timeout) {
		gs_get("gspace_gMesg").value = aMessage;
		if (timeout > 0)
		{
			setTimeout("gs_viewHandler.ShowMesg('', -1)", timeout);
		}
 },

 ShowFileProperties : function () {
		if (gs_gSession.isOverlay || gs_gSession.getStatus() != 1 || gs_gRemoteTreeView.selection == null)
				return;

		var curSelection = gs_gRemoteTreeView.arrRemoteFiles[gs_gRemoteTreeView.selection.currentIndex];
		if (curSelection == null)
			return;
		gs_viewHandler.ImageLoad();

		var imgPath;
		if (curSelection.isDirectory)
			imgPath = "chrome://gspace/skin/directory.png";
		else if (curSelection.fileName.toLowerCase().indexOf(".jpg") != -1)
					imgPath = gs_gSession.mailURL + "view=att&disp=thd&attid=0.1&th=" + curSelection.uid
		else
			imgPath = "moz-icon://" + curSelection.fileName + "?size=48";
		var strData = "<img src='" + imgPath + "'/>";

		var folderType = "";
		if (curSelection.isDirectory)
		{
			if (curSelection.isReadonly)
				folderType = "(" + gs_jsUtils.GetPropertyString("readonly") + ")";
			else
				folderType = "(" + gs_jsUtils.GetPropertyString("normal") + ")";
		}
		var fileTotal = curSelection.fileTotal < 1 ? 1 : curSelection.fileTotal;
		strData += "<BR/>" + gs_jsUtils.GetPropertyString("name") + " <b>" + curSelection.fileName + "</b>";
		strData += "<BR/>" + gs_jsUtils.GetPropertyString("type") + " <b>" + (curSelection.isDirectory ? "Folder" : "File") + " " + folderType + "</b>";
		strData += "<BR/>" + gs_jsUtils.GetPropertyString("filesize") + " <b>" + curSelection.fileSizeInKb + "</b>";
		strData += "<BR/>" + gs_jsUtils.GetPropertyString("numberofsplits") + " <b>" + fileTotal + "</b>";
		strData += "<BR/>" + gs_jsUtils.GetPropertyString("from") + " <b>" + curSelection.from + "</b>";
		strData += "<BR/>" + gs_jsUtils.GetPropertyString("remotepath") + " <b>" + curSelection.folderPath + "</b>";

		strData += "<BR/><BR/>" + gs_jsUtils.GetPropertyString("systemmodifiedtime") + " <b>" + gs_jsUtils.GetDateString(curSelection.sysModifiedTime) + "</b>";
		strData += "<BR/>" + gs_jsUtils.GetPropertyString("createtime") + " <b>" + gs_jsUtils.GetDateString(curSelection.gspaceCreateTime) + "</b>";
		strData += "<BR/>" + gs_jsUtils.GetPropertyString("modifiedtime") + " <b>" + gs_jsUtils.GetDateString(curSelection.modifiedTime) + "</b>";

		strData = "<div style='font-size:10px;font-family:verdana;'>" + strData + "</div>";
		var doc = gs_get("gspace_gProp").contentWindow.document;
		doc.getElementById("prop").innerHTML = strData;
 },

 ImageLoad : function () {
		if (gs_gSession.getStatus() != 1 || gs_gRemoteTreeView.selection == null)
				return;

		var curSelection = gs_gRemoteTreeView.arrRemoteFiles[gs_gRemoteTreeView.selection.currentIndex];
		if (curSelection == null)
			return;

		if (gs_jsUtils.isImage(curSelection.fileName) && curSelection.fileTotal == 1 && gs_gSession.modeIndex == "PhotoMode")
		{
			var path = gs_gSession.mailURL + "view=att&disp=emb&attid=0.1&th=" + curSelection.uid;
			var eImg = gs_get("gspace_gImg").contentDocument.getElementById("eImg");
			if (eImg != null)
			{
				eImg.setAttribute("src", path);
				var curState = gs_get("gspace_gZoom").getAttribute("zoomfit");

				if (curState == "true")
				{
					eImg.setAttribute("style", "");
				}
				else
				{
					var tWidth = eImg.naturalWidth, tHeight = eImg.naturalHeight;

					var frmWidth = gs_get("gspace_imageHolder").boxObject.width - 10;
					var frmHeight = gs_get("gspace_imageHolder").boxObject.height - 40;

					var aspRatio = tWidth / tHeight;
					var compWidth = aspRatio > frmWidth / frmHeight ?  frmWidth : frmHeight * aspRatio;
					var compHeight = aspRatio > frmWidth / frmHeight ? frmWidth / aspRatio : frmHeight;

					compWidth = compWidth > tWidth ? tWidth : compWidth;
					compHeight = compHeight > tHeight ? tHeight : compHeight;


					gs_Dump("IMG = " + aspRatio + ", " + tWidth + ", " + tHeight + ", " + eImg.naturalWidth + ", " + eImg.naturalHeight + ", " + gs_get("gspace_imageHolder").boxObject.width + ", " + gs_get("gspace_imageHolder").boxObject.height);
					eImg.style.width = compWidth;
					eImg.style.height = compHeight;
					//eImg.setAttribute("style", "width:100%;height:100%");
				}
			}
		}
 },

 MagnifyImage : function (nochange) {
		var curState = gs_get("gspace_gZoom").getAttribute("zoomfit");
		var eImg = gs_get("gspace_gImg").contentDocument.getElementById("eImg");
		if (curState == "true") {
			if (!nochange) {
				gs_get("gspace_gZoom").setAttribute("zoomfit", "false");
				gs_get("gspace_gZoom").setAttribute("image", "chrome://gspace/skin/imagezoom-in.png");
				gs_get("gspace_gZoom").setAttribute("tooltiptext", gs_jsUtils.GetPropertyString("viewfullimage"));
			}
			if (eImg != null) {
				var tWidth = eImg.naturalWidth, tHeight = eImg.naturalHeight;

				var frmWidth = gs_get("gspace_imageHolder").boxObject.width - 10;
				var frmHeight = gs_get("gspace_imageHolder").boxObject.height - 40;

				var aspRatio = tWidth / tHeight;
				var compWidth = aspRatio > frmWidth / frmHeight ?  frmWidth : frmHeight * aspRatio;
				var compHeight = aspRatio > frmWidth / frmHeight ? frmWidth / aspRatio : frmHeight;

				compWidth = compWidth > tWidth ? tWidth : compWidth;
				compHeight = compHeight > tHeight ? tHeight : compHeight;

				gs_Dump("IMG = " + aspRatio + ", " + tWidth + ", " + tHeight + ", " + eImg.naturalWidth + ", " + eImg.naturalHeight + ", " + gs_get("gspace_imageHolder").boxObject.width + ", " + gs_get("gspace_imageHolder").boxObject.height);
				eImg.style.width = compWidth;
				eImg.style.height = compHeight;

			}
		} else {
			if (!nochange) {
				gs_get("gspace_gZoom").setAttribute("zoomfit", "true");
				gs_get("gspace_gZoom").setAttribute("image", "chrome://gspace/skin/imagezoom-fit.png");
				gs_get("gspace_gZoom").setAttribute("tooltiptext", gs_jsUtils.GetPropertyString("fitinscreen"));
			}
			if (eImg != null) {
				eImg.setAttribute("style", "");
			}
		}
 },

 HidePanel: function () {
  if (gs_gSession.isOverlay)
   return;
  var doc = gs_get("gspace_gProp").contentWindow.document;
  doc.getElementById("prop").innerHTML = "";
  doc.getElementById("status").innerHTML = "";
  gs_viewHandler.ShowStatus("logout");
 },

 OpenNewWindow: function () {
  if (gs_gSession.getStatus() != 1 || gs_gRemoteTreeView.selection == null)
   return;
  var curSelection = gs_gRemoteTreeView.arrRemoteFiles[gs_gRemoteTreeView.selection.currentIndex];

  if (gs_jsUtils.isImage(curSelection.fileName) && curSelection.fileTotal == 1) {
   var path = gs_gSession.mailURL + "view=att&disp=inline&attid=0.1&th=" + curSelection.uid;
   var imgWindow = window.open(path, "Image");
  }
 },

 setGmailEnglishLocale: function () {
  try {
   if (gs_gSession.getStatus() != 1) {
    alert(gs_jsUtils.GetPropertyString("notlogged"));
    return;
   }
   var path = gs_gSession.mailURL +
              "act=prefs&at=" + gs_gSession.at + "&search=" +
              "&sx_dl=en" +
              "&ix_nt=50&bx_hs=0&bx_pd=0&sx_sg=0&sx_sg=&bx_sc=0&bx_ns=0&bx_ve=0&sx_vs=&sx_vm=" +
              "&bx_en=0&p_ix_pd=1&p_ix_fv=true&p_ix_ca=1&p_bx_pe=1&" +
              "&p_sx_dl=en"+
              "&p_bx_aa=1&p_sx_pu=undefined&p_ix_pp=";
   gs_xhttp.doSyncGet("", path);
  } catch (ex) { 	if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex); }
},

 openInbox : function() {
  try {
   if (gs_gSession.getStatus() != 1)  {
    alert(gs_jsUtils.GetPropertyString("notlogged"));
    return;
   }
   var path = gs_gSession.mailURL;
   var imgWindow = window.open(path, gs_gSession.gAct.domainName);
  } catch (ex) { alert(ex); }
 }
}

function gSpaceInit() {
 var toolbox = gs_get("navigator-toolbox");
 if (toolbox == null)
  return;
 try {
  var toolboxDocument = toolbox.ownerDocument;
  var afterElem = "search-container";
  var hasGSpaceBtn = false;
  var toolbar = gs_get("nav-bar");
  var prefIcon = gs_gPrefHandler.getPref(gs_gPrefNames.prefToolbarIcon, "char");
  var oldSet, newSet;
  oldSet = toolbar.currentSet;
  if (prefIcon == "yes") {
   gs_Dump("A " + toolbar.currentSet);
   if (toolbar.currentSet.indexOf("gspaceToolbarBtn") == -1) {
    newSet = oldSet.replace(afterElem, afterElem + ",gspaceToolbarBtn");
    toolbar.currentSet = newSet;
    toolbar.setAttribute("currentset", newSet);
    toolboxDocument.persist(toolbar.id, "currentset");
    BrowserToolboxCustomizeDone(false);
   }
  } else {
   if (oldSet.indexOf("gspaceToolbarBtn") != -1) {
    newSet = oldSet.replace(",gspaceToolbarBtn", "");
    toolbar.currentSet = newSet;
    toolbar.setAttribute("currentset", newSet);
    toolboxDocument.persist(toolbar.id, "currentset");
    BrowserToolboxCustomizeDone(false);
   }
  }
 } catch (ex) {;}
}

function gSpaceUnload() {
 var toolbox = gs_get("navigator-toolbox");
 var toolboxDocument = toolbox.ownerDocument;
 var afterElem = "urlbar-container";
 var hasGSpaceBtn = false;
 var toolbar = gs_get("nav-bar");
 var oldSet = toolbar.currentSet;
 if (toolbar.currentSet.indexOf("gspaceToolbarBtn") != -1) {
  var newSet = oldSet.replace(",gspaceToolbarBtn", "");
  gs_Dump(newSet);
  toolbar.currentSet = newSet;
  toolbar.setAttribute("currentset", newSet);
  toolboxDocument.persist(toolbar.id, "currentset");
  BrowserToolboxCustomizeDone(false);
 }
 gs_Dump(newSet);
}

