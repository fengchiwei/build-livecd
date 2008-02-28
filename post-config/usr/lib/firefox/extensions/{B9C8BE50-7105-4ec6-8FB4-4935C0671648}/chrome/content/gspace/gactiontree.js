var gs_gActionTreeView =
{
    treeBox: null,
    selection: null,
    curRow  : 0,
    gDownRow: 0,
    gUpRow  : 0,
    arrActionQ : new Array,
    maxConcurrentUploads    : 1,
    numConcurrentUploads    : 0,

    maxConcurrentDownloads    : 1,
    numConcurrentDownloads    : 0,

    splitInfo   :  null,

    isRemoteListValid	: true,

//	bufSize :  15000000,
//    isUploading :  false,

    isLargeFile : false,
	uploadTimer : null,
    downloadTimer : null,

    get rowCount()                     { return this.arrActionQ.length; },
    setTree     : function(treeBox)         { this.treeBox = treeBox; },
    getCellText : function(idx, column)
    {
       // gs_Dump("idx " + idx);
        if (idx >= this.rowCount)
            return "";
        var tgActionRow = this.arrActionQ[idx];
        var txt = "";
        var strProgressFileNum = tgActionRow.progress;
        if (tgActionRow.progress != "")
			strProgressFileNum += " ";
        switch (column.id)
        {
            case "gspace_actFileName" : txt = tgActionRow.fileName +  " ( " + strProgressFileNum + tgActionRow.internalProgress + "%" + " )"; break;
            case "gspace_actType" : txt = (tgActionRow.gspace_actType == "upload") ? gs_jsUtils.GetPropertyString("Upload") : gs_jsUtils.GetPropertyString("Download"); break;
            case "gspace_actUploadFrom" : txt = tgActionRow.fromPath; break;
            case "gspace_actDownloadTo" : txt = tgActionRow.toPath; break;
            //case "gspace_actProgress" : txt = tgActionRow.progress + " " + tgActionRow.internalProgress + "%"; break;
            case "gspace_actStatus" :
                                if (tgActionRow.status == 0)
                                    txt = gs_jsUtils.GetPropertyString("inqueue");
                                else if (tgActionRow.status == 1)
                                    txt = gs_jsUtils.GetPropertyString("processing");
                                else if (tgActionRow.status == 2)
                                    txt = gs_jsUtils.GetPropertyString("completed");
                                else if (tgActionRow.status == 3)
                                    txt = gs_jsUtils.GetPropertyString("failed");
                                break;
        }

        return txt;
    },
    isEditable: function(idx, column)  { return true; },
    isContainer: function(idx)         { return false;},
    isSeparator: function(idx)         { return false; },
    isSorted: function()               { return false; },

    getImageSrc: function(idx, column)
    {
         if (idx >= this.rowCount)
            return "";

        var tgActionRow = this.arrActionQ[idx];
        var imgPath = "";
        switch (column.id)
        {
            case "gspace_actFileName" : if (tgActionRow.isDirectory)
                                    imgPath = "chrome://gspace/skin/directory.png";
                                 else
                                    imgPath = "moz-icon://" + this.arrActionQ[idx].fileName + "?size=16"; break;
            case "gspace_actType" : imgPath = (tgActionRow.gspace_actType == "download") ? "chrome://gspace/skin/down.png" : "chrome://gspace/skin/up.png"; break;
            case "gspace_actStatus" :
                                if (tgActionRow.status == 0)
                                    imgPath = "chrome://gspace/skin/queue.png";
                                else if (tgActionRow.status == 1)
                                    imgPath = "chrome://gspace/skin/exec.png";
                                else if (tgActionRow.status == 2)
                                    imgPath = "chrome://gspace/skin/ok.png";
                                else if (tgActionRow.status == 3)
                                    imgPath = "chrome://gspace/skin/no.png";
                                 break;
        }
        return imgPath;

    },
    getProgressMode : function(idx,column)
    {
		// gs_Dump("idx " + idx);
        if (column.id == "gspace_actProgress")
			return Components.interfaces.nsITreeView.PROGRESS_NORMAL;
		return 0;
    },

    getCellValue: function(idx, column)
    {
		// gs_Dump("idx " + idx);
        if (idx >= this.rowCount)
            return "";
        var tgActionRow = this.arrActionQ[idx];
        if (column.id == "gspace_actProgress")
        {
            return tgActionRow.internalProgress;
        }
        else
			return null;
    },

    cycleHeader: function(col, elem) {},
    selectionChanged: function() {},
    cycleCell: function(idx, column) {},
    performAction: function(action) {},
    performActionOnCell: function(action, index, column) {},
    getRowProperties: function(idx, column, prop) {},
    getCellProperties: function(idx, column, prop) {},
    getColumnProperties: function(column, element, prop) {},
    getLevel : function(idx) { return 0; },
    getParentIndex : function(idx) { return -1;},
	drop : function (idx, orientation){	},


    AddToActionQ    : function (gspace_actType)
    {
		if (gs_gSession.getStatus() != 1)
			return;
        var start = new Object();
        var end = new Object();
        var rowCountChanged = -this.rowCount;

        var folderExists = false;
        var isDownload = false;
        var isUpload = false;

        if (gspace_actType == "download")
        {
            var numRanges = gs_gRemoteTreeView.selection.getRangeCount();

            for (var t = 0; t < numRanges; t++)
            {
                gs_gRemoteTreeView.selection.getRangeAt(t, start, end);
                for (var v = start.value; v <= end.value; v++)
                {
                    var tgRemoteInfo = gs_gRemoteTreeView.arrRemoteFiles[v];
                    var folder = gs_gLocalTreeView.GetLocalPrefFolder();

                    var remotePath = tgRemoteInfo.filePath;
                    remotePath = remotePath.substring(0, remotePath.lastIndexOf("/"));
                    var tgActionRow = new gs_gActionRow(remotePath, folder.path, unescape(tgRemoteInfo.fileName), 0, "download", tgRemoteInfo.fileSizeInKb, "", tgRemoteInfo.isDirectory, tgRemoteInfo.uid, "");
                    this.arrActionQ.push(tgActionRow);

                    if (tgRemoteInfo.isDirectory)
                    {
						var folderName = tgRemoteInfo.fileName.substring(0, tgRemoteInfo.fileName.lastIndexOf("/"));
						this.AddRemoteFoldersToQ(gs_jsUtils.SetLocalSystemPath(folder.path + "\\" + folderName), remotePath);
					}
					isDownload = true;
                }
            }
        }
        else if (gspace_actType == "upload")
        {
			if (gs_gRemoteTreeView.curFolderInfo && gs_gRemoteTreeView.curFolderInfo.isReadonly)
			{
				alert(gs_jsUtils.GetPropertyString("folderreadonly"));
				return;
			}
            var numRanges = gs_gLocalTreeView.selection.getRangeCount();
			gs_gFileOpPref.askOption = true;
            for (var t = 0; t < numRanges; t++)
            {
                gs_gLocalTreeView.selection.getRangeAt(t, start, end);
                for (var v = start.value; v <= end.value; v++)
                {
                    var tgLocalInfo = gs_gLocalTreeView.arrLocalFiles[v];
                    var folder = gs_gLocalTreeView.GetLocalPrefFolder();

                    var fname = tgLocalInfo.fileName;
                    fname += (tgLocalInfo.isDirectory) ? "/" : "";
                    var existRow = gs_gSession.gAct.fileExists(fname, gs_gSession.userName);
                    if (existRow != -1 && tgLocalInfo.isDirectory)
                    {
                        folderExists = true;
                    }
                    else
                    {
                        var remotePath = gs_gRemoteTreeView.GetRemotePath();
                        var existingUid, doDelete = false;
                        if (existRow != -1)
                        {
							if (gs_gFileOpPref.askOption)
								window.openDialog("chrome://gspace/content/gOverwrite.xul","Overwrite Options",
									"chrome,modal,centerscreen", gs_gFileOpPref, tgLocalInfo.fileName, "regular", gs_jsUtils.GetPropertyString("filestr"), gs_jsUtils.GetPropertyString("alreadystr"));
							if (gs_gFileOpPref.overwriteOption == gs_gFileOpPref.SKIP)
							{
								gs_gFileOpPref.askOption = true;
								continue;
							}
							else if (gs_gFileOpPref.overwriteOption == gs_gFileOpPref.SKIP_ALL || gs_gFileOpPref.overwriteOption == gs_gFileOpPref.CANCEL)
							{
								gs_gFileOpPref.askOption = false;
								continue;
							}
							else if (gs_gFileOpPref.overwriteOption == gs_gFileOpPref.OVERWRITE_DELETE)
							{
								gs_gFileOpPref.askOption = true;
								doDelete = true;
							}
							else if (gs_gFileOpPref.overwriteOption == gs_gFileOpPref.OVERWRITE_DELETE_ALL)
							{
								gs_gFileOpPref.askOption = false;
								doDelete = true;
							}
							else if (gs_gFileOpPref.overwriteOption == gs_gFileOpPref.OVERWRITE_SAVE)
							{
								gs_gFileOpPref.askOption = true;
								doDelete = false;
							}
							else if (gs_gFileOpPref.overwriteOption == gs_gFileOpPref.OVERWRITE_SAVE_ALL)
							{
								gs_gFileOpPref.askOption = false;
								doDelete = false;
							}

							existingUid = gs_gSession.gAct.gFiles[existRow].uid;
                        }
                        else
                        {
							existingUid = "";
                        }

                        var tgActionRow = new gs_gActionRow(folder.path, remotePath, tgLocalInfo.fileName, 0, "upload", tgLocalInfo.fileSizeInKb, "", tgLocalInfo.isDirectory, "", existingUid);
                        tgActionRow.gspaceCreateTime = (existRow == -1) ? "" : gs_gSession.gAct.gFiles[existRow].gspaceCreateTime;
						tgActionRow.doDelete = doDelete;

                        this.arrActionQ.push(tgActionRow);
                        if (tgLocalInfo.isDirectory)
                        {
                            this.AddLocalFoldersToQ(gs_jsUtils.SetLocalSystemPath(folder.path + "\\" + tgLocalInfo.fileName), remotePath);
                        }
                    }
                    gs_viewHandler.ShowStatus("upload-failed");
                    isUpload = true;
                }
            }
        }
        rowCountChanged += this.rowCount;
        this.treeBox.rowCountChanged(0, rowCountChanged);
        if (folderExists)
        {
            alert(gs_jsUtils.GetPropertyString("folders"));
        }
        this.ProcessActionQ(isDownload, isUpload);

    },


    DownloadTo : function ()
    {
		if (gs_gSession.getStatus() != 1)
			return;
        var start = new Object();
        var end = new Object();

        var isDownload = false;

		const nsIFilePicker = Components.interfaces.nsIFilePicker;
	    const fpContractID = "@mozilla.org/filepicker;1";
		var fp = Components.classes[fpContractID].createInstance(nsIFilePicker);
        fp.init(window, gs_jsUtils.GetPropertyString("choosefolder"), nsIFilePicker.modeGetFolder);
        fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText);

		var folder = gs_gLocalTreeView.GetLocalPrefFolder();
        if (folder != null)
        {
			fp.displayDirectory = folder;
		}

		fp.appendFilters(nsIFilePicker.filterAll);
        var rv = fp.show();
        if (rv == nsIFilePicker.returnOK)
        {
            folder = fp.file;
            gs_gLocalTreeView.SetLocalPrefFolder(folder);

			var rowCountChanged = -gs_gActionTreeView.rowCount;
            var numRanges = gs_gRemoteTreeView.selection.getRangeCount();

            for (var t = 0; t < numRanges; t++)
            {
                gs_gRemoteTreeView.selection.getRangeAt(t, start, end);
                for (var v = start.value; v <= end.value; v++)
                {
                    var tgRemoteInfo = gs_gRemoteTreeView.arrRemoteFiles[v];


                    var remotePath = tgRemoteInfo.filePath;
                    remotePath = remotePath.substring(0, remotePath.lastIndexOf("/"));
                    var tgActionRow = new gs_gActionRow(remotePath, folder.path, unescape(tgRemoteInfo.fileName), 0, "download", tgRemoteInfo.fileSizeInKb, "", tgRemoteInfo.isDirectory, tgRemoteInfo.uid, "");
                    this.arrActionQ.push(tgActionRow);

                    if (tgRemoteInfo.isDirectory)
                    {
						var folderName = tgRemoteInfo.fileName.substring(0, tgRemoteInfo.fileName.lastIndexOf("/"));
						this.AddRemoteFoldersToQ(gs_jsUtils.SetLocalSystemPath(folder.path + "\\" + folderName), remotePath);
					}
					isDownload = true;
                }
            }
            if (isDownload)
            {
				if (!gs_get("gspace_actionTree").hidden)
				{
					gs_gActionTreeView.treeBox.rowCountChanged(0, rowCountChanged);
					rowCountChanged = gs_gActionTreeView.rowCount;
					gs_gActionTreeView.treeBox.rowCountChanged(0, rowCountChanged);
				}

				if (this.gDownRow < 0)
					this.gDownRow = 0;

				setTimeout("gs_gActionTreeView.Download()", 300);
            }
        }
    },

    AddRemoteFoldersToQ		: function (localPath, remotePath)
    {
		remotePath += "/";
		var tgAct = gs_gSession.GetActionInstance();
		tgAct.Enumerate(remotePath);

	    for (var i = 0; i < tgAct.gFiles.length; i++)
	    {
			var tgRemoteInfo = tgAct.gFiles[i];

			remotePath = tgRemoteInfo.filePath;
			remotePath = remotePath.substring(0, remotePath.lastIndexOf("/"));

			var tgActionRow = new gs_gActionRow(remotePath, localPath, tgRemoteInfo.fileName, 0, "download", tgRemoteInfo.fileSizeInKb, "", tgRemoteInfo.isDirectory, tgRemoteInfo.uid, "");
			this.arrActionQ.push(tgActionRow);

			if (tgRemoteInfo.isDirectory)
            {
				var folderName = tgRemoteInfo.fileName.substring(0, tgRemoteInfo.fileName.lastIndexOf("/"));
				this.AddRemoteFoldersToQ(gs_jsUtils.SetLocalSystemPath(localPath + "\\" + folderName), remotePath);
			}
	    }

    },

    AddLocalFoldersToQ  : function (dirPath, remotePath)
    {
        //traverse this directory and add to Q
        try
        {
            var dir  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
			dir.initWithPath(dirPath);
			if (!dir.exists() || !dir.isDirectory())
				throw gs_jsUtils.GetPropertyString("validpath");

            remotePath += dir.leafName + "/";

	        var iter = dir.directoryEntries;

	        while (iter.hasMoreElements())
	        {
	            var localFile = iter.getNext().QueryInterface(Components.interfaces.nsILocalFile);

		        if (!this.filter || (this.filter && localFile.fileSize <= gs_gSession.bufSize))
		        {
		            var fileSizeInKb = Math.round(localFile.fileSize / 1000);
		            var tgActionRow = new gs_gActionRow(dir.path, remotePath, localFile.leafName, 0, "upload", fileSizeInKb, "", localFile.isDirectory(), "", "");
                    this.arrActionQ.push(tgActionRow);
				}
				if (localFile.isDirectory())
	            {
	                //var rPath = remotePath + "/" + localFile.leafName;
	                this.AddLocalFoldersToQ(gs_jsUtils.SetLocalSystemPath(dir.path + "\\" + localFile.leafName), remotePath);
	            }
	        }
	    }
	    catch (ex)
	    {
	        	if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
	    }

    },

    ProcessActionQ  : function ()
    {
        if (this.gDownRow < 0)
            this.gDownRow = 0;

        if (this.gUpRow < 0)
            this.gUpRow = 0;

        setTimeout("gs_gActionTreeView.Download()", 300);
        setTimeout("gs_gActionTreeView.Upload()", 200);
        //setTimeout("gs_gActionTreeView.RefreshCurRow()", 300);
    },

    ClearItems  : function()
    {
        if (this.numConcurrentDownloads != 0 || this.numConcurrentUploads != 0)
        {
            var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                        .getService(Components.interfaces.nsIPromptService);
            var chk = prompts.confirm(window, "Confirm", gs_jsUtils.GetPropertyString("uploadProgress")  +
                                            gs_jsUtils.GetPropertyString("unexpected"));
            if (!chk)
            {
                return;
            }
        }
        var rowCountChanged = this.rowCount;
        delete this.arrActionQ;
        this.arrActionQ = new Array;
        if (this.treeBox)
			this.treeBox.rowCountChanged(0, -rowCountChanged);
        this.gDownRow = 0;
        this.gUpRow = 0;
        this.numConcurrentDownloads = 0;
        this.numConcurrentUploads = 0;
    },

    RemoveFromQ : function ()
    {
		var start = new Object();
        var end = new Object();
        var rowCountChanged = -this.rowCount;
        var numRanges = gs_gActionTreeView.selection.getRangeCount();

        for (var t = 0; t < numRanges; t++)
        {
            gs_gActionTreeView.selection.getRangeAt(t, start, end);
            for (var v = start.value; v <= end.value; v++)
            {
				gs_Dump("Splice: " + v + " , " + this.rowCount);
				if (this.arrActionQ[v].status != 1)
				{

					this.arrActionQ.splice(v, 1);
					(v < this.gDownRow) ? this.gDownRow-- : this.gDownRow;
					(v < this.gUpRow) ? this.gUpRow-- : this.gUpRow;
				}
		    }
        }

        this.treeBox.rowCountChanged(0, rowCountChanged);
		this.treeBox.rowCountChanged(0, this.rowCount);
    },

    Download    : function()
    {
		var objActTree = this;
        try
        {
			gs_Dump("AAA " + this.gDownRow + ", " + this.rowCount);
            while (this.numConcurrentDownloads < this.maxConcurrentDownloads)
            {
                var tgActionRow;

                while (this.gDownRow < this.rowCount)
                {
                    tgActionRow = this.arrActionQ[this.gDownRow];

	                if (tgActionRow.gspace_actType == "download" && tgActionRow.status == 0)
	                    break;
	                else
	                    this.gDownRow++;
	            }
	            if (this.gDownRow >= this.rowCount)
	            {
					gs_gLocalTreeView.RefreshFolder();
                    return;
				}
                this.numConcurrentDownloads++;
				var strUid = tgActionRow.uid;
				gs_gSession.gAct.DownloadFileObject(tgActionRow.fileName, tgActionRow.isDirectory, strUid, tgActionRow.toPath);
				this.downloadTimer = setInterval(function () { objActTree.WaitUntilDownload(); }, 500);
		    }

    	    //setTimeout("gs_gActionTreeView.Download()", 50);
	    }
	    catch (ex)
	    {
				if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
	        this.arrActionQ[this.gDownRow].progress = ex;
		    this.arrActionQ[this.gDownRow].status = 3;
		    this.InvalidateTree(this.gDownRow);
		    this.numConcurrentDownloads--;
		    this.gDownRow++;
	        setTimeout(function () { objActTree.Download(); }, 500);
	    }
    },

	WaitUntilDownload : function ()
	{
		var objActTree = this;
		var progress, name, status;
		if (gs_gSession.gAct.downloadStatus == gs_gSession.gAct.COMPLETE)
		{
			clearInterval(this.downloadTimer);
			progress = this.arrActionQ[this.gDownRow].internalProgress = 100;
			this.arrActionQ[this.gDownRow].status = 2;
			this.numConcurrentDownloads--;
			this.InvalidateTree(this.gDownRow);
			name = this.arrActionQ[this.gDownRow].fileName;
			this.gDownRow++;
			setTimeout(function () { objActTree.Download(); }, 100);
		}
		else
		{
			progress = this.arrActionQ[this.gDownRow].internalProgress = gs_gSession.gAct.downloadStatusIndicator.filePercent;
			this.arrActionQ[this.gDownRow].status = 1;
			this.InvalidateTree(this.gDownRow);
			name = this.arrActionQ[this.gDownRow].fileName;

			status = progress;
			if (gs_gSession.gAct.downloadStatusIndicator.filePart != "")
			{
				this.arrActionQ[this.gDownRow].progress = gs_jsUtils.GetPropertyString("downloadingpart") + " " + gs_gSession.gAct.downloadStatusIndicator.filePart + "/" + gs_gSession.gAct.downloadStatusIndicator.fileTotal + ": ";
				status = gs_jsUtils.GetPropertyString("downloadingpart") + " " + gs_gSession.gAct.downloadStatusIndicator.filePart + "/" + gs_gSession.gAct.downloadStatusIndicator.fileTotal + ": " + progress;
			}
			//gs_get("gDrop").value = gs_gSession.gAct.downloadStatusIndicator.filePart + ", " + gs_gSession.gAct.downloadStatusIndicator.filePercent;
		}
		if (gs_gSession.isOverlay)
		{
			gs_get("gspace-uploadprogress").value = progress;
			gs_get("gspace-file-name").value = gs_jsUtils.GetPropertyString("strfilename") + " " + name;
			if (progress == 100)
			{
				gs_get("gspace-file-status").value = gs_jsUtils.GetPropertyString("strstatus") + " " +  gs_jsUtils.GetPropertyString("downloadcomplete");
				gs_get("gspace-uploadprogress").value = 0;
			}
			else
			{
				gs_get("gspace-file-status").value = "Status: " + status + " %";
			}
		}
	},


    InvalidateTree  : function (row)
    {
		if (this.treeBox == null)
			return;
        if (row != -1 && row < this.rowCount)
            this.treeBox.invalidateRow(row);
        else
            this.treeBox.invalidate();
    },

    Upload  : function ()
    {
	    if (gs_gSession.getStatus() == 0)
		    setTimeout("gs_gActionTreeView.Upload()", 1000);
	    else if (gs_gSession.getStatus() == 1)
	    {
	        if (this.gUpRow >= this.rowCount)
                return;

		    setTimeout("gs_gActionTreeView.FileUpload()", 200);
	    }
    },

	FileUpload  : function ()
    {

        try
		{
			var objActTree = this;
            while (this.numConcurrentUploads < this.maxConcurrentUploads)
            {
                var tgActionRow;

                while (this.gUpRow < this.rowCount)
                {
                    tgActionRow = this.arrActionQ[this.gUpRow];

	                if (tgActionRow.gspace_actType == "upload" && tgActionRow.status == 0)
	                    break;
	                else
	                    this.gUpRow++;
	            }
	            if (this.gUpRow >= this.rowCount)
	            {
					if (!this.isRemoteListValid)
					{
						gs_gRemoteTreeView.RefreshFolder();
						this.isRemoteListValid = true;
					}
                    return;
                }

				this.isRemoteListValid = false;
                var fileName = tgActionRow.fileName;
				var arrOtherInfo;

		        if (tgActionRow.existingUid != "")
		        {
   			        var arrId = tgActionRow.existingUid.split("|");

   			        arrOtherInfo = gs_gRemoteTreeView.GetFileInfo(arrId[0]);

   					if (tgActionRow.doDelete)
						gs_gSession.gAct.DeleteMail(arrId);
		        }

                var fpLocal  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		        fpLocal.initWithPath(tgActionRow.fromPath);
		        fpLocal.append(fileName);

				this.numConcurrentUploads++;
				gs_gSession.gAct.UploadFileObject(fpLocal.path, tgActionRow.toPath, arrOtherInfo);

				this.uploadTimer = setInterval(function () { objActTree.WaitUntilUpload(); }, 500);

		    }
        }
        catch (ex)
		{
		    this.arrActionQ[this.gUpRow].progress = ex;
		    this.arrActionQ[this.gUpRow].status = 3;
		    this.InvalidateTree(this.gUpRow);

		    this.gUpRow++;
		   // setTimeout("gs_gActionTreeView.SplitFileAndUpload()", 500);
		}
	},

	WaitUntilUpload : function ()
	{
		var progress, name, status;
		if (gs_gSession.gAct.uploadStatus == gs_gSession.gAct.COMPLETE)
		{
			clearInterval(this.uploadTimer);
			progress = this.arrActionQ[this.gUpRow].internalProgress = 100;
			this.arrActionQ[this.gUpRow].status = 2;
			this.numConcurrentUploads--;
			this.InvalidateTree(this.gUpRow);
			name = this.arrActionQ[this.gUpRow].fileName;
			this.gUpRow++;
			setTimeout("gs_gActionTreeView.FileUpload();", 100);
		}
		else
		{
			progress = this.arrActionQ[this.gUpRow].internalProgress = gs_gSession.gAct.uploadStatusIndicator.filePercent;
			this.arrActionQ[this.gUpRow].status = 1;
			this.InvalidateTree(this.gUpRow);
			name = this.arrActionQ[this.gUpRow].fileName;

			status = progress;
			if (gs_gSession.gAct.uploadStatusIndicator.filePart != "")
			{
				this.arrActionQ[this.gUpRow].progress = gs_jsUtils.GetPropertyString("uploadingpart") + " " + gs_gSession.gAct.uploadStatusIndicator.filePart + "/" + gs_gSession.gAct.uploadStatusIndicator.fileTotal + ": ";
				status = gs_jsUtils.GetPropertyString("uploadingpart") + " " + gs_gSession.gAct.uploadStatusIndicator.filePart + "/" + gs_gSession.gAct.uploadStatusIndicator.fileTotal + ": " + progress;
			}
		}
		if (gs_gSession.isOverlay)
		{
			gs_get("gspace-uploadprogress").value = progress;
			gs_get("gspace-file-name").value = gs_jsUtils.GetPropertyString("strfilename") + " " + name;
			if (progress == 100)
			{
				gs_get("gspace-file-status").value = gs_jsUtils.GetPropertyString("strstatus") + " " +  gs_jsUtils.GetPropertyString("uploadcomplete");
				gs_get("gspace-uploadprogress").value = 0;
			}
			else
			{
				gs_get("gspace-file-status").value = gs_jsUtils.GetPropertyString("strstatus")+ " " + status + " %";
			}
		}
	},


    RemoveTab	: function (tRow)
    {
		//gs_Dump("Rowwwwwww " + tRow);
		var tgFrame = gs_get("gspace_gUpFrame" + tRow)
		if (tgFrame != null)
		{
			tgFrame.stop();
			gs_get("gspace_tabbrowser").removeChild(tgFrame);
		}
    },


    Progress : function ()
    {
        gs_Dump("DD");
    }
};



