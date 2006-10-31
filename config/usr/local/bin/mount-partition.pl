#!/usr/bin/perl
use strict; 
use warnings;
$ENV{'LC_ALL'} = "zh_TW.UTF8";
$ENV{'LANG'} = "zh_TW.UTF8";
my @disk = `fdisk -l`;
!system("mkdir /home/ubuntu/Desktop; chmod a+rw /home/ubuntu/Desktop") or warn "$!\n";

foreach (@disk) {
next unless /^\/dev\/(\w+)\s/;
my $device = $1;
system("mkdir /mnt/$device") if (! -e "/mnt/$device");
&mk_shortcut($device);

if (/NTFS/) {
!system("ntfs-3g /dev/$device /mnt/$device -o silent,umask=0,locale=zh_TW.utf8") 
#!system("ntfsmount /dev/$device /mnt/$device -o show_sys_files,umask=0,locale=zh_TW.UTF8") 
or (rmdir("/mnt/$device") && unlink("/home/ubuntu/Desktop/$device.desktop"));
}

elsif (/FAT/) {
!system("mount /dev/$device /mnt/$device -o iocharset=utf8")
or (rmdir("/mnt/$device") && unlink("/home/ubuntu/Desktop/$device.desktop"));
}

else {
!system("mount /dev/$device /mnt/$device")
or (rmdir("/mnt/$device") && unlink("/home/ubuntu/Desktop/$device.desktop"));
}
}

sub mk_shortcut() {
my $mount_point = shift @_;
open(SHORTCUT, ">/home/ubuntu/Desktop/$mount_point.desktop") or die "$!\n";
print SHORTCUT <<EOF;
[Desktop Entry]
Version=1.0
Encoding=UTF-8
Type=Application
Name=硬碟($mount_point)
Comment=
Categories=Application;
Exec=thunar /mnt/$mount_point
Icon=/usr/local/share/icons/gnome-dev-harddisk.png
Terminal=false
StartupNotify=false
EOF
close(SHORTCUT);
}
