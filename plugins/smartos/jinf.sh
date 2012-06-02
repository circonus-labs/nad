#!/bin/bash

/opt/local/bin/jinf -p -c | sed -e 's/:/	n	/; s/^/jinf:/'
/opt/local/bin/jinf -p -m | sed -e 's/:/	L	/; s/^/jinf:/'
/opt/local/bin/jinf -p -s | sed -e 's/:/	L	/; s/^/jinf:/'
