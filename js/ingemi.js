(function (){
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
 * @property {Float} rangeLeft Width of coordinate system mapped to the canvas
 *     (smaller numbers produce zoom).
 * @property {Float} rangeTop Height of coordinate system mapped to the canvas.
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
Ingemi = function (parentDiv, args) {
    if (!parentDiv || parentDiv.nodeName != 'DIV') {
        throw new Error('You must specify the div where Ingemi will render');
    }
    args = args || {};
    this.parentDiv = parentDiv;
    this.upscale = args['upscale'] || 1;
    this.rangeLeft = args['rangeLeft'] || 1;
    this.rangeTop = args['rangeTop'] || 1;
    this.offsetLeft = args['offsetLeft'] || 0;
    this.offsetTop = args['offsetTop'] || 0;
    this.maxIteration = args['maxIteration'] || 255;
    this.blockSize = args['blockSize'] || 2500;
    this.onrender = (typeof args['onrender'] === 'function') ? args['onrender'] : null;
    this.lock = false;
    this.maxLeftRange = 3.5;
    this.maxTopRange = 2;
};

/**
 * Initialize the canvas element.
 */
Ingemi.prototype.init = function () {
    this.makeCanvas();
    this.scaleCanvas();
};

/**
 * Create a canvas in the parent div and inherit its size.
 */
Ingemi.prototype.makeCanvas = function () {
    this.canvas = document.createElement('canvas');
    this.parentDiv.appendChild(this.canvas);
    this.context = this.canvas.getContext('2d');
    this.clientWidth = this.parentDiv.clientWidth;
    this.clientHeight = this.parentDiv.clientHeight;
    this.canvas.style.width = this.clientWidth + 'px';
    this.canvas.style.height =  this.clientHeight + 'px';
};

/**
 * Set the internal size of the canvas element.
 */
Ingemi.prototype.scaleCanvas = function () {
    this.width = Math.floor(this.clientWidth / this.upscale);
    this.height = Math.floor(this.clientHeight / this.upscale);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.image = this.context.createImageData(this.width, this.height);
    this.totalPixels = this.width * this.height;
};

/**
 * Render the entire scene using the current viewport and context.
 */
Ingemi.prototype.render = function () {
    if (!this.lock) {
        console.time('render');
        this.lock = true;
        this.renderedPixels = 0;
        this.renderedPixelsInBlock = 0;
        this.blockOffset = 0;
        this.renderBlock();
    }
};

/**
 * Render one row asynchronously. Increasing blockSize can potentially
 *     decrease rendering times at the expense of CPU usage.
 */
Ingemi.prototype.renderBlock = function () {
    /**
     * Prevent pixel calculation beyond the total number of pixel
     * @type {Boolean}
     */
    var overSized = this.blockSize + this.blockOffset > this.totalPixels;
    var lim = overSized ? this.totalPixels - this.blockOffset : this.blockSize;
    var i;
    for (i = 0; i < lim; i += 1) {
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
Ingemi.prototype.setPixel = function (left, top) {
    var _this = this;
    setTimeout(function () {
        var pos = _this.gridToLine(left, top) * 4;
        var value = _this.getValue(left, top);
        _this.setPixelColor(pos, value);
        _this.updateCounters();
    }, 0);
};

/**
 * Convert cartesian coordinates to a one-dimensional index.
 * @param {Integer} left
 * @param {Integer} top
 */
Ingemi.prototype.gridToLine = function (left, top) {
    return top * this.width + left;
};

/**
 * Main logic for Mandelbrot generation
 *     - TODO Abstract out for more fractal types.
 * @param {Integer} left
 * @param {Integer} top
 */
Ingemi.prototype.getValue = function (left, top) {
    var scaledX, scaledY;
    scaledX = this.rangeLeft * this.maxLeftRange * left / this.width - 2.5 + this.offsetLeft;
    scaledY = this.rangeTop * this.maxTopRange * top / this.height - 1 + this.offsetTop;
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
Ingemi.prototype.isInCartoid = function (left, top) {
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
    if (this.maxIteration > 255) {
        value = Math.floor(value/this.maxIteration * 255);
    }
    this.image.data[pos] = value;
    this.image.data[pos+1] = value;
    this.image.data[pos+2] = value;
    this.image.data[pos+3] = 255;
};

/**
 * Increment block- and image-level counters (to deal with asynchronous pixel
 *     calculations).
 */
Ingemi.prototype.updateCounters = function () {
    this.renderedPixels += 1;
    this.renderedPixelsInBlock += 1;
    if (this.renderedPixels == this.totalPixels) {
        this.finalize();
    } else if (this.renderedPixelsInBlock === this.blockSize) {
        this.nextBlock();
    }
};

/**
 * Increment the global block offset, reset the block-level counter, and make
 *     rendering call.
 */
Ingemi.prototype.nextBlock = function () {
    this.blockOffset += this.blockSize;
    this.renderedPixelsInBlock = 0;
    this.renderBlock();
};

/**
 * Draw current image to canvas, unlock future rendering calls, and finally
 *     call onrender.
 */
Ingemi.prototype.finalize = function () {
    this.context.putImageData(this.image, 0, 0);
    console.timeEnd('render');
    this.lock = false;
    if (this.onrender) this.onrender();
};

/**
 * Center the viewport on (x, y) and zoom in 2x.
 * @param {Integer} x In pixels from the left of the canvas
 * @param {Integer} y In pixels from the top of the canvas
 * @param {Float} factor Multiplier for zoom
 */
Ingemi.prototype.zoom = function (x, y, factor) {
    if (!this.lock){
        x = x / this.upscale;
        y = y / this.upscale;
        var targetLeft = x / this.width - 0.5;
        var targetTop = y / this.height - 0.5;
        this.offsetLeft += targetLeft * this.rangeLeft * this.maxLeftRange;
        this.offsetTop += targetTop * this.rangeTop * this.maxTopRange;
        this.rangeLeft /= factor;
        this.rangeTop /= factor;
        this.offsetLeft += this.rangeLeft * this.maxLeftRange / 2;
        this.offsetTop += this.rangeTop;
        this.render();
    }
};

Ingemi.prototype.reset = function () {
    this.rangeLeft = 1;
    this.rangeTop = 1;
    this.offsetLeft = 0;
    this.offsetTop = 0;
};

Ingemi.prototype.scale = function(upscale) {
    this.upscale = upscale;
    this.scaleCanvas();
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
 * @export Ingemi.prototype.reset as window.Ingemi.prototype.reset
 */
Ingemi.prototype['reset'] = Ingemi.prototype.reset;
/**
 * @export Ingemi.prototype.scale as window.Ingemi.prototype.scale
 */
Ingemi.prototype['scale'] = Ingemi.prototype.scale;
})();