#!/bin/bash

which nodetool &>/dev/null || {
    >&2 echo "Unable to find 'nodetool' in path"
    exit 1
}

nodetool cfstats -F json 2>/dev/null

# END
