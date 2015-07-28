CC=cc
CFLAGS=-O2
CPPFLAGS=-DHAVE_ZFS
BINS=../fs.elf ../disk.elf

all::	$(BINS)

../fs.elf:	fs.c
	$(CC) $(CPPFLAGS) $(CFLAGS) -o $@ fs.c -lzfs -lzfs_core -luutil -lgeom

../disk.elf:	disk.c
	$(CC) $(CPPFLAGS) $(CFLAGS) -o $@ disk.c -ldevstat

clean::
	/bin/rm -f $(BINS)
