#!/usr/bin/perl
# usb_install.pl - PUD GNU/Linux USB Installer
# Copyright 2007 by Pin-Shiun Chen (penkia) <penkia@gmail.com>.
# This program is free software; you can redistribute it and/or modify it under the same terms as Perl itself.
# See http://www.perl.com/perl/misc/Artistic.html

BEGIN {

!system("cp -a ./usb_installer.glade /tmp/usb_installer.glade.tmp; cp -a ./syslinux.cfg /tmp/syslinux.cfg.tmp") or die "$!\n";

use Tie::File;
tie my @glade, 'Tie::File', '/tmp/usb_installer.glade.tmp' or die "$!\n";

my $PUD_INSTALLABLE_ITEM;

for (`fdisk -l`) {
	next unless /^Disk \/dev\/(s.*?):\s(.*?),/g;
	$PUD_INSTALLABLE_ITEM .= "/dev/$1, ($2)\n";
}

for (@glade) {
	s/PUD_INSTALLABLE_ITEM/$PUD_INSTALLABLE_ITEM/;
}

}

use usb_installer;

Gtk2->main;
