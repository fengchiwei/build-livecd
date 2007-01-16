#!/usr/bin/perl
# pud-embed-to-hd.pl - embedding PUD GNU/Linux to Win32 partition

# Copyright 2006 by 
# Pin-Shiun Chen (penkia) <penkia@gmail.com>

# This program is free software; 
# you can redistribute it and/or modify it under the same terms as Perl itself.
# See http://www.perl.com/perl/misc/Artistic.html

use strict; 
use warnings;
my @disk = `fdisk -l`;
my $target;
foreach (@disk) {
next unless /^\/dev\/(\w+)\s/;
my $device = $1;
$target = "/mnt/$device" if -e "/mnt/$device/boot.ini";
}

if ($target) {
print "Now embedding PUD to $target...\n";

my $tmp = `grep PUD $target/boot.ini`;
if (! defined $tmp) {
print "Modify $target/boot.ini ...";
!system("perl -pi -e 's!timeout=30!timeout=10!' $target/boot.ini") or die "$!\n";
!system(qq{echo 'c:\\grldr="PUD GNU/Linux"' >> $target/boot.ini}) or die "$!\n";
print "OK.\n";
} else {
print "It seems you have embedded before, it will now be upgraded.\n";
}

print "Copy all necessary files (this may take a while) ...";
!system("cp -rf /cdrom/opt/ /cdrom/casper/ /cdrom/initrd.gz /cdrom/vmlinuz /cdrom/misc/embedded/menu.lst /cdrom/misc/embedded/grldr $target") or die "$!\n";
print "OK.\n";

print "Done. You can reboot and try the embedded PUD GNU/Linux. \n";

} else {
print "Can not find any bootable W32 partition with 'boot.ini', abort.\n";
}
