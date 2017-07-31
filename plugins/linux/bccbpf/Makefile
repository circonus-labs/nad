CC=gcc

all: bpf.elf iolatency.elf

%.elf : %.c
	$(CC) $< -o $@
	chmod +s $@
