CC=gcc
HAVE_LOGICALUSED:=$(shell grep ZFS_PROP_LOGICALUSED /usr/include/sys/fs/zfs.h)
CFLAGS+=-D_LARGEFILE64_SOURCE
ifeq ($(HAVE_LOGICALUSED),)
	# you don't have these properties
else
	CFLAGS+=-DHAVE_LOGICAL_USED
endif

all:	../aggcpu.elf ../cpu.elf ../fs.elf ../zpoolio.elf

../aggcpu.elf:	aggcpu.c
	$(CC) -o $@ aggcpu.c -lkstat

../cpu.elf:	cpu.c
	$(CC) -o $@ cpu.c -lkstat

../fs.elf:	fs.c
	$(CC) -m64 $(CFLAGS) -o $@ fs.c -lzfs

../zpoolio.elf:	zpoolio.c
	$(CC) -m64 -o $@ zpoolio.c -lzfs -lnvpair
