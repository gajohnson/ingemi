var worker = new Worker('thread.js');
var buffer = new ArrayBuffer(200000000); // 200 MB = 50 million float32s                        
worker.onmessage = function(evt) {
  var buffer = evt.data.response;
  if (evt.data.idx == 999) {
    var fa = new Float32Array(buffer);
    var sum = 0;
    for (var i=0; i<1000; i++) sum += fa[i];
    console.log('sum: '+sum);
    console.log('amount of data passed: '+((evt.data.idx+1)*buffer.byteLength / 1e9)+' GB');
  } else {
    // second arg to webkitPostMessage is an array of objects to                             
    // yield to the receiver                                                                 
    worker.webkitPostMessage({buffer: buffer, idx: evt.data.idx+1}, [buffer]);
  }
};
// send initial message of 1000x pingpong                                                     
worker.onmessage({data:{response: buffer, idx: -1}});
// you should get sum: 1000 in the console  