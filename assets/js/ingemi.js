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
 * @property {Number} iterations Maximum iteration used in escape-velocity
 *     calculations. High numbers produce greater color differentiation.
 * @property {Float} sample Used to strech and compress internal canvas dimensions.
 * @property {Number} workers Number of threads to use.
 * @property {Float} minStdDev Minimum threshold standard deviation in random images.
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
    this.iterations = args['iterations'] || 255;

    this.sample = args['sample'] || 1;

    this.workers = args['workers'] || 4;
    this.minStdDev = args['minStdDev'] || 10;


    this.dx = 3.5;
    this.dy = 2;

    this.threads = [];
    this.finishedThreads = [];
    this.requestCallbacks = {};

    this.lock = false;
};

/**
 * Initialize the canvas element.
 */
Ingemi.prototype.init = function() {
    if (this.lock) return;
    this.makeCanvas();
    this.scaleCanvas();
    this.spawnThreads('js/w.mandelbrot.js');
    this.bindListeners();
};

/**
 * Create a canvas in the parent div and inherit its size.
 */
Ingemi.prototype.makeCanvas = function() {
    this.canvas_ = document.createElement('canvas');
    this.container.appendChild(this.canvas_);
    this.ctx = this.canvas_.getContext('2d');
};

/**
 * Set the internal size of the canvas element.
 */
Ingemi.prototype.scaleCanvas = function() {
    var _width = this.container.clientWidth;
    var _height = this.container.clientHeight;
    this.w = Math.floor(_width / this.sample);
    this.h = Math.floor(_height / this.sample);
    this.canvas_.style.width = _width + 'px';
    this.canvas_.style.height =  _height + 'px';
    this.hScale = Math.round(_width * this.dy / this.dx) / _height;
    this.pixels = this.w * this.h;
    this.image = this.ctx.createImageData(this.w, this.h);

    this.buf = [];
    for(var i = 0; i < this.workers; i++) {
        var size = this.getOffset(i + 1) - this.getOffset(i);
        this.buf[i] = new ArrayBuffer(size);
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
Ingemi.prototype.checkThreads = function(callbackId) {
    for (var i = 0, l = this.finishedThreads.length; i < l; i++) {
        if (!this.finishedThreads[i]) return;
    }
    this.draw();

    if (callbackId) {
        var callback = this.requestCallbacks[callbackId];
        if (callback) {
            callback();
            delete this.requestCallbacks[callbackId];
        }
    }
};

/**
 * Render the entire scene using the current viewport and context.
 * @param {Function=} callback Post-render hook.
 */
Ingemi.prototype.render = function(callback) {
    if (this.lock) return;
    this.lock = true;
    callback = (typeof callback === 'function') ? callback : null;

    for (var i = 0; i < this.workers; i++) {
        this.finishedThreads[i] = false;
        var r = this.makeRequestObject('draw', i, callback);
        this.threads[i]['postMessage'](r, [this.buf[i]]);
    }
};

/**
 * Create message to be passed to worker.
 * @param {String} type The type of request ('init' | 'draw' | 'rand').
 * @param {Number} block The index of the thread being messaged.
 * @param {Function=} callback Post-request hook.
 */
Ingemi.prototype.makeRequestObject = function(type, block, callback) {
    var r = {};
    r['type'] = type;
    if (callback) {
        var key = Math.floor(Math.random()*100000);
        this.requestCallbacks[key] = callback;
        r['callback'] = key;
    }
    switch (type) {
        case 'init':
            var settings = r['settings'] = {};
            settings['dx'] = this.dx;
            settings['dy'] = this.dy;
            settings['hScale'] = this.hScale;
            settings['w'] = this.w;
            settings['h'] = this.h;
            settings['iterations'] = this.iterations;
            settings['minStdDev'] = this.minStdDev;
            break;
        case 'draw':
            var state = r['state'] = {};
            state['x'] = this.x;
            state['y'] = this.y;
            state['z'] = this.z;
            state['offset'] = this.getOffset(block);
            state['size'] = this.buf[block].byteLength;
            state['block'] = block;
            r['buf'] = this.buf[block];
            break;
        case 'rand':
            break;
    }
    return r;
};

/**
 * Get byte offset for a given thread.
 * @param {Number} block
 */
Ingemi.prototype.getOffset = function(block) {
    return Math.ceil(this.pixels * block / this.workers) * 4;
};

/**
 * Receive and process incoming messages from workers.
 * @param {Object} data event.data as passed from worker.
 */
Ingemi.prototype.handleMessage = function(data) {
    switch (data['type']) {
        case 'init':
            break;
        case 'draw':
            var callbackId = data['callback'] || null;
            var i = data['block'];
            this.buf[i] = data['image'];
            var img = new Uint8ClampedArray(this.buf[i]);
            this.image.data.set(img, data['offset']);
            this.finishedThreads[i] = true;
            this.checkThreads(callbackId);
            break;
        case 'rand':
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
    this.canvas_.width = this.w;
    this.canvas_.height = this.h;
    this.ctx.putImageData(this.image, 0, 0);
    this.lock = false;
};

/**
 * Set the zoom factor (absolute).
 * @param {Float} factor Multiplier for zoom
 */
Ingemi.prototype.zoom_ = function(factor) {
    if (this.lock) return;
    this.z *= factor;
};

/**
 * Center the viewport on (x, y).
 * @param {Integer} x In pixels from the left of the canvas
 * @param {Integer} y In pixels from the top of the canvas
 */
Ingemi.prototype.center = function(x, y) {
    if (this.lock) return;
    this.x += (x / this.sample / this.w - 0.5) * this.dx * this.z;
    this.y += (y / this.sample / this.h - 0.5) * this.dy * this.z / this.hScale;
};

/**
 * Resample the image.
 * @param {Float} sample New sample ratio.
 */
Ingemi.prototype.resample = function(sample) {
    if (!sample) return this.sample;
    if (this.lock) return;
    this.sample = sample;
    this.scaleCanvas();
    for (var j = 0; j < this.workers; j++) {
        var r = this.makeRequestObject('init');
        this.threads[j]['postMessage'](r);
    }
};

/**
 * Getter for width
 * @return {Integer} Width of containing div.
 */
Ingemi.prototype.width_ = function() {
    return this.container.clientWidth;
};

/**
 * Getter for height
 * @return {Integer} height of containing div.
 */
Ingemi.prototype.height_ = function() {
    return this.container.clientHeight;
};

/**
 * Get or set the current viewport.
 * @param {Object=} coords
 */
Ingemi.prototype.state_ = function(coords) {
    if (!coords) return {
        'x': this.x,
        'y': this.y,
        'z': this.z
    };
    this.x = coords['x'] || this.x;
    this.y = coords['y'] || this.y;
    this.z = coords['z'] || this.z;
};

/**
 * Generate a random image. Candidates are filtered by standard deviation of 16 sample points.
 */
Ingemi.prototype.rand = function() {
    if (this.lock) return;
    var r = this.makeRequestObject('rand');
    this.threads[0]['postMessage'](r);
};

Ingemi.prototype.bindListeners = function() {
    this.listen(window, 'keydown', this.handleKeyDown);
    this.listen(window, 'resize', this.debounce_(this.handleResize));
    this.listen(this.container, 'click', this.handleClick);
};

Ingemi.prototype.listen = function(target, type, handler) {
    var that = this;
    target.addEventListener(type, function(event) {
        handler.call(that, event);
    });
}

Ingemi.prototype.handleResize = function(event) {
    this.render();
};

Ingemi.prototype.handleClick = function(event) {
    this.center(event.clientX, event.clientY);
    this.render();
}

Ingemi.prototype.handleKeyDown = function(event) {
    switch (event.keyCode) {
        case 82: // R
            this.rand();
            break;
        case 87: // W
            this.zoom_(1/1.05);
            this.render();
            break;
        case 83: // S
            this.zoom_(2);
            this.render();
            break;
        case 65: // A
            this.resample(this.sample * 2);
            this.render();
            break;
        case 68: // D
            this.resample(this.sample / 2);
            this.render();
            break;
        case 37: // Left
            this.center(0, this.height_() / 2);
            this.render();
            break;
        case 39: // Right
            this.center(this.width_(), this.height_() / 2);
            this.render();
            break;
        case 38: // Up
            this.center(this.width_() / 2, 0);
            this.render();
            break;
        case 40: // Down
            this.center(this.width_() / 2, this.height_());
            this.render();
            break;
        case 90: // Z
            this.save();
            break;
    }
};

/**
 * Export the current view to PNG
 * @param {Boolean} inplace Create the image in the same window | Open a new window.
 */
Ingemi.prototype.save_ = function(inplace) {
    var exportImage;
    var displayWidth = this.canvas_.width;
    var displayHeight = this.canvas_.height;
    var dataURL = this.canvas_.toDataURL("image/png");
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

Ingemi.prototype.debounce_ = function(func, threshold) {

    var timeout;

    return function debounced () {
        var obj = this, args = arguments;
        function delayed () {
            func.apply(obj, args);
            timeout = null;
        };

        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(delayed, threshold || 500);
    };
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
 * @export Ingemi.prototype.zoom_ as window.Ingemi.prototype.zoom
 */
Ingemi.prototype['zoom'] = Ingemi.prototype.zoom_;

/**
 * @export Ingemi.prototype.center as window.Ingemi.prototype.center
 */
Ingemi.prototype['center'] = Ingemi.prototype.center;

/**
 * @export Ingemi.prototype.resample as window.Ingemi.prototype.resample
 */
Ingemi.prototype['resample'] = Ingemi.prototype.resample;

/**
 * @export Ingemi.prototype.width_ as window.Ingemi.prototype.width
 */
Ingemi.prototype['width'] = Ingemi.prototype.width_;

/**
 * @export Ingemi.prototype.height_ as window.Ingemi.prototype.height
 */
Ingemi.prototype['height'] = Ingemi.prototype.height_;

/**
 * @export Ingemi.prototype.state_ as window.Ingemi.prototype.state
 */
Ingemi.prototype['state'] = Ingemi.prototype.state_;

/**
 * @export Ingemi.prototype.rand as window.Ingemi.prototype.rand
 */
Ingemi.prototype['rand'] = Ingemi.prototype.rand;

/**
 * @export Ingemi.prototype.save_ as window.Ingemi.prototype.save
 */
Ingemi.prototype['save'] = Ingemi.prototype.save_;

})();
