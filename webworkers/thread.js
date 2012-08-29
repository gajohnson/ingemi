self.onmessage = function(event) {
  var buffer = event.data.buffer;
  var fa = new Float32Array(buffer);
  fa[event.data.idx]++;
  self.webkitPostMessage({response: buffer, idx: event.data.idx}, [buffer]);
};