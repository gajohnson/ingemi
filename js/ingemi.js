(function(){

/**
 * Ingemi(nate) - Mandelbrot set generator.
 * @name Ingemi
 * @class Ingemi
 * @constructor
 * @param {Node} container The container where Ingemi will render.
 * @param {Object} args An argument object to override most defaults. Valid
 *     properties are listed below.
 * @property {Float} x Horizontal offset of the coordinate system
 *     relative to the center of the canvas. Units are the same as rangeLeft.
 * @property {Float} y Vertical offset of the coordinate system
 *     relative to the center of the canvas.
 * @property {Float} z Magnification level.
 * @property {Number} maxIteration Maximum iteration used in escape-velocity
 *     calculations. High numbers produce greater color differentiation.
 * @property {Float} sample Used to strech and compress internal canvas dimensions.
 * @property {Number} workers Number of threads to use.
 * @property {Float} minStdDev Minimum threshold standard deviation in random images.
 * @property {Function} onrender Callback function fired every time a render
 *     is completed.
 * @throws Error if container is not a valid <div>.
 */
Ingemi = function(container, args) {
    if (!container || container.nodeName != 'DIV') {
        throw new Error('You must specify Ingemi\'s container');
    }

    args = args || {};

    this.container = container;

    this.x = args['x'] || 0;
    this.y = args['y'] || 0;
    this.z = args['z'] || 1;
    this.maxIteration = args['maxIteration'] || 255;

    this.sample = args['sample'] || 1;

    this.workers = args['workers'] || 1;
    this.minStdDev = args['minStdDev'] || 10;
    this.onrender = (typeof args['onrender'] === 'function') ? args['onrender'] : null;

    this.dx = 3.5;
    this.dy = 2;
    this.blockSize = 0;
    this.blockOffset = 0;

    this.threads = [];
    for (var i = 0; i < this.workers; i++) {
        this.threads.push(new Worker('w.mandelbrot.js'));
    }

    this.canvas = null;
    this.context = null;
    this.imagedata = null;

    this.clientWidth = 0;
    this.clientHeight = 0;
    this.forcedHeight = 0;

    this.width = 0;
    this.height = 0;
    this.totalPixels = 0;

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

            // TODO Break this out and generalize to multiple threads
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
    this.width = Math.floor(this.clientWidth / this.sample);
    this.height = Math.floor(this.clientHeight / this.sample);
    this.canvas.style.width = this.clientWidth + 'px';
    this.canvas.style.height =  this.clientHeight + 'px';
    this.forcedHeight = Math.round(this.clientWidth * this.dy / this.dx) / this.clientHeight;
    this.totalPixels = this.width * this.height;
    this.blockSize = this.totalPixels / this.workers;
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
    var state = msg['state'] = {};
    var settings = msg['settings'] = {};

    state['x'] = this.x;
    state['y'] = this.y;
    state['z'] = this.z;
    state['blockOffset'] = this.blockOffset;
    settings['dx'] = this.dx;
    settings['dy'] = this.dy;
    settings['forcedHeight'] = this.forcedHeight;
    settings['blockSize'] = this.blockSize;
    settings['totalPixels'] = this.totalPixels;
    settings['width'] = this.width;
    settings['height'] = this.height;
    settings['maxIteration'] = this.maxIteration;
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
    this.z *= factor;
    this.render();
};

/**
 * Center the viewport on (x, y).
 * @param {Integer} x In pixels from the left of the canvas
 * @param {Integer} y In pixels from the top of the canvas
 */
Ingemi.prototype.center = function(x, y) {
    this.x += (x / this.sample / this.width - 0.5) * this.dx * this.z;
    this.y += (y / this.sample / this.height - 0.5) * this.dy * this.z;
    this.render();
};

/**
 * Reset the viewport: offsets and zoom.
 */
Ingemi.prototype.reset = function() {
    this.x = 0;
    this.y = 0;
    this.z = 1;
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
/*    do {
        points = [];
        this.z = 1 / Math.pow(2, Math.floor(Math.random()*22) + 10)
        this.x = this.dx * (Math.random() - 0.5);
        this.y = this.dy * (Math.random() - 0.5);
        for(var i = 0; i < 16; i++) {
            left = Math.floor((i%4) * this.width/4);
            top = Math.floor(Math.floor(i / 4) * this.height/4);
            points.push(this.getValue(left, top));
        }
        i++;
    } while (stddev(points, average(points)) < this.minStdDev && i < max);*/
    this.z = 1 / Math.pow(2, Math.floor(Math.random()*22) + 10)
    this.x = this.dx * (Math.random() - 0.5);
    this.y = this.dy * (Math.random() - 0.5);
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
        //TODO Allow saving without spawing a new window
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

/**
 * @export Ingemi.prototype.zoom as window.Ingemi.prototype.zoom
 */
Ingemi.prototype['zoom'] = Ingemi.prototype.zoom;

/**
 * @export Ingemi.prototype.center as window.Ingemi.prototype.center
 */
Ingemi.prototype['center'] = Ingemi.prototype.center;

/**
 * @export Ingemi.prototype.reset as window.Ingemi.prototype.reset
 */
Ingemi.prototype['reset'] = Ingemi.prototype.reset;

/**
 * @export Ingemi.prototype.random as window.Ingemi.prototype.random
 */
Ingemi.prototype['random'] = Ingemi.prototype.random;

})();