var gs_Overlay = {
 //attributes
 isTabListenerSet : false,
 isHidden		: true,

 //methods
 load : function () {
  gs_initPrefs();
   if (gs_gPrefHandler.getPref(gs_gPrefNames.prefShowStatusIcon, "char") == "yes")
    gs_get("gspace-statusicon").hidden = false;
   else
    gs_get("gspace-statusicon").hidden = true;
 },

 openGspacePanel : function () {
  var tabbox = getBrowser().mTabBox;
  if (!gs_Overlay.isTabListenerSet) {	
   gs_Overlay.isTabListenerSet = true;
   tabbox.addEventListener("select", function (evt)  { 
                                       if (!gs_Overlay.isHidden)  {
                                        gs_get("gspace-panel").hidden = true; 
                                        setTimeout(function () { 
                                                     gs_get("gspace-panel").hidden = false; 
                                                               }, 10);	
                                       }
                                                     }, true);
   
  }
  if (gs_Overlay.isHidden) {	
   gs_get("gspace-panel").hidden = false;
   gs_Overlay.isHidden = false;
  } else {
   gs_get("gspace-panel").hidden = true;	
   gs_Overlay.isHidden = true;
  }
  gs_Overlay.setPosition();	
  gs_gSession.gInitialize(true);	
 },
	
 hide : function (hide) {
  if (hide) {
   gs_get("gspace-panel").hidden = true;	
   gs_Overlay.isHidden = true;
   return;
  }

  //setposition for the main panel
  var statusbarTop = gs_get("status-bar").boxObject.y;
  var screenWidth = gs_get("status-bar").boxObject.width;
  var mainWidth = 530, mainHeight = 330;
  var mainLeft = (screenWidth - mainWidth) - 10;
  var mainTop = statusbarTop - mainHeight - 2;
  var webControl = new gs_wc_clsWebControl(gs_get("gspace-panel"), new gspace_wc_Point(mainLeft, mainTop), new gspace_wc_Point(mainLeft, statusbarTop), gspace_wc_EffectType.ANIMATE);
  webControl.animate("gs_Overlay.hide(true)");
 },
	
 setPosition : function () {
  //setposition for the main panel
  var statusbarTop = gs_get("status-bar").boxObject.y;
  var screenWidth = gs_get("status-bar").boxObject.width;
  var mainWidth = 530, mainHeight = 330;
  var mainLeft = (screenWidth - mainWidth) - 10;
  var mainTop = statusbarTop - mainHeight - 2;

  var webControl = new gs_wc_clsWebControl(gs_get("gspace-panel"), new gspace_wc_Point(mainLeft, statusbarTop), new gspace_wc_Point(mainLeft, mainTop), gspace_wc_EffectType.ANIMATE);
  webControl.animate();
 }
}


var gs_PanelDropObserver = {
 // methods
 onDrop : function (evt, transferData, session) {
  evt.preventDefault(); 
  if (gs_gSession.getStatus() != 1) return;
  
  var url; 
  if (gs_gRemoteTreeView.curFolderInfo && gs_gRemoteTreeView.curFolderInfo.isReadonly) {
   alert(gs_jsUtils.GetPropertyString("folderreadonly"));
   return;
  }		
  var folderExists = false;
  var rowCountChanged = -gs_gActionTreeView.rowCount;
  var isUpload = false;
  gs_gFileOpPref.askOption = true;
  for (var i = 0; i < session.numDropItems; i++) {
   var tobj = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
   tobj.addDataFlavor("application/x-moz-file"); 
   tobj.addDataFlavor("text/x-moz-url");  
   session.getData(tobj, i);
   var dataObj     = new Object();
   var dropSizeObj = new Object();
   var flavourObj = new Object();
   tobj.getAnyTransferData(flavourObj, dataObj, dropSizeObj);
   if (flavourObj.value.toString() != "application/x-moz-file") return;   

   var fileObj = dataObj.value.QueryInterface(Components.interfaces.nsIFile);
   var path = fileObj.parent ? fileObj.parent.path : fileObj.path;
   var tgLocalInfo = new gs_gLocalFileInfo(path, fileObj.leafName,  fileObj.fileSize, fileObj.lastModifiedTime , fileObj.isDirectory());
   var folder = fileObj.parent;
   var fname = tgLocalInfo.fileName;
   fname += (tgLocalInfo.isDirectory) ? "/" : "";
   var existRow = gs_gSession.gAct.fileExists(fname, gs_gSession.userName);
   if (existRow != -1 && tgLocalInfo.isDirectory) {
    folderExists = true;
   } else {
    var remotePath = gs_gRemoteTreeView.GetRemotePath();
    var existingUid, doDelete = false;
    if (existRow != -1) {
     if (gs_gFileOpPref.askOption)
      window.openDialog("chrome://gspace/content/gOverwrite.xul","Overwrite Options",
                        "chrome,modal,centerscreen", gs_gFileOpPref, tgLocalInfo.fileName, "regular", gs_jsUtils.GetPropertyString("filestr"), gs_jsUtils.GetPropertyString("alreadystr"));
     if (gs_gFileOpPref.overwriteOption == gs_gFileOpPref.SKIP) {
      gs_gFileOpPref.askOption = true;
      continue;
     } else if (gs_gFileOpPref.overwriteOption == gs_gFileOpPref.SKIP_ALL || gs_gFileOpPref.overwriteOption == gs_gFileOpPref.CANCEL) {
      gs_gFileOpPref.askOption = false;
      continue;
     } else if (gs_gFileOpPref.overwriteOption == gs_gFileOpPref.OVERWRITE_DELETE) {
      gs_gFileOpPref.askOption = true;
      doDelete = true;
     } else if (gs_gFileOpPref.overwriteOption == gs_gFileOpPref.OVERWRITE_DELETE_ALL) {
      gs_gFileOpPref.askOption = false;
      doDelete = true;
     } else if (gs_gFileOpPref.overwriteOption == gs_gFileOpPref.OVERWRITE_SAVE) {
      gs_gFileOpPref.askOption = true;
      doDelete = false;
     } else if (gs_gFileOpPref.overwriteOption == gs_gFileOpPref.OVERWRITE_SAVE_ALL) {
      gs_gFileOpPref.askOption = false;
      doDelete = false;
     }

     existingUid = gs_gSession.gAct.gFiles[existRow].uid;
    } else {
     existingUid = "";
    }

    var tgActionRow = new gs_gActionRow(folder.path, remotePath, tgLocalInfo.fileName, 0, "upload", tgLocalInfo.fileSizeInKb, "", tgLocalInfo.isDirectory, "", existingUid);
    tgActionRow.gspaceCreateTime = (existRow == -1) ? "" : gs_gSession.gAct.gFiles[existRow].gspaceCreateTime;
    tgActionRow.doDelete = doDelete;

    gs_gActionTreeView.arrActionQ.push(tgActionRow);
    if (tgLocalInfo.isDirectory)
     gs_gActionTreeView.AddLocalFoldersToQ(gs_jsUtils.SetLocalSystemPath(folder.path + "\\" + tgLocalInfo.fileName), remotePath);
    
    isUpload = true;
   }
  }	

  if (!gs_get("gspace_actionTree").hidden) {
   gs_gActionTreeView.treeBox.rowCountChanged(0, rowCountChanged);
   rowCountChanged = gs_gActionTreeView.rowCount;
   gs_gActionTreeView.treeBox.rowCountChanged(0, rowCountChanged);
  }
  if (folderExists) {
   alert(gs_jsUtils.GetPropertyString("folders"));
  }

  setTimeout("gs_gActionTreeView.Upload()", 200);
  //gs_gActionTreeView.ProcessActionQ(isDownload, isUpload);        
 },

 onDragOver: function (evt,flavour,session){},
  
 getSupportedFlavours: function () {
  var flavourSet = new FlavourSet();
  flavourSet.appendFlavour("text/x-moz-url");
  flavourSet.appendFlavour("text/unicode");
  flavourSet.appendFlavour("application/x-moz-file", "nsIFile");
  return flavourSet;
 }
}

window.addEventListener("load", gs_Overlay.load, false);
//window.addEventListener("unload", gs_Overlay.unload, false);