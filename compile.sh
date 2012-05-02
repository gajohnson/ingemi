#!/bin/bash
cp js/ingemi.js closure-compiler/ingemi.js
cd closure-compiler
java -jar compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --js ingemi.js --js_output_file ingemi.min.js
echo "Ingemi compiled successfully"
rm ingemi.js
mv ingemi.min.js ../demo/