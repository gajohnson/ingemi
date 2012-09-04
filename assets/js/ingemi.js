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
    this.maxIteration = this['maxIteration'] = args['maxIteration'] || 255;

    this.sample = args['sample'] || 1;

    this.workers = args['workers'] || 4;
    this.minStdDev = args['minStdDev'] || 10;
    this.onrender = (typeof args['onrender'] === 'function') ? args['onrender'] : null;

    this.dx = 3.5;
    this.dy = 2;

    this.threads = [];
    this.finishedThreads = [];

    this.lock = false;

    this.timer = null;
    this.time = 0;
    this.renders = 0;
};

/**
 * Initialize the canvas element.
 */
Ingemi.prototype.init = function() {
    this.makeCanvas();
    this.scaleCanvas();
    this.spawnThreads('js/w.mandelbrot.js');
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
    this.imagedata = this.context.createImageData(this.width, this.height);

    this.buffer = [];
    for(var i = 0; i < this.workers; i++) {
        var blockSize = this.getBlockOffset(i + 1) - this.getBlockOffset(i);
        this.buffer[i] = new ArrayBuffer(blockSize);
    }
};

/**
 * Starts web workers.
 * @param {string} filename The relative path to the web worker file.
 */
Ingemi.prototype.spawnThreads = function(filename) {
    var _this = this;
    for (var j = 0; j < this.workers; j++) {
        this.threads[j] = new Worker(filename);
        var r = this.makeRequestObject('init');
        this.threads[j]['postMessage'](r);
        this.threads[j].onmessage = function(event) {
            _this.handleMessage(event['data']);
        };
    }
};

/**
 * Check if all threads have completed.
 * @return {Boolean}
 */
Ingemi.prototype.checkThreads = function() {
    for (var i = 0, l = this.finishedThreads.length; i < l; i++) {
        if (!this.finishedThreads[i]) return;
    }
    this.draw();
};

/**
 * Render the entire scene using the current viewport and context.
 */
Ingemi.prototype.render = function() {
    if (this.lock) return;
    this.lock = true;

    // Benchmarking
    this.timer = +new Date();

    for (var i = 0; i < this.workers; i++) {
        this.finishedThreads[i] = false;
        var r = this.makeRequestObject('render', i);
        this.threads[i]['postMessage'](r, [this.buffer[i]]);
    }
};

/**
 * Create message to be passed to worker.
 * @param {String} type The type of request ('init' | 'render' | 'random').
 * @param {Number} index The index of the thread being messaged.
 */
Ingemi.prototype.makeRequestObject = function(type, index) {
    var r = {};
    r['type'] = type;
    switch (type) {
        case 'init':
            var settings = r['settings'] = {};
            settings['dx'] = this.dx;
            settings['dy'] = this.dy;
            settings['forcedHeight'] = this.forcedHeight;
            settings['totalPixels'] = this.totalPixels;
            settings['width'] = this.width;
            settings['height'] = this.height;
            settings['maxIteration'] = this.maxIteration;
            settings['minStdDev'] = this.minStdDev;
            break;
        case 'render':
            var state = r['state'] = {};
            state['x'] = this.x;
            state['y'] = this.y;
            state['z'] = this.z;
            state['blockOffset'] = this.getBlockOffset(index);
            state['blockSize'] = this.buffer[index].byteLength;
            state['index'] = index;
            r['buffer'] = this.buffer[index];
            break;
        case 'random':
            break;
    }
    return r;
};

/**
 * Get byte offset for a given thread.
 * @param {Number} index
 */
Ingemi.prototype.getBlockOffset = function(index) {
    return Math.ceil(this.totalPixels * index / this.workers) * 4;
};

/**
 * Receive and process incoming messages from workers.
 * @param {Object} data event.data as passed from worker.
 */
Ingemi.prototype.handleMessage = function(data) {
    switch (data['type']) {
        case 'init':
            break;
        case 'render':
            var i = data['index'];
            this.buffer[i] = data['imagedata'];
            var imagedata = new Uint8ClampedArray(this.buffer[i]);
            this.imagedata.data.set(imagedata, data['blockOffset']);
            this.finishedThreads[i] = true;
            this.checkThreads();
            break;
        case 'random':
            this.x = data['x'] || this.x;
            this.y = data['y'] || this.y;
            this.z = data['z'] || this.z;
            this.render();
            break;
    }
};

/**
 * Draw the final image to the screen.
 */
Ingemi.prototype.draw = function() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.context.putImageData(this.imagedata, 0, 0);

    // Benchmarking
    this.time += (+new Date() - this.timer);
    this.renders++;

    this.lock = false;
};

/**
 * Set the zoom factor (absolute).
 * @param {Float} factor Multiplier for zoom
 */
Ingemi.prototype.zoom = function(factor) {
    if (this.lock) return;
    this.z *= factor;
    this.render();
};

/**
 * Center the viewport on (x, y).
 * @param {Integer} x In pixels from the left of the canvas
 * @param {Integer} y In pixels from the top of the canvas
 */
Ingemi.prototype.center = function(x, y) {
    if (this.lock) return;
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
 * Generate a random image. Candidates are filtered by standard deviation of 16 sample points.
 */
Ingemi.prototype.random = function() {
    if (this.lock) return;
    var r = this.makeRequestObject('random');
    this.threads[0]['postMessage'](r);
};

/**
 * Export the current view to PNG
 * @param {Boolean} inplace Create the image in the same window | Open a new window.
 */
Ingemi.prototype.save = function(inplace) {
    var exportImage;
    var displayWidth = this.canvas.width;
    var displayHeight = this.canvas.height;
    var dataURL = this.canvas.toDataURL("image/png");
    if (inplace) {
        //TODO Allow saving without spawing a new window
    } else {
        var options = "left=0,top=0,toolbar=0,resizable=0,width=" + displayWidth + ",height=" + displayHeight;
        var imageWindow = window.open("", "Ingemi", options);
        imageWindow.document.write("<title>Ingemi Export Image</title>");
        imageWindow.document.write("<img id='exportImage' style='position:absolute;left:0;top:0'"
                                    + " height='" + displayHeight + "' width='"  + displayWidth  + "'/>");
        imageWindow.document.close();
        exportImage = imageWindow.document.getElementById("exportImage");
    }
    exportImage.src = dataURL;
};

/**
 * Print the running average render time for benchmarking purposes.
 */
Ingemi.prototype.average = function() {
    console.log('Average render time: ' + Math.round(this.time / this.renders) + 'ms');
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

/**
 * @export Ingemi.prototype.average as window.Ingemi.prototype.average
 */
Ingemi.prototype['average'] = Ingemi.prototype.average;

/**
 * @export Ingemi.prototype.save as window.Ingemi.prototype.save
 */
Ingemi.prototype['save'] = Ingemi.prototype.save;

})();