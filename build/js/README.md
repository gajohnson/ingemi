ingemi
======
        <script type='text/javascript' src='js/ingemi.js'></script>


        <h1>Writing fast, non-blocking JavaScript with Web Workers and Typed Arrays</h1>
        <a href="demo.html"><div id='ingemi'></div></a>
        <script type='text/javascript'>
            var parentDiv = document.getElementById('ingemi');
            var ingemi = new Ingemi(parentDiv, {
                minStdDev: 20,
                sample: 0.5,
                maxIteration: 100
            });
            ingemi.init();
            ingemi.random();
            var iteration = 0;
            var demoLoop = function() {
                ingemi.zoom(1/1.005);
                iteration++;
                if (iteration > 200) {
                    iteration = 0;
                    setTimeout(function(){
                        ingemi.random();
                        demoLoop();
                    }, 500);
                } else setTimeout(demoLoop, 120);
            };
            demoLoop();
        </script>

Copyright (C) 2012 Geoffrey Johnson

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.