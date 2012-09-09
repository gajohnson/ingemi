var c;Ingemi=function(a,b){if(!a||"DIV"!=a.nodeName)throw Error("You must specify Ingemi's container");b=b||{};this.h=a;this.x=b.x||0;this.y=b.y||0;this.a=b.z||1;this.C=this.maxIteration=b.maxIteration||255;this.f=b.sample||1;this.g=b.workers||4;this.D=b.minStdDev||10;this.i=3.5;this.j=2;this.c=[];this.d=[];this.b=!1;this.q=null;this.p=this.time=0};c=Ingemi.prototype;c.A=function(){this.B();this.F();this.G()};
c.B=function(){this.canvas=document.createElement("canvas");this.h.appendChild(this.canvas);this.m=this.canvas.getContext("2d")};
c.F=function(){this.clientWidth=this.h.clientWidth;this.clientHeight=this.h.clientHeight;this.width=Math.floor(this.clientWidth/this.f);this.height=Math.floor(this.clientHeight/this.f);this.canvas.style.width=this.clientWidth+"px";this.canvas.style.height=this.clientHeight+"px";this.n=Math.round(this.clientWidth*this.j/this.i)/this.clientHeight;this.r=this.width*this.height;this.o=this.m.createImageData(this.width,this.height);this.buffer=[];for(var a=0;a<this.g;a++)this.buffer[a]=new ArrayBuffer(this.k(a+
1)-this.k(a))};c.G=function(){for(var a=this,b=0;b<this.g;b++){this.c[b]=new Worker("js/w.mandelbrot.js");var e=this.l("init");this.c[b].postMessage(e);this.c[b].onmessage=function(b){a.w(b.data)}}};c.u=function(){for(var a=0,b=this.d.length;a<b;a++)if(!this.d[a])return;this.v()};c.e=function(){if(!this.b){this.b=!0;this.q=+new Date;for(var a=0;a<this.g;a++){this.d[a]=!1;var b=this.l("render",a);this.c[a].postMessage(b,[this.buffer[a]])}}};
c.l=function(a,b){var e={};e.type=a;switch(a){case "init":var d=e.settings={};d.dx=this.i;d.dy=this.j;d.forcedHeight=this.n;d.totalPixels=this.r;d.width=this.width;d.height=this.height;d.maxIteration=this.C;d.minStdDev=this.D;break;case "render":d=e.state={},d.x=this.x,d.y=this.y,d.z=this.a,d.blockOffset=this.k(b),d.blockSize=this.buffer[b].byteLength,d.index=b,e.buffer=this.buffer[b]}return e};c.k=function(a){return 4*Math.ceil(this.r*a/this.g)};
c.w=function(a){switch(a.type){case "render":var b=a.index;this.buffer[b]=a.imagedata;this.o.data.set(new Uint8ClampedArray(this.buffer[b]),a.blockOffset);this.d[b]=!0;this.u();break;case "random":this.x=a.x||this.x;this.y=a.y||this.y;this.a=a.z||this.a;this.e();points=[];context.fillStyle="rgba(255, 0, 0, 100)";for(b=0;32>b;b++)left=Math.floor(b%4*width/4),top=Math.floor(Math.floor(b/4)*height/4),context.H(left,top,10,10)}};
c.v=function(){this.canvas.width=this.width;this.canvas.height=this.height;this.m.putImageData(this.o,0,0);this.time+=+new Date-this.q;this.p++;this.b=!1};c.zoom=function(a){this.b||(this.a*=a,this.e())};c.t=function(a,b){this.b||(this.x+=(a/this.f/this.width-0.5)*this.i*this.a,this.y+=(b/this.f/this.height-0.5)*this.j*this.a/this.n,this.e())};c.reset=function(){this.y=this.x=0;this.a=1};
c.state=function(a){if(!a)return{x:this.x,y:this.y,z:this.a};this.x=a.x||this.x;this.y=a.y||this.y;this.a=a.z||this.a};c.random=function(){this.b||this.c[0].postMessage(this.l("random"))};
c.save=function(a){var b,e=this.canvas.width,d=this.canvas.height,f=this.canvas.toDataURL("image/png");a||(a=window.open("","Ingemi","left=0,top=0,toolbar=0,resizable=0,width="+e+",height="+d),a.document.write("<title>Ingemi Export Image</title>"),a.document.write("<img id='exportImage' style='position:absolute;left:0;top:0' height='"+d+"' width='"+e+"'/>"),a.document.close(),b=a.document.getElementById("exportImage"));b.src=f};
c.s=function(){console.log("Average render time: "+Math.round(this.time/this.p)+"ms")};window.Ingemi=Ingemi;Ingemi.prototype.init=Ingemi.prototype.A;Ingemi.prototype.render=Ingemi.prototype.e;Ingemi.prototype.zoom=Ingemi.prototype.zoom;Ingemi.prototype.center=Ingemi.prototype.t;Ingemi.prototype.reset=Ingemi.prototype.reset;Ingemi.prototype.state=Ingemi.prototype.state;Ingemi.prototype.random=Ingemi.prototype.random;Ingemi.prototype.average=Ingemi.prototype.s;Ingemi.prototype.save=Ingemi.prototype.save;
