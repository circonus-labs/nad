//WMI agent for Nad.
//Note: Throughout, we exit(0)... if we exit with an error condition,
//Nad will think there's an error and discard the script, which we don't
//want to do.

var fs = require('fs'),
    spawn = require('child_process').spawn,
    configfile = "default.json",
    total_commands = 0,
    commands_finished = 0,
    data_points = {};

function help(err) {
  console.log(process.argv[1] + "\n" +
              "\t-h\t\t\tthis help message\n" +
              "\t-c <config file>\tconfiguration file\n"
             );

  if(err) {
    console.log("\nError: " + err + "\n");
    process.exit(0);
  }

}

function readconfig(config) {
  try {
    var lines = fs.readFileSync(config, 'utf8').split('\n');
    return lines;
  }
  catch(e) { }
  return null;
}

function convert_config_to_commands(config_array) {
  try {
    var return_array = [];
    var command_index = 0;
    var length = 0;

    for (var i in config_array) {
      var trimmed = config_array[i].trim();
      if (trimmed.match(/^.*\(\*\).*$/)) {
        console.log("ERROR: Wildcards not allowed (" + trimmed + ")");
        process.exit(0);
      }
      if (trimmed !== "") {
        var command = "\"" + trimmed + "\"";
        if (!return_array[command_index]) {
          length = "typeperf -sc 1 ".length + trimmed.length + 7;
          return_array[command_index] = ["-sc", "1", trimmed];
        }
        else if (length < 21500) {
          length += trimmed.length + 3;
          return_array[command_index].push(trimmed);
        }
        else {
          command_index++;
          length = "typeperf -sc 1 ".length + trimmed.length + 7;
          return_array[command_index] = ["-sc", "1", trimmed];
        }
      }
    }
    total_commands = command_index + 1;
    return return_array;
  }
  catch(e) { }
  total_commands = 0;
  return null;
}

function guess_data_type(value) {
  if (value.match(/^[-+]?[0-9]*\.[0-9]+$/)) {
    //we're a decimal value
    return "n";
  }
  else if (value.match(/^[-+]?[0-9]+$/)) {
    //we're an integer
    return "l";
  }
  //we're a string
  return "s";
}

function finalize_nad_output() {
  var results = {};
  for(var prop in data_points) {
    results[prop] = { '_type': guess_data_type(data_points[prop]),
                      '_value': data_points[prop]
    };
  }
  console.log(JSON.stringify(results));
}

function process_output(output, args, tries) {
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
    commands_finished++;
    if (commands_finished == total_commands) {
      finalize_nad_output();
    }
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
        data_points[split_header[i]] = split_data[i];
      }
      commands_finished++;
      if (commands_finished == total_commands) {
        finalize_nad_output();
      }
    }
    else {
      //We failed for some reason... just try again
      tries++;
      if (tries < 5) {
        run_command(args, tries);
      }
      else {
        //We failed 5 times and never got anything back...
        //time to give up
        commands_finished++;
        if (commands_finished == total_commands) {
          finalize_nad_output();
        }
      }
    }
  }
}

function run_command(args, tries) {
  var data = "",
      cmd = spawn('typeperf', args);
  cmd.stdout.on('data', function(buff) {
    data = data + buff;
  });
  cmd.stdout.on('end', function() {
    process_output(data, args, tries);
  });
}

for(var i=2; i<process.argv.length; i++) {
  switch(process.argv[i]) {
    case "-h": help(); process.exit(0);
    case "-c": configfile = process.argv[++i]; break;
    default: help("unknown argument: " + process.argv[i]);
  }
}

var config_array = readconfig(configfile);
if (config_array == null) {
  console.log("ERROR: Invalid Config File");
  process.exit(0);
}
var command_array = convert_config_to_commands(config_array);
if (command_array == null) {
  console.log("ERROR: Invalid Config File");
  process.exit(0);
}

commands_finished = 0;

for (var i in command_array) {
  run_command(command_array[i], 0);
}
