(function (){
/*
 * Ingemi
 */

// Constructor
function Ingemi (args) {

    // Bootstrap the page
    args = args || {};
    this.ensureParent();
    this.makeCanvas();
    
    // Set viewport and rendering defaults
    this.upscale = args.upscale || 1;
    this.rangeLeft = args.rangeLeft || 1;
    this.rangeTop = args.rangeTop || 1;
    this.offsetLeft = args.offsetLeft || 0;
    this.offsetTop = args.offsetTop || 0;
    this.maxIteration = args.maxIteration || 255;

    // Set internal canvas scale
    this.scaleCanvas();

    // Initialize zoom controller
    this.zoomer = new IngemiZoom(this);

    // Render the current view
    this.render();
}

// Get and ensure the container for ingemi. Size and position of the canvas element will be
// determined from this element. If it does not exist, we cannot proceed.
Ingemi.prototype.ensureParent = function () {
    this.parentDiv = document.getElementById('ingemi');
    if (!this.parentDiv) {
        throw new Error('You must include "<div id=\'ingemi\'></div>" in your markup');
    }
};

// Create a canvas in the parent div and inherit its size
Ingemi.prototype.makeCanvas = function () {
    this.canvas = document.createElement('canvas');
    this.parentDiv.appendChild(this.canvas);
    this.context = this.canvas.getContext('2d');
    this.clientWidth = this.parentDiv.clientWidth;
    this.clientHeight = this.parentDiv.clientHeight;
    this.canvas.style.width = this.clientWidth + 'px';
    this.canvas.style.height =  this.clientHeight + 'px';
};

// Set the internal size of the canvas element
Ingemi.prototype.scaleCanvas = function () {
    this.width = this.canvas.width = Math.floor(this.clientWidth / this.upscale);
    this.height = this.canvas.height = Math.floor(this.clientHeight / this.upscale);
    this.image = this.context.createImageData(this.width, this.height);
    this.totalPixels = this.width * this.height;
};

// Render the entire scene using the current viewport and canvas
Ingemi.prototype.render = function () {
    this.timer = new Date().getTime();
    this.renderedPixels = 0;
    this.renderedPixelsInRow = 0;
    this.currentRow = 0;
    this.renderRow();
};

// Render one row asynchronously - TODO convert to static sized blocks
Ingemi.prototype.renderRow = function () {
    var j;
    for (j = 0; j < this.height; j += 1) {
        this.setPixel(this.currentRow, j);
    }
};

// Asynchronously determine and set pixel (left, top)
// and internally check if we are done rendering either a row (TODO - block) or image
Ingemi.prototype.setPixel = function (left, top) {
    var _this = this;
    setTimeout(function () {
        var pos = _this.gridToLine(left, top) * 4;
        var value = _this.getValue(left, top);
        _this.setPixelColor(pos, value);
        _this.renderedPixels += 1;
        _this.renderedPixelsInRow += 1;
        if (_this.renderedPixels == _this.totalPixels) {
            _this.context.putImageData(_this.image, 0, 0);
            _this.logStats();
        } else if (_this.renderedPixelsInRow === _this.height) {
            _this.currentRow += 1;
            _this.renderedPixelsInRow = 0;
            _this.renderRow();
        }
    }, 0);
};

// Map an integer [0...maxIteration] into some rgb spectrum
// and write it to the imageData array
Ingemi.prototype.setPixelColor = function(pos, value) {
    if (this.maxIteration > 255) {
        value = Math.floor(value/maxIteration) * 255;
    }
    this.image.data[pos] = value;
    this.image.data[pos+1] = value;
    this.image.data[pos+2] = value;
    this.image.data[pos+3] = 255;
};

// Main logic for Mandelbrot generation
// TODO - Abstract out for more fractal types
Ingemi.prototype.getValue = function (left, top) {
    var scaledX = (this.rangeLeft * 3.5 * left / this.width) - 2.5 + this.offsetLeft;
    var scaledY = (this.rangeTop * 2 * top / this.height) - 1 + this.offsetTop;
    if (this.isInCartoid(scaledX, scaledY)) {   // Optimize against inner cartoid
        return this.maxIteration;
    } else {
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
    }
};

// Simple optimization to prevent computing to maximum iteration in the center
// of the unzoomed Mandelbrot set
Ingemi.prototype.isInCartoid = function (left, top) {
    var p = Math.pow(left - 0.25, 2) + (top * top);
    var q = Math.sqrt(p);
    return left <= q - (2 * p) + 0.25;
};

// Convert cartesian coordinates to a one-dimensional index
Ingemi.prototype.gridToLine = function (left, top) {
    return top * this.width + left;
};

// Log timing statistics
Ingemi.prototype.logStats = function() {
    console.log(
        'Rendered ' + this.width + ' * ' + this.height + ' pixels in ' +
        ((new Date().getTime() - this.timer)/1000) + ' seconds.'
    );
};


/*
 * IngemiZoom
 */
function IngemiZoom (fractal) {
    this.fractal = fractal;
    this.binds();
}

IngemiZoom.prototype.binds = function () {
    var _this = this;
    this.fractal.parentDiv.addEventListener("click", function (e) {
        _this.handleClick(e.pageX, e.pageY);
    });
};

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

window.Ingemi = Ingemi;
})();