#!/bin/bash

echo "Compiling javascript ..."

cd closure-compiler

cp ../js/ingemi.js ./ingemi.js && \
java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --js ingemi.js --js_output_file ingemi.min.js && \
rm ingemi.js
mv ingemi.min.js ~/Sites/ingemi/ingemi.js

cp ../js/w.mandelbrot.js ./w.mandelbrot.js && \
java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --js w.mandelbrot.js --js_output_file w.mandelbrot.min.js && \
rm w.mandelbrot.js
mv w.mandelbrot.min.js ~/Sites/ingemi/w.mandelbrot.js

echo "Ingemi compiled successfully"

cd ..

echo "Staging remaning files"

cp index.html ~/Sites/ingemi/

echo "Generating documentation ..."

cd _jsdoc-toolkit

java -jar jsrun.jar app/run.js -a -t=templates/jsdoc ../js/ingemi.js && \
rm -rf ../docs && \
mkdir ../docs && \
mv ./out/jsdoc/* ../docs/ && \
rm -rf ./out

cd ..