var gs_gRemoteTreeView = {
 treeBox : null,
 selection : null,
 filter : true,
 arrRemoteFiles : new Array,
 arrImageFilesIndex : null,

 remotePath	: "gs:/",
 arrId : null,

 thumbnailCount : -1,

 isTreeSorted : false,

 isCutOrCopy : 0,
 arrCopyFiles : new Array,
 copyPath : "",
 showImagePanel : false,
 arrExistFoldersPath : new Array,

 copyIndex : 0,
 splitIndex : -1,
 splitInfo : null,

 curFolderInfo : null,

 toEmailList : "",

 EXISTS_IN_FOLDER : 1,
 EXISTS_ASK_OPTION : 2,

 IS_CUT : 1,
 IS_COPY : 2,
 IS_RENAME : 3,
 IS_NOTHING : 0,
 IS_SENDTO : 4,

 isCopyActive : false,
 replacePath : "",

 get rowCount()                     { return (this.arrRemoteFiles != null)? this.arrRemoteFiles.length : 0; },
 setTree     : function(treeBox)         { this.treeBox = treeBox; },
 getCellText : function(idx, column) {
  if (idx >= this.rowCount) return "";
  if (column.id == "gspace_remoteFileName") {
   return decodeURI(this.arrRemoteFiles[idx].fileName);
  }
  if (column.id == "gspace_remoteFileSize") {
   return this.arrRemoteFiles[idx].fileSizeInKb;
  }
  if (column.id == "gspace_uploadTime") {
   //return this.arrRemoteFiles[idx].uploadTime;
   var modTime = new Date(this.arrRemoteFiles[idx].modifiedTime);
   return gs_jsUtils.GetDateString(modTime);
  }
  if (column.id == "gspace_remoteFrom") {
   if (this.arrRemoteFiles[idx].from == gs_gSession.userName)
    return gs_jsUtils.GetPropertyString("me");
   else
    return this.arrRemoteFiles[idx].from;
  }
  return "";
 },
    isEditable: function(idx, column)  { return true; },
    isContainer: function(idx)         { return false;},
    isSeparator: function(idx)         { return false; },
    isSorted: function()               { return false; },

 getImageSrc: function(idx, column) {
  if (idx >= this.rowCount) return "";
  if (column.id == "gspace_remoteFileName") {
   if (this.arrRemoteFiles[idx].isDirectory) {
    if (this.arrRemoteFiles[idx].isReadonly)
     return "chrome://gspace/skin/folder_readonly.png";
    else
     return "chrome://gspace/skin/directory.png";
   } else {
    return "moz-icon://" + this.arrRemoteFiles[idx].fileName + "?size=16";
   }
  }
  return "";
 },
 getProgressMode : function(idx,column) {},
 getCellValue: function(idx, column) {},
 cycleHeader: function(col, column) {
  var sortDirection = (col.element.getAttribute("sortDirection") == "ascending" ||
                      col.element.getAttribute("sortDirection") == "natural") ? "descending" : "ascending";
  for (var i = 0; i < col.columns.count; i++) {
   col.columns.getColumnAt(i).element.setAttribute("sortDirection", "natural");
  }
  col.element.setAttribute("sortDirection", sortDirection);

  this.DoSort();
 },
 canDrop : function (idx, orientation) {
  if (orientation != Components.interfaces.DROP_ON)
   return false;
  else
   return true;
 },
 selectionChanged: function() {},
 cycleCell: function(idx, column) {},
 performAction: function(action) {},
 performActionOnCell: function(action, index, column) {},
 getRowProperties: function(idx, prop) {
  if (gs_gRemoteTreeView.curFolderInfo && gs_gRemoteTreeView.curFolderInfo.isReadonly) {
   var aserv = Components.classes["@mozilla.org/atom-service;1"].
               getService(Components.interfaces.nsIAtomService);
   prop.AppendElement(aserv.getAtom("readonly"));
  }
 },
 getCellProperties: function(idx, column, prop) {
  if (gs_gRemoteTreeView.curFolderInfo && gs_gRemoteTreeView.curFolderInfo.isReadonly) {
   var aserv = Components.classes["@mozilla.org/atom-service;1"].
               getService(Components.interfaces.nsIAtomService);
   prop.AppendElement(aserv.getAtom("readonly"));
  }
 },
 getColumnProperties: function(column, element, prop) {},
 getLevel : function(idx) { return 0; },
 getParentIndex : function(idx) { return -1;},
 drop : function (idx, orientation){	},

 SetDefaultPath : function() {
  this.remotePath = "gs:/";
 },
 DoSort	: function() {
  if ( gs_get("gspace_remoteFileName").getAttribute("sortDirection") &&
       gs_get("gspace_remoteFileName").getAttribute("sortDirection") != "natural") {
   if (gs_get("gspace_remoteFileName").getAttribute("sortDirection") == "descending")
    this.arrRemoteFiles.sort(gs_compareFileName);
   else {
    if (!this.isTreeSorted) {
     this.arrRemoteFiles.sort(gs_compareFileName);
     this.arrRemoteFiles.reverse();
    }
   }
  }

  if ( gs_get("gspace_remoteFileSize").getAttribute("sortDirection") &&
       gs_get("gspace_remoteFileSize").getAttribute("sortDirection") != "natural") {
   if (gs_get("gspace_remoteFileSize").getAttribute("sortDirection") == "descending")
    this.arrRemoteFiles.sort(gs_compareFileSize);
   else {
    if (!this.isTreeSorted) {
     this.arrRemoteFiles.sort(gs_compareFileSize);
     this.arrRemoteFiles.reverse();
    }
   }
  }

  if ( gs_get("gspace_uploadTime").getAttribute("sortDirection") &&
       gs_get("gspace_uploadTime").getAttribute("sortDirection") != "natural") {
   if (gs_get("gspace_uploadTime").getAttribute("sortDirection") == "descending")
    this.arrRemoteFiles.sort(gs_compareModifiedTime);
   else {
    if (!this.isTreeSorted) {
     this.arrRemoteFiles.sort(gs_compareModifiedTime);
     this.arrRemoteFiles.reverse();
    }
   }
  }

  if ( gs_get("gspace_remoteFrom") && gs_get("gspace_remoteFrom").getAttribute("sortDirection") &&
       gs_get("gspace_remoteFrom").getAttribute("sortDirection") != "natural") {
   if (gs_get("gspace_remoteFrom").getAttribute("sortDirection") == "descending")
    this.arrRemoteFiles.sort(gs_compareFrom);
   else {
    if (!this.isTreeSorted) {
     this.arrRemoteFiles.sort(gs_compareFrom);
     this.arrRemoteFiles.reverse();
    }
   }
  }
 },

 dblClick : function(event) {
		if (gs_gSession.getStatus() != 1)
			return;
		var curSelection = this.arrRemoteFiles[this.selection.currentIndex];
		if (curSelection.isDirectory)
			this.ChangeFolder(curSelection.filePath);
	},

	click : function (evt)
	{
		if (gs_gSession.getStatus() != 1)
			return;

		var curSelection = gs_gRemoteTreeView.arrRemoteFiles[gs_gRemoteTreeView.selection.currentIndex];
		if (curSelection == null)
			return;
		if (gs_gPrefHandler.getPref(gs_gPrefNames.prefClickProperties, "char") == "yes")
		{
			if (curSelection.hasMetaData)
			{
				var arrOtherInfo = this.GetFileInfo(curSelection.uid.split("|")[0]);
				curSelection.gspaceCreateTime = arrOtherInfo['GSCT'];
				curSelection.sysModifiedTime = arrOtherInfo['ST'];
			}
		}
		gs_viewHandler.ShowFileProperties();
	},

	keyPress: function (evt)
	{
		if (gs_gSession.getStatus() != 1)
			return;
		if (evt.keyCode == 13)			//if enter key is pressed
			this.dblClick(null);
		if (evt.ctrlKey && (evt.which == 65 || evt.which == 97))
		{
			if (this.selection)
				this.selection.selectAll();
			evt.stopPropagation();
		}
	},

	GetFileInfo : function (uid)
	{
		var arrOtherInfo = new Array();
		var objResp = new gs_WebResponse(0, "");
		var text = "", url = gs_gSession.mailURL + "view=att&disp=inline&attid=0.2&";
		url += "th=" + uid;

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
				var dataNode = doc.getElementsByTagName("metadata")[0];
				if (dataNode != null)
				{
					for (var i = 0; i < dataNode.childNodes.length; i++)
					{
						arrOtherInfo[dataNode.childNodes[i].nodeName] = dataNode.childNodes[i].firstChild.nodeValue;
					}
				}
			}
		}
		return arrOtherInfo;
	},



	ChangeFolder	: function (path)
	{
		if (gs_gSession.getStatus() != 1)
			return;
		try
		{
			if (path.indexOf("gs:") == -1)
				throw gs_jsUtils.GetPropertyString("invalidpath");
			this.SetRemotePath(path);
			this.RefreshFolder();
		}
		catch (ex)
		{
				if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
		}
	},

	GotoParentFolder	: function()
	{
		if (gs_gSession.getStatus() != 1)
			return;
		var curPath = this.remotePath;

		var lastButOneSlash = curPath.lastIndexOf("/", curPath.length - 2);
		var parentFolderPath = curPath.substring(0, lastButOneSlash);

		this.ChangeFolder(parentFolderPath);
	},

 ClearItems  : function() {
  var rowCountChanged = this.rowCount;
  delete this.arrRemoteFiles;
  if (this.treeBox != null) this.treeBox.rowCountChanged(0, -rowCountChanged);
 },

 RefreshFolder	: function () {
		if (gs_gSession.getStatus() != 1)
			return;
		this.thumbnailCount = -1;

		var rowCountChange = -this.rowCount;

	    delete this.arrRemoteFiles;

	    this.SetRemotePath(this.remotePath);

	    gs_gSession.gAct.Enumerate(this.remotePath);
	    gs_gRemoteTreeView.curFolderInfo = gs_gSession.gAct.folderInfo;
	    this.arrRemoteFiles =  gs_gSession.gAct.gFiles;

	    this.DoSort();
	    this.loadThumbnails();
	    if (this.treeBox != null)
	    {
			this.treeBox.rowCountChanged(0, rowCountChange);
			rowCountChange = this.arrRemoteFiles.length;
			this.treeBox.rowCountChanged(0, rowCountChange);
	    }
	    if (this.selection)
			this.selection.clearSelection();
	    this.RefreshStatus();
	},

 RefreshStatus : function () {
  gs_gSession.RefreshStatus();
 },

 SetRemotePath : function (path) {
  path = path.replace("d$", "");
  path = gs_jsUtils.trimWhitespace(path);
  this.remotePath = path;
  if (this.remotePath.lastIndexOf("/") != this.remotePath.length -1 )
   this.remotePath += "/";
  gs_get("gspace_remotePath").value = this.remotePath;
 },

 GetRemotePath : function (){
  return this.remotePath;
 },

	DeleteSelected	: function ()
	{
	    gs_viewHandler.ShowMesg(gs_jsUtils.GetPropertyString("wait"), 1500);
		if (gs_gSession.getStatus() != 1)
			return;

		if (gs_gRemoteTreeView.curFolderInfo && gs_gRemoteTreeView.curFolderInfo.isReadonly)
		{
			alert(gs_jsUtils.GetPropertyString("folderreadonly"));
			return;
		}
		var start = new Object();
        var end = new Object();

		var numRanges = gs_gRemoteTreeView.selection.getRangeCount();
		this.arrId = new Array;
		var isDisplayed = false;

		var chk = confirm(gs_jsUtils.GetPropertyString("deleteconfirm"));
		if (!chk)
			return;
		else
		{
			for (var t = 0; t < numRanges; t++)
			{
				gs_gRemoteTreeView.selection.getRangeAt(t, start, end);
				for (var v = start.value; v <= end.value; v++)
				{
					var tgRemoteInfo = gs_gRemoteTreeView.arrRemoteFiles[v];
					if (tgRemoteInfo.isDirectory)
                    {
						var remotePath = tgRemoteInfo.filePath;
						remotePath = remotePath.substring(0, remotePath.lastIndexOf("/"));
						this.GetRemoteFileIds(remotePath);
					}
					var arrUid = tgRemoteInfo.uid.split("|");
					for (var i = 0; i < arrUid.length; i++)
						this.arrId.push(arrUid[i]);
				}
				gs_gSession.gAct.DeleteMail(this.arrId);
				delete this.arrId;
				this.arrId = new Array;
			}

			this.RefreshFolder();
			if (this.selection)
				this.selection.clearSelection();
		}
	},

	GetRemoteFileIds		: function (remotePath)
    {
		remotePath += "/";
		var tgAct = gs_gSession.GetActionInstance();
		tgAct.Enumerate(remotePath);

	    for (var i = 0; i < tgAct.gFiles.length; i++)
	    {
			var tgRemoteInfo = tgAct.gFiles[i];

	        remotePath = tgRemoteInfo.filePath;

	        if (tgRemoteInfo.isDirectory)
            {
				remotePath = remotePath.substring(0, remotePath.lastIndexOf("/"));
				this.GetRemoteFileIds(remotePath);
			}
			var arrUid = tgRemoteInfo.uid.split("|");
			for (var j = 0; j < arrUid.length; j++)
				this.arrId.push(arrUid[j]);


	    }

    },

	FileExists	: function (fileName, isDir)
	{
		var found = -1;
		for (var i = 0; i < this.arrRemoteFiles.length; i++)
		{
			if (this.arrRemoteFiles[i].fileName == fileName)
			{
				if (isDir && this.arrRemoteFiles[i].isDirectory == true)
				{
					found = i;
					break;
				}
				else if (!isDir)
				{
					found = i;
					break;
				}
			}
		}
		return found;
	},

	AddFolder	: function ()
	{
		if (gs_gSession.getStatus() != 1)
			return;
		if (gs_gRemoteTreeView.curFolderInfo && gs_gRemoteTreeView.curFolderInfo.isReadonly)
		{
			alert(gs_jsUtils.GetPropertyString("folderreadonly"));
			return;
		}
		var folderName = prompt(gs_jsUtils.GetPropertyString("typefolder"));
		if (folderName == null)
			return;

		folderName = gs_jsUtils.trimWhitespace(folderName);
		folderName = folderName.replace(/\//gi, "");
		if (folderName.lastIndexOf("/") != folderName.length - 1 )
			folderName += "/";

		if (this.FileExists(folderName, true) != -1)
			alert(gs_jsUtils.GetPropertyString("folderexists"));
		else
		{
			gs_gSession.gAct.CreateRemoteFolder(folderName, this.remotePath);
			var objRemoteTree = this;
			setTimeout(function () { objRemoteTree.RefreshFolder();}, 1000);
		}
	},

	CopyFiles : function ()
	{
		if (gs_gSession.getStatus() != 1)
			return;
		this.toEmailList = gs_gSession.userName;
		if (this.isCopyActive)
		{
			alert(gs_jsUtils.GetPropertyString("operationinprogress"));
			//alert("A Cut/Copy/Rename operation is in progress, please wait until it is complete");
			return;
		}
		this.GetSelectedFiles();
		gs_viewHandler.ShowStatus("after-copy", [gs_gRemoteTreeView.remotePath, "Copy"]);
		this.isCutOrCopy = this.IS_COPY;
	},

	CutFiles : function()
	{
		if (gs_gSession.getStatus() != 1)
			return;
		this.toEmailList = gs_gSession.userName;
		if (this.isCopyActive)
		{
			alert(gs_jsUtils.GetPropertyString("operationinprogress"));
			return;
		}
		this.GetSelectedFiles();
		gs_viewHandler.ShowStatus("after-copy", [gs_gRemoteTreeView.remotePath, "Cut"]);
		this.isCutOrCopy = this.IS_CUT;
	},

	GetSelectedFiles : function ()
	{
		if (gs_gSession.getStatus() != 1)
			return;
		var start = new Object();
        var end = new Object();

		var numRanges = gs_gRemoteTreeView.selection.getRangeCount();
		this.arrCopyFiles = new Array;
		this.copyPath = gs_gRemoteTreeView.remotePath;
		var isDisplayed = false;

		for (var t = 0; t < numRanges; t++)
		{
			gs_gRemoteTreeView.selection.getRangeAt(t, start, end);
			for (var v = start.value; v <= end.value; v++)
			{
				var tgRemoteInfo = gs_gRemoteTreeView.arrRemoteFiles[v];
				this.arrCopyFiles.push(tgRemoteInfo);
				if (tgRemoteInfo.isDirectory)
                {
					var remotePath = tgRemoteInfo.filePath;
					remotePath = remotePath.substring(0, remotePath.lastIndexOf("/"));
					this.GetRemoteFiles(remotePath);
				}

			}
		}
	},

	GetRemoteFiles	: function (remotePath)
    {
		remotePath += "/";
		var tgAct = gs_gSession.GetActionInstance();
		tgAct.Enumerate(remotePath);

	    for (var i = 0; i < tgAct.gFiles.length; i++)
	    {
			var tgRemoteInfo = tgAct.gFiles[i];

	        remotePath = tgRemoteInfo.filePath;
			this.arrCopyFiles.push(tgRemoteInfo);
	        if (tgRemoteInfo.isDirectory)
            {
				remotePath = remotePath.substring(0, remotePath.lastIndexOf("/"));
				this.GetRemoteFiles(remotePath);
			}

	    }

    },

    SendTo : function ()
	{
		if (gs_gSession.getStatus() != 1)
			return;
		if (this.isCopyActive)
		{
			alert(gs_jsUtils.GetPropertyString("operationinprogress"));
			return;
		}

		var toEmail = prompt(gs_jsUtils.GetPropertyString("entertheemail"));
		if (toEmail == null)
			return;
		var conf = confirm(gs_jsUtils.GetPropertyString("youaresending") + " " + toEmail + gs_jsUtils.GetPropertyString("areyousure"));
		if (!conf)
			return;
		gs_viewHandler.ShowStatus("after-rename", [this.remotePath, "Send To"]);
		this.toEmailList = toEmail;
		this.GetSelectedFiles();
		this.isCutOrCopy = this.IS_SENDTO;
		this.copyIndex = 0;
		this.splitIndex = -1;
		this.replacePath = "gs:/";
		setTimeout("gs_gRemoteTreeView.PasteFiles()", 10);
	},

	RenameFileObject : function ()
	{
		if (gs_gSession.getStatus() != 1)
			return;
		if (this.isCopyActive)
		{
			alert(gs_jsUtils.GetPropertyString("operationinprogress"));
			return;
		}
		this.toEmailList = gs_gSession.userName;
		var curSelection = this.arrRemoteFiles[this.selection.currentIndex];

		var fileObjectName = prompt(gs_jsUtils.GetPropertyString("enterthename") + " " + curSelection.fileName, curSelection.fileName);
		if (fileObjectName == null)
			return;
		fileObjectName = gs_jsUtils.trimWhitespace(fileObjectName);
		fileObjectName = fileObjectName.replace(/\//gi, "");

		if (fileObjectName.lastIndexOf("/") != fileObjectName.length - 1 && curSelection.isDirectory)
			fileObjectName += "/";

		if (this.FileExists(fileObjectName, curSelection.isDirectory) != -1)
			alert(gs_jsUtils.GetPropertyString("fileexists"));
		else
		{
			this.copyIndex = 0;
			this.splitIndex = -1;
			this.isCopyActive = true;

			this.isCutOrCopy = this.IS_RENAME;
			this.arrCopyFiles = new Array;

			gs_viewHandler.ShowStatus("after-rename", [curSelection.folderPath, "Rename"]);
			if (!curSelection.isDirectory)
			{
				this.replacePath = curSelection.folderPath;
				this.copyPath = curSelection.folderPath;
				curSelection.fileName = fileObjectName;
				this.arrCopyFiles.push(curSelection);
				this.PasteFiles();
			}
			else
			{

				var remotePath = curSelection.filePath;
				remotePath = remotePath.substring(0, remotePath.lastIndexOf("/"));
				this.GetRemoteFiles(remotePath);

				gs_gSession.gAct.CreateRemoteFolder(fileObjectName, curSelection.folderPath);
				this.replacePath = curSelection.folderPath + fileObjectName;
				gs_Dump("Rename path = " + this.replacePath + ", " + curSelection.uid);

				this.copyPath = curSelection.filePath;
				gs_gSession.gAct.DeleteMail(curSelection.uid.split("|"))

				this.PasteFiles();
			}
//			this.isCopyActive = false;

		}
	},


	ParsePasteFiles : function ()
	{

		var folderExists = false;
		delete this.arrExistFoldersPath;
		this.arrExistFoldersPath = new Array;
		for (var i = 0; i < this.arrCopyFiles.length; i++)
		{
			var existRow = -1;
			var fileName = this.arrCopyFiles[i].fileName
			if (this.arrCopyFiles[i].folderPath == this.remotePath)
				existRow = gs_gSession.gAct.fileExists(fileName, gs_gSession.userName);
            if (existRow != -1 && this.arrCopyFiles[i].isDirectory)
            {
                folderExists = true;
                this.arrExistFoldersPath.push(this.arrCopyFiles[i].filePath);
                this.arrCopyFiles[i].alreadyExists = this.EXISTS_IN_FOLDER;
            }
            else
            {
				if (this.CheckExistingFolderFiles(this.arrCopyFiles[i].folderPath))
					this.arrCopyFiles[i].alreadyExists = this.EXISTS_IN_FOLDER;
				else if (existRow != -1)
				{
					this.arrCopyFiles[i].alreadyExists = this.EXISTS_ASK_OPTION;
					this.arrCopyFiles[i].existingUid = gs_gSession.gAct.gFiles[existRow].uid;
				}
            }
		}
		gs_gFileOpPref.askCopyOption = true;
		if (folderExists)
        {
            alert(gs_jsUtils.GetPropertyString("folders"));
        }
		this.copyIndex = 0;
		this.splitIndex = -1;
		this.replacePath = this.remotePath;
		gs_viewHandler.ShowStatus("after-paste");
		setTimeout("gs_gRemoteTreeView.PasteFiles()", 10);
	},


	PasteFiles : function ()
	{
		var doDelete;
		try
		{
			if (this.copyPath == this.remotePath && !this.isCopyActive && this.isCutOrCopy != this.IS_RENAME
				&& this.isCutOrCopy != this.IS_SENDTO)
			{
				alert(gs_jsUtils.GetPropertyString("samedirectory"));
				return;
			}
			this.isCopyActive = true;
			var i = this.copyIndex;
			this.splitIndex++;
			gs_Dump("copyIndex " + this.copyIndex + ", " + this.splitIndex);
			if (this.copyIndex >= this.arrCopyFiles.length)
			{
				gs_Dump("Copy Complete");
				this.RefreshFolder();
				if (this.selection)
					this.selection.clearSelection();
				this.isCutOrCopy = this.IS_NOTHING;
				gs_viewHandler.ShowStatus("paste-complete");
				//alert("Cut/Copy/Rename/SendTo operation is complete successfully");
				this.isCopyActive = false;
				return;
			}

			doDelete = false;
			if (this.arrCopyFiles[i].alreadyExists == this.EXISTS_IN_FOLDER)
			{
				this.splitIndex = -1;
				this.copyIndex++;
				this.PasteFiles();
				return;
			}
			if (this.arrCopyFiles[i].alreadyExists == this.EXISTS_ASK_OPTION)
			{
				if (gs_gFileOpPref.askCopyOption && this.splitIndex == 0)
					window.openDialog("chrome://gspace/content/gOverwrite.xul","Overwrite Options",
						"chrome,modal,centerscreen", gs_gFileOpPref, this.arrCopyFiles[i].fileName, "copy", gs_jsUtils.GetPropertyString("filestr"), gs_jsUtils.GetPropertyString("alreadystr"));
				if (gs_gFileOpPref.copyOverwriteOption == gs_gFileOpPref.SKIP)
				{
					gs_gFileOpPref.askCopyOption = true;
					this.splitIndex = -1;
					this.copyIndex++;
					this.PasteFiles();
					return;
				}
				else if (gs_gFileOpPref.copyOverwriteOption == gs_gFileOpPref.SKIP_ALL || gs_gFileOpPref.copyOverwriteOption == gs_gFileOpPref.CANCEL)
				{
					gs_gFileOpPref.askCopyOption = false;
					this.splitIndex = -1;
					this.copyIndex++;
					this.PasteFiles();
					return;
				}
				else if (gs_gFileOpPref.copyOverwriteOption == gs_gFileOpPref.OVERWRITE_DELETE)
				{
					gs_gFileOpPref.askCopyOption = true;
					doDelete = true;
				}
				else if (gs_gFileOpPref.copyOverwriteOption == gs_gFileOpPref.OVERWRITE_DELETE_ALL)
				{
					gs_gFileOpPref.askCopyOption = false;
					doDelete = true;
				}
				else if (gs_gFileOpPref.copyOverwriteOption == gs_gFileOpPref.OVERWRITE_SAVE)
				{
					gs_gFileOpPref.askCopyOption = true;
					doDelete = false;
				}
				else if (gs_gFileOpPref.copyOverwriteOption == gs_gFileOpPref.OVERWRITE_SAVE_ALL)
				{
					gs_gFileOpPref.askCopyOption = false;
					doDelete = false;
				}
			}

			var arrUid = this.arrCopyFiles[i].uid.split("|");
			arrUid.reverse();
			if (this.splitIndex >= arrUid.length)
			{
				if (doDelete)
				{
					var existArrId = this.arrCopyFiles[i].existingUid.split("|");
					gs_gSession.gAct.DeleteMail(existArrId);
				}
				if (this.isCutOrCopy == this.IS_CUT || this.isCutOrCopy == this.IS_RENAME)
				{
					gs_Dump(arrUid.join("|"));
					gs_gSession.gAct.DeleteMail(arrUid);
				}
				this.splitIndex = -1;
				this.copyIndex++;
				this.PasteFiles();
				return;
			}

			if (this.splitIndex == 0)
			{
				this.splitInfo = new gs_gSplitFileInfo;
				this.splitInfo.fileName = this.arrCopyFiles[i].fileName;
				this.splitInfo.toPath = this.arrCopyFiles[i].folderPath.replace(this.copyPath, this.replacePath);

				if (this.arrCopyFiles[i].hasMetaData)
					this.splitInfo.arrOtherInfo = this.GetFileInfo(arrUid[0]);
				else
				{
					gs_gSession.gAct.CreateMetaData(this.splitInfo, null, this.splitInfo.toPath);
					gs_Dump("GSCT = " + this.splitInfo.arrOtherInfo['GSCT']);
					this.splitInfo.arrOtherInfo['ST'] = "";
				}
				this.splitInfo.arrOtherInfo['PATH'] = this.splitInfo.toPath;
				this.splitInfo.strMetaXml = gs_gSession.gAct.MakeMetaDataXml(this.splitInfo);
			}
			var splitInfo = this.splitInfo;
			gs_Dump("OLD PATH = " + this.arrCopyFiles[i].filePath + ", " + this.arrCopyFiles[i].folderPath + ", " + this.remotePath + ", " + this.copyPath);
			if (this.arrCopyFiles[i].isDirectory)
				splitInfo.fileType = gs_gSession.gAct.FOLDER;
			else
				splitInfo.fileType = gs_gSession.gAct.FILE;
			splitInfo.fileNum = this.splitIndex + 1;
			splitInfo.totalFileSize = this.arrCopyFiles[i].fileSizeInKb;

			splitInfo.fileTotal = arrUid.length;
			var pSub = gs_gSession.gAct.CreateCopySubject(splitInfo);
			gs_Dump(pSub);



			gs_gSession.gAct.SendAttachment(gs_gSession.userName, this.toEmailList, pSub, splitInfo.totalFileSize, arrUid[this.splitIndex], "gs_gRemoteTreeView.PasteFiles()", this.splitInfo.strMetaXml);
			gs_Dump(pSub + ", " + arrUid[this.splitIndex]);
		}
		catch (ex)
		{
				if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
		}
	},


	CheckExistingFolderFiles : function(folderPath)
	{
		for (var i = 0; i < this.arrExistFoldersPath.length; i++)
		{
			if (folderPath.indexOf(this.arrExistFoldersPath[i]) != -1)
				return true;
		}
		return false;
	},

	PopupContextMenu : function()
	{
		if (gs_gSession.getStatus() != 1 || gs_gRemoteTreeView.selection == null)
			return;

		if (this.isCutOrCopy != this.IS_NOTHING)
			gs_get("gspace_remotePaste").setAttribute("disabled", false);
		else
			gs_get("gspace_remotePaste").setAttribute("disabled", true);

		var curSelection = gs_gRemoteTreeView.arrRemoteFiles[gs_gRemoteTreeView.selection.currentIndex];
		if (curSelection == null)
			return;

		if (curSelection.fileTotal == 1 && curSelection.fileName.toLowerCase().indexOf(".html") != -1 || curSelection.fileName.toLowerCase().indexOf(".txt") != -1
				|| curSelection.fileName.toLowerCase().indexOf(".htm") != -1 || curSelection.fileName.toLowerCase().indexOf(".pdf") != -1
				|| curSelection.fileName.toLowerCase().indexOf(".mp3") != -1 || curSelection.fileName.toLowerCase().indexOf(".jpg") != -1)
			gs_get("gspace_preview").setAttribute("disabled", false);
		else
			gs_get("gspace_preview").setAttribute("disabled", true);

		if (!curSelection.isDirectory)
		{
			gs_get("gspace_remoteFolderAccess").setAttribute("disabled", true);
		}
		else
			gs_get("gspace_remoteFolderAccess").setAttribute("disabled", false);

		if (curSelection.isDirectory && curSelection.isReadonly)
		{
			gs_get("gspace_remoteFolderAccess").setAttribute("label", gs_jsUtils.GetPropertyString("makewritable"));
		}
		else if (curSelection.isDirectory && !curSelection.isReadonly)
		{
			gs_get("gspace_remoteFolderAccess").setAttribute("label", gs_jsUtils.GetPropertyString("makereadonly"));

		}
		if (gs_gRemoteTreeView.curFolderInfo)
		{
			if (gs_gRemoteTreeView.curFolderInfo.isReadonly)
			{
				gs_get("gspace_remotePaste").setAttribute("disabled", true);
				gs_get("gspace_remoteRename").setAttribute("disabled", true);
				gs_get("gspace_remoteDeleteSelected").setAttribute("disabled", true);
				gs_get("gspace_remoteAddFolder").setAttribute("disabled", true);
			}
			else
			{
				gs_get("gspace_remoteRename").setAttribute("disabled", false);
				gs_get("gspace_remoteDeleteSelected").setAttribute("disabled", false);
				gs_get("gspace_remoteAddFolder").setAttribute("disabled", false);
			}
		}

	},

	ShowPreview : function ()
	{
		if (gs_gSession.getStatus() != 1 || gs_gRemoteTreeView.selection == null)
			return;
		var curSelection = gs_gRemoteTreeView.arrRemoteFiles[gs_gRemoteTreeView.selection.currentIndex];
		if (curSelection == null)
			return;

		var path = "";

		if (curSelection.fileName.toLowerCase().indexOf(".html") != -1 || curSelection.fileName.toLowerCase().indexOf(".txt") != -1
				|| curSelection.fileName.toLowerCase().indexOf(".htm") != -1)
		{
			path = gs_gSession.mailURL + "view=att&disp=inline&attid=0.1&th=" + curSelection.uid;
		}
		else if (curSelection.fileName.toLowerCase().indexOf(".pdf") != -1)
		{
			path = gs_gSession.mailURL + "view=att&disp=vah&attid=0.1&th=" + curSelection.uid;
		}
		else if (curSelection.fileName.toLowerCase().indexOf(".mp3") != -1)
		{
			path = gs_gSession.mailURL + "view=audio&attid=0.1&msgs=" + curSelection.uid;
		}
		else if (curSelection.fileName.toLowerCase().indexOf(".jpg") != -1)
		{
			path = gs_gSession.mailURL + "view=att&disp=inline&attid=0.1&th=" + curSelection.uid;
		}
		if (path != "")
			var imgWindow = window.open(path, "");
	},

	ShowProperties : function ()
	{
		if (gs_gSession.getStatus() != 1)
			return;

		var curSelection = gs_gRemoteTreeView.arrRemoteFiles[gs_gRemoteTreeView.selection.currentIndex];
		if (curSelection == null)
			return;

		if (curSelection.hasMetaData)
		{
			var arrOtherInfo = this.GetFileInfo(curSelection.uid.split("|")[0]);
			curSelection.gspaceCreateTime = arrOtherInfo['GSCT'];
			curSelection.sysModifiedTime = arrOtherInfo['ST'];
		}

		gs_viewHandler.ShowFileProperties();
	},

	getThumbnails : function ()
	{

		if (gs_gSession.modeIndex != "PhotoMode" || gs_gPrefHandler.getPref(gs_gPrefNames.prefShowThumbnails, "char") != "yes" || gs_gRemoteTreeView.thumbnailCount > gs_gRemoteTreeView.arrImageFilesIndex.length)
			return;
		gs_gRemoteTreeView.thumbnailCount++;

		if (gs_gRemoteTreeView.thumbnailCount > 0)
		{
			var curImage = gs_gRemoteTreeView.arrRemoteFiles[gs_gRemoteTreeView.arrImageFilesIndex[gs_gRemoteTreeView.thumbnailCount - 1]];
			if (curImage)
			{
				gs_Dump(curImage.fileName + ", " + gs_gSession.mailURL + "view=att&disp=thd&attid=0.1&th=" + curImage.uid);
				gs_gRemoteTreeView.addPhotoToPanel(gs_gSession.mailURL + "view=att&disp=thd&attid=0.1&th=" + curImage.uid, curImage.fileName, gs_gRemoteTreeView.arrImageFilesIndex[gs_gRemoteTreeView.thumbnailCount - 1]);
			}
		}

		var curSelection = gs_gRemoteTreeView.arrRemoteFiles[gs_gRemoteTreeView.arrImageFilesIndex[gs_gRemoteTreeView.thumbnailCount]];
		if (curSelection == null)
			return;

		var objResp = gs_xhttp.doAsyncGet("", gs_gRemoteTreeView.getThumbnails, gs_gSession.mailURL + "view=cv&search=cat&th=" + curSelection.uid);
	},

	loadThumbnails : function ()
	{
		if (gs_gSession.modeIndex == "PhotoMode" && gs_gPrefHandler.getPref(gs_gPrefNames.prefShowThumbnails, "char") == "yes")
	    {
			gs_get("gspace_photoPanel").setAttribute("collapsed", "false");
			gs_get("gspace_photoPanelSplitter").hidden = false;

			delete gs_gRemoteTreeView.arrImageFilesIndex;
			gs_gRemoteTreeView.arrImageFilesIndex = new Array();
			for (var i = 0; i < gs_gRemoteTreeView.arrRemoteFiles.length; i++)
			{
				var curSelection = gs_gRemoteTreeView.arrRemoteFiles[i];
				if (gs_jsUtils.isImage(curSelection.fileName) && curSelection.fileTotal == 1 && !curSelection.isDirectory)
				{
					gs_gRemoteTreeView.arrImageFilesIndex.push(i);
				}
			}
			gs_gRemoteTreeView.thumbnailCount = -1;
			var pDoc = gs_get("gspace_photoPanel").contentDocument;
			if (gs_get("divAllPhotos", pDoc) != null)
				gs_get("divAllPhotos", pDoc).innerHTML = "";
			gs_gRemoteTreeView.getThumbnails();
		}
	},

	addPhotoToPanel : function (imgSrc, fileName, index)
	{
		if (gs_gSession.modeIndex != "PhotoMode" || gs_gPrefHandler.getPref(gs_gPrefNames.prefShowThumbnails, "char") != "yes")
			return;
		var pDoc = gs_get("gspace_photoPanel").contentDocument;
		var imageNode = pDoc.createElement("img");
		imageNode.setAttribute("src", imgSrc);
		imageNode.setAttribute("style", "cursor:pointer;");
		imageNode.addEventListener("load", function (evt)
											{
												var tWidth = imageNode.naturalWidth, tHeight = imageNode.naturalHeight;
												if (tWidth < 20 && tHeight < 20)
													gs_get("divAllPhotos", pDoc).removeChild(imageNode);

											}, true);
		imageNode.addEventListener("click", function (evt)
											{
												gs_gRemoteTreeView.selection.select(index);
												//gs_gRemoteTreeView.selection.currentIndex = index;
												gs_viewHandler.ShowFileProperties();
											}, true);
		if (gs_get("divAllPhotos", pDoc).innerHTML != "")
		{
			gs_get("divAllPhotos", pDoc).appendChild(pDoc.createElement("br"));
			var hrNode = pDoc.createElement("hr");
			hrNode.setAttribute("style", "background-color:blue;border:blue;height:1px;width:90%;");
			gs_get("divAllPhotos", pDoc).appendChild(hrNode);
			gs_get("divAllPhotos", pDoc).appendChild(pDoc.createElement("br"));
		}
		gs_get("divAllPhotos", pDoc).appendChild(imageNode);
		gs_get("divAllPhotos", pDoc).appendChild(pDoc.createTextNode("  " + fileName));
	},

	ChangeFolderAccess : function ()
	{
		if (gs_gSession.getStatus() != 1)
			return;

		var curSelection = gs_gRemoteTreeView.arrRemoteFiles[gs_gRemoteTreeView.selection.currentIndex];
		if (curSelection == null)
			return;

		alert(gs_jsUtils.GetPropertyString("fewseconds"));
		var localGAct = gs_gSession.GetActionInstance();
		var curSelection = gs_gRemoteTreeView.arrRemoteFiles[gs_gRemoteTreeView.selection.currentIndex];
		if (curSelection == null)
			return;
		localGAct.Enumerate(gs_gRemoteTreeView.remotePath + curSelection.fileName);


		if (curSelection.isReadonly)
		{
			//create a folder with the same name but flag readonly
			localGAct.CreateRemoteFolder(curSelection.fileName, this.remotePath, false);
		}
		else
		{
			localGAct.CreateRemoteFolder(curSelection.fileName, this.remotePath, true);
		}
		var arr = new Array();
		arr.push(curSelection.uid);
		localGAct.DeleteMail(arr);
		this.RefreshFolder();
		alert(gs_jsUtils.GetPropertyString("folderchanged"));
	}
};
