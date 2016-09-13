CC=gcc

all:	../boot_time.elf ../loadavg.elf ../user_logins.elf ../file_stat.elf

../boot_time.elf:	boot_time.c
	$(CC) -o $@ boot_time.c

../file_stat.elf:	file_stat.c
	$(CC) -o $@ file_stat.c

../loadavg.elf:	loadavg.c
	$(CC) -o $@ loadavg.c

../user_logins.elf:	user_logins.c
	$(CC) -o $@ user_logins.c
