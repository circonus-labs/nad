var fs = require('fs');

function init_debug(script_name, debug_dir) {
  var debug_file = debug_dir + "/" + script_name + ".nad_debug";
  try {
    var exists = fs.existsSync(debug_file);
    if (exists) {
      fs.unlinkSync(debug_file);
    }
  }
  catch (e) {
    console.log("Error checking for debug file " + debug_file);
    console.log(e);
  }
}

function write_debug_output(script_name, debug_lines, debug_dir, wipe_debug_dir) {
  var debug_file = debug_dir + "/" + script_name + ".nad_debug";
  try {
    if (wipe_debug_dir) {
      init_debug(script_name, debug_dir);
    }
    var output = "-----START RECORD-----\n" + debug_lines.join('\n') + "\n-----END RECORD-----\n";
    fs.appendFile(debug_file, output);
  }
  catch (e) {
    console.log("Error writing to debug file " + debug_file);
    console.log(e);
  }
}

exports.init_debug = init_debug;
exports.write_debug_output = write_debug_output;
