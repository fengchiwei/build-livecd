function gs_wc_clsWebControl (obj, startPoint, endPoint, type)
{
	this.obj = obj;
	this.startPoint = startPoint;
	this.endPoint = endPoint;
	
	this.callback = null;
	this.type = type;
}

gs_wc_clsWebControl.prototype = 
{
	animTimer : null,
	animDelay : 10,
	numTimes : 50,
	xChange : 0,
	yChange : 0,
	maxTimes : 20,
	startDim : null,
	endDim : null,
	
	setDim : function (startDim, endDim)
	{
		this.startDim = startDim;
		this.endDim = endDim;
	},
	
	magnify : function ()
	{
		var self = this;
		if (this.animTimer == null)
		{
			this.numTimes = this.maxTimes;
			this.wChange = (this.endDim.width - this.startDim.width) / this.numTimes;
			this.hChange = (this.endDim.height - this.startDim.height) / this.numTimes; 
			
			this.xChange = (this.endPoint.left - this.startPoint.left) / this.numTimes;
			this.yChange = (this.endPoint.top - this.startPoint.top) / this.numTimes; 
		}
		
		this.startDim.width += this.wChange;
		this.startDim.height += this.hChange;
		
		this.obj.style.width = this.startDim.width + "px";
		this.obj.style.height = this.startDim.height + "px";
				
		this.startPoint.left += this.xChange;
		this.startPoint.top += this.yChange;
		
		this.obj.style.left = this.startPoint.left + "px";
		this.obj.style.top = this.startPoint.top + "px";
		this.obj.style.position = "fixed";
		
		this.numTimes--;													
		if (this.numTimes < 5)
			this.animDelay += 10;
		this.animTimer = setTimeout(function () { self.magnify() }, this.animDelay);
		if (this.numTimes == 0)
		{
			this.reset(gspace_wc_EffectType.ANIMATE);
			this.obj.style.width = this.endDim.width;
			this.obj.style.height = this.endDim.height;		
			
			this.obj.style.left = this.endPoint.left;
			this.obj.style.top = this.endPoint.top;		
		}
	},
	
	expand : function ()
	{
		var self = this;
		if (this.animTimer == null)
		{
			this.numTimes = this.maxTimes;
			this.wChange = (this.endDim.width - this.startDim.width) / this.numTimes;
			this.hChange = (this.endDim.height - this.startDim.height) / this.numTimes; 
		}
		
		this.startDim.width += this.wChange;
		this.startDim.height += this.hChange;
		
		this.obj.style.width = this.startDim.width + "px";
		this.obj.style.height = this.startDim.height + "px";
		this.obj.style.position = "fixed";
		
		if (this.callback != null)
		{
			this.callback(this.endPoint.left, this.endPoint.top, this.startDim.width, this.startDim.height);
		}
		
		this.numTimes--;													
		if (this.numTimes < 5)
			this.animDelay += 10;
		this.animTimer = setTimeout(function () { self.expand() }, this.animDelay);
		if (this.numTimes == 0)
		{
			this.reset(gspace_wc_EffectType.ANIMATE);
			this.obj.style.width = this.endDim.width;
			this.obj.style.height = this.endDim.height;		
		}
	},
	
	fadeIn : function ()
	{
		var self = this;
		if (this.animTimer == null)
		{
			this.numTimes = this.maxTimes;
			this.opacityChange = (1 - 0.1)/ this.numTimes;
			this.obj.style.opacity = 0.0;
		}
		var opacity = this.obj.style.opacity;
		opacity = parseFloat(opacity) + this.opacityChange;
		this.obj.style.opacity = opacity;
		
		this.numTimes--;													
		if (this.numTimes < 5)
			this.animDelay += 10;
		this.animTimer = setTimeout(function () { self.fadeIn() }, this.animDelay);
		if (this.numTimes == 0)
		{
			this.reset(gspace_wc_EffectType.ANIMATE);
		}
	},
	animate : function (funcAfterAnimate)
	{
		var self = this;
		if (this.animTimer == null)
		{
			this.numTimes = this.maxTimes;
			this.xChange = (this.endPoint.left - this.startPoint.left) / this.numTimes;
			this.yChange = (this.endPoint.top - this.startPoint.top) / this.numTimes; 
		}
		
		this.startPoint.left += this.xChange;
		this.startPoint.top += this.yChange;
		
		this.obj.style.left = this.startPoint.left + "px";
		this.obj.style.top = this.startPoint.top + "px";
		this.obj.style.position = "fixed";
		
		this.numTimes--;													
		if (this.numTimes < 5)
			this.animDelay += 10;
		this.animTimer = setTimeout(function () { self.animate(funcAfterAnimate) }, this.animDelay);
		if (this.numTimes == 0)
		{
			this.reset(gspace_wc_EffectType.ANIMATE);
			this.obj.style.left = this.endPoint.left;
			this.obj.style.top = this.endPoint.top;		
			if (funcAfterAnimate != null && funcAfterAnimate != "")
			{
				setTimeout(funcAfterAnimate, 10);
			}
		}
	},
	
	drag : function ()
	{
	},
	
	reset : function (type)
	{
		switch (type)
		{
			case gspace_wc_EffectType.ANIMATE : this.numTimes = this.maxTimes;
											clearTimeout(this.animTimer);
											this.animTimer = null;
											this.animDelay = 100;
											break;
		}
	},
	
	setObject : function  (obj, startPoint, endPoint, type)
	{
		this.obj = obj;
		this.startPoint = startPoint;
		this.endPoint = endPoint;
		
		this.type = type;
	}
	
}

function gspace_wc_Point(left, top)
{
	this.left = left;
	this.top = top;
	
	var content = document.getElementById("content");
	
	this.bottom = (content.boxObject.y + content.boxObject.height) - this.top;
	this.right = (content.boxObject.x + content.boxObject.width) - this.left;
}

function gspace_wc_Dim(width, height)
{
	this.width = width;
	this.height = height;
}

var gspace_wc_EffectType = {ANIMATE : "0", DRAG : "drag", RESIZE : "resize", EXPAND : "expand"};




