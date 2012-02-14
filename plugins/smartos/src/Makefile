CC=gcc

all:	../aggcpu.elf ../fs.elf

../aggcpu.elf:	aggcpu.c
	$(CC) -o $@ aggcpu.c -lkstat

../fs.elf:	fs.c
	$(CC) -m64 -D_LARGEFILE64_SOURCE -o $@ fs.c 
