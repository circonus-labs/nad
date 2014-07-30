var util = require('util'),
    da = require('ktap_aggr'),
    fs = require('fs'),
    io = function() { da.apply(this); };

util.inherits(io,da);

io.prototype.probe = function() {
  var dlist = {};
  var dseen = {}
  var devs = fs.readdirSync('/dev');
  for (var i=0; i<devs.length; i++) {
    var s = fs.statSync('/dev/' + devs[i]);
    if(s && s.isBlockDevice()) {
      var major = Math.floor(s.rdev / 256);
      if(!dseen[s.rdev] && major * 256 == s.rdev) {  /* minor == 0 */ 
        dseen[s.rdev] = 1;
        dlist[devs[i]] = s.rdev;
      }
    }
  }


  var script = "var ios = {} \n" +
"var hist = {} \n";

  for (var dname in dlist) {
    script = script + "hist[" + dlist[dname] + "] = {}\n";
  }
  script = script +
"trace block:block_rq_issue { \n" +
"  if (arg2 == 0) { return } \n" +
"  var idx = arg1 * 256 + arg2 \n" +
"  ios[idx] = gettimeofday_us() \n" +
"} \n" +
"trace block:block_rq_complete { \n" +
"  var dev = 256 * (arg0 / 1048576) + arg0 % 256 \n" +
"  if (arg2 == 0) { return } \n" +
"  var idx = arg1 * 256 + arg2 \n" +
"  if (ios[idx] == nil) { return } \n" +
"  var delta = (gettimeofday_us() - ios[idx]) \n" +
"  var te = 0 \n" +
"  var mult = 1 \n" +
"  while (delta > 100) { \n" +
"    delta = delta / 10 \n" +
"    mult = mult * 10 \n" +
"  } \n" +
"  if (hist[dev] != nil) { \n" +
"    hist[dev][delta*mult] += 1 \n" +
"  } \n" +
"  ios[idx] = nil \n" +
"} \n" +
" \n" +
"tick-1s { \n" +
"  printf(\"ts:%d\\n\", gettimeofday_us()) \n";
  for (var dname in dlist) {
    script = script + "  printf(\"key:" + dname + "\\n\") \n" +
                      "  print_hist(hist[" + dlist[dname] + "]) \n" +
                      "  delete(hist[" + dlist[dname] + "]) \n";
  }
  script = script + "}";
  return script;
}
module.exports = io;
