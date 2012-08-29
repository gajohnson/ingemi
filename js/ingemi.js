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
 *     relative to the center of the canvas
 * @property {Float} minStdDev Minimum threshold standard deviation in random images.
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
    this.minStdDev = args['minStdDev'] || 10;

    this.maxIteration = args['maxIteration'] || 255;
    this.blockSize = args['blockSize'] || 2000;

    this.onrender = (typeof args['onrender'] === 'function') ? args['onrender'] : null;

    this.forcedHeight = Math.round(parentDiv.clientWidth * this.maxTopRange / this.maxLeftRange) / parentDiv.clientHeight;

    this.lock = false;
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

    /** Working canvas to avoid clearing the visible image on resample */
    this.scratchCanvas = document.createElement('canvas');
    this.scratchContext = this.scratchCanvas.getContext('2d');

    this.status = document.getElementById('status');
    this.statusX = document.getElementById('x');
    this.statusY= document.getElementById('y');
    this.statusZ = document.getElementById('z');

    /*var _this = this;
    this.statusUpdate = setInterval(function(){
        _this.status.innerText = Math.round(100 * _this.blockOffset / _this.totalPixels);
    }, 1000);*/
};

/**
 * Set the internal size of the canvas element.
 */
Ingemi.prototype.scaleCanvas = function() {
    this.width = Math.floor(this.clientWidth / this.upscale());
    this.height = Math.floor(this.clientHeight / this.upscale());
    this.scratchCanvas.width = this.width;
    this.scratchCanvas.height = this.height;
    this.image = this.scratchContext.createImageData(this.width, this.height);
    this.totalPixels = this.width * this.height;
};

/**
 * Render the entire scene using the current viewport and context.
 */
Ingemi.prototype.render = function() {
    var _this = this;
    setTimeout(function(){
        _this._render();
    }, 0);
};
/**
 * Render the entire scene using the current viewport and context.
 */
Ingemi.prototype._render = function() {
    if (this.lock) return;
    this.lock = true;
    console.time('render');
    this.status.innerText = 0;
    this.statusX.innerText = this.offsetLeft;
    this.statusY.innerText = this.offsetTop;
    this.statusZ.innerText = Math.log(1 / this.scale) / Math.LN2;
    this.renderedPixels = 0;
    this.renderedPixelsInBlock = 0;
    this.blockOffset = 0;
    this.renderBlock();
};

/**
 * Cancel any pending requests for pixels and clean up.
 */
Ingemi.prototype.cancel = function() {

};

/**
 * Render one row asynchronously. Increasing blockSize can potentially
 *     decrease rendering times at the expense of CPU usage.
 */
Ingemi.prototype.renderBlock = function() {
    var lim = this.blockSize + this.blockOffset > this.totalPixels ? this.totalPixels - this.blockOffset : this.blockSize;
    var i;
    for(i = 0; i < lim; i++) {
        var pos = this.blockOffset + i;
        var left = pos % this.width, top = Math.floor(pos/this.width);
        pos = (top * this.width + left) * 4;
        var value = this.getValue(left, top);
        this.setPixelColor(pos, value);
        this.updateCounters();
    }
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
    var iteration;
    var xtemp;
    for(iteration = 0; x*x + y*y < 4 && iteration < this.maxIteration; iteration++) {
        xtemp = x*x - y*y + scaledX;
        y = 2*x*y + scaledY;
        x = xtemp;
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
    var p = (left - 0.25) * (left - 0.25) + (top * top);
    return left <= Math.sqrt(p) - (2 * p) + 0.25;
};

/**
 * Map an integer [0...maxIteration] into some rgb spectrum
 *     and write it to the imageData array.
 * @param {Integer} pos The linear position of the pixel being modified
 * @param {Integer} value The value returned by getValue [1...maxIteration]
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
        this.draw();
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
    this.renderedPixelsInBlock = 0;
    this.renderBlock();
};

/**
 * Draw the final image to the screen.
 */
Ingemi.prototype.draw = function() {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.context.putImageData(this.image, 0, 0);
};

/**
 * Update status, unlock future rendering calls, and finally
 *     call onrender.
 */
Ingemi.prototype.finalize = function() {
    this.status.innerText = 100;
    
    console.timeEnd('render');
    this.lock = false;
    if (this.onrender) this.onrender();
};

/**
 * Set the zoom factor (absolute).
 * @param {Float} factor Multiplier for zoom
 */
Ingemi.prototype.zoom = function(factor) {
    this.scale = factor;
    this.render();
};

/**
 * Center the viewport on (x, y).
 * @param {Integer} x In pixels from the left of the canvas
 * @param {Integer} y In pixels from the top of the canvas
 */
Ingemi.prototype.center = function(x, y) {
    this.offsetLeft += (x / this.upscale() / this.width - 0.5) * this.maxLeftRange * this.scale;
    this.offsetTop += (y / this.upscale() / this.height - 0.5) * this.maxTopRange * this.scale;
    this.render();
};

/**
 * Reset the viewport: offsets and zoom.
 */
Ingemi.prototype.reset = function() {
    this.offsetLeft = 0;
    this.offsetTop = 0;
    this.scale = 1;
};

/**
 * Set scaling factor for higher or lower resolution images.
 * @param {Integer} upscale The scaling factor of the image
 */
Ingemi.prototype.upscale = function(upscale) {
    if (!upscale) return this.upscale_;
    this.upscale_ = upscale;
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
        this.scale = 1 / Math.pow(2, Math.floor(Math.random()*22) + 10)
        this.offsetLeft = this.maxLeftRange * (Math.random() - 0.5);
        this.offsetTop = this.maxTopRange * (Math.random() - 0.5);
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
 * @export Ingemi.prototype.save as window.Ingemi.prototype.save
 */
Ingemi.prototype['save'] = Ingemi.prototype.save;

/**
 * @export Ingemi.prototype.upscale as window.Ingemi.prototype.upscale
 */
Ingemi.prototype['upscale'] = Ingemi.prototype.upscale;

})();