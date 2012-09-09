#!/bin/bash

OUT_DIR=~/Sites/ingemi

echo "Cleaning up old builds ..."
rm -rf ./build/*
rm -rf $OUT_DIR/*

echo "Staging static assets"
cp -r ./assets/css ./build
cp -r ./assets/html/* ./build/
cp -r ./assets/js ./build

if [ "$1" == debug ]; then
echo "Debug flag set ..."
else
echo "Compiling javascript ..."

cd closure-compiler

cp ../assets/js/ingemi.js ./ingemi.js && \
java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --js ingemi.js --js_output_file ingemi.min.js && \
rm ingemi.js && \
mv ingemi.min.js ../build/js/ingemi.js

cp ../assets/js/w.mandelbrot.js ./w.mandelbrot.js && \
java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --js w.mandelbrot.js --js_output_file w.mandelbrot.min.js && \
rm w.mandelbrot.js && \
mv w.mandelbrot.min.js ../build/js/w.mandelbrot.js

echo "Ingemi compiled successfully"
cd ..
fi

echo "Generating documentation ..."

cd jsdoc3

mkdir -p ../build/docs && \
./jsdoc -r -t templates/blog -d ../build/docs/ ../assets/js/*

cd ..

cp -r ./build/* $OUT_DIR/