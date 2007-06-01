/////////////////////////////////////////////////////////////////////////////
//
// rscp.js: Red Swoosh Control Panel
// Updated: 21st June 2006
// Copyright 2006, Red Swoosh (http://www.redswoosh.net)
// 
/////////////////////////////////////////////////////////////////////////////

var g_pageHTML;
var g_cidList;
var g_cidListIndex;
var g_diskSpace;
var g_lastRefreshTime = 0;
var g_startingTimer = 0;
var g_showDetails = [];

// Called from the stopping page
function redswooshStoppingCheckLoop( ) 
{
    // Start trying to not-be-able-to-initialize
    g_startingTimer = 0;
    redswooshStoppingCheckLooper( );
}

function redswooshStoppingCheckLooper( ) 
{
    // Try
    redswooshInitialize( onRedSwooshNonInitializeCheck, 0, 0 );
    
    // And try again
    setTimeout( "redswooshStoppingCheckLooper( )", 500 );
    
    // Give up after 30 seconds
    g_startingTimer++;
    if( g_startingTimer > 30 ) document.location = "ControlPanel.html"
}

function onRedSwooshNonInitializeCheck( success, ignore )
{
    // On to the not running page after 2 seconds if no success 
    if( !success ) setTimeout( "forwardToNotRunning( )", 2000 );
}

function forwardToNotRunning( )
{
    document.location = "NotRunning.html";
}

// Called from the starting page
function redswooshRunningCheckLoop( ) 
{
    // Start trying to initialize
    g_startingTimer = 0;
    redswooshRunningCheckLooper( );
}

function redswooshRunningCheckLooper( ) 
{
    // Try
    redswooshInitialize( onRedSwooshInitializeCheck, 0, 0 );
    
    // And try again
    setTimeout( "redswooshRunningCheckLooper( )", 1000 );
    
    // Give up after 30 seconds
    g_startingTimer++;
    if( g_startingTimer > 30 ) document.location = "NotRunning.html"
}

function onRedSwooshInitializeCheck( success, ignore )
{
    // On to the controlpanel page if success
    if( success ) document.location = "ControlPanel.html";     
}

// Called from the main HTML page.
function redswooshManageDownloads( )
{
    redswooshInitialize( onRedSwooshInitializeFirstTest, 0, 0 );
}

function onRedSwooshInitializeFirstTest( success, ignore )
{
    // Show the content if success, else prompt to install
    if( success )
    {
        // Render the page and start the timer to render it again.
        resetTimer( );
    }
    else
    {
        // Red Swoosh isn't running/installed -- redirect to not running page.
        document.location = "NotRunning.html";     
    }
}

// This function, called once, will call render the page and cause another call to itself in 5 seconds.
function resetTimer( )
{
    // Initialize Red Swoosh as cid 0 to get the list of cid's that are to be displayed.
    // (Have to re-initialize Red Swoosh every refresh, as new cid's may have been added.)
    refreshPage( );

    // Call ourselves again after 5 seconds to do the same again.
    setTimeout( "resetTimer( )", 5000 );
}

function refreshPage( )
{
    // If we attempt ot refresh the page while the page is still being rendered, it's bad news,
    // so make sure we haven't refreshed within two seconds ago.
    // Yes, there is a race condition here from the 'test then set', but it very rarely happens.
    nowTime = new Date().getTime();
    if( nowTime < g_lastRefreshTime + 2000 )
        return;     // Don't refresh
    g_lastRefreshTime = new Date().getTime();
    redswooshInitialize( onRedSwooshInitializeCID0, 0, 0 );
}

function onRedSwooshInitializeCID0( success, ignore )
{
    if( success ) redswooshUpdateAttributes( onUpdateAttributesCID0, 0 );
    else          redswooshInitialize( onRedSwooshInitializeFirstTest, 0, 0 );
}

function onUpdateAttributesCID0( success, handle )
{
    if( success ) renderAll( );
}

// Function renderAll( cidList): Re-renders the control panel page by logging in as every CID returned and displaying that cid's details.
function renderAll( )
{
    // Change online status, depending on if we are online or not.
    var message = "";
    if( !rs_attributes['rs_isOnline'] && rs_attributes['rs_goonline'] )
        message = "<font color=green>Going online...</font>";
    var onlineTarget = document.getElementById( "RS_ONLINE_INDICATOR" );
    if( rs_attributes['rs_isOnline'] )
    {
        // Show online
        onlineTarget.className = "online"; 
        onlineTarget.innerHTML = "<table border=0><tr><td><a text=\"offline\" href='javascript:goOffline();'><img src=\"images/grid/icon_online.gif\" width=48 height=48></a></td><td><a text=\"heyy\" href='javascript:goOffline();'> <font color=green>You are <strong>online</strong></font></a></td><td>&nbsp;&nbsp;&nbsp;&nbsp;" + message + "</td></tr></table>";
    }
    else
    {
        // Work out the correct function to use
        var correctFunction;
        if( rs_attributes['rs_goonline'] )
            correctFunction = "goOffline";
        else
            correctFunction = "goOnline";
        onlineTarget.className = "offline"; // Makes it (red).
        onlineTarget.innerHTML = "<table border=0><tr><td><a href='javascript:" + correctFunction + "();'><img src=\"images/grid/icon_offline.gif\" width=48 height=48></a></td><td><a href='javascript:" + correctFunction + "();'><font color=#aa1111> You are <strong>offline</strong></font></a></td><td>&nbsp;&nbsp;&nbsp;&nbsp;" + message + "</td></tr></table>";
    }

    // Generate the page HTML by logging in as each cid and appending that cid's details to g_pageHTML
    g_pageHTML = "";

    // Initialize the cidList variables
    g_cidList = rs_attributes['rs_cidlist'];
    
    g_cidListIndex = 0;
    g_diskSpace = 0;

    if( g_cidList && g_cidList.length > 0 )
    {
        redswooshInitialize( onRedSwooshInitialize, 0, Number(g_cidList[g_cidListIndex++]) );
    }
    else
    {
        // Render 'no websites are registered' page.
        g_pageHTML += "<center><b>(No websites are registered with Red Swoosh.)</b></center>";
        var target = document.getElementById( "RS_WEBSITE_CONTENT" );
        if (target) target.innerHTML = g_pageHTML;
        
        // Update the download rate meter.
        var downloadRateTarget = document.getElementById( "RS_DOWNLOAD_RATE" );
        out = "<br><br><p align=center>"
        out += "Download speed:<br>"
        out += "<b>"; 
        out += formatSize( 0 ) + " per second";
        out += "</b></p>";
        downloadRateTarget.innerHTML = out;

        // Update the share rate meter.
        var shareRateTarget = document.getElementById( "RS_SHARE_RATE" );
        out = "<br><br><p align=center>"
        out += "Share speed:<br>"
        out += "<b>"; 
        out += formatSize( 0 ) + " per second";
        out += "</b></p>";
        shareRateTarget.innerHTML = out;

        // Update the disk space usage meter.
        var diskSpaceTarget = document.getElementById( "RS_DISK_SPACE" );
        out = "<br><br><p align=center>"
        out += "Disk space used:<br>"
        out += "<b>"; 
        out += formatSize(g_diskSpace);
        out += "</b></p>";
        diskSpaceTarget.innerHTML = out;
        
        g_lastRefreshTime = 0;
    }
}

function onRedSwooshInitialize( success, handle )
{
	// Go, render.
    if (success) redswooshUpdateAttributes(onRedSwooshUpdateAttributes2, 0);
}


function onRedSwooshUpdateAttributes2( success, handle )
{
    // If it worked
    if( success )
    {
		// Count disk space used
		var g_entryList = getFileDetails();
		var diskSpaceUsed = 0;
		var anyDownloadGoing = false;
		var anyPaused = false;
		for( url in g_entryList )
		{
			// Add this download if not no size.
			var size = rs_fileAttributes[url]['rs_size'];
			if( size ) diskSpaceUsed += size;
			
			// Have we got a download downloading?
			if( rs_fileAttributes[url]['rs_status'] == "SEARCHING" || rs_fileAttributes[url]['rs_status'] == "DOWNLOADING" ) anyDownloadGoing = true;

			// Have we got a download paused / waiting?
			if( rs_fileAttributes[url]['rs_status'] == "PAUSED" || rs_fileAttributes[url]['rs_status'] == "WAITING" ) anyPaused = true;
		}
			
		// And add to total over all websites disk space used
		if( diskSpaceUsed ) g_diskSpace += diskSpaceUsed;
			
		// Get our customer name and URL as best we can.
		var customerName, customerURL;
		if( rsInternal_customerID == 1 )                     { customerName = "Swooshed links";                  customerURL = "http://www.redswoosh.net/"; subscribeCode = ""; removeCode = "Delete these files"; }
		else if( rsInternal_customerID == 2 )                { customerName = "Torrents";                        customerURL = "";                          subscribeCode = ""; removeCode = "Delete all"; }
		else                                                 { customerName = rs_attributes['rs_customername'];  customerURL  = rs_attributes['rs_customerurl'];                removeCode = "Delete this website's files"; }
		if( !customerName ) customerName = "Website <b>" + rsInternal_customerID + "</b>";
		if( !customerURL )  customerURL = "";
		
		// Choose icon
		if( rsInternal_customerID == 1 )                     icon = "rs_icon.gif";
		else												 icon = "icon.gif";

		// Should we show subscribe or unsubscribe?
		if( rsInternal_customerID == 1 )                     subscribeCode = "";
		else if( rs_attributes['rs_predeliveriesenabled'] )  subscribeCode = "<a href='javascript:unsubscribe( " + rsInternal_customerID + " );'><font size=2 color=blue>Unsubscribe from predeliveries</font></a></td><td width=19><a href='javascript:unsubscribe( " + rsInternal_customerID + " );'><img src=images/grid/icon_pause_on.gif  width=19 height=19></a>";
		else                                                 subscribeCode = "<a href='javascript:subscribe( "   + rsInternal_customerID + " );'><font size=2 color=blue>Subscribe to predeliveries    </font></a></td><td width=19><a href='javascript:subscribe( "   + rsInternal_customerID + " );'><img src=images/grid/icon_resume_on.gif width=19 height=19></a>";
		
		// Should we show / hide pause all / resume all ?
		if( anyDownloadGoing )                          	 pauseAllCode  = "<a href='javascript:pauseAll( "    + rsInternal_customerID + " );'><font size=2 color=blue>Pause downloads</font></a></td><td><a href='javascript:pauseAll( "   + rsInternal_customerID + " );'><img src=images/grid/icon_pause_on.gif  width=19 height=19></a>";
		else if( anyPaused ) 							     pauseAllCode  = "<a href='javascript:resumeAll( "   + rsInternal_customerID + " );'><font size=2 color=blue>Resume downloads</font></a></td><td><a href='javascript:resumeAll( " + rsInternal_customerID + " );'><img src=images/grid/icon_resume_on.gif width=19 height=19></a>";
		else	 											 pauseAllCode  = "</td><td>"; // Hide

		// Should we show / hide details?
		if( !rs_attributes['rs_detailsviewenabled'] )        detailsCode   = ""; // Hide
		else if( !g_showDetails[ rsInternal_customerID ] )  { detailsCode   = "<a href='javascript:showDetails( " + rsInternal_customerID + ", true )'><font size=2 color=blue>Hide files</font></a>"; detailsImage = "<a href='javascript:showDetails( " + rsInternal_customerID + ", true)'><img src=images/grid/icon_stream_on_backwards.gif width=19 height=19></a>"; }
		else                                               { detailsCode   = "<a href='javascript:showDetails( " + rsInternal_customerID + ", false)'><font size=2 color=blue>Show files</font></a>";   detailsImage = "<a href='javascript:showDetails( " + rsInternal_customerID + ", false )'><img src=images/grid/icon_stream_on.gif width=19 height=19></a>"; }

		// Output the header of the files table
        if( customerURL == "" ) { nameCode = customerName; iconCode = ""; }
        else                    { nameCode = "<a target=_new href=\"" + customerURL + "\"><font color=blue>" + customerName + "</font></a>"; ; iconCode = "<a target=_new href=\"" + customerURL + "\">"; }
		g_pageHTML += "<div id=\"content\"><div class=\"box-2\"><div class=\"box-c1\"><div class=\"box-c2\"><div class=\"box-c3\"><div class=\"box-body\">";
		g_pageHTML += "<div class=\"header-box\"><h2><table cellpadding=0 cellspacing=0 width=100% border=0 background=0>";
		g_pageHTML += "<tr><td width=40 valign=top align=right>" + iconCode + "<img src='images/" + icon + "' width='32' height='32'></a><br></td><td valign=top><font size=4>" + nameCode + "</font><br><font size=2>Using " + formatSize( diskSpaceUsed ) + " of disk space</font>"
		g_pageHTML += "</td><td align=right valign=middle width=40% rowspan=2>";
		g_pageHTML += "<table cellpadding=0 cellspacing=0 width=100% border=0 background=0>";
		g_pageHTML += "<tr><td align=right valign=middle><a href='javascript:uninstall( " + rsInternal_customerID + " );'><font size=2 color=blue>" + removeCode + "</font></a></td><td width=19><a href='javascript:uninstall( " + rsInternal_customerID + " );'><font size=2 color=blue><img src=images/grid/icon_delete_on.gif width=19 height=19></font></a></td></tr>"
		g_pageHTML += "<tr><td align=right valign=middle>" + subscribeCode + "</td></tr>";
		g_pageHTML += "<tr><td align=right valign=middle>" + pauseAllCode  + "</td></tr>";
		g_pageHTML += "</table></td></tr>";
		g_pageHTML += "<tr><td align=right>" + detailsImage + "</td><td>" +  detailsCode + "</td></tr>";
		g_pageHTML += "</table></h2></div>"

		if( !g_showDetails[ rsInternal_customerID ] )
		{
					// Show each file details
					g_pageHTML += "<table class=\"table\" border='0' cellspacing='0' cellpadding='0' summary='Current downloads'> \
								 <col class='session' /> \
								 <col class='session' /> \
								 <col class='session' /> \
								 <col class='session' /> \
								 <col class='session' width=40%/> \
								 <tr> \
								   <th class=\"td\" scope='col' width=30%>Controls</th> \
								   <th class=\"td\" scope='col'>Name</th> \
								   <th class=\"td\" scope='col'>Status</th> \
								   <th class=\"td\" scope='col'>Size</th> \
								   <th class=\"td\" scope='col' width=40%>URL</th> \
								 </tr>";
															
			// Output the rows
			var count = 0;
			for( url in g_entryList )
			{
				var entry = g_entryList[url];
				if( !entry.name ) entry.name = "(Unknown)";
				g_pageHTML += "<tr>";
				g_pageHTML += "<td class=\"td\">" + entry.commands2 + "</td>";
				g_pageHTML += "<td class=\"td\">" + shortenURL( entry.name, 20 ) + "</td>";
				g_pageHTML += "<td class=\"td\">" + entry.commands + "</td>";
				g_pageHTML += "<td class=\"td\">" + entry.size + "</td>";
				g_pageHTML += "<td class=\"td\" width=40%>" + shortenURL( url, 30 ) + "</td>";
				g_pageHTML += "</tr>";
				var size = rs_fileAttributes[url]['rs_size'];
				count++;
			}

			// Output a message if no content was displayed
			if( !count )
			{
				// No content 
				g_pageHTML += "<tr valign='middle'><td colspan='5' style='text-align:center;'>";
				g_pageHTML += "<br>(No content available)<br><br>";
				g_pageHTML += "</td></tr>";      
			}
		}
		g_pageHTML += "</table></div></div></div></div></div></div></div><br>";
	}
	else
	{
		// Error
		g_pageHTML += "<br><br><center>(Failed to read website details.)</center><br><br>";
	}

    // Another customer?
    if( g_cidList && g_cidListIndex < g_cidList.length )
    {
        // Add the next customer's details to pageHTML.
        redswooshInitialize( onRedSwooshInitialize, 0, Number(g_cidList[g_cidListIndex++]) );
    }
    else
    {
        // Render the page. NOTE: We must do this here rather than in renderAll() because the RS calls are asynchronous!
        var target = document.getElementById( "RS_WEBSITE_CONTENT" );
        if (target) target.innerHTML = g_pageHTML;
        g_lastRefreshTime = 0;

        // Update the download rate meter.
        var downloadRateTarget = document.getElementById( "RS_DOWNLOAD_RATE" );
        out = "<br><br><p align=center>"
        out += "Download speed:<br>"
        out += "<b>"; 
        out += formatSize( rs_attributes['rs_downloadrate'] ) + " per second";
        out += "</b></p>";
        downloadRateTarget.innerHTML = out;

        // Update the share rate meter.
        var shareRateTarget = document.getElementById( "RS_SHARE_RATE" );
        out = "<br><br><p align=center>"
        out += "Share speed:<br>"
        out += "<b>"; 
        out += formatSize( rs_attributes['rs_sharerate'] ) + " per second";
        out += "</b></p>";
        shareRateTarget.innerHTML = out;

        // Update the disk space usage meter.
        var diskSpaceTarget = document.getElementById( "RS_DISK_SPACE" );
        out = "<br><br><p align=center>"
        out += "Disk space used:<br>"
        out += "<b>"; 
        out += formatSize(g_diskSpace);
        out += "</b></p>";
        diskSpaceTarget.innerHTML = out;
    }
}

function getFileDetails()
{
    // Generate the HTML that allows the user to play/pause/resume etc. each file.
    var g_entryList = new Object();
    var now = new Date( );
    var totalSize = 0;
    for( url in rs_fileAttributes )
    {
        // Create a new entry in entry list.
        g_entryList[url] = new Object;

        // Just copy over the fields that need no modification / processing.
        g_entryList[url].name   = rs_fileAttributes[url].rs_name;
        g_entryList[url].path   = rs_fileAttributes[url].rs_path;
        g_entryList[url].status = rs_fileAttributes[url].rs_status;
        g_entryList[url].hash = rs_fileAttributes[url].rs_hash;

        // Add to the sum of total size used by Red Swoosh.
        var size = rs_fileAttributes[url].rs_size;
        totalSize += size;

        // Pretty print the size.
        if( size > 0 )        g_entryList[url].size = formatSize(size);
        else                  g_entryList[url].size = "&nbsp;";

        // Calculate percentage done.
        if( rs_fileAttributes[url].rs_size           && 
            rs_fileAttributes[url].rs_size      != 0 && 
            rs_fileAttributes[url].rs_totalrecv      && 
            rs_fileAttributes[url].rs_totalrecv != 0) g_entryList[url].percent = Math.ceil( 100 * rs_fileAttributes[url].rs_totalrecv / rs_fileAttributes[url].rs_size );
        else                                          g_entryList[url].percent = 0;
        if( g_entryList[url].percent > 100 )          g_entryList[url].percent = 100;

        // Generate PAUSING pseudo-state
        if( rs_fileAttributes[url].rs_status == "DOWNLOADING" && g_entryList[url].pausing ) g_entryList[url].status = "PAUSING";
        else                                                                                g_entryList[url].pausing = false;

        // Different commands if online or offline
        g_entryList[url].commands = "";
        g_entryList[url].commands2 = "";
        if( rs_attributes['rs_isOnline'] )
        {
            // Choose an online command set
            switch( g_entryList[url].status )
            {
            default :
                // File is not known
                g_entryList[url].commands += "Ready to download";
                g_entryList[url].commands2 += "<a href='javascript:fileDownload(" + rsInternal_customerID + ", \"" + url + "\" );'><img src='images/grid/icon_play.gif'/> Download </a>";
                break;      

            case "INSUFFICIENTDISKSPACE" :
                // Insufficient disk space
                g_entryList[url].commands += "Not enough disk space";
                g_entryList[url].commands2 += "<a href='javascript:fileDownload(" + rsInternal_customerID + ", \"" + url + "\" );'><img src='images/grid/icon_play.gif'/> Download </a>";
                g_entryList[url].commands2 += " <br><a href='javascript:fileDelete(" + rsInternal_customerID + ", \"" + url + "\" );'><img src='images/grid/icon_delete.gif'/> Cancel </a>";
                break;      
                 
            case "DOWNLOADING" :
                // Downloading
                g_entryList[url].commands += "Downloading (" + g_entryList[url].percent + "%)";
                g_entryList[url].commands2 += " <a href='javascript:filePause(" + rsInternal_customerID + ", \"" + url + "\" );'><img src='images/grid/icon_pause.gif'/> Pause </a>";
                break;          

            case "PAUSED" :
                // Paused
                g_entryList[url].commands += "Paused (" + g_entryList[url].percent + "%)";
                g_entryList[url].commands2 += " <a href='javascript:fileDownload(" + rsInternal_customerID + ", \"" + url + "\" );'><img src='images/grid/icon_resume.gif'/> Resume</a>";
                g_entryList[url].commands2 += " <br><a href='javascript:fileDelete(" + rsInternal_customerID + ", \"" + url + "\" );'><img src='images/grid/icon_delete.gif'/> Cancel </a>";
                break;          
                
            case "COMPLETE" :
                // File has been downloaded; suppress streaming option
                var localURL = rs_fileAttributes[url].rs_localURL;
                var cid = rs_fileAttributes[url].rs_cid;
                if( !localURL ) localURL = "http://127.0.0.1:9421/@c=" + cid + "@/" + url;
                g_entryList[url].commands += "Done";
                g_entryList[url].commands2 += "<a href='javascript:playURL( \"" + localURL + "\", true );'><img src='images/grid/icon_play.gif'/> Play</a>";
                g_entryList[url].commands2 += " <br><a href='javascript:fileDelete(" + rsInternal_customerID + ", \"" + url + "\" );'><img src='images/grid/icon_delete.gif'/> Delete</a>";
                break;
              
            case "SEARCHING" :
                // Download is starting
                g_entryList[url].commands += "Searching...";
                g_entryList[url].commands2 += " <a href='javascript:fileDelete(" + rsInternal_customerID + ", \"" + url + "\" );'><img src='images/grid/icon_delete.gif'/> Cancel</a>";
                break;
              
            case "PAUSING" :
                // Pause has been requested
                g_entryList[url].commands += "Pausing...";
                g_entryList[url].commands2 += " <a href='javascript:fileDelete(" + rsInternal_customerID + ", \"" + url + "\" );'><img src='images/grid/icon_delete.gif'/> Cancel</a>";
                break;
            }
        }
        else
        {
            // Choose an offline command set
            switch( g_entryList[url].status )
            {
            default :
                // File is not known
                g_entryList[url].commands += "Offline";
                g_entryList[url].commands2 += "&nbsp;&nbsp;Offline";
                break;      
                    
            case "DOWNLOADING" :
            case "PAUSED" :
            case "SEARCHING" :
            case "PAUSING" :
                // Paused
                g_entryList[url].commands += "Paused (" + g_entryList[url].percent + "%)";
                g_entryList[url].commands2 += " <a href='javascript:fileDelete(" + rsInternal_customerID + ", \"" + url + "\" );'><img src='images/grid/icon_delete.gif'/> Cancel</a>";
                break;          
                  
            case "COMPLETE" :
                // File has been downloaded; suppress streaming option
                var localURL = rs_fileAttributes[url].rs_localURL;
                var cid = rs_fileAttributes[url].rs_cid;
                if( !localURL ) localURL = "http://127.0.0.1:9421/@c=" + cid + "@/" + url;
                g_entryList[url].commands += "Done";
                g_entryList[url].commands2 += "<a href='javascript:playURL( \"" + localURL + "\", true );'><img src='images/grid/icon_play.gif'/> Play</a>";
                g_entryList[url].commands2 += " <br><a href='javascript:fileDelete(" + rsInternal_customerID + ", \"" + url + "\" );'><img src='images/grid/icon_delete.gif'/> Delete</a>";
                break;
            }
        }
    }
    return g_entryList;
}

function formatSize( size )
{
    // Pretty print the size.
    var formatted;
    if (size < 1024)                        formatted = size + " bytes";
    else if (size/1024 < 1024)              formatted = round(size/1024) + " kilobytes";
    else if (size/1024/1024 < 1024)         formatted = round(size/1024/1024) + " megabytes";
    else if (size/1024/1024/1024 < 1024)    formatted = round(size/1024/1024/1024) + " gigabytes";
    else                                    formatted = "&nbsp;";
    return formatted;
}

function round( number )
{
    // Check if browser supports rounding. If not, fail gracefully rather than breaking the whole page.
    if ((1).toFixed(2))
    {
        return number.toFixed(2);
    }
    else // Browser does not support number rounding. (IE 5 doesn't, IE 5.5 does.)
    {
        return number;
    }
}


// The following functions respond to button clicks from the user.
function goOnline()
{
    redswooshSetAttribute( onCommand, 0, 'rs_goonline', 'true' );
    refreshSoon( 1500 );
}

function goOffline()
{
    redswooshSetAttribute( onCommand, 0, 'rs_goonline', 'false' );
    refreshSoon( 300 );
}

function unsubscribe( cid )
{
    // Must call executeJSIOCall function directly to specify the cid, as g_internalCustomerID could be set when refreshing the page
    rsInternal_executeJSIOCall( cid, "SetAttribute", onCommand, 0, 'rs_predeliveriesenabled', 'false' );
}

function subscribe( cid )
{
    // Must call executeJSIOCall function directly to specify the cid, as g_internalCustomerID could be set when refreshing the page
    rsInternal_executeJSIOCall( cid, "SetAttribute", onCommand, 0, 'rs_predeliveriesenabled', 'true' );
}

function uninstall( cid )
{
    if( confirm( "Are you sure you want to delete all downloads for this website?" ) ) 
        rsInternal_executeJSIOCall( cid, "Uninstall", onCommand, 0 );
}

function fileDownload( cid, url )
{
    // Must call executeJSIOCall function directly to specify the cid, as g_internalCustomerID could be set when refreshing the page
    rsInternal_executeJSIOCall( Number( cid ), "DownloadFile", onCommand, 0, url );
}

function filePause( cid, url )
{
    // Must call executeJSIOCall function directly to specify the cid, as g_internalCustomerID could be set when refreshing the page
    rsInternal_executeJSIOCall( Number( cid ), "PauseFile", onCommand, 0, url );
}

function fileDelete( cid, url )
{
    // Must call executeJSIOCall function directly to specify the cid, as g_internalCustomerID could be set when refreshing the page
    rsInternal_executeJSIOCall( Number( cid ), "DeleteFile", onCommand, 0, url );
}

function onCommand( success, handle )
{
    // Refresh the page
    refreshPage( );
}

function refreshSoon( time )
{
    // Refresh the page in a second
     setTimeout( "refreshPage( )", time );
}

function showDetails( cid, trueorfalse )
{
	// Show them details
	g_showDetails[ cid ] = trueorfalse;
	refreshPage( );
}

function pauseAll( cid )
{
   // Must call executeJSIOCall function directly to specify the cid, as g_internalCustomerID could be set when refreshing the page
    rsInternal_executeJSIOCall( Number( cid ), "UpdateAttributes", onPauseAllCommand, cid );
}

function onPauseAllCommand( success, cid )
{
	// Pause all
    for( url in rs_fileAttributes )		rsInternal_executeJSIOCall( Number( cid ), "PauseFile", onCommandNull, 0, url );

	// Refresh the page
    refreshPage( );
}

function resumeAll( cid )
{
   // Must call executeJSIOCall function directly to specify the cid, as g_internalCustomerID could be set when refreshing the page
    rsInternal_executeJSIOCall( Number( cid ), "UpdateAttributes", onResumeAllCommand, cid );
}

function onResumeAllCommand( success, cid )
{
	// Resume all
    for( url in rs_fileAttributes )		rsInternal_executeJSIOCall( Number( cid ), "DownloadFile", onCommandNull, 0, url );

	// Refresh the page
    refreshPage( );
}

function onCommandNull( success, handle )
{
	// Do nothing.
}

var g_playingURL = null;
function playURL( url )
{
	// If not a WMV, have to open new window to play rather than doing document.location, because quicktime might be associated for the filetype, and we need to do that for quicktime
 	if( url.indexOf( ".wmv" ) != -1 ) 	document.location = url;  
	else			  					window.open( url, "openmypage", "width=300,height=300,location=0,menubar=0,resizable=1,scrollbars=1,status=0,titlebar=0,toolbar=0,screenX=400,left=300,screenY=300,top=100");
}

function shortenURL( url, maxlength )
{
	// The string added to or in the middle of the link text after shortening
	var breaker =' ';

    // Check if the URL starts with http: and that it is longer than the allowed length
    if( url.length > maxlength )
    {
        // Get the text of the URL, shorten accordingly and add the separator string
        url = url.substr( 0, maxlength ) + breaker + shortenURL( url.substr( maxlength, url.length ), maxlength );
    }
    
    // Return URL
    return url;
}
