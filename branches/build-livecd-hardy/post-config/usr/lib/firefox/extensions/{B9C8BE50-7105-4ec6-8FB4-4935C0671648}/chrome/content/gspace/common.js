//names of the preferences
var gs_gPrefNames =
{
    prefLocalFolderKey	: "gspace.localdir",
	prefLastUserName	: "gspace.lastusername",

	prefAttachmentSize	: "gspace.attachmentsize",
	prefHarmfulExtensions : "gspace.harmfulext",
	prefViewExtensions	: "gspace.previewext",
	prefSpeed			: "gspace.speed",
	prefToolbarIcon		: "gspace.toolbaricon",

	prefUserNames	: "gspace.usernames",
	prefClickProperties	: "gspace.clickproperties",
	prefIsNew			: "gspace.newinstallation",

	prefShowThumbnails	: "gspace.showthumbnails",
	prefShowStatusIcon	: "gspace.showstatusicon",

	prefDebug			: "gspace.debug"
}

var gs_gFileOpPref =
{
	CANCEL : 0,
	OVERWRITE_DELETE : 1,
	OVERWRITE_DELETE_ALL : 2,
	SKIP : 3,
	SKIP_ALL : 4,
	OVERWRITE_SAVE : 5,
	OVERWRITE_SAVE_ALL : 6,

	overwriteOption : 5,
	askOption : true,

	askCopyOption : true,
	copyOverwriteOption : 5
}

function gs_gRemoteFileInfo(fileName, uid, fileSize, uploadTime, randomNumber, isDir, path, folderPath, fileTotal, from, hasMetaData, isReadonly)
{
	this.fileName = fileName;
	this.uid = uid;
	this.fileSizeInKb = fileSize;
	this.uploadTime = uploadTime;
	this.randNum = randomNumber;
	this.isDirectory = isDir;
	this.filePath = path;
	this.folderPath = folderPath;
	this.getDate = function (uploadTime)
	{
		var arrDateTime = uploadTime.split("_");
		return new Date(arrDateTime[0] + " " + arrDateTime[1]);
	}
	this.fileNum = 1;
	this.fileTotal = fileTotal;
	this.modifiedTime = this.getDate(uploadTime);

	this.sysModifiedTime = "";
	this.from = (from != null && from != "") ? from : gs_gSession.userName;
	this.gspaceCreateTime = "";

	this.alreadyExists = 0;
	this.existingUid = null;

	this.hasMetaData = (hasMetaData) ? true : false;
	this.loadThumbnail = false;

	this.isReadonly = (isReadonly) ? true : false;
}


function gs_gLocalFileInfo(filePath, fileName, fileSize, modifiedTime, isDirectory)
{
    this.filePath = filePath;
    this.fileName = fileName;
    this.fileSizeInKb = Math.ceil(fileSize / 1000);
    this.modifiedTime = modifiedTime;
    this.isDirectory = isDirectory;
}

function gs_gSplitFileInfo(fileName, fpLocal, tgActionRow, fileNum, fileTotal, randNum, tRow, path)
{
	this.isFolder = 0;
	this.totalFileSize = -1;
    this.fileName = fileName;
    this.fileNum = 1;
    this.fileTotal = 1;
    this.folderPath = path;
	this.diskFileName = "";
	this.toPath = "";
    this.randNum = -1;
	this.isLargeFile = false;
    this.arrUid = null;
    this.arrOtherInfo = null;
    this.strMetaXml = "";
}


function gs_gActionRow(fromPath, toPath, fileName, status, type, fileSize, curprogress, isDirectory, uid, existUid)
{
    this.fileName = fileName;
    this.status = status;
    this.gspace_actType  = type;
    this.progress = curprogress;
    this.fileSizeInKb = fileSize;
    this.isDirectory = isDirectory;
    this.fromPath = fromPath;
    this.toPath = toPath;
    this.internalProgress = 0;
    this.uid = uid;
    this.existingUid = existUid;
    this.tempListener = null;
    this.tempFileName = "";

    this.sysModifiedTime = "";
	this.from = gs_gSession.userName;
	this.gspaceCreateTime = "";
	this.doDelete = false;
}


function gs_compareFileName(x, y)
{
	if (x.isDirectory && !y.isDirectory)
		return -1;
	else if (!x.isDirectory && y.isDirectory)
		return 1;

	if (x.fileName.toLowerCase() < y.fileName.toLowerCase())
		return -1;
	else if (x.fileName.toLowerCase() > y.fileName.toLowerCase())
		return 1;
	return 0;
}

function gs_compareFrom(x, y)
{
	if (x.isDirectory && !y.isDirectory)
		return -1;
	else if (!x.isDirectory && y.isDirectory)
		return 1;

	if (x.from.toLowerCase() < y.from.toLowerCase())
		return -1;
	else if (x.from.toLowerCase() > y.from.toLowerCase())
		return 1;
	return 0;
}

function gs_compareFileSize(x, y)
{
	if (x.isDirectory && !y.isDirectory)
		return -1;
	else if (!x.isDirectory && y.isDirectory)
		return 1;
	if (isNaN(x.fileSizeInKb - y.fileSizeInKb))
		return 0;
	else
		return x.fileSizeInKb - y.fileSizeInKb;
}

function gs_compareModifiedTime(x, y)
{
	if (x.isDirectory && !y.isDirectory)
		return -1;
	else if (!x.isDirectory && y.isDirectory)
		return 1;

	if (isNaN(x.modifiedTime - y.modifiedTime))
		return 0;
	else
		return x.modifiedTime - y.modifiedTime;
}


function gs_Dump(aMessage)
{

	try
	{

		if (gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug, "char") == "yes")
		{

			var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
									.getService(Components.interfaces.nsIConsoleService);
			consoleService.logStringMessage("gspace: " + aMessage);
		}
	}
	catch (ex)
	{
	}

}

if (typeof gs_jsUtils == 'undefined')
{
	var gs_jsUtils =
	{
		SetLocalSystemPath : function (path)
		{
			var folder = Components.classes["@mozilla.org/file/directory_service;1"]
							.getService(Components.interfaces.nsIProperties)
							.get("Home", Components.interfaces.nsIFile);

			path = (folder.path.search(/\\/) != -1) ? path.replace(/\//gi, "\\") : path.replace(/\\/gi, "/");
			return path;
		},


		GetPropertyString : function (prop)
		{
			try
			{
				return gs_get('gspace_strings').getString(prop);
			}
			catch (ex)
			{
				return ex;
			}
		},


		// Remove leading and trailing whitespace from a string
		trimWhitespace : function (string)
		{
			var newString  = '';
			var substring  = '';
			var beginningFound = false;

			// copy characters over to a new string
			// retain whitespace characters if they are between other characters
			for (var i = 0; i < string.length; i++) {

				// copy non-whitespace characters
				if (string.charAt(i) != ' ' && string.charCodeAt(i) != 9) {

					// if the temporary string contains some whitespace characters, copy them first
					if (substring != '') {
						newString += substring;
						substring = '';
					}
					newString += string.charAt(i);
					if (beginningFound == false) beginningFound = true;
				}

				// hold whitespace characters in a temporary string if they follow a non-whitespace character
				else if (beginningFound == true) substring += string.charAt(i);
			}
			return newString;
		},


		GetDateString : function(dt)
		{
			if (dt == null || dt == undefined)
				return "";
			var modTime = new Date(dt);

			if (isNaN(modTime.getDate()))
			{
				gs_Dump(dt);
				return "";
			}
			var amORpm = (modTime.getHours() >= 0 && modTime.getHours() <= 12) ? "AM" : "PM";
			var sdate = modTime.getDate();
			sdate = sdate > 9 ? sdate : "0" + sdate;
			var month = modTime.getMonth() + 1;
			month = month > 9 ? month : "0" + month;
			var hours = modTime.getHours() - 12 >= 0 ? Math.abs(modTime.getHours() - 12) : modTime.getHours();
   			hours = hours > 9 ? hours : "0" + hours;

   			var minutes = modTime.getMinutes() > 9 ? modTime.getMinutes() : "0" + modTime.getMinutes();
			return month + "/" + sdate + "/" + modTime.getFullYear()
							+ " " + hours + ":" + minutes + " " + amORpm;

		},

		DelayExec : function (millis)
		{
			var date = new Date();
			var curDate = null;

			do { var curDate = new Date(); }
			while (curDate - date < millis);
		},

		isImage : function(fileName)
		{
			try
			{
				var strExtList = gs_gPrefHandler.getPref(gs_gPrefNames.prefViewExtensions, "char");
				var arrExtList = strExtList.split(",");

				for (var i = 0; i < arrExtList.length; i++)
				{
					var strExt = gs_jsUtils.trimWhitespace(arrExtList[i].toLowerCase());
					if (strExt.indexOf(".") != 0)
						strExt = "." + strExt;
					if (fileName.toLowerCase().indexOf(strExt) != -1)
						return true;
				}
			}
			catch (ex)
			{
				return false;
			}
			return false;
		}
	}
}

//preference handler which wraps the actual 'pref' functions
var gs_gPrefHandler =
{
     //used to set the preferences
    prefs : Components.classes["@mozilla.org/preferences-service;1"].
               getService(Components.interfaces.nsIPrefBranch ),


 isExists : function (prefName, type) {
  var prefs = this.prefs;
  type = (type == null) ? "char" : type;
  if (type == "char") {
   try {
    if (prefs.getPrefType(prefName) == prefs.PREF_STRING && gs_jsUtils.trimWhitespace( prefs.getCharPref(prefName).toString()) != "")
     return true;
   } catch (ex) {
    return false;
   }
   return false;
  }
  if (type == "bool") {
   try {
    var tempValue = prefs.getBoolPref(prefName);
   } catch (ex) {
    return false;
   }
   return true;
  }
  return false;
 },
 getPref : function (prefName, type) {
  var prefs = this.prefs;

  try {
   type = (type == null) ? "char" : type;
   if (type == "char") {
    return prefs.getCharPref(prefName).toString();
   } else if (type == "bool") {
     return prefs.getBoolPref (prefName);
    }
  } catch (e) {
	if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex + ", " + prefName);
	else alert("Failing reading preference " + prefName);
  }
  return null;
 },
 setPref : function (prefName, value, type) {
  var prefs = this.prefs;
  type = (type == null) ? "char" : type;
  if (type == "char") {
   prefs.setCharPref(prefName, value);
  } else if (type == "bool") {
    prefs.setBoolPref(prefName, value);
   }
  return null;
 },
    setPrefIfNotExists : function (prefName, value, type)
    {
        var prefs = this.prefs;
        type = (type == null) ? "char" : type;
        if (type == "char")
        {
            try
            {
                if (prefs.getPrefType (prefName) != prefs.PREF_STRING || (prefs.getPrefType(prefName) == prefs.PREF_STRING && gs_jsUtils.trimWhitespace(prefs.getCharPref (prefName).toString()) == ""))
                {
                    prefs.setCharPref (prefName, value);
                }
            }
            catch (ex)
            {
                prefs.setCharPref(prefName, value);
            }

        }
        else if (type == "bool")
        {
            try
            {
                var boolValue = prefs.getBoolPref(prefName);
            }
            catch (ex)
            {
                prefs.setBoolPref(prefName, value);
            }


        }
    },

    getComplexValue : function (prefName, type)
    {
        var prefs = this.prefs;
        return prefs.getComplexValue(prefName, type);
    },

    setComplexValue : function (prefName, type, value)
    {
        var prefs = this.prefs;
        prefs.setComplexValue(prefName, type, value);
    }
}

function gs_initPrefs()
{
	gs_gPrefHandler.setPrefIfNotExists(gs_gPrefNames.prefHarmfulExtensions, ".exe,.dll,.zip,.vb,.chm", "char");
	gs_gPrefHandler.setPrefIfNotExists(gs_gPrefNames.prefViewExtensions, ".jpg,.bmp", "char");
	gs_gPrefHandler.setPrefIfNotExists(gs_gPrefNames.prefAttachmentSize, "19000000", "char");
	gs_gPrefHandler.setPrefIfNotExists(gs_gPrefNames.prefDebug, "no", "char");
	gs_gPrefHandler.setPrefIfNotExists(gs_gPrefNames.prefToolbarIcon, "yes", "char");
	gs_gPrefHandler.setPrefIfNotExists(gs_gPrefNames.prefClickProperties, "yes", "char");
	gs_gPrefHandler.setPrefIfNotExists(gs_gPrefNames.prefIsNew, "yes", "char");
	gs_gPrefHandler.setPrefIfNotExists(gs_gPrefNames.prefShowThumbnails, "yes", "char");
	gs_gPrefHandler.setPrefIfNotExists(gs_gPrefNames.prefShowStatusIcon, "yes", "char");
	gs_gPrefHandler.setPrefIfNotExists(gs_gPrefNames.prefSpeed, "0.0007", "char");
}

function gs_get(elemId, doc)
{
	if (doc == null)
		return document.getElementById(elemId);
	else
		return doc.getElementById(elemId);
}


