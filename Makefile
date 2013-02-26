PREFIX=/opt/circonus
MAN=$(PREFIX)/man/man8
SBIN=$(PREFIX)/sbin
CONF=$(PREFIX)/etc/node-agent.d
MODULES=$(PREFIX)/etc/node_modules

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
