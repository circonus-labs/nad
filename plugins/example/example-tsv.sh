#!/bin/bash
#
# SCRIPT OUTPUT
#
# Executables in the configdir write metrics to standard output.
# These can have either use JSON or this tab separated format:
#
# <metric_name>\t<metric_type>\t<value>
#        Indicating the the metric specified has value
#
# <metric_name>\t<metric_type>
#        Indicating the the metric specified has a null value.
#
#
# Valid <metric_type> values are:
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
printf "%s\n" '# { "timeout": 1.12 }' # optional timeout information
printf "%s\t%s\t%s\n" "an_integer_metric" "l" "123456789"
printf "%s\t%s\t%s\n" "a_float_metric"     "n" "1.2345678"
