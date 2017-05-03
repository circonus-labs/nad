#include <kstat.h>
#include <stdio.h>
#include <strings.h>
#include <inttypes.h>
#include <sys/sysinfo.h>

#define CSSUM(name) sum.cpu_sysinfo.name += cpu.cpu_sysinfo.name
#define CVSUM(name) sum.cpu_vminfo.name += cpu.cpu_vminfo.name
#define PRINT_CSSUM(name) do { \
  printf("cpu_stat:all:sys:%s\tL\t%llu\n", #name, sum.cpu_sysinfo.name); \
} while(0)
#define PRINT_NORM_CSSUM(name) do { \
  printf("cpu_stat:all:sys:%s\tL\t%llu\n", #name, sum.cpu_sysinfo.name); \
  printf("cpu_stat:sys:%s\tn\t%llu\n", #name, sum.cpu_sysinfo.name/ncpus); \
} while(0)
#define PRINTN_CSSUM(pname, name) do { \
  printf("cpu_stat:all:sys:%s\tL\t%llu\n", #pname, sum.cpu_sysinfo.name); \
} while(0)
#define PRINTN_NORM_CSSUM(pname, name) do { \
  printf("cpu_stat:all:sys:%s\tL\t%llu\n", #pname, sum.cpu_sysinfo.name); \
  printf("cpu_stat:sys:%s\tL\t%llu\n", #pname, sum.cpu_sysinfo.name/ncpus); \
} while(0)
#define PRINT_CVSUM(name) do { \
  printf("cpu_stat:all:vm:%s\tL\t%llu\n", #name, sum.cpu_vminfo.name); \
} while(0)
#define PRINTN_CVSUM(pname, name) do { \
  printf("cpu_stat:all:vm:%s\tL\t%llu\n", #pname, sum.cpu_vminfo.name); \
} while(0)

int main(int argc, char **argv) {
  kstat_ctl_t   *kc;
  kstat_t       *ksp;
  kstat_io_t     kio;
  kstat_named_t *knp;
  int ncpus = 0;
  cpu_stat_t sum;
  cpu_stat_t cpu;

  memset(&sum, 0, sizeof(sum));
  kc = kstat_open();
  ksp = kstat_lookup(kc, "cpu_stat", -1, NULL);
  for (; ksp != NULL; ksp = ksp->ks_next) {
    if(!strcmp(ksp->ks_module, "cpu_stat")) {
      ncpus++;
      kstat_read(kc,ksp,&cpu);
      CSSUM(cpu[CPU_IDLE]);
      CSSUM(cpu[CPU_USER]);
      CSSUM(cpu[CPU_KERNEL]);
      CSSUM(cpu[CPU_WAIT]);
      CSSUM(wait[W_IO]);
      CSSUM(wait[W_SWAP]);
      CSSUM(wait[W_PIO]);
      CSSUM(bread);
      CSSUM(bwrite);
      CSSUM(lread);
      CSSUM(lwrite);
      CSSUM(phread);
      CSSUM(phwrite);
      CSSUM(pswitch);
      CSSUM(trap);
      CSSUM(intr);
      CSSUM(syscall);
      CSSUM(sysread);
      CSSUM(syswrite);
      CSSUM(sysfork);
      CSSUM(sysvfork);
      CSSUM(sysexec);
      CSSUM(readch);
      CSSUM(writech);
      CSSUM(rcvint);
      CSSUM(xmtint);
      CSSUM(mdmint);
      CSSUM(rawch);
      CSSUM(canch);
      CSSUM(outch);
      CSSUM(msg);
      CSSUM(sema);
      CSSUM(namei);
      CSSUM(ufsiget);
      CSSUM(ufsdirblk);
      CSSUM(ufsipage);
      CSSUM(ufsinopage);
      CSSUM(inodeovf);
      CSSUM(fileovf);
      CSSUM(procovf);
      CSSUM(intrthread);
      CSSUM(intrblk);
      CSSUM(idlethread);
      CSSUM(inv_swtch);
      CSSUM(nthreads);
      CSSUM(cpumigrate);
      CSSUM(xcalls);
      CSSUM(mutex_adenters);
      CSSUM(rw_rdfails);
      CSSUM(rw_wrfails);
      CSSUM(modload);
      CSSUM(modunload);
      CSSUM(bawrite);
      CVSUM(pgrec);
      CVSUM(pgfrec);
      CVSUM(pgin);
      CVSUM(pgpgin);
      CVSUM(pgout);
      CVSUM(pgpgout);
      CVSUM(swapin);
      CVSUM(pgswapin);
      CVSUM(swapout);
      CVSUM(pgswapout);
      CVSUM(zfod);
      CVSUM(dfree);
      CVSUM(scan);
      CVSUM(rev);
      CVSUM(hat_fault);
      CVSUM(as_fault);
      CVSUM(maj_fault);
      CVSUM(cow_fault);
      CVSUM(prot_fault);
      CVSUM(softlock);
      CVSUM(kernel_asflt);
      CVSUM(pgrrun);
      CVSUM(execpgin);
      CVSUM(execpgout);
      CVSUM(execfree);
      CVSUM(anonpgin);
      CVSUM(anonpgout);
      CVSUM(anonfree);
      CVSUM(fspgin);
      CVSUM(fspgout);
      CVSUM(fsfree);
    }
  }

  PRINTN_NORM_CSSUM(cpu_idle, cpu[CPU_IDLE]);
  PRINTN_NORM_CSSUM(cpu_user, cpu[CPU_USER]);
  PRINTN_NORM_CSSUM(cpu_kernel, cpu[CPU_KERNEL]);
  PRINTN_NORM_CSSUM(cpu_wait, cpu[CPU_WAIT]);
  PRINTN_NORM_CSSUM(wait_io, wait[W_IO]);
  PRINTN_NORM_CSSUM(wait_swap, wait[W_SWAP]);
  PRINTN_NORM_CSSUM(wait_pio, wait[W_PIO]);
  PRINT_CSSUM(bread);
  PRINT_CSSUM(bwrite);
  PRINT_CSSUM(lread);
  PRINT_CSSUM(lwrite);
  PRINT_CSSUM(phread);
  PRINT_CSSUM(phwrite);
  PRINT_CSSUM(pswitch);
  PRINT_CSSUM(trap);
  PRINT_CSSUM(intr);
  PRINT_CSSUM(syscall);
  PRINT_CSSUM(sysread);
  PRINT_CSSUM(syswrite);
  PRINT_CSSUM(sysfork);
  PRINT_CSSUM(sysvfork);
  PRINT_CSSUM(sysexec);
  PRINT_CSSUM(readch);
  PRINT_CSSUM(writech);
  PRINT_CSSUM(rcvint);
  PRINT_CSSUM(xmtint);
  PRINT_CSSUM(mdmint);
  PRINT_CSSUM(rawch);
  PRINT_CSSUM(canch);
  PRINT_CSSUM(outch);
  PRINT_CSSUM(msg);
  PRINT_CSSUM(sema);
  PRINT_CSSUM(namei);
  PRINT_CSSUM(ufsiget);
  PRINT_CSSUM(ufsdirblk);
  PRINT_CSSUM(ufsipage);
  PRINT_CSSUM(ufsinopage);
  PRINT_CSSUM(inodeovf);
  PRINT_CSSUM(fileovf);
  PRINT_CSSUM(procovf);
  PRINT_CSSUM(intrthread);
  PRINT_CSSUM(intrblk);
  PRINT_CSSUM(idlethread);
  PRINT_CSSUM(inv_swtch);
  PRINT_CSSUM(nthreads);
  PRINT_CSSUM(cpumigrate);
  PRINT_CSSUM(xcalls);
  PRINT_CSSUM(mutex_adenters);
  PRINT_CSSUM(rw_rdfails);
  PRINT_CSSUM(rw_wrfails);
  PRINT_CSSUM(modload);
  PRINT_CSSUM(modunload);
  PRINT_CSSUM(bawrite);
  PRINT_CVSUM(pgrec);
  PRINT_CVSUM(pgfrec);
  PRINT_CVSUM(pgin);
  PRINT_CVSUM(pgpgin);
  PRINT_CVSUM(pgout);
  PRINT_CVSUM(pgpgout);
  PRINT_CVSUM(swapin);
  PRINT_CVSUM(pgswapin);
  PRINT_CVSUM(swapout);
  PRINT_CVSUM(pgswapout);
  PRINT_CVSUM(zfod);
  PRINT_CVSUM(dfree);
  PRINT_CVSUM(scan);
  PRINT_CVSUM(rev);
  PRINT_CVSUM(hat_fault);
  PRINT_CVSUM(as_fault);
  PRINT_CVSUM(maj_fault);
  PRINT_CVSUM(cow_fault);
  PRINT_CVSUM(prot_fault);
  PRINT_CVSUM(softlock);
  PRINT_CVSUM(kernel_asflt);
  PRINT_CVSUM(pgrrun);
  PRINT_CVSUM(execpgin);
  PRINT_CVSUM(execpgout);
  PRINT_CVSUM(execfree);
  PRINT_CVSUM(anonpgin);
  PRINT_CVSUM(anonpgout);
  PRINT_CVSUM(anonfree);
  PRINT_CVSUM(fspgin);
  PRINT_CVSUM(fspgout);
  PRINT_CVSUM(fsfree);

  return 0;
}
