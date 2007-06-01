// Red Swoosh API: jsapi.js
// Updated: 2006/11/29
// Copyright 2006, Red Swoosh (http://www.redswoosh.net)
//  Version 2.005

/////////////////////////////////////////////////////////////////////////////
/////////////////////////// RSAPI External Functions /////////////////////////
/////////////////////////////////////////////////////////////////////////////
// Global variables
var rs_attributes     = new Object;
var rs_fileAttributes = new Object;

// Initialize the RSAPI with a given customer ID
function redswooshInitialize( callback, handle, customerID )
{
rsInternal_assertTypeof( "customerID", customerID, "number" );
    // Record the new customerID and initialize
    rsInternal_customerID = customerID;
    rsInternal_executeJSIOCall( rsInternal_customerID, "initialize", callback, handle );
}

// Get a list of files stored on the client
// **NOTE: This function is deprecated; do not use
function redswooshQueueGetFiles( callback, handle, constrainValue )
{
    rsInternal_executeJSIOCall( rsInternal_customerID, "queueGetFiles", callback, handle, constrainValue );
}

// Get the information for a single file on the clieint
// **NOTE: This function is deprecated; do not use
function redswooshQueueGetOneFile( callback, handle, url, constrainValue )
{
    rsInternal_executeJSIOCall( rsInternal_customerID, "queueGetOneFile", callback, handle, url, constrainValue );
}

// Add a CUID to the client for the current initialized customerID
function redswooshAddCuidMapping( callback, handle, customerUserId )
{
    rsInternal_executeJSIOCall( rsInternal_customerID, "addCuidMapping", callback, handle, customerUserId );
}

// Updates 'rs_fileAttributes' and 'rs_attributes'
function redswooshUpdateAttributes( callback, handle )
{
    rsInternal_executeJSIOCall( rsInternal_customerID, "UpdateAttributes", callback, handle );
}

// Pauses the download of a URL
function redswooshPauseFile( callback, handle, url )
{
    rsInternal_executeJSIOCall( rsInternal_customerID, "PauseFile", callback, handle, url );
}

// Resumes or begins downloading a URL
function redswooshDownloadFile( callback, handle, url )
{
    rsInternal_executeJSIOCall( rsInternal_customerID, "DownloadFile", callback, handle, url );
}

// Launches the player for a file to play it
function redswooshPlayFile( callback, handle, url )
{
    rsInternal_executeJSIOCall( rsInternal_customerID, "PlayFile", callback, handle, url );
}

// Pops move dialog so user can move the file
function redswooshMoveFile( callback, handle, url )
{
    rsInternal_executeJSIOCall( rsInternal_customerID, "MoveFile", callback, handle, url );
}

// Pauses and deletes a file
function redswooshDeleteFile( callback, handle, url )
{
    rsInternal_executeJSIOCall( rsInternal_customerID, "DeleteFile", callback, handle, url );
}

// Sets a new 'rs_attribute'
function redswooshSetAttribute( callback, handle, name, value )
{
    rsInternal_executeJSIOCall( rsInternal_customerID, "SetAttribute", callback, handle, name, value );
}

// Sets a new 'rs_fileAttribute'
function redswooshSetFileAttribute( callback, handle, url, name, value )
{
    rsInternal_executeJSIOCall( rsInternal_customerID, "SetFileAttribute", callback, handle, url, name, value );
}

// Subscribes to a RSS 2.0 feed.
function redswooshSubscribeToFeed( callback, handle, url )
{
    rsInternal_executeJSIOCall( rsInternal_customerID, "SubscribeToFeed", callback, handle, url );
}

// Unubscribes from a RSS feed.
function redswooshUnsubscribeFromFeed( callback, handle, url )
{
    rsInternal_executeJSIOCall( rsInternal_customerID, "UnsubscribeFromFeed", callback, handle, url );
}

/////////////////////////////////////////////////////////////////////////////
///////////////////////// RSAPI Internal Functions ///////////////////////////
/////////////////////////////////////////////////////////////////////////////

// Internal global variables
var rsInternal_customerID        = -1;
var rsInternal_functionCallSet   = new Array( );
var rsInternal_functionCallCount = 0;
var rsInternal_clientVersion     = 2000000;
var rsInternal_jsapiVersion      = 2005;

// Prepare to hear back from from the client
var rsClient_version        = 0;
var rsClient_attributes     = 0;
var rsClient_fileAttributes = 0;

// Clone an object to help avoid closure leak problems
function rsInternal_copy( obj )
{
    // Only copy 'objects'
	if(obj == null || typeof(obj) != 'object') return obj;

    // If an array, declare as array, else object
    if( obj.length ) var objCopy = new Array( ); // **NOTE: This must be 'var' else it screws up
    else             var objCopy = new Object;   // **NOTE: This must be 'var' else it screws up
    
    // Walk across all properties and copy
    for( prop in obj ) objCopy[prop] = rsInternal_copy( obj[prop] );
	return objCopy;
}


// Clean up an old script
function rsInternal_cleanupRequest( url )
{
    // Delete the script with this URL, as it's no longer needed
    headElement = document.getElementsByTagName( 'head' )[0];
    if( !headElement ) return;
    scriptElement = headElement.getElementsByTagName( 'script' );
    if( !scriptElement ) return;
    for( i = 0; i < scriptElement.length; i++ )
        if( scriptElement[i].src == url )
        {
            // Found it -- clean and return
            headElement.removeChild( scriptElement[i] );
            return;
        }
}

// Actual callback invoked by JSIO
function rsInternal_callbackWrapper( success, functionCallIndex )
{
    // Look across the set of outstanding function calls and see if this
    // one has already been responded to.  If we can't find a corresponding
    // function call, it means we've already responded to this once and we
    // should ignore this secondary attempt to call.
    for( c=0; c<rsInternal_functionCallSet.length; c++ )
    {
        // Check this function call to see if it corresponds to the one we want
        functionCall = rsInternal_functionCallSet[c];
        if( functionCall != 0 && functionCall.index == functionCallIndex )
        {
            // Done with this function call; clear the slot for reuse, as well as to indicate we've responded            
            rsInternal_functionCallSet[c] = 0;
            
            // Incorporate any updates the client has given us (explicit nullify in case JavaScript GC sucks)
            if( rsClient_version != 0 )
            {
                // Update the version and delete
                rsInternal_clientVersion = rsClient_version;
                rsClient_version = 0;
            }
            if( rsClient_attributes != 0 )
            {
                // Update the attributes and delete
                rs_attributes = rsInternal_copy( rsClient_attributes );
                rsClient_attributes = 0;
            }
            if( rsClient_fileAttributes != 0 )
            {
                // Update the attributes and delete
                rs_fileAttributes = rsInternal_copy( rsClient_fileAttributes );
                rsClient_fileAttributes = 0;
            }
        
            // We've found the function call -- this means the call hasn't been
            // responded to yet.  Respond now.
            switch( arguments.length )
            {
                case 2 : functionCall.callback( success, functionCall.handle ); break;
                case 3 : functionCall.callback( success, functionCall.handle, arguments[2] ); break;
                case 4 : functionCall.callback( success, functionCall.handle, arguments[2], arguments[3] ); break;
                case 5 : functionCall.callback( success, functionCall.handle, arguments[2], arguments[3], arguments[4] ); break;
                default : alert( "Error: Received callback with too many arguments (" + arguments.length + ")" ); break;
            }
            
            // Now nullify this function call explicitly, just in jase JavaScript sucks
            delete functionCall;
            break;
        }
    }
}

// Exit point through which all JSIO calls are made
function rsInternal_executeJSIOCall( customerID, jsioName, callback, handle )
{
rsInternal_assertTypeof( "jsioName", jsioName, "string" );
rsInternal_assertTypeof( "callback", callback, "function" );
    // First, create a record for this function call
    functionCallIndex = rsInternal_functionCallCount++;
    functionCall = new Object( );
    functionCall.index     = functionCallIndex;
    functionCall.jsioName  = jsioName;
    functionCall.callback  = callback;
    functionCall.handle    = handle;
    
    // Next, insert into the set in the first empty slot
    inserted = false;
    for( c=0; c<rsInternal_functionCallSet.length; c++ )
        if( rsInternal_functionCallSet[c] == 0 )
        {
            // Add now
            rsInternal_functionCallSet[c] = functionCall;
            inserted = true;
            break;
        }
    
    // If no empty slots, add one more
    if( !inserted ) rsInternal_functionCallSet.push( functionCall );

    // now convert function call into URL
    jsioURL = "http://127.0.0.1:9421/jsio?";
    jsioURL = jsioURL +  "r=" +  Math.random( );               // To avoid cache
    jsioURL = jsioURL + "&f=" +  jsioName;                     // JSIO function name
    jsioURL = jsioURL + "&i=" +  customerID;                   // customer ID
    jsioURL = jsioURL + "&c=" + "rsInternal_callbackWrapper";  // callback function name
    jsioURL = jsioURL + "&h=" +  functionCallIndex;            // callback handle information
    if( rsInternal_clientVersion >= 2059000 )
    {
        // Starting with at least 2.059 we can send additional parameters
        jsioURL = jsioURL + "&v=" +  rsInternal_jsapiVersion;  // JSAPI.js version
    }
    for( c=4; c<arguments.length; ++c )
    {
      // Starting with 2.104 we encode arguments.
      var arg = arguments[c];
      if( rsInternal_clientVersion >= 2104000 )
      {
        // Escape special chars ( lowercase hex digits), and %'s from the part of the URL after escaped(http://)
        arg = escape( arg );
        arg = encodeLowerCase( arg );
        arg = arg.substr( 0, 9 ) + arg.substr( 9 ).replace(/%/g, '%25');
      }
      
      // Add the variable arguments
      jsioURL = jsioURL + "&a" + (c-4) + "=" + arg;
    }

    // Next, prepare a timeout that will call the callback with failure if no response is received
    timeout = 20000; // Wait up to 10000ms for function return
    onTimeout = "rsInternal_callbackWrapper( false, " + functionCallIndex + " );";
    setTimeout( onTimeout, timeout ); 

    // Load a script using the URL in order to invoke the JSIO call
    script = document.createElement( 'script' );
    script.src = jsioURL;
    h = document.getElementsByTagName( 'head' )[0];
    h.appendChild( script );
    
    // Finally, schedule this request for cleanup once completed, but only if client can handle it
    if( rsInternal_clientVersion >= 2059000 )
    {
        // Delete well after request timed out for safety
        onDelete = "rsInternal_cleanupRequest( '" + jsioURL + "' );"
        setTimeout( onDelete, timeout*2 );
    }
}

function encodeLowerCase(input)
{
    var output = input; 
    var results = null; 
    var regex = new RegExp("(%..)", "g");
    while(results = regex.exec(input)) output = output.replace(results[1], results[1].toLowerCase());
    return output;
}

// Helps verify input parameters are correct
function rsInternal_assertTypeof( obj, obj, type )
{
    // Verify the object is of the expected type
    if( typeof(obj) != type )
        alert( "Red Swoosh Error: Parameter '" + obj + "' supposed to be '" + type + "' but is actually '" + typeof(obj) + "'" );
}

