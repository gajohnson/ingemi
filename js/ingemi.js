(function(){
/**
 * Ingemi(nate) - An iterative Mandelbrot set generator in JavaScript.
 * @name Ingemi
 * @class Ingemi
 * @constructor
 * @param {Node} parentDiv The container where Ingemi will render.
 * @param {Object} args An argument object to override most defaults. Valid
 *     properties are listed below.
 * @property {Integer} upscale Used to strech internal canvas dimensions for
 *     fast, low-resolution renders.
 * @property {Float} offsetLeft Horizontal offset of the coordinate system
 *     relative to the center of the canvas. Units are the same as rangeLeft.
 * @property {Float} offsetTop Vertical offset of the coordinate system
 *     relative to the center of the canvas.
 * @property {Integer} maxIteration Maximum iteration used in escape-velocity
 *     calculations. High numbers produce greater color differentiation.
 * @property {Integer} blockSize Number of pixels to render concurrently.
 *     Higher values may increase performance at the cost of browser stability.
 * @property {Function} onrender Callback function fired every time a render
 *     is completed.
 * @throws Error if parentDiv is not a valid <div>.
 */

Ingemi = function(parentDiv, args) {
    if (!parentDiv || parentDiv.nodeName != 'DIV') {
        throw new Error('You must specify the div where Ingemi will render');
    }
    args = args || {};

    this.parentDiv = parentDiv;

    this.upscale_ = args['upscale'] || 1;

    this.offsetLeft = args['offsetLeft'] || 0;
    this.offsetTop = args['offsetTop'] || 0;
    this.maxLeftRange = 3.5;
    this.maxTopRange = 2;
    this.scale = 1;

    this.maxIteration = args['maxIteration'] || 255;
    this.blockSize = args['blockSize'] || 2500;

    this.onrender = (typeof args['onrender'] === 'function') ? args['onrender'] : null;

    this.forcedHeight = Math.round(parentDiv.clientWidth * 2 / 3.5) / parentDiv.clientHeight;

    this.lock = false;
    this.threads = [];
    this.smart = false;
};

/**
 * Initialize the canvas element.
 */
Ingemi.prototype.init = function() {
    this.makeCanvas();
    this.scaleCanvas();
};

/**
 * Create a canvas in the parent div and inherit its size.
 */
Ingemi.prototype.makeCanvas = function() {
    this.canvas = document.createElement('canvas');
    this.parentDiv.appendChild(this.canvas);
    this.context = this.canvas.getContext('2d');
    this.clientWidth = this.parentDiv.clientWidth;
    this.clientHeight = this.parentDiv.clientHeight;
    this.canvas.style.width = this.clientWidth + 'px';
    this.canvas.style.height =  this.clientHeight + 'px';

    this.scratchCanvas = document.createElement('canvas');
    this.scratchContext = this.scratchCanvas.getContext('2d');

    this.status = document.getElementById('status');
};

/**
 * Set the internal size of the canvas element.
 */
Ingemi.prototype.scaleCanvas = function() {
    this.width = Math.floor(this.clientWidth / this.upscale_);
    this.height = Math.floor(this.clientHeight / this.upscale_);
    this.scratchCanvas.width = this.width;
    this.scratchCanvas.height = this.height;
    this.image = this.scratchContext.createImageData(this.width, this.height);
    this.totalPixels = this.width * this.height;
};

/**
 * Render the entire scene using the current viewport and context.
 */
Ingemi.prototype.render = function() {
    if (this.lock) return;
    this.lock = true;
    console.time('render');
    this.status.innerText = 0;
    this.renderedPixels = 0;
    this.renderedPixelsInBlock = 0;
    this.blockOffset = 0;
    this.renderBlock();
};

/**
 * Render one row asynchronously. Increasing blockSize can potentially
 *     decrease rendering times at the expense of CPU usage.
 */
Ingemi.prototype.renderBlock = function() {
    /**
     * Prevent pixel calculation beyond the total number of pixel
     * @type {Boolean}
     */
    var overSized = this.blockSize + this.blockOffset > this.totalPixels;
    var lim = overSized ? this.totalPixels - this.blockOffset : this.blockSize;
    this.threads = [];
    for (var i = 0; i < lim; i += 1) {
        var pos = this.blockOffset + i;
        this.setPixel(pos % this.width, Math.floor(pos/this.width));
    }
};

/**
 * Asynchronously determine and set the value for the specified pixel
 *     and internally check if we are done rendering either a block or image.
 * @param {Integer} left
 * @param {Integer} top
 */
Ingemi.prototype.setPixel = function(left, top) {
    var _this = this;
    this.threads.push(setTimeout(function() {
        var pos = _this.gridToLine(left, top) * 4;
        var value = _this.getValue(left, top);
        _this.setPixelColor(pos, value);
        _this.updateCounters();
    }, 0));
};

/**
 * Convert cartesian coordinates to a one-dimensional index.
 * @param {Integer} left
 * @param {Integer} top
 */
Ingemi.prototype.gridToLine = function(left, top) {
    return top * this.width + left;
};

/**
 * Main logic for Mandelbrot generation
 *     - TODO Abstract out for more fractal types.
 * @param {Integer} left
 * @param {Integer} top
 */
Ingemi.prototype.getValue = function(left, top) {
    var scaledX, scaledY;
    scaledX = this.scale * (this.maxLeftRange * left / this.width - 1.75) + this.offsetLeft;
    scaledY = this.scale / this.forcedHeight * (this.maxTopRange * top / this.height - 1) + this.offsetTop;

    /** Optimize against inner cartoid and return known maxIteration */
    if (this.isInCartoid(scaledX, scaledY)) {
        return this.maxIteration;
    }
    var x = 0;
    var y = 0;
    var iteration = 0;
    var xtemp;
    while (x*x + y*y < 4 && iteration < this.maxIteration) {
        xtemp = x*x - y*y + scaledX;
        y = 2*x*y + scaledY;
        x = xtemp;
        iteration += 1;
    }
    return iteration;
};

/**
 * Simple optimization to prevent computing to maximum iteration in the center
 *     of the unzoomed Mandelbrot set.
 * @param {Float} left
 * @param {Float} top
 */
Ingemi.prototype.isInCartoid = function(left, top) {
    var p = Math.pow(left - 0.25, 2) + (top * top);
    var q = Math.sqrt(p);
    return left <= q - (2 * p) + 0.25;
};

/**
 * Map an integer [0...maxIteration] into some rgb spectrum
 *     and write it to the imageData array.
 * @param {Integer} pos The linear position of the pixel being modified
 * @param {Integer} value The value returned by getValue [0...maxIteration]
 */
Ingemi.prototype.setPixelColor = function(pos, value) {
    var r, g, b;
    value = 6 * value / this.maxIteration;
    if (value < 1) {
        r = 255;
        g = value * 255;
        b = 0;
    } else if (value < 2) {
        r = (2 - value) * 255;
        g = 255;
        b = 0;
    } else if (value < 3) {
        r = 0;
        g = 255;
        b = (value - 2) * 255;
    } else if (value < 4) {
        r = 0;
        g = (4 - value) * 255;
        b = 255;
    } else if (value < 5) {
        r = (value - 4) * 255;
        g = 0;
        b = 255;
    } else {
        r = 255;
        g = 0;
        b = (6 - value) * 255;
    }
    this.image.data[pos] = r;
    this.image.data[pos+1] = g;
    this.image.data[pos+2] = b;
    this.image.data[pos+3] = 255;
};

/**
 * Increment block- and image-level counters (to deal with asynchronous pixel
 *     calculations).
 */
Ingemi.prototype.updateCounters = function() {
    this.renderedPixels += 1;
    this.renderedPixelsInBlock += 1;
    if (this.renderedPixels == this.totalPixels) {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.context.putImageData(this.image, 0, 0);
        this.finalize();
    } else if (this.renderedPixelsInBlock === this.blockSize) {
        this.nextBlock();
    }
};

/**
 * Increment the global block offset, reset the block-level counter, and make
 *     rendering call.
 */
Ingemi.prototype.nextBlock = function() {
    this.blockOffset += this.blockSize;
    this.status.innerText = Math.round(100 * this.blockOffset / this.totalPixels);
    this.renderedPixelsInBlock = 0;
    this.renderBlock();
};

/**
 * Update status, unlock future rendering calls, and finally
 *     call onrender.
 */
Ingemi.prototype.finalize = function() {
    this.status.innerText = 100;
    console.timeEnd('render');
    this.lock = false;
    if (this.smart) {
        this.smart = false;
        this.upscale(1);
        this.render();
    }
    if (this.onrender) this.onrender();
};

/**
 * Center the viewport on (x, y) and zoom in 2x.
 * @param {Float} factor Multiplier for zoom
 */
Ingemi.prototype.zoom = function(factor) {
    //if (this.lock) return;
    this.scale = factor;
    this.smartRender();
};

/**
 * Center the viewport on (x, y) and zoom in 2x.
 * @param {Integer} x In pixels from the left of the canvas
 * @param {Integer} y In pixels from the top of the canvas
 */
Ingemi.prototype.center = function(x, y) {
    //if (this.lock) return;
    this.offsetLeft += (x / this.upscale_ / this.width - 0.5) * this.maxLeftRange * this.scale;
    this.offsetTop += (y / this.upscale_ / this.height - 0.5) * this.maxTopRange * this.scale;
    this.smartRender();
};

Ingemi.prototype.reset = function() {
    this.offsetLeft = 0;
    this.offsetTop = 0;
    this.scale = 1;
};

Ingemi.prototype.upscale = function(upscale) {
    this.upscale_ = upscale;
    this.scaleCanvas();
};

Ingemi.prototype.cancel = function() {
    while(this.threads.length) {
        clearTimeout(this.threads.pop());
    }
    this.finalize();
};

Ingemi.prototype.smartRender = function() {
    if (this.lock) this.cancel();
    this.smart = true;
    this.upscale(8);
    this.render();
}
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
 * @export Ingemi.prototype.upscale as window.Ingemi.prototype.upscale
 */
Ingemi.prototype['upscale'] = Ingemi.prototype.upscale;
})();