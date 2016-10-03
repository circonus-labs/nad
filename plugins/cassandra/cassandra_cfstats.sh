#!/bin/bash
which nodetool >/dev/null 2>&1 || exit 1
which awk >/dev/null 2>&1 || exit 1

nodetool cfstats -F json 2>/dev/null
