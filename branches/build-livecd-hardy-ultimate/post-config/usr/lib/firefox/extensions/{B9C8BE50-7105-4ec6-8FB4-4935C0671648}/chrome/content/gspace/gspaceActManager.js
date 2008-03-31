var gs_accountManager = 
{
	type : "new",
	arrNames : new Array,
	
	loadAccounts : function ()
	{
		var lastUserName = "";
		
		if (gs_gPrefHandler.isExists(gs_gPrefNames.prefUserNames))
		{
			var strNames = gs_gPrefHandler.getPref(gs_gPrefNames.prefUserNames);
			this.arrNames = strNames.split(";;");
		}		
		if (gs_gPrefHandler.isExists(gs_gPrefNames.prefLastUserName))
		{
			lastUserName = gs_gPrefHandler.getPref(gs_gPrefNames.prefLastUserName);
		}
		
		document.getElementById("gspace_treeAccounts").view = gs_accountTreeView;
		gs_accountTreeView.arrNames = this.arrNames;
		this.invalidateTrees(0, this.arrNames.length);
		var index = this.isExists(lastUserName);
		if (index != -1)
		{
			this.loadAccountInfo(lastUserName);	
			gs_accountTreeView.selection.select(index);
		}
	},
	
	
	invalidateTrees : function(index, rowCount)
	{
		//var rowCountChangeAcctTree = gs_accountTreeView.rowCount;
		gs_accountTreeView.treeBox.rowCountChanged(index, rowCount);

	},
	
	checkUserEmail : function()
	{	
		var name = document.getElementById("gs_userEmail").value;
		name = gs_jsUtils.trimWhitespace(name);
		if (name != "")
		{
			if (name.indexOf("@") == -1)
				name += "@gmail.com";
			document.getElementById("gs_userEmail").value = name;
		}
		else
			return "";
		    
		if (this.isExists(name) != -1)
		{
			document.getElementById("gspace_btnSaveAccount").label = gs_jsUtils.GetPropertyString("save");
			this.loadAccountInfo(name);
			
		}		
		else
		{
			document.getElementById("gspace_btnSaveAccount").label = gs_jsUtils.GetPropertyString("add");;
		}
	},
	
	isExists : function (name)
	{
		var found = -1;
		for (var i = 0; i < this.arrNames.length; i++)
		{
			if (this.arrNames[i] == name)
			{
				found = i;
				break;
			}
		}
		return found;
	},
	
	removeAccount : function()
	{
		var userEmail = document.getElementById("gs_userEmail").value;
		if (gs_jsUtils.trimWhitespace(userEmail) != "")
		{
			var index = this.isExists(userEmail);
			this.arrNames.splice(index, 1);
			var strNames = this.arrNames.join(";;");
		
			gs_gPrefHandler.setPref(gs_gPrefNames.prefUserNames, strNames);
			var host = "chrome://gspace/";
			var pwdManager = Components.classes["@mozilla.org/passwordmanager;1"].createInstance();

			if (pwdManager) 
			{
				pwdManager = pwdManager.QueryInterface(Components.interfaces.nsIPasswordManager);
				try
				{
					pwdManager.removeUser(host, userEmail);
				} 
				catch (ex) 
				{  
					
				}
			}
		}
		this.invalidateTrees(index, -1);
		this.clearInfo();
	},
	
	clearInfo : function ()
	{
		document.getElementById("gspace_btnSaveAccount").label = gs_jsUtils.GetPropertyString("add");
		document.getElementById("gs_userEmail").value = "";
		document.getElementById("gspace_userPwd").value = "";
	},
	
	saveAccount : function()
	{
		var userEmail = document.getElementById("gs_userEmail").value;
		if (gs_jsUtils.trimWhitespace(userEmail) == "")
		{
			alert(gs_jsUtils.GetPropertyString("emailempty"));
			return;
		}
		var userPwd = document.getElementById("gspace_userPwd").value;
		var index = this.isExists(userEmail);
		if (index == -1)
		{
			this.arrNames.push(userEmail);			
		}
		
		var strNames = this.arrNames.join(";;");
		
		gs_gPrefHandler.setPref(gs_gPrefNames.prefUserNames, strNames);
				
		var host = "chrome://gspace/";
		var pwdManager = Components.classes["@mozilla.org/passwordmanager;1"].createInstance();

		if (pwdManager) 
		{
			pwdManager = pwdManager.QueryInterface(Components.interfaces.nsIPasswordManager);
			try
			{
				pwdManager.removeUser(host, userEmail);
				
			} 
			catch (ex) 
			{  
				
			}
			if (gs_get("gspace_remPassword").checked)
				pwdManager.addUser(host, userEmail, userPwd);
		}    
		
		if (index == -1)
			this.invalidateTrees(this.arrNames.length - 1, 1);
	},


	loadExistingAccount : function()
	{
		var selectedIndex = gs_accountTreeView.selection.currentIndex;
		this.loadAccountInfo(this.arrNames[selectedIndex]);
		document.getElementById("gs_userEmail").value = this.arrNames[selectedIndex];
	},
	
	loadAccountInfo : function (userEmail)
	{
		var host = "chrome://gspace/";
		
		var pwdManager = Components.classes["@mozilla.org/passwordmanager;1"].createInstance(Components.interfaces.nsIPasswordManagerInternal);
		var existingHost = {value:""};
		var existingUser = {value:""};
		var existingPwd = {value:""};

		try 
		{
			pwdManager.findPasswordEntry(host, userEmail, "", existingHost, existingUser, existingPwd);
		} 
		catch(e)
		{
			
		}  
		if (existingPwd.value == "")
		{
			gs_get("gspace_remPassword").checked = false;
		}
		else
		{
			gs_get("gspace_remPassword").checked = true;
		}
		document.getElementById("gspace_userPwd").value = existingPwd.value;
		document.getElementById("gs_userEmail").value = userEmail;
		document.getElementById("gspace_btnSaveAccount").label = gs_jsUtils.GetPropertyString("save");;
	}
	
	
}


//treeview for the preferred dictionaries
var gs_accountTreeView =
{
    treeBox: null,
    selection: null,
    
    arrNames : new Array,

    get rowCount()                     { return this.arrNames.length; },
    setTree     : function(treeBox)         { this.treeBox = treeBox; },
    getCellText : function(idx, column) 
    { 
        if (idx >= this.rowCount)
			return "";
		if (column.id == "gspace_colAccountName")
            return this.arrNames[idx];
    },
    isEditable: function(idx, column)  { return true; },
    isContainer: function(idx)         { return false;},
    isSeparator: function(idx)         { return false; },
    isSorted: function()               { return false; },
      
    getImageSrc: function(idx, column) 
    {
    },
    getProgressMode : function(idx,column) {},
    getCellValue: function(idx, column) {},
    cycleHeader: function(col) 
    {
    },
    selectionChanged: function() {},
    cycleCell: function(idx, column) {},
    performAction: function(action) {},
    performActionOnCell: function(action, index, column) {},
    getRowProperties: function(idx, column, prop) {},
    getCellProperties: function(idx, column, prop) {},
    getColumnProperties: function(column, element, prop) {},
    getLevel : function(idx) { return 0; }
};



function doCancel()
{
	return true;
}






