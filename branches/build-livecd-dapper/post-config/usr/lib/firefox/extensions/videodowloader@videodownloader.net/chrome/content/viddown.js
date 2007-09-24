


function clickButton(e) {
		
    if (e.button == 0)
    {
    	var currentTime = new Date();
			var instante = currentTime.getTime();
			var dir = window.content.document.location.href;
			
			if (((instanteGlobal==0) || (instanteGlobal<(instante-10000))) && (dir.indexOf('javimoya.com/blog/youtube')==-1) && (dir.indexOf('videodownloader.net')==-1))
			{
				instanteGlobal=instante;
				var txt = "http://videodownloader.net/get/?url=" + escape(dir) + "&orig=ffp&ver=1";
				window.open(txt,'VD','fullscreen=no,toolbar=no,status=no,menubar=no,scrollbars=yes,resizable=yes,directories=no,location=no,width=800,height=400');				
			}
		}
		e.preventDefault();
	}

var instanteGlobal=0;