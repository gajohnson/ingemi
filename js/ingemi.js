(function(){

Ingemi = function(container, args) {
    if (!container || container.nodeName != 'DIV') {
        throw new Error('You must specify Ingemi\'s container');
    }
    args = args || {};

    this.container = container;

    this.sample = 1;

    this.offsetLeft = args['offsetLeft'] || 0;
    this.offsetTop = args['offsetTop'] || 0;
    this.zoom = args['zoom'] || 1;

    this.dx = 3.5;
    this.dy = 2;
    this.zoom = 1;
    this.minStdDev = args['minStdDev'] || 10;

    this.maxIteration = args['maxIteration'] || 2550;
    this.blockSize = args['blockSize'] || 2000;

    this.forcedHeight = Math.round(container.clientWidth * this.dy / this.dx) / container.clientHeight;

    this.workers = args['workers'] || 1;
    this.threads = [];
    for (var i = 0; i < this.workers; i++) {
        this.threads.push(new Worker('w.mandelbrot.js'));
    }

    this.lock = false;
};

/**
 * Initialize the canvas element.
 */
Ingemi.prototype.init = function() {
    console.time('total');
    var _this = this;
    _this.makeCanvas();
    _this.scaleCanvas();
    for (var i = 0; i < _this.workers; i++) {
        _this.threads[i].onmessage = function(event) {
            var buffer = event.data['imagedata'];
            var imagedata = new Uint8ClampedArray(buffer, 0, _this.totalPixels * 4);
            _this.imagedata = _this.context.createImageData(_this.width, _this.height);
            _this.imagedata.data.set(imagedata);
            _this.draw();
        };
    }
};

/**
 * Create a canvas in the parent div and inherit its size.
 */
Ingemi.prototype.makeCanvas = function() {
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);
    this.context = this.canvas.getContext('2d');
};

/**
 * Set the internal size of the canvas element.
 */
Ingemi.prototype.scaleCanvas = function() {
    this.clientWidth = this.container.clientWidth;
    this.clientHeight = this.container.clientHeight;
    this.width = Math.floor(this.clientWidth / this.upscale());
    this.height = Math.floor(this.clientHeight / this.upscale());
    this.canvas.style.width = this.clientWidth + 'px';
    this.canvas.style.height =  this.clientHeight + 'px';
    this.totalPixels = this.width * this.height;
    this.imagedata = this.context.createImageData(this.width, this.height);

    //this.buffer = new ArrayBuffer(this.totalPixels * 4);
};

/**
 * Render the entire scene using the current viewport and context.
 */
Ingemi.prototype.render = function() {
    console.time('render');
    this.blockOffset = 0;
    var d = this.imagedata.data.buffer;
    var msg = {};
    msg['state'] = {};
    msg['state']['offsetLeft'] = this.offsetLeft;
    msg['state']['offsetTop'] = this.offsetTop;
    msg['state']['zoom'] = this.zoom;
    msg['state']['blockOffset'] = this.blockOffset;
    msg['settings'] = {};
    msg['settings']['dx'] = this.dx;
    msg['settings']['dy'] = this.dy;
    msg['settings']['forcedHeight'] = this.forcedHeight;
    msg['settings']['blockSize'] = this.blockSize;
    msg['settings']['totalPixels'] = this.totalPixels;
    msg['settings']['width'] = this.width;
    msg['settings']['height'] = this.height;
    msg['settings']['maxIteration'] = this.maxIteration;
    msg['buffer'] = d;
    this.threads[0]['postMessage'](msg, [d]);
};

/**
 * Draw the final image to the screen.
 */
Ingemi.prototype.draw = function() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.context.putImageData(this.imagedata, 0, 0);
    this.lock = false;
    console.timeEnd('render');
    console.timeEnd('total');
    console.log('Total Pixels:', this.totalPixels);
};

/**
 * Set the zoom factor (absolute).
 * @param {Float} factor Multiplier for zoom
 */
Ingemi.prototype.zoom = function(factor) {
    this.zoom = factor;
    this.render();
};

/**
 * Center the viewport on (x, y).
 * @param {Integer} x In pixels from the left of the canvas
 * @param {Integer} y In pixels from the top of the canvas
 */
Ingemi.prototype.center = function(x, y) {
    this.offsetLeft += (x / this.upscale() / this.width - 0.5) * this.dx * this.zoom;
    this.offsetTop += (y / this.upscale() / this.height - 0.5) * this.dy * this.zoom;
    this.render();
};

/**
 * Reset the viewport: offsets and zoom.
 */
Ingemi.prototype.reset = function() {
    this.offsetLeft = 0;
    this.offsetTop = 0;
    this.zoom = 1;
};

/**
 * Set scaling factor for higher or lower resolution images.
 * @param {Integer} upscale The scaling factor of the image
 */
Ingemi.prototype.upscale = function(sample) {
    if (!sample) return this.sample;
    this.sample = sample;
    this.scaleCanvas();
};

/**
 * Generate a random image
 */
Ingemi.prototype.random = function() {
    var points, left, top, max = 100, i = 0;
    var average = function(array) {
        var sum = 0, l = array.length;
        for(var i = 0; i < l; i++) {
            sum += array[i];
        }
        return sum / l;
    };
    var stddev = function(array, average) {
        var l = array.length;
        var sum = 0;
        for(var i = 0; i < l; i++) {
            var x = array[i] - average;
            sum += x * x;
        }
        return Math.pow(sum / l, 0.5);
    };
    do {
        points = [];
        this.zoom = 1 / Math.pow(2, Math.floor(Math.random()*22) + 10)
        this.offsetLeft = this.dx * (Math.random() - 0.5);
        this.offsetTop = this.dy * (Math.random() - 0.5);
        for(var i = 0; i < 16; i++) {
            left = Math.floor((i%4) * this.width/4);
            top = Math.floor(Math.floor(i / 4) * this.height/4);
            points.push(this.getValue(left, top));
        }
        i++;
    } while (stddev(points, average(points)) < this.minStdDev && i < max);
    this.render();
};

/**
 * Export the current view to PNG
 */
Ingemi.prototype.save = function(inplace) {
    var exportImage;
    var displayWidth = this.canvas.width;
    var displayHeight = this.canvas.height;
    var dataURL = this.canvas.toDataURL("image/png");
    if (inplace) {

    } else {
        var options = "left=0,top=0,width=" + displayWidth +
            ",height=" + displayHeight +
            ",toolbar=0,resizable=0";
        var imageWindow = window.open("", "Ingemi", options);
        imageWindow.document.write("<title>Ingemi Export Image</title>")
        imageWindow.document.write("<img id='exportImage'"
                                    + " alt=''"
                                    + " height='" + displayHeight + "'"
                                    + " width='"  + displayWidth  + "'"
                                    + " style='position:absolute;left:0;top:0'/>");
        imageWindow.document.close();
        //copy the image into the empty img in the newly opened window:
        exportImage = imageWindow.document.getElementById("exportImage");
    }
    exportImage.src = dataURL;
};

/**
 * @export Ingemi as window.Ingemi
 */
window['Ingemi'] = Ingemi;

/**
 * @export Ingemi.prototype.init as window.Ingemi.prototype.init
 */
Ingemi.prototype['init'] = Ingemi.prototype.init;

/**
 * @export Ingemi.prototype.render as window.Ingemi.prototype.render
 */
Ingemi.prototype['render'] = Ingemi.prototype.render;

})();