#!/bin/bash
#
# SCRIPT OUTPUT
#
# Executables in the configdir write metrics to standard output.
# These can have either be tab separated, or as JSON documents.
#
# If you elect to product JSON formatted output in your programs, you
# must provide a JSON object whose keys have values that look so:
#
#    { "_type": <metric_type>, "_value": <metric_value> }
#
# Valid <metric_type>s are:
#
#     i - indicating a signed 32bit integer value,
#
#     I - indicating an unsigned 32bit integer value,
#
#     l - indicating a signed 64bit integer value,
#
#     L - indicating an unsigned 64bit integer value,
#
#     n - indicating a value to be represented as a double, or
#
#     s - indicating the the value is a string.
#
#
# Numeric <metric_value>s can be provided as JSON number or string.  This
# is in order to allow ensure that very large, and high prevision
# values, that exceed the float/int32 range, can be safely submitted
# to the system.
#
cat <<EOF
{
    "number": 123,
    "test":   "a text string",
    "bignum_as_string": "281474976710656",
    "container": { "key1" : 12345 },
    "array": [
        20,
        "string",
        { "crazy": "like a fox" }
    ],
    "testingtypedict": { "_type": "L", "_value": "12398234" },
    "histogram_list":   { "_type": "n", "_value": [102,304,512,23,12,241,142,543] },
    "histogram_bucket_list":   { "_type": "n", "_value": ["H[1]=1","H[2]=2","H[3]=1"] }
}
EOF
