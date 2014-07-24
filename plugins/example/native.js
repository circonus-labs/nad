var mod = function () {
};

mod.prototype.run = function(d, cb, req, args, instance) {
  var data = {
    now: (+ new Date()),
    rand: Math.random()
  };
  cb(d, data, instance);
  d.running = false;
}
module.exports = mod;
