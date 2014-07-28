CC=cc
CFLAGS=
CPPFLAGS=-DHAVE_ZFS

all:	../fs.elf ../disk.elf

../fs.elf:	fs.c
	$(CC) $(CPPFLAGS) $(CFLAGS) -o $@ fs.c -lzfs -lzfs_core -luutil -lgeom

../disk.elf:	disk.c
	$(CC) $(CPPFLAGS) $(CFLAGS) -o $@ disk.c -ldevstat
