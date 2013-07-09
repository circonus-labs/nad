PREFIX=/opt/circonus
MAN=$(PREFIX)/man/man8
SBIN=$(PREFIX)/sbin
CONF=$(PREFIX)/etc/node-agent.d
MODULES=$(PREFIX)/etc/node_modules
MAKE?=make

all:

install:	install-nad install-man install-plugins install-modules

install-dirs:
	./mkinstalldirs $(DESTDIR)$(MAN)
	./mkinstalldirs $(DESTDIR)$(SBIN)
	./mkinstalldirs $(DESTDIR)$(CONF)
	./mkinstalldirs $(DESTDIR)$(MODULES)

install-nad:	install-dirs
	./install-sh -c -m 0755 nad $(DESTDIR)$(SBIN)/nad

install-man:	install-dirs
	./install-sh -c -m 0644 nad.8 $(DESTDIR)$(MAN)/nad.8

install-plugins:	install-dirs
	rsync -a plugins/ $(DESTDIR)$(CONF)/

install-modules:
	rsync -a node_modules/ $(DESTDIR)$(MODULES)/

install-illumos:	install
	cd $(DESTDIR)$(CONF)/illumos ; $(MAKE)
	cd $(DESTDIR)$(CONF) ; for f in aggcpu.elf cpu.elf fs.elf if.sh sdinfo.sh smf.sh tcp.sh vminfo.sh vnic.sh zfsinfo.sh zone_vfs.sh; do /bin/ln -sf illumos/$$f ; done
	mkdir -p $(DESTDIR)/lib/svc/manifest/network/circonus
	./install-sh -c -m 0644 smf/nad.xml $(DESTDIR)/lib/svc/manifest/network/circonus/nad.xml

install-linux:	install
	cd $(DESTDIR)$(CONF)/linux ; $(MAKE)
	cd $(DESTDIR)$(CONF) ; for f in `/usr/bin/find linux -maxdepth 1 -type f -executable` ; do /bin/ln -sf $$f ; done

install-ubuntu:	install-linux
	./install-sh -c -m 0644 linux-init/defaults $(DESTDIR)/etc/default/nad
	./install-sh -c -m 0755 linux-init/ubuntu-init $(DESTDIR)/etc/init.d/nad

install-rhel:	install-linux
	./install-sh -c -m 0644 linux-init/defaults $(DESTDIR)/etc/sysconfig/nad
	./install-sh -c -m 0755 linux-init/rhel-init $(DESTDIR)/etc/init.d/nad
