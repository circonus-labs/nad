NPM_BIN ?= $(shell which npm 2>/dev/null)
ifeq (,$(NPM_BIN))
ifneq (,$(wildcard /opt/circonus/embedded/bin/npm))
NPM_BIN = /opt/circonus/embedded/bin/npm
else ifneq (,$(wildcard /opt/circonus/bin/npm))
NPM_BIN = /opt/circonus/bin/npm
else
$(error Unable to locate npm command)
endif
endif

install:
	$(NPM_BIN) install --production

.PHONY: clean
clean:
	-rm -rf node_modules
