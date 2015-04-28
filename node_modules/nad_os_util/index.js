var os   = require('os'),
    exec = require('child_process').exec;


exports.lookup_hostname = function (callback) {
    var os_type = os.type();

    var process_hostname = function(error, stdout, stderr) {
        if ( error != null ) {
            console.error("Could not look up hostname: " + error);
            process.exit(1);
        }
        callback( stdout.replace(/\n/g, "") );
    };

    if ( os_type === 'SunOS' ) {
        exec("/usr/bin/zonename", process_hostname );
        return;
    } 

    if ( os_type === 'Linux' || os_type === 'FreeBSD' ) {
        exec("/bin/hostname", process_hostname );
        return;
    }

    console.log("don't know what I am supposed to look up");
}

