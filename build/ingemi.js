var d;Ingemi=function(a,b){if(!a||"DIV"!=a.nodeName)throw Error("You must specify Ingemi's container");b=b||{};this.h=a;this.x=b.x||0;this.y=b.y||0;this.a=b.z||1;this.C=this.maxIteration=b.maxIteration||255;this.f=b.sample||1;this.g=b.workers||4;this.D=b.minStdDev||10;this.i=3.5;this.j=2;this.c=[];this.d=[];this.b=!1;this.p=null;this.o=this.time=0};d=Ingemi.prototype;d.A=function(){this.B();this.F();this.G()};
d.B=function(){this.canvas=document.createElement("canvas");this.h.appendChild(this.canvas);this.m=this.canvas.getContext("2d")};
d.F=function(){this.clientWidth=this.h.clientWidth;this.clientHeight=this.h.clientHeight;this.width=Math.floor(this.clientWidth/this.f);this.height=Math.floor(this.clientHeight/this.f);this.canvas.style.width=this.clientWidth+"px";this.canvas.style.height=this.clientHeight+"px";this.v=Math.round(this.clientWidth*this.j/this.i)/this.clientHeight;this.q=this.width*this.height;this.n=this.m.createImageData(this.width,this.height);this.buffer=[];for(var a=0;a<this.g;a++)this.buffer[a]=new ArrayBuffer(this.k(a+
1)-this.k(a))};d.G=function(){for(var a=this,b=0;b<this.g;b++){this.c[b]=new Worker("w.mandelbrot.js");var e=this.l("init");this.c[b].postMessage(e);this.c[b].onmessage=function(b){a.w(b.data)}}};d.t=function(){for(var a=0,b=this.d.length;a<b;a++)if(!this.d[a])return;this.u()};d.e=function(){if(!this.b){this.b=!0;this.p=+new Date;for(var a=0;a<this.g;a++){this.d[a]=!1;var b=this.l("render",a);this.c[a].postMessage(b,[this.buffer[a]])}}};
d.l=function(a,b){var e={};e.type=a;switch(a){case "init":var c=e.settings={};c.dx=this.i;c.dy=this.j;c.forcedHeight=this.v;c.totalPixels=this.q;c.width=this.width;c.height=this.height;c.maxIteration=this.C;c.minStdDev=this.D;break;case "render":c=e.state={},c.x=this.x,c.y=this.y,c.z=this.a,c.blockOffset=this.k(b),c.blockSize=this.buffer[b].byteLength,c.index=b,e.buffer=this.buffer[b]}return e};d.k=function(a){return 4*Math.ceil(this.q*a/this.g)};
d.w=function(a){switch(a.type){case "render":var b=a.index;this.buffer[b]=a.imagedata;this.n.data.set(new Uint8ClampedArray(this.buffer[b]),a.blockOffset);this.d[b]=!0;this.t();break;case "random":this.x=a.x||this.x,this.y=a.y||this.y,this.a=a.z||this.a,this.e()}};d.u=function(){this.canvas.width=this.width;this.canvas.height=this.height;this.m.putImageData(this.n,0,0);this.time+=+new Date-this.p;this.o++;this.b=!1};d.zoom=function(a){this.b||(this.a*=a,this.e())};
d.s=function(a,b){this.b||(this.x+=(a/this.f/this.width-0.5)*this.i*this.a,this.y+=(b/this.f/this.height-0.5)*this.j*this.a,this.e())};d.reset=function(){this.y=this.x=0;this.a=1};d.random=function(){this.b||this.c[0].postMessage(this.l("random"))};
d.save=function(a){var b,e=this.canvas.width,c=this.canvas.height,f=this.canvas.toDataURL("image/png");a||(a=window.open("","Ingemi","left=0,top=0,toolbar=0,resizable=0,width="+e+",height="+c),a.document.write("<title>Ingemi Export Image</title>"),a.document.write("<img id='exportImage' style='position:absolute;left:0;top:0' height='"+c+"' width='"+e+"'/>"),a.document.close(),b=a.document.getElementById("exportImage"));b.src=f};
d.r=function(){console.log("Average render time: "+Math.round(this.time/this.o)+"ms")};window.Ingemi=Ingemi;Ingemi.prototype.init=Ingemi.prototype.A;Ingemi.prototype.render=Ingemi.prototype.e;Ingemi.prototype.zoom=Ingemi.prototype.zoom;Ingemi.prototype.center=Ingemi.prototype.s;Ingemi.prototype.reset=Ingemi.prototype.reset;Ingemi.prototype.random=Ingemi.prototype.random;Ingemi.prototype.average=Ingemi.prototype.r;Ingemi.prototype.save=Ingemi.prototype.save;