DESTDIR?=
PREFIX?=/opt/circonus
MAN=$(PREFIX)/man/man8
SBIN=$(PREFIX)/sbin
BIN=$(PREFIX)/bin
LOG=$(PREFIX)/log
ETC=$(PREFIX)/etc
CONF=$(PREFIX)/etc/node-agent.d
MODULES=$(PREFIX)/lib/node_modules
NAD_LIB=$(MODULES)/nad
RUNSTATE_DIR=/var/run
RUNSTATE_FILE=$(RUNSTATE_DIR)/nad.pid
MANIFEST_DIR=/var/svc/manifest/network/circonus
METHOD_DIR=/var/svc/method
MAKE?=make

# centos7 and ubuntu16
SYSTEMD_BIN=$(wildcard /bin/systemctl)
SYSTEMD_DIR=$(wildcard /lib/systemd/system)
# NOTE: upstart is not tracking PIDs consistently across distros
# `expect daemon` - sometimes tracks first pid, sometimes tracks correct pid
# `expect fork` - sometimes tracks first pid, sometimes tracks correct pid
# neither works consistenly, which pid is tracked is random on both centos/ubuntu.
#
# since *both* have switched to systemd, rhel6/ubuntu14 will
# continue to use sysv init...leaving the upstart logic
# in case a viable solution presents.
# centos6 and ubuntu14
UPSTART_BIN=$(wildcard disabled/sbin/initctl)
UPSTART_DIR=$(wildcard disabled/etc/init)

all:

install:	install-nad install-man install-plugins install-modules

install-dirs:
	./mkinstalldirs $(DESTDIR)$(BIN)
	./mkinstalldirs $(DESTDIR)$(SBIN)
	./mkinstalldirs $(DESTDIR)$(ETC)
	./mkinstalldirs $(DESTDIR)$(CONF)
	./mkinstalldirs $(DESTDIR)$(MODULES)
	./mkinstalldirs $(DESTDIR)$(NAD_LIB)
	./mkinstalldirs $(DESTDIR)$(MAN)
	./mkinstalldirs $(DESTDIR)$(RUNSTATE_DIR)

install-nad:	install-dirs
	@# main nad scripts
	/bin/sed \
		-e "s#@@PREFIX@@#$(PREFIX)#g" \
		-e "s#@@PID_FILE@@#$(RUNSTATE_FILE)#g" \
		sbin/nad.sh > sbin/nad.sh.out
	./install-sh -c -m 0644 sbin/nad.js $(DESTDIR)$(SBIN)/nad.js
	./install-sh -c -m 0755 sbin/nad.sh.out $(DESTDIR)$(SBIN)/nad
	@# default configuration file
	/bin/sed \
		-e "s#@@CONF@@#$(CONF)#g" \
		-e "s#@@ETC@@#$(ETC)#g" \
		etc/nad.conf > etc/nad.conf.out
	./install-sh -c -m 0644 etc/nad.conf.out $(DESTDIR)$(ETC)/nad.conf
	@# shell statsd client
	./install-sh -c -m 0755 bin/statsd.sh $(DESTDIR)$(BIN)/statsd.sh

install-man:	install-dirs
	./install-sh -c -m 0644 man/nad.8 $(DESTDIR)$(MAN)/nad.8

install-plugins:	install-dirs
	rsync -a plugins/ $(DESTDIR)$(CONF)/

install-modules:
	PATH="$(PATH):$(DESTDIR)$(PREFIX)/bin" npm install --no-progress
	rsync -a node_modules/ $(DESTDIR)$(MODULES)/
	rsync -a lib/* $(DESTDIR)$(NAD_LIB)/

install-illumos:	install
	@# service manifest
	mkdir -p $(DESTDIR)$(MANIFEST_DIR)
	/bin/sed \
		-e "s#@@PREFIX@@#$(PREFIX)#g" \
		-e "s#@@METHOD_DIR@@#$(METHOD_DIR)#g" \
		smf/nad.xml > smf/nad.xml.out
	./install-sh -c -m 0644 smf/nad.xml.out $(DESTDIR)$(MANIFEST_DIR)/nad.xml
	@# service method
	mkdir -p $(DESTDIR)$(METHOD_DIR)
	/bin/sed \
		-e "s#@@SBIN@@#$(SBIN)#g" \
		-e "s#@@PID_FILE@@#$(RUNSTATE_FILE)#g" \
		smf/circonus-nad > smf/circonus-nad.out
	./install-sh -c -m 0755 smf/circonus-nad.out $(DESTDIR)$(METHOD_DIR)/circonus-nad
	@# illumos binaries and default plugins
	cd $(DESTDIR)$(CONF)/illumos ; $(MAKE)
	cd $(DESTDIR)$(CONF) ; for f in aggcpu.elf cpu.elf fs.elf zpoolio.elf if.sh iflink.sh sdinfo.sh smf.sh tcp.sh udp.sh vminfo.sh vnic.sh zfsinfo.sh zone_vfs.sh; do /bin/ln -sf illumos/$$f ; done
	cd $(DESTDIR)$(CONF) ; /bin/ln -sf common/zpool.sh

install-linux:	install
	@# logging
	./mkinstalldirs $(DESTDIR)$(LOG)
	/bin/sed \
		-e "s#@@LOG@@#$(LOG)#g" \
		linux-init/logrotate > linux-init/logrotate.out
	./install-sh -c -m 0644 linux-init/logrotate.out $(DESTDIR)/etc/logrotate.d/nad
	/bin/sed \
		-e "s#@@BIN@@#$(BIN)#g" \
		-e "s#@@MODULES@@#$(MODULES)#g" \
		-e "s#@@LOG@@#$(LOG)#g" \
		bin/nad-log.sh > bin/nad-log.out
	./install-sh -c -m 0755 bin/nad-log.out $(DESTDIR)$(BIN)/nad-log
	@# linux binaries and default plugins
	cd $(DESTDIR)$(CONF)/linux ; $(MAKE)
	cd $(DESTDIR)$(CONF) ; for f in cpu.sh disk.sh diskstats.sh fs.elf if.sh vm.sh ; do /bin/ln -sf linux/$$f ; done
ifneq ($(wildcard /sbin/zpool),)
	cd $(DESTDIR)$(CONF) ; /bin/ln -sf common/zpool.sh
endif
ifneq ($(SYSTEMD_BIN),)
	cd $(DESTDIR)$(CONF) ; /bin/ln -sf linux/systemd.sh
endif

install-linux-init:	install-linux
ifneq ($(and $(SYSTEMD_BIN), $(SYSTEMD_DIR)),)
	/bin/sed \
		-e "s#@@SBIN@@#$(SBIN)#g" \
		-e "s#@@PID_FILE@@#$(RUNSTATE_FILE)#g" \
		linux-init/systemd.service > linux-init/systemd.service.out
	./install-sh -c -m 0755 linux-init/systemd.service.out $(DESTDIR)/lib/systemd/system/nad.service
else ifneq ($(and $(UPSTART_BIN), $(UPSTART_DIR)),)
	/bin/sed \
		-e "s#@@SBIN@@#$(SBIN)#g" \
		-e "s#@@PID_FILE@@#$(RUNSTATE_FILE)#g" \
		linux-init/upstart > linux-init/upstart.out
	./install-sh -c -m 0644 linux-init/upstart.out $(DESTDIR)/etc/init/nad.conf
else
ifneq ($(wildcard /etc/redhat-release),)
	/bin/sed \
		-e "s#@@SBIN@@#$(SBIN)#g" \
		-e "s#@@PID_FILE@@#$(RUNSTATE_FILE)#g" \
		linux-init/rhel-init > linux-init/initd.out
else ifneq ($(wildcard /etc/debian_version),)
	/bin/sed \
		-e "s#@@SBIN@@#$(SBIN)#g" \
		-e "s#@@PID_FILE@@#$(RUNSTATE_FILE)#g" \
		linux-init/ubuntu-init > linux-init/initd.out
else
	@echo "Unable to determine OS init variant"
	@exit 1
endif
	./install-sh -c -m 0755 linux-init/initd.out $(DESTDIR)/etc/init.d/nad
endif

install-ubuntu:	install-linux-init

install-rhel:	install-linux-init

install-freebsd:	install
	for f in plugins/freebsd/*.sh ; do \
		filename=`echo "$${f}" | /usr/bin/sed -e 's#plugins/##'`; \
		/usr/bin/sed \
			-e "s#@@PREFIX@@#${PREFIX}#g" \
			-e "s#@@CONF@@#${CONF}#g" \
			$${f} > "${DESTDIR}${CONF}/$${filename}"; \
	done
	@# detect if logrotate is installed, preference it over piping to syslog
	@# it is up to the user to ensure logrotate is cron'd correctly
ifeq ($(wildcard /usr/local/etc/logrotate.d),/usr/local/etc/logrotate.d)
	./mkinstalldirs $(DESTDIR)$(LOG)
	/usr/bin/sed \
		-e "s#@@LOG@@#$(LOG)#g" \
		linux-init/logrotate > linux-init/logrotate.out
	./install-sh -c -m 0644 linux-init/logrotate.out $(DESTDIR)/usr/local/etc/logrotate.d/nad
	/usr/bin/sed \
		-e "s#@@SBIN@@#$(SBIN)#g" \
		-e "s#@@PID_FILE@@#$(RUNSTATE_FILE)#g" \
		-e "s#@@SYSLOG@@##g" \
		freebsd-init/nad > freebsd-init/nad.out
else
	/usr/bin/sed \
		-e "s#@@SBIN@@#$(SBIN)#g" \
		-e "s#@@PID_FILE@@#$(RUNSTATE_FILE)#g" \
		-e "s#@@SYSLOG@@#--syslog#g" \
		freebsd-init/nad > freebsd-init/nad.out
endif
	./install-sh -c -m 0755 freebsd-init/nad.out $(DESTDIR)/etc/rc.d/nad
	cd $(DESTDIR)$(CONF)/freebsd ; $(MAKE)
	cd $(DESTDIR)$(CONF) ; for f in cpu.sh disk.elf fs.elf if.sh vm.sh  ; do /bin/ln -sf freebsd/$$f ; done
	A=$(shell /sbin/sysctl kstat.zfs > /dev/null 2>&1 ; echo $$?)
ifeq ($(A),0)
	cd $(DESTDIR)$(CONF) ; /bin/ln -sf zfsinfo.sh ; \
	cd $(DESTDIR)$(CONF) ; /bin/ln -sf common/zpool.sh
endif

install-openbsd:	install
	cd $(DESTDIR)$(CONF)/openbsd ; $(MAKE)
	cd $(DESTDIR)$(CONF) ; for f in cpu.sh fs.elf if.sh ; do /bin/ln -sf openbsd/$$f ; done
	cd $(DESTDIR)$(CONF) ; /bin/ln -sf pf/pf.pl

clean:
	rm -f etc/*.out bin/*.out sbin/*.out freebsd-init/*.out linux-init/*.out smf/*.out
