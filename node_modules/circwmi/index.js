var fs = require('fs'),
    dutil = require('debug_util'),
    base32 = require('thirty-two'),
    spawn = require('child_process').spawn;

function process_category_output(output) {
  var lines = output.split('\n'),
      category_array = [];

  for (var i = 0; i < lines.length; i++) {
    var category = lines[i].trim();
    if (category.substring(0, 1) == "\\") {
      var split_category = category.split("\\");
      category = split_category[1];
      if ((category != null) && (category != "")) {
        if ((category_array.length == 0) || (category_array[category_array.length - 1] != category)) {
          category_array.push(category);
        }
      }
    }
  }
  category_array.sort();
  return category_array;
}
function process_metrics(output, data_points) {
  var lines = output.split('\n'),
      start_line = 0,
      found = false;
  //Header will always start with a begin quotation mark; skip
  //lines until we get to the first that starts with one.
  for (start_line=0; start_line < lines.length; start_line++) {
    if (lines[start_line].substring(0, 1) == "\"") {
      found = true;
      break;
    }
  }
  //We didn't get any valid data from this command... just move on
  if (!found) {
    return true;
  }
  else {
    var header = lines[start_line].trim(),
        data = lines[start_line+1].trim(),
        split_header = header.split("\",\""),
        split_data = data.split("\",\""),
        header_array_size = split_header.length - 1,
        array_size = split_data.length - 1,
        i = 0;

    //The header doesn't always match the data for some reason... if it doesn't,
    //run the command again until it does.
    if (header_array_size == array_size) {
      //We have to strip the ending quotation mark off the final array entry
      //I wanted to separate on tabs, but changing the output delimiter on 
      //typeperf ties you to a file and won't let you write to stdout. Sadness.
      split_header[header_array_size] = split_header[header_array_size].substring(0, 
              split_header[header_array_size].length-1);
      split_data[array_size] = split_data[array_size].substring(0, split_data[array_size].length-1);

      //Skip timestamp, start at 1
      for (i = 1; i <= array_size; i++) {
        var m = /^(\\\\[^\\]*)?\\(.*)$/.exec(split_header[i]);
        if (m && m[2]) {
          var key = m[2];
          key = key.replace(/\(([^\)]+)\)\\/g, "`$1`");
          key = key.replace(/\\/g, "`");
          data_points[key] = split_data[i];
        }
        else {
          data_points[split_header[i]] = split_data[i];
        }
      }
      return true;
    }
    else {
      return false;
    }
  }
  return false;
}

function get_categories(res) {
  var set = {},
      data = "",
      send_complete = function() {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify(set));
        res.end();
      },
      cmd = spawn('typeperf', ['-q']);

  cmd.stdout.on('data', function(buff) {
    data = data + buff;
  });
  cmd.stdout.on('end', function() {
    set['categories'] = process_category_output(data);
    send_complete();
  });
}

function get_counters_for_category(res, category, debug_dir, wipe_debug_dir, tries) {
  var set = {},
      data = "",
      decoded = base32.decode(category),
      send_complete = function() {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify(set));
        res.end();
      };
  if (tries == null) tries = 0;
  var cmd = spawn('typeperf', ['-sc', '1', decoded + "\\*"]);
  cmd.stdout.on('data', function(buff) {
    data = data + buff;
  });
  cmd.stdout.on('end', function() {
    var success = process_metrics(data, set);
    if (success == true) {
      if (debug_dir) {
        var i = 0,
            debug_lines = new Array;
        for (key in set) {
          debug_lines[i] = key + "\t" + set[key];
          i++;
        };
        dutil.write_debug_output('wmi', debug_lines, debug_dir, wipe_debug_dir);
      }
      send_complete();
    }
    else {
      tries++;
      if (tries >= 2) {
        set = {};
        send_complete();
      }
      else {
        get_counters_for_category(res, category, tries);
      }
    }
  });
}

exports.get_categories = get_categories;
exports.get_counters_for_category = get_counters_for_category;
