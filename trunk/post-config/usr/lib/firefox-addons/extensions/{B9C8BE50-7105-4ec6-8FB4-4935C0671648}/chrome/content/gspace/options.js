//get the preferences when showing the dialog box
function LoadPrefs()
{
	gs_initPrefs();

	var strViewExtList = gs_gPrefHandler.getPref(gs_gPrefNames.prefViewExtensions, "char");
	var strHarmfulExtList = gs_gPrefHandler.getPref(gs_gPrefNames.prefHarmfulExtensions, "char");
	var attachSize = gs_gPrefHandler.getPref(gs_gPrefNames.prefAttachmentSize, "char");
	var showThumbnails = gs_gPrefHandler.getPref(gs_gPrefNames.prefShowThumbnails, "char");

	var prefIcon = gs_gPrefHandler.getPref(gs_gPrefNames.prefToolbarIcon, "char");
	if (prefIcon == "yes")
		gs_get("gspace_gToolbarIcon").checked = true;
	else
		gs_get("gspace_gToolbarIcon").checked = false;

	if (gs_gPrefHandler.getPref(gs_gPrefNames.prefClickProperties, "char") == "yes")
		gs_get("gspace_gClickProperties").checked = true;
	else
		gs_get("gspace_gClickProperties").checked = false;

	if (gs_gPrefHandler.getPref(gs_gPrefNames.prefShowThumbnails, "char") == "yes")
		gs_get("gspace_gShowThumbnails").checked = true;
	else
		gs_get("gspace_gShowThumbnails").checked = false;

	if (gs_gPrefHandler.getPref(gs_gPrefNames.prefShowStatusIcon, "char") == "yes")
		gs_get("gspace_gShowStatusIcon").checked = true;
	else
		gs_get("gspace_gShowStatusIcon").checked = false;

	gs_get("gspace_gAttachmentSize").value = Math.ceil(attachSize / 1000000);
	gs_get("gspace_gHarmfulExtList").value = strHarmfulExtList;
	gs_get("gspace_gViewExtList").value = strViewExtList;
}

//set the preferences when the "OK" button is pressed in the dialog box
function doOK()
{
	try
	{
		var elemSize = gs_get("gspace_gAttachmentSize");
		var attachSize = parseInt(elemSize.value);
		if (isNaN(attachSize))
		{
			throw "Please enter a correct value in the attachment size";
		}
		else if (attachSize > 19 || attachSize < 1)
		{
			throw "Please enter a value greater than 1 and less than 19 as the max attachment size is 19 MB";
		}
		attachSize *= 1000000;
		var strViewExtList = gs_get("gspace_gViewExtList").value;
		var strHarmfulExtList = gs_get("gspace_gHarmfulExtList").value;
		if (window.arguments != null && window.arguments.length > 0)
		{
			var gs_gSession = window.arguments[0];
			if (gs_gSession != null)
				gs_gSession.bufSize = attachSize;
		}

		if (gs_get("gspace_gToolbarIcon").checked)
			gs_gPrefHandler.setPref(gs_gPrefNames.prefToolbarIcon, "yes", "char");
		else
			gs_gPrefHandler.setPref(gs_gPrefNames.prefToolbarIcon, "no", "char");

		if (gs_get("gspace_gClickProperties").checked)
			gs_gPrefHandler.setPref(gs_gPrefNames.prefClickProperties, "yes", "char");
		else
			gs_gPrefHandler.setPref(gs_gPrefNames.prefClickProperties, "no", "char");

		if (gs_get("gspace_gShowThumbnails").checked)
			gs_gPrefHandler.setPref(gs_gPrefNames.prefShowThumbnails, "yes", "char");
		else
			gs_gPrefHandler.setPref(gs_gPrefNames.prefShowThumbnails, "no", "char");

		if (gs_get("gspace_gShowStatusIcon").checked)
			gs_gPrefHandler.setPref(gs_gPrefNames.prefShowStatusIcon, "yes", "char");
		else
			gs_gPrefHandler.setPref(gs_gPrefNames.prefShowStatusIcon, "no", "char");

		gs_gPrefHandler.setPref(gs_gPrefNames.prefAttachmentSize, attachSize, "char");
		gs_gPrefHandler.setPref(gs_gPrefNames.prefHarmfulExtensions, strHarmfulExtList, "char");
		gs_gPrefHandler.setPref(gs_gPrefNames.prefViewExtensions, strViewExtList, "char");
		return true;
	}
	catch (ex)
	{
		if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
		return false;
	}
}

var joinFile = null;

function doBrowse()
{
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	const fpContractID = "@mozilla.org/filepicker;1";

	var fp = Components.classes[fpContractID].createInstance(nsIFilePicker);

    fp.init(window, gs_jsUtils.GetPropertyString("choosefile"), nsIFilePicker.modeOpen);
    fp.appendFilters(nsIFilePicker.filterAll);
	var rv = fp.show();
    if (rv == nsIFilePicker.returnOK)
    {
        gs_get("gspace_gPath").value = fp.file.path;
    }
}

function doJoin()
{
	var path = gs_get("gspace_gPath").value;
	if (gs_jsUtils.trimWhitespace(path) == "")
		return;
	try
	{
		var fpActFile  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		fpActFile.initWithPath(path);
		if (!fpActFile.exists())
		{
			alert(gs_jsUtils.GetPropertyString("filenotexists"));
			return;
		}

		var lastIndex = fpActFile.leafName.lastIndexOf("_gs");
		if (lastIndex == -1)
		{
			alert(gs_jsUtils.GetPropertyString("invalidfile"));
			return;
		}

		var currentExt = "_gs";

		var fileName = fpActFile.leafName.substring(0, lastIndex);

		var toPath = fpActFile.parent.path;
		var fpLocal  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
		fpLocal.initWithPath(toPath);
		fpLocal.append(fileName);
		var j = 0;
		while (fpLocal.exists())
		{
			j++;
			fpLocal.initWithPath(toPath);
			fpLocal.append(j + "_" + fileName);
		}

		var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
					.createInstance(Components.interfaces.nsIFileOutputStream);
		var sstream = Components.classes["@mozilla.org/network/buffered-output-stream;1"]
				.createInstance(Components.interfaces.nsIBufferedOutputStream);
		sstream.init(foStream, gs_gSession.bufSize);
		foStream.init(fpLocal, 0x02 | 0x08 | 0x20, 0664, 0); // write, create, truncate

		var i = parseInt(fpActFile.leafName.substr(lastIndex + 3), 10);

		while (true)
		{
			var tfpLocal  = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
			tfpLocal.initWithPath(toPath);
			tfpLocal.append(fileName + currentExt + i);
			if (!tfpLocal.exists())
				break;

			var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
							.createInstance(Components.interfaces.nsIFileInputStream);
			fstream.init(tfpLocal, 1, 0, false);
			fstream.QueryInterface(Components.interfaces.nsIInputStream);

			sstream.writeFrom(fstream, fstream.available());
			fstream.close();
			tfpLocal.remove(true);
			i++;
		}
		sstream.close();
		foStream.close();
	}
	catch (ex)
	{
		if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") alert(ex);
		return;
	}
	alert(gs_jsUtils.GetPropertyString("joincompleted"));
}
