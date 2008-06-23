var gs_gPlaylistTreeView =
{
    treeBox: null,
    selection: null,
    curRow  : 0,
    playRow : -1,

	showMesg : true,
    playStatus : -1,
    playTimer : null,

    arrPlayQ : new Array,

    get rowCount()                     { return this.arrPlayQ.length; },
    setTree     : function(treeBox)         { this.treeBox = treeBox; },
    getCellText : function(idx, column)
    {
       // gs_Dump("idx " + idx);
        if (idx >= this.rowCount)
            return "";
        var playRow = this.arrPlayQ[idx];
        var txt = "";
        switch (column.id)
        {
            case "gspace_playlistFileName" : txt = playRow.fileName; break;
            case "gspace_playlistRemotePath" : txt = playRow.fromPath; break;
        }
		if (column.id == "gspace_playlistFileName" && idx == this.playRow)
			txt += " (playing)";
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

        var playRow = this.arrPlayQ[idx];
        var imgPath = "";
        switch (column.id)
        {
            case "gspace_playlistFileName" : if (playRow.isDirectory)
                                    imgPath = "chrome://gspace/skin/directory.png";
                                 else
                                    imgPath = "moz-icon://" + this.arrPlayQ[idx].fileName + "?size=16"; break;

        }
        return imgPath;

    },
    getProgressMode : function(idx,column) {},
    getCellValue: function(idx, column) {},
    cycleHeader: function(col, elem) {},
    selectionChanged: function() {},
    cycleCell: function(idx, column) {},
    performAction: function(action) {},
    performActionOnCell: function(action, index, column) {},
    getRowProperties: function(idx, column, prop) {},
    getCellProperties: function(idx, column, prop) {},
    getColumnProperties: function(column, element, prop) {},
    getLevel : function(idx) { return 0; },


    AddToPlayQ    : function ()
    {
		if (gs_gSession.getStatus() != 1)
			return;
        var start = new Object();
        var end = new Object();
        var rowCountChanged = -this.rowCount;

        var folderExists = false;
        var isDownload = false;
        var isUpload = false;

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

                if (tgRemoteInfo.isDirectory)
                {
					if (this.showMesg)
					{
						alert(gs_jsUtils.GetPropertyString("mp3mesg"));
						this.showMesg = false;
					}
					var folderName = tgRemoteInfo.fileName.substring(0, tgRemoteInfo.fileName.lastIndexOf("/"));
					this.AddRemoteFoldersToPlayQ(gs_jsUtils.SetLocalSystemPath(folder.path + "\\" + folderName), remotePath);
				}
				else
				{
					if (this.isMusicFile(tgRemoteInfo.fileName) && tgRemoteInfo.fileTotal == 1)
					{
						var playListRow = new gs_gActionRow(remotePath, folder.path, tgRemoteInfo.fileName, 0, "download", tgRemoteInfo.fileSizeInKb, "", tgRemoteInfo.isDirectory, tgRemoteInfo.uid, "");
						this.arrPlayQ.push(playListRow);
					}
				}
				isDownload = true;
            }
        }

        rowCountChanged += this.rowCount;
        this.treeBox.rowCountChanged(0, rowCountChanged);
        //if (this.playRow == -1)
			setTimeout(function () { gs_gPlaylistTreeView.playStart() } , 1000);
    },

    isMusicFile : function (fileName)
	{
		try
		{
			var strExt = ".mp3";
			if (fileName.toLowerCase().indexOf(strExt) != -1)
				return true;

		}
		catch (ex)
		{
			return false;
		}
		return false;
	},

    AddRemoteFoldersToPlayQ		: function (localPath, remotePath)
    {
		remotePath += "/";
		var tgAct = gs_gSession.GetActionInstance();
		tgAct.Enumerate(remotePath);

	    for (var i = 0; i < tgAct.gFiles.length; i++)
	    {
			var tgRemoteInfo = tgAct.gFiles[i];

			remotePath = tgRemoteInfo.filePath;
			remotePath = remotePath.substring(0, remotePath.lastIndexOf("/"));

			if (tgRemoteInfo.isDirectory)
            {
				var folderName = tgRemoteInfo.fileName.substring(0, tgRemoteInfo.fileName.lastIndexOf("/"));
				this.AddRemoteFoldersToPlayQ(gs_jsUtils.SetLocalSystemPath(localPath + "\\" + folderName), remotePath);
			}
			else
			{
				if (this.isMusicFile(tgRemoteInfo.fileName) && tgRemoteInfo.fileTotal == 1)
				{
					var playListRow = new gs_gActionRow(remotePath, localPath, tgRemoteInfo.fileName, 0, "download", tgRemoteInfo.fileSizeInKb, "", tgRemoteInfo.isDirectory, tgRemoteInfo.uid, "");
					this.arrPlayQ.push(playListRow);
				}
			}
	    }
    },


    ClearItems  : function()
    {
        var rowCountChanged = this.rowCount;
        delete this.arrPlayQ;
        this.arrPlayQ = new Array;
        if (this.treeBox)
        	this.treeBox.rowCountChanged(0, -rowCountChanged);
        this.playRow = -1;
    },

    RemoveFromQ : function ()
    {
		var start = new Object();
        var end = new Object();
        var rowCountChanged = -this.rowCount;
        var numRanges = gs_gPlaylistTreeView.selection.getRangeCount();

        for (var t = 0; t < numRanges; t++)
        {
            gs_gPlaylistTreeView.selection.getRangeAt(t, start, end);
            for (var v = start.value; v <= end.value; v++)
            {
				gs_Dump("Splice: " + v + " , " + this.rowCount);
				if (this.arrPlayQ[v].status != 1)
					this.arrPlayQ.splice(v, 1);
		    }
        }

        this.treeBox.rowCountChanged(0, rowCountChanged);
		this.treeBox.rowCountChanged(0, this.rowCount);
    },

	playStart : function ()
	{
		if (gs_gSession.getStatus() != 1)
			return;
		this.playRow = gs_gPlaylistTreeView.selection.currentIndex;
		if (this.playRow == -1)
			this.playRow = 0;
		if (this.arrPlayQ[this.playRow] == null)
			return;

		var uid = this.arrPlayQ[this.playRow].uid;
		this.treeBox.rowCountChanged(0, -this.rowCount);
		this.treeBox.rowCountChanged(0, this.rowCount);


		var playListFile = this.get_XSPF_playlist();

		gs_get("gspace_songBrowser").removeEventListener("load", gs_gPlaylistTreeView.onLoad, true);

		gs_get("gspace_songBrowser").setAttribute("src", "?");
		gs_get("gspace_songBrowser").setAttribute("src", "chrome://gspace/content/player.html");
		gs_get("gspace_songBrowser").setAttribute("desc", playListFile);

		gs_get("gspace_songBrowser").addEventListener("load", gs_gPlaylistTreeView.onLoad, true);

		//this.clearTimer();
		//this.playTimer = setInterval(function () { gs_gPlaylistTreeView.checkPlayingStatus(); } , 1500);
	},

	checkPlayingStatus : function ()
	{
		var sDoc = gs_get("gspace_songBrowser").contentDocument;
		var sNode = gs_get("pStatus", sDoc);
		if (sNode == null)
			return;
		var status = sNode.value;
		if (status == "yes")
		{
			this.clearTimer(this.playTimer);
			this.playNext();
			//window.repaint(true);
		}
		var sDoc = gs_get("gspace_songBrowser").contentDocument;
		var docWrapper = new XPCNativeWrapper(sDoc, 'embeds');
		docWrapper.embeds[0].focus();

	},

	clearTimer : function ()
	{
		if (this.playTimer != null)
		{
			clearInterval(this.playTimer);
			this.playTimer = null;
		}
	},

	playNext : function ()
	{
		if (gs_gSession.getStatus() != 1)
			return;
		 if (this.playRow < this.rowCount - 1)
		 {
			this.playRow++;
			gs_gPlaylistTreeView.selection.currentIndex = this.playRow;
			this.playStart();
		 }
	},

	playPrevious : function ()
	{
		if (gs_gSession.getStatus() != 1)
			return;
		 if (this.playRow > 0)
		 {
			this.playRow--;
			gs_gPlaylistTreeView.selection.currentIndex = this.playRow;
			this.playStart();
		 }
	},

	onLoad : function (evt)
	{
		var sDoc = gs_get("gspace_songBrowser").contentDocument;
		var docWrapper = new XPCNativeWrapper(sDoc, 'embeds');

		docWrapper.embeds[0].setAttribute("src","chrome://gspace/content/xspf_player.swf?playlist_url=file://"+gs_get("gspace_songBrowser").getAttribute("desc")+"&amp;autoload=true&amp;autoplay=true");
		var embed = docWrapper.embeds[0].cloneNode(true);
		var cell = sDoc.getElementsByTagName("object")[0].parentNode;
		var object = sDoc.getElementsByTagName("object")[0];
		cell.removeChild(object);


		cell.appendChild(embed);

	},

    InvalidateTree  : function (row)
    {
        if (row != -1 && row < this.rowCount)
            this.treeBox.invalidateRow(row);
        else
            this.treeBox.invalidate();
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

	get_XSPF_playlist : function ()
	{
		//Create temp file
		var file = Components.classes["@mozilla.org/file/directory_service;1"]
		                     .getService(Components.interfaces.nsIProperties)
		                     .get("TmpD", Components.interfaces.nsIFile);
		file.append("gspace_playlist");
		file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);

		// file is nsIFile, data is a string
		var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
		                         .createInstance(Components.interfaces.nsIFileOutputStream);

		// use 0x02 | 0x10 to open file for appending.
		foStream.init(file, 0x02 | 0x08 | 0x20, 0666, 0); // write, create, truncate

		var charset = "UTF-8"; // Can be any character encoding name that Mozilla supports

		var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
		                   .createInstance(Components.interfaces.nsIConverterOutputStream);

		// This assumes that fos is the nsIOutputStream you want to write to
		os.init(foStream, charset, 0, 0x0000);

		os.writeString("<?xml version=\"1.0\" encoding=\"UTF-8\"?> <playlist version=\"0\" xmlns = \"http://xspf.org/ns/0/\">");
		os.writeString("<title>FON Gspace playlist</title>  <trackList>");

		// Para cada mp3 de la lista (array arrPlayQ):
		//"http://mail.google.com/mail/?realattid=file0&attid=0.1&view=att&th=" + this.arrPlayQ[0].uid
		for(var x in this.arrPlayQ){
			//alert("Agregando " + this.arrPlayQ[x].fileName + " con la url: http://mail.google.com/mail/?realattid=file0&attid=0.1&view=att&th=" + this.arrPlayQ[x].uid);
			os.writeString("<track>");
			os.writeString("<location>http://mail.google.com/mail/?realattid=file0&attid=0.1&view=att&th=" + this.arrPlayQ[x].uid +"</location>");
			os.writeString("<annotation>"+this.arrPlayQ[x].fileName+"</annotation>");
			os.writeString("</track>");
		}

		os.writeString("</trackList></playlist>");


		os.close();
		foStream.close();

		return file.path;
	},


    Progress : function ()
    {
        gs_Dump("DD");
    }
};



