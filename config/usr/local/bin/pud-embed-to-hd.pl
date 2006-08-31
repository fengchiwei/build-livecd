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

print "Modify $target/boot.ini ...";
!system("perl -pi -e 's!timeout=30!timeout=10!' $target/boot.ini") or die "$!\n";
!system(qq{echo 'c:\\grldr="PUD GNU/Linux"' >> $target/boot.ini}) or die "$!\n";
print "OK.\n";

print "Copy all necessary files (this may take a while) ...";
!system("cp -rf /cdrom/casper/ /cdrom/vmlinuz /usr/local/share/embed/menu.lst /usr/local/share/embed/grldr $target") or die "$!\n";
print "OK.\n";

print "Make new initrd ...";
!system("mkdir /tmp/new_initrd") or die "$!\n";
chdir '/tmp/new_initrd';
!system("cat /cdrom/initrd.gz | gzip -d | cpio -i") or die "$!\n";
!system("cp -f /usr/local/share/embed/casper scripts/") or die "$!\n";
!system("cp -rf /lib/modules/2.6.15-23-386/kernel/fs/ntfs/ lib/modules/2.6.15-23-386/kernel/fs/") or die "$!\n";
!system("find | cpio -H newc -o | gzip > $target/initrd.gz") or die "$!\n";
print "OK.\n";
!system("rm -rf /tmp/new_initrd") or die "$!\n";

print "Done. You can reboot and try embedded PUD GNU/Linux. \n";

} else {
print "Can not find any bootable W32 partition with 'boot.ini', abort.\n";
}
