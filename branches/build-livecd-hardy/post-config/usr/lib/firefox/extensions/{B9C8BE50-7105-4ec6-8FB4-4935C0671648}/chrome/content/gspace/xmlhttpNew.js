var gs_xhttp = {
 //xmlhttp : null,
 handler : null,
 uri     : null,
 auxObj  : null,
 init    : function () {
  var xmlhttp;
  if (!xmlhttp && typeof XMLHttpRequest != 'undefined') {
   try {
    xmlhttp = new XMLHttpRequest();
   }   catch (e) {
    xmlhttp = false
   }
  }
  return xmlhttp;
 },

 doAsyncPost  : function (postData, getData, handler, uri) {
		try
		{
			var objResp = new gs_WebResponse(0, "");
			var aHandler = handler, aUri = uri;
			var xmlhttp = this.init();
			if (handler == null)
				aHandler = this.handler;
			if (uri == null)
				aUri = this.uri;


			if (xmlhttp == false)
				throw "Error initializing the object";

			xmlhttp.open("POST", aUri + "?" + getData, true);
			xmlhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			xmlhttp.onreadystatechange = function() {
							if (xmlhttp.readyState == 4){
								if (xmlhttp.status == 200)
								{
									if (aHandler != null)
									{
										objResp.auxObj = xmlhttp.responseText;
										aHandler(objResp);

									}
								}
								else
									throw "Error occurred while retrieving from the server!";
								}

						};
			xmlhttp.send(postData);
		}
		catch (ex)
		{
			console.debug("EXCEPCION EN EL SEND?");
			return new gs_WebResponse(1, ex);
		}
		delete xmlhttp;
		return objResp;
    },


    doAsyncGet  : function (getData, handler, uri)
    {
		try
		{
			var objResp = new gs_WebResponse(0, "");
			var aHandler = handler, aUri = uri;
			var xmlhttp = this.init();
			if (handler == null)
				aHandler = this.handler;
			if (uri == null)
				aUri = this.uri;

			if (xmlhttp == false)
				throw "Error initializing the object";

			if (getData != "")
			{
				aUri += "?" + getData;
			}

			xmlhttp.open("GET", aUri, true);
			xmlhttp.onreadystatechange = function() {
							if (xmlhttp.readyState == 4){
								if (xmlhttp.status == 200)
								{
									if (aHandler != null)
									{
										objResp.auxObj = xmlhttp.responseText;
										aHandler(objResp);
									}
								}
								else
									throw "Error occurred while retrieving from the server!";
							}
						};
			xmlhttp.send(null);
		}
		catch (ex)
		{
			return new gs_WebResponse(1, ex);
		}
		delete xmlhttp;
		return objResp;
    },

    doSyncGetText  : function (getData, uri)
    {
		try
		{
			var objResp = new gs_WebResponse(0, "");
			var aUri = uri, respText = null;
			var xmlhttp = this.init();
			//if (this.xmlhttp == null)
			//	this.xmlhttp = this.init();
			if (uri == null)
				aUri = this.uri;

			if (xmlhttp == false)
				throw "Error initializing the object";

			if (getData != "")
			{
				aUri += "?" + getData;
			}

			xmlhttp.open("GET", aUri, false);
			xmlhttp.send(null);

			if (xmlhttp.readyState == 4) {
				if (xmlhttp.status == 200)
				{
					objResp.auxObj = xmlhttp.responseText;
					objResp.headers = xmlhttp.getAllResponseHeaders();
				}
				else
				{
					throw xmlhttp.statusText + " " + aUri + " Error occurred while retrieving from the server!";
				}
			}
		}
		catch (ex)
		{

			gs_Dump("ERROR :: " + ex);
			return new gs_WebResponse(1, ex);
		}
		delete xmlhttp;
		return objResp;
    },

    doSyncGet  : function (getData, uri)
    {
		try
		{
			var objResp = new gs_WebResponse(0, "");
			var aUri = uri, respText = null;
			var xmlhttp = this.init();
			//if (this.xmlhttp == null)
			//	this.xmlhttp = this.init();
			if (uri == null)
				aUri = this.uri;

			if (xmlhttp == false)
				throw "Error initializing the object";

			if (getData != "")
			{
				aUri += "?" + getData;
			}

			xmlhttp.open("GET", aUri, false);
			xmlhttp.send(null);

			if (xmlhttp.readyState == 4){
				if (xmlhttp.status == 200)
				{
					objResp.auxObj = xmlhttp.responseText;
					objResp.headers = xmlhttp.getAllResponseHeaders();
				}
				else
				{
					throw xmlhttp.statusText + " " + aUri + " Error occurred while retrieving from the server!";
				}
			}
		}
		catch (ex)
		{

			if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") {
				gs_Dump("ERROR :: " + ex);
				alert(ex);
				}
			return new gs_WebResponse(1, ex);
		}
		delete xmlhttp;
		return objResp;
    },

    doSyncPost  : function (postData, getData, uri)
    {
		try
		{
			var objResp = new gs_WebResponse(0, "");
			var  aUri = uri, respText = null;
			var xmlhttp = this.init();
			//if (this.xmlhttp == null)
			//	this.xmlhttp = this.init();
			if (uri == null)
				aUri = this.uri;

			if (xmlhttp == false)
				throw "Error initializing the object";
			if (getData != "")
			{
				aUri += "?" + getData;
			}

			xmlhttp.open("POST", aUri, false);
			xmlhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			xmlhttp.setRequestHeader('Content-Length', postData.length);
			xmlhttp.send(postData);

			if (xmlhttp.readyState == 4){
				if (xmlhttp.status == 200)
				{
					objResp.headers = xmlhttp.getAllResponseHeaders();
					objResp.auxObj =  xmlhttp.responseText;
				}
				else
				{
					throw xmlhttp.statusText + " " + aUri + " Error occurred while retrieving from the server!";
				}
			}
		}
		catch (ex)
		{
			if(gs_gPrefHandler.getPref(gs_gPrefNames.prefDebug)=="yes") {
				gs_Dump("ERROR P:: " + ex);
				alert(ex);
				}
			return new gs_WebResponse(1, ex);
		}
		delete xmlhttp;
		return objResp;
    }
};


