(function (){
/**
 * Ingemi(nate) - An iterative Mandelbrot set generator in JavaScript.
 * @name Ingemi
 * @class Ingemi
 * @constructor
 * @param {Object} args An argument object to override most defaults. Valid properties are listed below.
 * @property {Integer} upscale Used to strech internal canvas dimensions for fast, low-resolution renders.
 * @property {Float} rangeLeft Width of coordinate system mapped to the canvas (smaller numbers produce zoom).
 * @property {Float} rangeTop Height of coordinate system mapped to the canvas.
 * @property {Float} offsetLeft Horizontal offset of the coordinate system relative to the center of the canvas. Units are the same as rangeLeft.
 * @property {Float} offsetTop Vertical offset of the coordinate system relative to the center of the canvas.
 * @property {Integer} maxIteration Maximum iteration used in escape-velocity calculations. High numbers produce greater color differentiation.
 * @property {Integer} blockSize Number of pixels to render concurrently. Higher values may increase performance at the cost of browser stability.
 * @property {Function} onrender Callback function fired every time a render is completed.
 */
Ingemi = function (args) {

    args = args || {};

    /** Bootstrap the page. */
    this.ensureParent();
    this.makeCanvas();
    
    /** Set viewport and rendering defaults. */
    this.setDefaults(args);

    /** Set internal canvas scale. */
    this.scaleCanvas();

    /**
     * Initialize zoom controller - TODO generalize for different fractals.
     */
    this.zoomer = new IngemiZoom(this);

    /** Render the current view. */
    this.render();
}

/**
 * Get and ensure the container for Ingemi. Size and position of the canvas element will be
 *     determined from this element.
 * @throws Error if markup doesn't contain a node with id 'ingemi'.
 */
Ingemi.prototype.ensureParent = function () {
    this.parentDiv = document.getElementById('ingemi');
    if (!this.parentDiv) {
        throw new Error('You must include "<div id=\'ingemi\'></div>" in your markup');
    }
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
 * @param {Object} args See class definition for valid properties of args.
 */
Ingemi.prototype.setDefaults = function (args) {
    this.upscale = args['upscale'] || 1;
    this.rangeLeft = args['rangeLeft'] || 1;
    this.rangeTop = args['rangeTop'] || 1;
    this.offsetLeft = args['offsetLeft'] || 0;
    this.offsetTop = args['offsetTop'] || 0;
    this.maxIteration = args['maxIteration'] || 255;
    this.blockSize = args['blockSize'] || 2500;
    this.onrender = (typeof args['onrender'] === 'function') ? args['onrender'] : null;
};

/**
 * Set the internal size of the canvas element.
 */
Ingemi.prototype.scaleCanvas = function () {
    this.width = this.canvas.width = Math.floor(this.clientWidth / this.upscale);
    this.height = this.canvas.height = Math.floor(this.clientHeight / this.upscale);
    this.image = this.context.createImageData(this.width, this.height);
    this.totalPixels = this.width * this.height;
};

/**
 * Render the entire scene using the current viewport and context.
 */
Ingemi.prototype.render = function () {
    this.timer = new Date().getTime();
    this.renderedPixels = 0;
    this.renderedPixelsInBlock = 0;
    this.blockOffset = 0;
    this.renderBlock();
};

/**
 * Render one row asynchronously - TODO convert to static sized blocks.
 */
Ingemi.prototype.renderBlock = function () {
    var i;
    var lim = (this.blockSize + this.blockOffset > this.totalPixels) ? this.totalPixels - this.blockOffset : this.blockSize;
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
    var scaledX = (this.rangeLeft * 3.5 * left / this.width) - 2.5 + this.offsetLeft;
    var scaledY = (this.rangeTop * 2 * top / this.height) - 1 + this.offsetTop;
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
 * Increment block- and image-level counters (to deal with asynchronous pixel calculations).
 *     Callback to renderBlock or putImageData when appropriate.
 */
Ingemi.prototype.updateCounters = function () {
    this.renderedPixels += 1;
    this.renderedPixelsInBlock += 1;
    if (this.renderedPixels == this.totalPixels) {
        this.context.putImageData(this.image, 0, 0);
        this.drawAxes();
        if (this.onrender) this.onrender();
    } else if (this.renderedPixelsInBlock === this.blockSize) {
        this.blockOffset += this.blockSize;
        this.renderedPixelsInBlock = 0;
        this.renderBlock();
    }
};

/**
 * Indicate the current frame being rendered. Not yet implemented.
 */
Ingemi.prototype.drawAxes = function () {
    var margin = 30;
    this.context.fillStyle = "rgba(255, 255, 255, 1)";
    this.context.fillRect(0, margin, this.width, 2);
    this.context.fillRect(margin, 0, 2, this.height);
};

/**
 * Log timing statistics.
 */
Ingemi.prototype.logStats = function() {
    console.log(
        'Rendered ' + this.width + ' * ' + this.height + ' pixels in ' +
        ((new Date().getTime() - this.timer)/1000) + ' seconds.'
    );
};


/**
 * A helper class to handle viewport modification in Ingemi.
 * @name IngemiZoom
 * @class IngemiZoom
 * @constructor
 * @param {Ingemi} fractal
 */
IngemiZoom = function (fractal) {
    this.fractal = fractal;
    this.binds();
}

/**
 * Bind all UI events.
 */
IngemiZoom.prototype.binds = function () {
    var _this = this;
    this.fractal.parentDiv.addEventListener("click", function (e) {
        _this.handleClick(e.offsetX, e.offsetY);
    });
};

/**
 * Handle click: center on (x, y) and zoom 2x.
 * @param {Integer} x
 * @param {Integer} y
 */
IngemiZoom.prototype.handleClick = function (x, y) {
    x = x / this.fractal.upscale;
    y = y / this.fractal.upscale;
    var targetLeft = x / this.fractal.width - 0.5;
    var targetTop = y / this.fractal.height - 0.5;
    this.fractal.offsetLeft += targetLeft * this.fractal.rangeLeft * 3.5;
    this.fractal.offsetTop += targetTop * this.fractal.rangeTop * 2;
    this.fractal.rangeLeft /= 2;
    this.fractal.rangeTop /= 2;
    this.fractal.offsetLeft += this.fractal.rangeLeft * 1.75;
    this.fractal.offsetTop += this.fractal.rangeTop;
    this.fractal.render();
};

/**
 * @export Ingemi as window.Ingemi
 */
window['Ingemi'] = Ingemi;

/**
 * @export Ingemi.prototype.render as window.Ingemi.prototype.render
 */
Ingemi.prototype['render'] = Ingemi.prototype.render;

/**
 * @export Ingemi.prototype.logStats as window.Ingemi.prototype.logStats
 */
Ingemi.prototype['logStats'] = Ingemi.prototype.logStats;
})();