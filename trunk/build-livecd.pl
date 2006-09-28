#!/usr/bin/perl
# build-livecd.pl - PUD GNU/Linux Live CD build script

# Copyright 2006 by 
# Pin-Shiun Chen (penkia) <penkia@gmail.com>
# Hiweed Leng (hiweed) <hiweed@gmail.com>

# This program is free software; 
# you can redistribute it and/or modify it under the same terms as Perl itself.
# See http://www.perl.com/perl/misc/Artistic.html

use strict;
use warnings;
use Getopt::Std;

# setting variables
$ENV{'LANG'} = 'C';
$ENV{'LC_ALL'} = 'C';

our(%VAR, %opts, @action, %act); 
getopts('phc:', \%opts);

our($y, $m, $d, $h) = (localtime)[5, 4, 3, 2];
$VAR{'TARGET_DIR'} 	= sprintf("../pud_builddir/lzma-%.4d%.2d%.2d-%.2d", $y+1900, $m+1, $d, $h);
#$VAR{'TARGET_DIR'} 	= sprintf("../pud_builddir/hybrid-%.4d%.2d%.2d", $y+1900, $m+1, $d);
$VAR{'SYSTEM'} 		= $VAR{'TARGET_DIR'}.'/system';
$VAR{'CDROM'} 		= $VAR{'TARGET_DIR'}.'/cdrom';
$VAR{'LEFT'}		= $VAR{'TARGET_DIR'}.'/left';
$VAR{'TEMPLATE'} = 'config';
$VAR{'POST'} = 'post-config';
$VAR{'CDROM-TEMP'} = 'cdrom';
$VAR{'CASPER'} 		= $VAR{'CDROM'}.'/casper';
$VAR{'GRUB'}		= $VAR{'CDROM'}.'/boot/grub';
#$VAR{'ISOLINUX'}	= $VAR{'CDROM'}.'/isolinux';
@action = qw/init bootstrap base_config apt_update apt_install pud_lize apt_clean make_squashfs make_iso test_iso/;
%act = (
'init'		=> sub { &init() },
'bootstrap' 	=> sub { &bootstrap() },
'base_config' 	=> sub { &base_config() },
'apt_update' 	=> sub { &apt_update() },
'apt_install' 	=> sub { &apt_install() },
'pud_lize' 	=> sub { &pud_lize() },
'apt_clean' 	=> sub { &apt_clean() },
'make_squashfs' => sub { &make_squashfs() },
'make_iso' 	=> sub { &make_iso() },
'test_iso'	=> sub { &test_iso() },
);

if ($opts{'h'}) {
	&usage();
} elsif ($opts{'c'}) {
	# check if command exist
	my $count = 1;
	for (@action) {
		$VAR{'CMD'} = $count if $opts{'c'} eq $_;
		$count++;
	}
	if ($VAR{'CMD'}) { 
		# from the command to the end
		for ($VAR{'CMD'}-1 .. $#action) {
			&{$act{$action[$_]}};
		last if $opts{'p'};
		}
	} else {
		print "Error: $opts{'c'} is not a valid command in $0.\n";
	}
} else {
	# auto build: process all 
	&{$act{$_}} for @action;
}

sub do_chroot {
!system("chroot $VAR{'SYSTEM'} $_[0]") or die "$!\n";
}

sub bootstrap {
&system_call("debootstrap --arch i386 dapper $VAR{'SYSTEM'} http://apt.ubuntu.org.tw/ubuntu");
# http://archive.ubuntulinux.org/ubuntu");
}

sub make_dir {
for ($VAR{'SYSTEM'}, $VAR{'CDROM'}, $VAR{'LEFT'}) {
  !system("mkdir -p $_") or die "$!\n";
}
}

sub system_call {
!system("$_[0]") or die "$!\n";
}

sub init {
print "[$0] Initializing $VAR{'TARGET_DIR'}...";
&make_dir();
print "OK.\n"
}

sub base_config {
# pre-config
print "[$0] Copying pre-config files...";
&system_call("cp -a $VAR{'TEMPLATE'}/*  $VAR{'SYSTEM'}/");
print "OK.\n";
&do_chroot('locale-gen');
&do_chroot('mount -t proc /proc proc');
}

sub apt_update {
print "[$0] Updating packages list...\n";
&do_chroot('apt-get update');
print "OK.\n";
}

sub apt_install {
# install packages
open(L, 'install.txt') or die "$!\n"; my $list; for (<L>) { chomp; next if /^#/; $list .= " $_"; } close(L);
  
print "[$0] install packages\n";
&do_chroot("apt-get install --yes --force-yes $list");
&do_chroot('debconf-set-selections /localepurge_preseed.cfg');
&do_chroot("apt-get install --yes --force-yes localepurge");
&do_chroot("rm -f /localepurge_preseed.cfg");
} 
 
sub pud_lize {
# pud-lize
print "[$0] PUD-lize the Live CD system...\n";
&do_chroot('update-alternatives --install /usr/lib/usplash/usplash-artwork.so usplash-artwork.so /usr/lib/usplash/usplash-fixed.so 55');
&do_chroot('dpkg-reconfigure linux-image-2.6.15-26-386');
&do_chroot('rm -f /etc/skel/.bashrc');
&do_chroot('rm -rf /etc/X11/ion3/');
&do_chroot('rm -f /usr/share/ubuntu-artwork/home/index.html');
&do_chroot('ln -s /usr/share/ubuntu-artwork/home/firefox-index.html /usr/share/ubuntu-artwork/home/index.html');
&do_chroot('rm -rf /usr/share/firefox/searchplugins/');
&do_chroot('ln -fs /usr/lib/libesd.so.0 /usr/lib/libesd.so.1');
&do_chroot('ln -s /etc/fonts/conf.d/umingpatch.conf /etc/fonts/conf.d/20-umingpatch.conf');
&do_chroot('mv /etc/rc2.d/S99rc.local /etc/rc2.d/S98rc.local');
&do_chroot('ln -s /etc/init.d/startx /etc/rc2.d/S99startx');
&do_chroot('ln -s /etc/init.d/auto_mount /etc/rc2.d/S99auto_mount');
print "OK.\n";

# post-config
print "[$0] Copying post-config files...";
&system_call("cp -a $VAR{'POST'}/*  $VAR{'SYSTEM'}/");
&do_chroot('dpkg-reconfigure linux-image-2.6.15-26-386');
&do_chroot('updatedb');

print "OK.\n"; 
 
# files for cdrom 
&system_call("cp -a $VAR{'CDROM-TEMP'}/  $VAR{'TARGET_DIR'}/");
&do_chroot('dpkg -l > packages.txt');
&system_call("mv packages.txt $VAR{'CDROM'}/");
}  

sub apt_clean {
# clean up
print "[$0] Clean up the Live CD system...";
&do_chroot('apt-get clean');
&do_chroot('localepurge');
&do_chroot('rm -rf /var/lib/apt/lists/*');
&do_chroot('mkdir /var/lib/apt/lists/partial');
&do_chroot('rm -rf /var/cache/apt/*');
&do_chroot('mkdir -p /var/cache/apt/archives/partial');
  
# remove list
open(R, 'remove.txt') or die "$!\n"; 
my $dir;
for (<R>) { 
  	chomp; 
  	next if /^\s/;
  	if (/^#/) {
  		$dir = (split/ /, $_)[1];
  		&system_call("mkdir $VAR{'LEFT'}/$dir");
  	} else {
  		&system_call("mv $VAR{'SYSTEM'}$_ $VAR{'LEFT'}/$dir/");
  	}
}

close(R);
&do_chroot('umount /proc');
print "OK.\n";
}  

sub make_squashfs {
# compress
&system_call("post-config/usr/sbin/mksquashfs-lzma $VAR{'SYSTEM'} $VAR{'CASPER'}/filesystem.squashfs -info");
}

sub make_iso {
&system_call("cp $VAR{'SYSTEM'}/boot/vmlinuz-* $VAR{'CDROM'}/vmlinuz");
&system_call("cp $VAR{'SYSTEM'}/boot/initrd.img-* $VAR{'CDROM'}/initrd.gz");
#&system_call("cp /usr/lib/syslinux/isolinux.bin $VAR{'ISOLINUX'}/");
  
# &system_call("cp $VAR{'TEMPLATE'}/ubuntu.xpm.gz $VAR{'GRUB'}/");
&system_call("cp /lib/grub/i386-pc/stage2_eltorito $VAR{'GRUB'}/");
# &system_call("cp $VAR{'TEMPLATE'}/menu.lst $VAR{'GRUB'}");
chdir $VAR{'CDROM'};
&system_call("mkisofs -R -l -V 'PUD GNU/Linux' -b boot/grub/stage2_eltorito -no-emul-boot -boot-load-size 4 -boot-info-table -o ../../$VAR{'TARGET_DIR'}.iso .");
#&system_call("mkisofs -R -l -V 'PUD GNU/Linux' -b isolinux/isolinux.bin -c isolinux/boot.cat -no-emul-boot -boot-load-size 4 -boot-info-table -o ../../$VAR{'TARGET_DIR'}.iso .");
}

sub test_iso {
&system_call("qemu -cdrom ../../$VAR{'TARGET_DIR'}.iso &");
}

sub usage {
print 	"Usage: perl build-livecd.pl [OPTION] <command>\n".
	"This is a Live CD build script from PUD GNU/Linux".
	"\nOptions:\n".
	"perl build-livecd.pl  \t\t\tautomatically build\n".
	"perl build-livecd.pl  -c <command>\tstart from the specified command to the end\n".
	"\t\t\t\t\tvalid commands are:\n\t\t\t\t\tinit, bootstrap, base_config, apt_update,\n".
	"\t\t\t\t\tapt_install, pud_lize, apt_clean, make_squashfs, make_iso, test_iso\n".
	"perl build-livecd.pl  -c <command> -p\tprocess the specified command\n";
}
