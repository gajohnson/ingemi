#!/bin/bash

OUT_DIR=~/Sites/ingemi

if [ "$1" == debug ]; then
echo "Debug flag set ..."
else
echo "Compiling javascript ..."

cd closure-compiler

cp ../assets/js/ingemi.js ./ingemi.js && \
java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --js ingemi.js --js_output_file ingemi.min.js && \
rm ingemi.js
mv ingemi.min.js ../build/

cp ../js/w.mandelbrot.js ./w.mandelbrot.js && \
java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --js w.mandelbrot.js --js_output_file w.mandelbrot.min.js && \
rm w.mandelbrot.js
mv w.mandelbrot.min.js ../build/

echo "Ingemi compiled successfully"
cd ..
fi

echo "Staging static assets"
cp -r ./assets/css ./build
cp -r ./assets/html/* ./build/
cp -r ./assets/js ./build

echo "Generating documentation ..."

cd _jsdoc-toolkit

java -jar jsrun.jar app/run.js -a -t=templates/jsdoc ../js/ingemi.js && \
rm -rf ../docs && \
mkdir ../build/docs && \
mv ./out/jsdoc/* ../build/docs/ && \
rm -rf ./out

cd ..

cp -r ./build/* $OUT_DIR/