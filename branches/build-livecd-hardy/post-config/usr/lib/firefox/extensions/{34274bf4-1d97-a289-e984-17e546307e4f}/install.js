/*
** authored by rue
*/

/* Pre-Install Cleanup (for prior versions) */

// temp-dir
initInstall("pre-install", "/tempDir", "0.0"); // dummy-install - allows committance of file-operations
var tempDir = getFolder(getFolder("Profile", "chrome"), "adblock-temp"); // adblock temp-dir
if (!File.exists(tempDir)) dirCreate(tempDir); // create temp-dir if it doesn't exist
performInstall(); // commit dir-creation changes

// file-check array
var dirArray = new Array(), d;
dirArray.push((d=[]));
	d.push(getFolder("Profile", "chrome"));	// profile-chrome
	d.push("adblock"); 						// filename - profile jar
	d.push(".jar"); 						// filename - extension
dirArray.push((d=[]));
	d.push(getFolder("chrome"));			// app-chrome
	d.push("adblock"); 						// filename - root jar
	d.push(".jar"); 						// filename - extension
dirArray.push((d=[]));
	d.push(getFolder("components"));		// app-components
	d.push("nsAdblock"); 					// filename - root component
	d.push(".js"); 							// filename - extension
dirArray.push((d=[]));
	d.push(getFolder("Profile"));			// profile
	d.push("XUL FastLoad File"); 			// filename - xul cache mac
	d.push(""); 							// filename - extension
dirArray.push((d=[]));
	d.push(getFolder("Profile"));			// profile
	d.push("XUL"); 							// filename - xul cache macosX
	d.push(".mfast"); 						// filename - extension
dirArray.push((d=[]));
	d.push(getFolder("Profile"));			// profile
	d.push("XUL"); 							// filename - xul cache linux
	d.push(".mfasl"); 						// filename - extension
dirArray.push((d=[]));
	d.push(getFolder("Profile"));			// profile
	d.push("XUL"); 							// filename - xul cache windows
	d.push(".mfl"); 						// filename - extension
dirArray.push((d=[]));
	d.push(getFolder(getFolder("Profile"),'components'));// profile-components
	d.push("nsAdblock"); 					// filename - root component
	d.push(".js"); 							// filename - extension
dirArray.push((d=[]));
	d.push(getFolder(getFolder("Profile"),"pref"));// profile prefs
	d.push("adblock"); 						// filename - pref defaults
	d.push(".js"); 							// filename - extension

var currentInProfile = false;
var currentInRoot = false;

// file-check loop
for (var i = 0 ; i < dirArray.length ; i++) {
	initInstall("pre-install - 0."+i, "/rename", "0."+i); // reopen dummy-install
	var currentDir = dirArray[i][0];
	var nameMain = dirArray[i][1];
	var nameEnd = dirArray[i][2];
	var tempDir = getFolder(getFolder("Profile", "chrome"), "adblock-temp"); // adblock temp-dir
	if (!File.exists(tempDir)) dirCreate(tempDir); // create temp-dir if it doesn't exist
	var previousFile = getFolder(currentDir, nameMain + nameEnd); // previous jar
	var newNameMain = "adblock-uninstalled";// nameMain + "-uninstalled";
	var newName = newNameMain; // + nameEnd;
	var n = 1;
	
	if (File.exists(previousFile)) {
		if (File.exists(getFolder(currentDir, newName))) // <-- change 'currentDir' to 'tempDir' to revert: old-style
			while(File.exists(getFolder(currentDir, newName))) { // <-- ditto.
				newName = new String(newNameMain + n); // + nameEnd); // find a unique-name for our "move-to" destination
				n++;
			}
		// rename file
		File.rename(previousFile, newName); // rename the previous jar to the unique-name
		performInstall(); // commit file-rename changes
		
		// -- this can be (un)commented without worry.. it just seemingly fails to move, every time
		// move file
		initInstall("pre-install", "/move", "0."+i); // reopen dummy-install
		if (!File.exists(previousFile)) previousFile = getFolder(currentDir, newName); // if successfully renamed, get the file by its new name
		File.move(previousFile, tempDir); // move jar to temp-dir
		performInstall(); // commit file-move changes
		
		// delete original
		initInstall("pre-install", "/delete", "0."+i); // reopen dummy-install
		if (File.exists(previousFile)) File.remove(previousFile); // delete original (in case it didn't completely move)
		performInstall(); // commit file-deletion changes
		
		switch(i) {
			case 0: currentInProfile = true; break;
			case 1: currentInRoot    = true; break; }
	}
	
}

const alreadyInstalled = currentInProfile||currentInRoot;


/* Main Install Routine */

// only load after the Pre-Install Cleanup completes
if (true) {
	// install constants
	const APP_DISPLAY_NAME = "Adblock";
	const APP_NAME = "adblock";
	const APP_PACKAGE = "/adblock.mozdev.org";
	const APP_VERSION = "0.5";
	
	const APP_JAR_FILE = "adblock.jar";
	const APP_JAR_LOC = 'chrome/' + APP_JAR_FILE;
	
	const APP_REG_FILE = "components/.autoreg";
	const APP_COMP_FILE = "components/nsAdblock.js";
	const APP_COMP_LOC = APP_COMP_FILE;
	
	const APP_SKIN_FOLDER = "skin/classic/";
	var   APP_LOCALE_FOLDERS = [];
		//APP_LOCALE_FOLDERS.push("content/sessionsaver/main-locale/en-US/sessionsaver/"); // default fallback-locale
		//APP_LOCALE_FOLDERS.push("locale/nl-NL/sessionsaver/");
	var  NEW_APP_LOCALE_FOLDERS = [];
		// ..add new app-locales here, so they'll be registered even if only updating
	
	const APP_CONTENT_FOLDER = "content/";
	
	const INST_TO_PROFILE = "Install "+APP_DISPLAY_NAME+" in your profile?\n(..you wont have to reinstall when updating the browser).\n\nClick Cancel to install "+APP_DISPLAY_NAME+" in the browser root.";
	const ROOT_FAILED___TRY_INST_TO_PROFILE = "You didn't have permission to install as root.\n Would you like to force profile-installation?\n\n[Note: "+APP_DISPLAY_NAME+" WILL NOT FUNCTION in the profile for browsers-builds older than 6.24.03. This includes moz1.4.1 and fb.6]";
	
	const profileChrome = getFolder("Profile", "chrome");
	const previousJarInProfile = getFolder(profileChrome, "adblock.jar");
	const previousJarInRoot = getFolder("chrome", "adblock.jar"); }



// initialize our install
initInstall(APP_NAME, APP_PACKAGE, APP_VERSION);


// check for previous install
if (File.exists(previousJarInProfile) || File.exists(previousJarInRoot)) {
	
	var installedHere = File.exists(previousJarInProfile)?"profile ":"";
	installedHere += (File.exists(previousJarInProfile) && File.exists(previousJarInRoot))?"*and* ":"";
	installedHere += File.exists(previousJarInRoot)?"root ":"";
	installedHere += (File.exists(previousJarInProfile) && File.exists(previousJarInRoot))?"directories":"directory";

	alert("Sorry:  Adblock is already installed in your " + installedHere + ". "
		+"\n\n\n\nIf you're running a recent dev-build, you can deinstall from preferences. "
		+"\nFor all other versions, please consult the online-faq:"
		+"\n\nadblock.mozdev.org/faq.html");
	cancelInstall(-23); // we can't overwrite, so don't install further
	
}
else {

	// runtime component registration only works since 2003-06-24..
	var instToProfile = false;
	if (alreadyInstalled) instToProfile = currentInProfile;
	else if (buildID == 0 || buildID > 2003062400) instToProfile = confirm(INST_TO_PROFILE); // ..so, dont ask on prior builds.
	
	// Add comp file
    //if (!instToProfile) {
        var compDir = getFolder(getFolder('Program'),'components');
        if (!File.exists(getFolder(compDir,".autoreg"))) addFile(null, APP_REG_FILE, compDir, null);
        
        var errComponent = addFile(null, APP_COMP_FILE, compDir, null);
        if (errComponent != SUCCESS && instToProfile) alert("Adblock's Component failed to install.\n\nDon't worry- Adblock will attempt to install this file again, \nat startup. Just make sure you have write-privileges for \nthe application folder.");
    //}
    
	
	// install jar-file
	var chromef = instToProfile ? getFolder("Profile", "chrome") : getFolder("chrome");
	var errJar = addFile(APP_PACKAGE, APP_VERSION, APP_JAR_LOC, chromef, null);
	
	
	// if root-install was attempted and failed, ask the user what to do
	if(!instToProfile && (errComponent != SUCCESS || errJar != SUCCESS)) {
		instToProfile = confirm(ROOT_FAILED___TRY_INST_TO_PROFILE);
		if (instToProfile) {
			chromef = getFolder("Profile", "chrome");
			errJar = addFile(APP_PACKAGE, APP_VERSION, APP_JAR_LOC, chromef, null); }
		else errJar = "root install failed";
	}
	
	
    // Add profile-copy of component, for startup-installation
    if (instToProfile) {
		var profChromef = getFolder("Profile", "chrome");
		errComponent = addFile(null, APP_COMP_FILE, profChromef, null);
		addFile(null, APP_REG_FILE, profChromef, null);
    }

	// if we've successfully installed the files, register them
	if (errJar == SUCCESS && errComponent == SUCCESS) {
		var jar = getFolder(chromef, APP_JAR_FILE);
		var chrome_dest = (instToProfile) ? PROFILE_CHROME : DELAYED_CHROME;
		
		if (alreadyInstalled) { //;} // *ding -- update success.
			for(var j = 0; i < NEW_APP_LOCALE_FOLDERS.length; ++j) 
				registerChrome(LOCALE | chrome_dest, jar, NEW_APP_LOCALE_FOLDERS[j]);
		}
		else {
			registerChrome(CONTENT | chrome_dest, jar, APP_CONTENT_FOLDER);
			//registerChrome(SKIN | chrome_dest, jar, APP_SKIN_FOLDER);
			for(var k = 0; k < APP_LOCALE_FOLDERS.length; ++k) 
				registerChrome(LOCALE | chrome_dest, jar, APP_LOCALE_FOLDERS[k]);
		}
		
		// Add prefs file -- only after successful install of others
		var prefDir = getFolder(getFolder("Profile"),"pref");
		if (!File.exists(prefDir)) dirCreate(prefDir);
		if (!File.exists(getFolder(prefDir,APP_NAME+".js"))) 
			addFile(null, "defaults/preferences/" + APP_NAME + ".js", prefDir, null);
		
		// Commit install
		var err = performInstall();
		if (err == SUCCESS || err == 999) {
			alert(APP_DISPLAY_NAME + " " + APP_VERSION + " is now installed.\n"
				+"Just restart to activate."); } 
		else {
			alert("Install failed. Error code:" + err);
			cancelInstall(err); }
	} 
	else {
		alert("Failed to create " +APP_JAR_FILE +"\n"
			+"You probably don't have appropriate permissions \n"
			+"(write access to your profile or chrome directory). \n"
			+"_____________________________\nError code:" + errJar);
		cancelInstall(errJar);
	}
	
}