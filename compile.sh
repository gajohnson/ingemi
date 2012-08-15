#!/bin/bash
echo "Generating documentation ..."
cd _jsdoc-toolkit
java -jar jsrun.jar app/run.js -a -t=templates/jsdoc ../js/ingemi.js
rm -rf ../docs
mkdir ../docs
mv ./out/jsdoc/* ../docs/
rm -rf ./out
cd ..
echo "Compiling javascript ..."
cp js/ingemi.js closure-compiler/ingemi.js
cd closure-compiler
java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --js ingemi.js --js_output_file ingemi.min.js
rm ingemi.js
mv ingemi.min.js ../demo/
echo "Ingemi compiled successfully"
