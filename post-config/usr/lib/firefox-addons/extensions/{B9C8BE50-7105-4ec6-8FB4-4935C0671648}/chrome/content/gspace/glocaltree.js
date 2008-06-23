var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
var gs_gLocalTreeView =
{
    treeBox: null,
    selection: null,
    filter : true,
    arrLocalFiles : new Array,
	isTreeSorted : false,

    get rowCount()                     { return this.arrLocalFiles.length; },
    setTree     : function(treeBox)         { this.treeBox = treeBox; },
 getCellText : function(idx, column) {
  if (idx >= this.rowCount) return "";
  if (column.id == "gspace_localFileName") {
   return this.arrLocalFiles[idx].fileName;
  }
  if (column.id == "gspace_localFileSize") {
   return this.arrLocalFiles[idx].fileSizeInKb;
  }
  if (column.id == "gspace_localModifiedTime") {
   var modTime = new Date(this.arrLocalFiles[idx].modifiedTime);
   return gs_jsUtils.GetDateString(modTime);
   //return modTime.toDateString() + " " + modTime.getHours() + ":" + modTime.getMinutes() ;
  }
  return "";
 },
    isEditable: function(idx, column)  { return true; },
    isContainer: function(idx)         { return false;},
    isSeparator: function(idx)         { return false; },
    isSorted: function()               { return false; },

 getImageSrc: function(idx, column) {
  if (column.id == "gspace_localFileName") {
   if (this.arrLocalFiles[idx].isDirectory) {
    return "chrome://gspace/skin/directory.png";
   } else {
    //var fileURI = ios.newFileURI(localFile);
    return "moz-icon://" + this.arrLocalFiles[idx].fileName + "?size=16";
   }
  }
  return "";
 },
    getProgressMode : function(idx,column) {},
    getCellValue: function(idx, column) {},
    cycleHeader: function(col)
    {

		var sortDirection = (col.element.getAttribute("sortDirection") == "ascending" ||
									col.element.getAttribute("sortDirection") == "natural") ? "descending" : "ascending";
		for (var i = 0; i < col.columns.count; i++)
		{
			col.columns.getColumnAt(i).element.setAttribute("sortDirection", "natural");
		}
		col.element.setAttribute("sortDirection", sortDirection);

		this.DoSort();
    },

    selectionChanged: function() {},
    cycleCell: function(idx, column) {},
    performAction: function(action) {},
    performActionOnCell: function(action, index, column) {},
    getRowProperties: function(idx, column, prop) {},
    getCellProperties: function(idx, column, prop) {},
    getColumnProperties: function(column, element, prop) {},
    getLevel : function(idx) { return 0; },

    DoSort	: function()
	{
		if (gs_gSession.isOverlay)
			return;
		if (gs_get("gspace_localFileName").getAttribute("sortDirection") &&
				gs_get("gspace_localFileName").getAttribute("sortDirection") != "natural")
		{
			if (gs_get("gspace_localFileName").getAttribute("sortDirection") == "descending")
				this.arrLocalFiles.sort(gs_compareFileName);
			else
			{
				if (!this.isTreeSorted)
				{
					this.arrLocalFiles.sort(gs_compareFileName);
					this.arrLocalFiles.reverse();
				}
			}
		}

		if (gs_get("gspace_localFileSize").getAttribute("sortDirection") &&
				gs_get("gspace_localFileSize").getAttribute("sortDirection") != "natural")
		{
			if (gs_get("gspace_localFileSize").getAttribute("sortDirection") == "descending")
				this.arrLocalFiles.sort(gs_compareFileSize);
			else
			{
				if (!this.isTreeSorted)
				{
					this.arrLocalFiles.sort(gs_compareFileSize);
					this.arrLocalFiles.reverse();
				}
			}

		}

		if (gs_get("gspace_localModifiedTime").getAttribute("sortDirection") &&
				gs_get("gspace_localModifiedTime").getAttribute("sortDirection") != "natural")
		{
			if (gs_get("gspace_localModifiedTime").getAttribute("sortDirection") == "descending")
				this.arrLocalFiles.sort(gs_compareModifiedTime);
			else
			{
				if (!this.isTreeSorted)
				{
					this.arrLocalFiles.sort(gs_compareModifiedTime);
					this.arrLocalFiles.reverse();
				}
			}
		}

	},

	keyPress: function (evt)
	{
		if (evt.keyCode == 13)			//if enter key is pressed
			this.dblClick(null);
		if (evt.ctrlKey && (evt.which == 65 || evt.which == 97))
		{
			this.selection.selectAll();
			evt.stopPropagation();
		}
	},

    dblClick : function(event)
    {
		var curSelection = this.arrLocalFiles[this.selection.currentIndex];
		if (curSelection.isDirectory)
			this.ChangeFolder(curSelection.filePath);
	},

    GetPath	: function ()
    {
	    const nsIFilePicker = Components.interfaces.nsIFilePicker;
	    const fpContractID = "@mozilla.org/filepicker;1";
		var fp = Components.classes[fpContractID].createInstance(nsIFilePicker);
        fp.init(window, gs_jsUtils.GetPropertyString("choosefolder"), nsIFilePicker.modeGetFolder);
        fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText);

		var folder = this.GetLocalPrefFolder();
        if (folder != null)
        {
			fp.displayDirectory = folder;
		}

		fp.appendFilters(nsIFilePicker.filterAll);
        var rv = fp.show();
        if (rv == nsIFilePicker.returnOK)
        {
            folder = fp.file;
            this.SetLocalPrefFolder(folder);

            this.SetWorkingDir(folder.path);
            this.RefreshFolder();
        }
    },

    ToggleFilter	: function ()
    {
		if (gs_gSession.isOverlay)
			return;
		var gspace_localFilter = gs_get("gspace_localFilter");
		var curState = gspace_localFilter.checked;
		if (curState)
		{
			this.filter = false;
		}
		else
		{
			this.filter = true;
		}
		this.RefreshFolder();
    },

    GotoParentFolder	: function ()
    {
		try
		{
			var curFolder = this.GetLocalPrefFolder();

			if (curFolder != null && curFolder.parent != null)
			{
				this.ChangeFolder(curFolder.parent.path);
			}
		}
		catch (ex)
		{
		    alert(gs_jsUtils.GetPropertyString("noparent"));
		}
    },

    ChangeFolder	: function(path)
    {
		try
		{
			var folder  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
			path = gs_jsUtils.SetLocalSystemPath(path);
			folder.initWithPath(path);
			if (!folder.exists() || !folder.isDirectory())
				throw gs_jsUtils.GetPropertyString("notvalidpath");

			this.SetLocalPrefFolder(folder);
			//this.SetWorkingDir(folder.path);
			this.RefreshFolder();
		}
		catch (ex)
		{
				if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
		}
    },

    SetWorkingDir	: function (path)
	{
		if (gs_gSession.isOverlay)
			return;
		gs_get("gspace_localPath").value = path;
        gs_gSession.workingDir = path;
	},

    SetLocalPrefFolder : function (file)
    {
		gs_gPrefHandler.setComplexValue(gs_gPrefNames.prefLocalFolderKey, Components.interfaces.nsILocalFile, file);
    },

    GetLocalPrefFolder : function ()
    {

		var folder = null;
		try
		{
			folder = gs_gPrefHandler.getComplexValue(gs_gPrefNames.prefLocalFolderKey, Components.interfaces.nsILocalFile);

			if (!folder.exists())
				throw "Folder does not exist";
		}catch (ex)
		{
		    try
		    {
		        folder = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("Home", Components.interfaces.nsIFile);
                this.SetLocalPrefFolder(folder);
            }
            catch (ex)
            {
                return null;
            }
		}
		return folder;
    },

    RefreshFolder	: function()
    {
		var folder = this.GetLocalPrefFolder();

        if (folder != null)
        {
		    this.PopulateList(folder);
		    this.SetWorkingDir(folder.path);

		}
		if (this.selection)
			this.selection.clearSelection();
    },

    PopulateList    : function (dir)
    {
        try
        {
	        var gspace_gLocalTreeChildren = gs_get("gspace_gLocalTreeChildren");
	        var rowCountChange = -this.rowCount;

	        delete this.arrLocalFiles;
	        this.arrLocalFiles = new Array;
	        var iter = dir.directoryEntries;

	        while (iter.hasMoreElements())
	        {
	            var localFile = iter.getNext().QueryInterface(Components.interfaces.nsILocalFile);
	            var isDirectory = false;
	            if (localFile.isDirectory())
		            isDirectory = true;

		        if (!this.filter || (this.filter && localFile.fileSize <= gs_gSession.bufSize))
					this.arrLocalFiles.push(new gs_gLocalFileInfo(localFile.path, localFile.leafName, localFile.fileSize, localFile.lastModifiedTime, isDirectory));
	        }
            this.DoSort();
            if (this.treeBox)
            {
				this.treeBox.rowCountChanged(0, rowCountChange);
				rowCountChange = this.arrLocalFiles.length;
				this.treeBox.rowCountChanged(0, rowCountChange);
			}
	    }
	    catch (ex)
	    {
	        	if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
	    }
    },

    AddFolder	: function ()
	{
		var folderName = prompt(gs_jsUtils.GetPropertyString("typefolder"));
		var regex = /\s/;
		folderName = gs_jsUtils.trimWhitespace(folderName);
		//folderName = folderName.replace(regex, "");
		folderName = folderName.replace(/\//gi, "");

		var file  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(this.GetLocalPrefFolder().path);
        file.append(folderName);
		if (!file.exists() || !file.isDirectory()) // if it doesn't exist, create
		{
			file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
		}
		else
	    {
	        alert(gs_jsUtils.GetPropertyString("folderexists"));
	    }
	    this.RefreshFolder();
	},

	DeleteSelected  : function ()
	{
	    var start = new Object();
        var end = new Object();

        var chk = confirm(gs_jsUtils.GetPropertyString("deleteconfirm"));
        if (!chk)
            return;

        try
        {
            var numRanges = gs_gLocalTreeView.selection.getRangeCount();
            for (var t = 0; t < numRanges; t++)
            {
                gs_gLocalTreeView.selection.getRangeAt(t, start, end);
                for (var v = start.value; v <= end.value; v++)
                {
                    var tgLocalInfo = gs_gLocalTreeView.arrLocalFiles[v];
                    var folder = gs_gLocalTreeView.GetLocalPrefFolder();

	                var file  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		            file.initWithPath(folder.path);
                    file.append(tgLocalInfo.fileName);
                    file.remove(true);
                }
            }
            this.RefreshFolder();
        }
		catch (ex)
		{
			alert(gs_jsUtils.GetPropertyString("errordeletingfolder"));
			return;
		}
		return;
	}


};

