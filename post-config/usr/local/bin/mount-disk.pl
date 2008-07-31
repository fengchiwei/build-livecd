#!/usr/bin/perl
# mount-disk.pl - PUD GNU/Linux automatic mount script
use strict; 
use warnings;
use Switch;

$ENV{'LC_ALL'} = "zh_TW.UTF8";
$ENV{'LANG'} = "zh_TW.UTF8";
my $fstype;
my @disk = `fdisk -l`;

foreach (@disk) {
next unless /^\/dev\/(\w+)\s/;
my $device = $1;
system("mkdir /mnt/$device") if (! -e "/mnt/$device");

chomp($fstype = `/lib/udev/vol_id -t /dev/$1`);

switch ($fstype) {
case 'ntfs' { 	!system("ntfs-3g /dev/$device /mnt/$device -o noatime,silent,umask=0,locale=zh_TW.utf8") 
		or (rmdir("/mnt/$device")); 
	} 

case 'vfat' { 	!system("mount /dev/$device /mnt/$device -o noatime,iocharset=utf8")
		or (rmdir("/mnt/$device")); 
	}

case /(ext2|ext3)/ { 
		!system("mount -o noatime /dev/$device /mnt/$device")
		or (rmdir("/mnt/$device")); 
	} 

=pod
case 'swap' {
		system("swapon /dev/$device");
		rmdir("/mnt/$device");
		unlink("/home/ubuntu/Desktop/$device.desktop"); 
	}

else 	{
		!system("mount -o noatime /dev/$device /mnt/$device")
		or (rmdir("/mnt/$device") && unlink("/home/ubuntu/Desktop/$device.desktop"));
	}
=cut

}

}
