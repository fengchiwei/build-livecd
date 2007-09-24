#!/usr/bin/perl
# mount-disk.pl - PUD GNU/Linux automatic mount script
use strict; 
use warnings;
use Switch;

$ENV{'LC_ALL'} = "zh_TW.UTF8";
$ENV{'LANG'} = "zh_TW.UTF8";
my $fstype;
my @disk = `fdisk -l`;
!system("mkdir -p /home/ubuntu/Desktop") or warn "$!\n";
#&mk_home_shortcut();

foreach (@disk) {
next unless /^\/dev\/(\w+)\s/;
my $device = $1;
system("mkdir /mnt/$device") if (! -e "/mnt/$device");
#&mk_shortcut($device);

chomp($fstype = `/lib/udev/vol_id -t /dev/$1`);

switch ($fstype) {
case 'ntfs' { 	!system("ntfs-3g /dev/$device /mnt/$device -o noatime,silent,umask=0,locale=zh_TW.utf8") 
		#!system("ntfsmount /dev/$device /mnt/$device -o show_sys_files,umask=0,locale=zh_TW.UTF8") 
		or (rmdir("/mnt/$device") && unlink("/home/ubuntu/Desktop/$device.desktop")); 
	} 

case 'vfat' { 	!system("mount /dev/$device /mnt/$device -o noatime,iocharset=utf8")
		or (rmdir("/mnt/$device") && unlink("/home/ubuntu/Desktop/$device.desktop")); 
	}

case /(ext2|ext3)/ { 
		!system("mount -o noatime /dev/$device /mnt/$device")
		or (rmdir("/mnt/$device") && unlink("/home/ubuntu/Desktop/$device.desktop")); 
	} 

case 'swap' {
		system("swapon /dev/$device");
		rmdir("/mnt/$device");
		unlink("/home/ubuntu/Desktop/$device.desktop"); 
	}

else 	{
		!system("mount -o noatime /dev/$device /mnt/$device")
		or (rmdir("/mnt/$device") && unlink("/home/ubuntu/Desktop/$device.desktop"));
	}
}

}

!system("chown ubuntu:ubuntu -R /home/ubuntu/Desktop") or warn "$!\n";

sub mk_shortcut() {
my $mount_point = shift @_;
open(SHORTCUT, ">/home/ubuntu/Desktop/$mount_point.desktop") or die "$!\n";
print SHORTCUT <<EOF;
[Desktop Entry]
Version=1.0
Encoding=UTF-8
Type=Application
Name=HardDisk($mount_point)
Name[zh_TW]=硬碟($mount_point)
Name[zh_CN]=硬盘($mount_point)
Categories=Application;
Exec=thunar /mnt/$mount_point
Icon=gnome-dev-harddisk
Terminal=false
StartupNotify=false
EOF
close(SHORTCUT);
}

sub mk_home_shortcut() {
open(HOME, ">/home/ubuntu/Desktop/home.desktop") or die "$!\n";
print HOME <<EOF;
[Desktop Entry]
Version=1.0
Encoding=UTF-8
Type=Application
Name=Home
Name[zh_TW]=家目錄
Name[zh_CN]=家目录
Categories=Application;
Exec=thunar
Icon=gnome-fs-home
Terminal=false
StartupNotify=false
EOF
close(HOME);
}
