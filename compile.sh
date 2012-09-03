#!/bin/bash

OUT_DIR=~/Sites/ingemi

if [ "$1" == debug ]; then
cp ./js/ingemi.js $OUT_DIR/
cp ./js/w.mandelbrot.js $OUT_DIR/
else
echo "Compiling javascript ..."

cd closure-compiler

cp ../js/ingemi.js ./ingemi.js && \
java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --js ingemi.js --js_output_file ingemi.min.js && \
rm ingemi.js
mv ingemi.min.js $OUT_DIR/ingemi.js

cp ../js/w.mandelbrot.js ./w.mandelbrot.js && \
java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --js w.mandelbrot.js --js_output_file w.mandelbrot.min.js && \
rm w.mandelbrot.js
mv w.mandelbrot.min.js $OUT_DIR/w.mandelbrot.js

echo "Ingemi compiled successfully"
cd ..
fi

echo "Generating documentation ..."

cd _jsdoc-toolkit

java -jar jsrun.jar app/run.js -a -t=templates/jsdoc ../js/ingemi.js && \
rm -rf ../docs && \
mkdir ../build/docs && \
mv ./out/jsdoc/* ../build/docs/ && \
rm -rf ./out

cd ..

cp -r $OUT_DIR/* ./build/