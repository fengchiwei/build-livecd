sub do_chroot {
	!system("chroot $VAR{'SYSTEM'} $_[0]") or warn "$!\n";
}

sub bootstrap {
	&system_call("debootstrap --arch i386 $VAR{'CORENAME'} $VAR{'SYSTEM'} $VAR{'REPOURL'}");
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
	print "[$0] Initializing $VAR{'TARGET_DIR'} ...";
	&make_dir();
	print "OK.\n"
}

sub base_config {
	# pre-config
	print "[$0] Copying pre-config files...";
	&system_call("cp -a -v $VAR{'TEMPLATE'}/*  $VAR{'SYSTEM'}/");

	print "OK.\n";
	
	&do_chroot('locale-gen');
	&do_chroot('mount -t proc /proc proc');
}

sub apt_update {
	print "[$0] Updating packages list...\n";

	# add gpg key first
	open(GPG, "ls $VAR{'SYSTEM'}/gpg|") or warn "$!\n";
	for (<GPG>) {
		chomp;
		&do_chroot("apt-key add /gpg/$_");
	}
	close(GPG);
	&do_chroot('rm -rf /gpg');

	&do_chroot('apt-get update');
	print "OK.\n";
}

sub apt_install {
	# install packages
	open(L, 'install.txt') or die "$!\n";
	my $list;
	for (<L>) {
		chomp;
		next if /^#/;
		$list .= " $_";
	}
	close(L);
  
	print "[$0] install packages\n";
	&do_chroot('debconf-set-selections /preseed.cfg');
	&do_chroot("apt-get install --yes --force-yes $list");
	&do_chroot('apt-get install --yes --force-yes localepurge');

        open(DEB, 'ls config/deb |') or warn "$!\n";
        my $debfiles;
        for (<DEB>) {
                chomp;
                $debfiles .= " /deb/$_";
        }
        close(DEB);

        &do_chroot("dpkg -i $debfiles");
        &do_chroot('apt-get install -f');
        &do_chroot('rm -rf /deb');
        &do_chroot('rm -f /preseed.cfg');
        &do_chroot('apt-get remove --purge aptitude ubuntu-minimal seamonkey-browser -y');
} 
 
sub pud_lize {
	# pud-lize
	print "[$0] PUD-lize the Live CD system...\n";
	&do_chroot('rm -f /bin/sh');
	&do_chroot('ln -s /bin/bash /bin/sh');
	&do_chroot('rm -f /etc/skel/.bashrc');
	# &do_chroot('rm -rf /etc/X11/ion3/');
	# &do_chroot('rm -f /usr/share/ubuntu-artwork/home/index.html');
	# &do_chroot('ln -s /usr/share/ubuntu-artwork/home/firefox-index.html /usr/share/ubuntu-artwork/home/index.html');
	&do_chroot('rm -rf /usr/share/firefox/searchplugins/');
	&do_chroot('rm -f /etc/init.d/hwclock.sh');
	&do_chroot('rm -f /etc/rc*.d/*hw*');
	&do_chroot('ln -fs /usr/lib/libesd.so.0 /usr/lib/libesd.so.1');
	&do_chroot('ln -fs /etc/fonts/conf.d/umingpatch.conf /etc/fonts/conf.d/20-umingpatch.conf');
	&do_chroot('mv /etc/rc2.d/S99rc.local /etc/rc2.d/S94rc.local');
	&do_chroot('mv /etc/rc2.d/30gdm /etc/rc2.d/99gdm');
	&do_chroot('ln -s ../init.d/auto_mount /etc/rc2.d/S95auto_mount');
	&do_chroot('ln -s ../init.d/load-opt /etc/rc2.d/S96load-opt');
	&do_chroot('ln -s ../init.d/pudata /etc/rc2.d/S97pudata');
	&do_chroot('ln -s ../init.d/pudding /etc/rc2.d/S98pudding');
#	&do_chroot('ln -s ../init.d/startx /etc/rc2.d/S99startx');
	&do_chroot('ln -s ../init.d/pudata /etc/rc0.d/K02pudata');
	&do_chroot('ln -s ../init.d/pudata /etc/rc6.d/K02pudata');
	&do_chroot('rm -f /etc/rc2.d/S01lokkit /etc/rc2.d/S14ppp /etc/rc6.d/K99lokkit /etc/rc0.d/K99lokkit /etc/rc6.d/K86ppp /etc/rc0.d/K86ppp');
	&do_chroot('rm -f /etc/localtime');
	&do_chroot('ln -s /usr/share/zoneinfo/Asia/Taipei /etc/localtime');
	&do_chroot('rm -f /etc/alternatives/x-cursor-theme');
	&do_chroot('update-alternatives --install /etc/alternatives/x-cursor-theme x-cursor-theme /usr/share/themes/Human/cursor.theme 1');
	&do_chroot('update-alternatives --set x-cursor-theme /usr/share/themes/Human/cursor.theme');
	&do_chroot('ln -s /sbin/s2ram /usr/sbin/s2ram');
	&do_chroot('ln -s /sbin/s2disk /usr/sbin/s2disk');
	#&do_chroot('ln -s /usr/share/themes/Human/cursor.theme /etc/alternatives/x-cursor-theme');
	print "OK.\n";

	# post-config
	print "[$0] Copying post-config files...";
	&system_call("cp -a $VAR{'POST'}/*  $VAR{'SYSTEM'}/");
	#&do_chroot('updatedb');

	print "OK.\n"; 
 
	# files for cdrom 
	&system_call("cp -a $VAR{'CDROM-TEMP'}/  $VAR{'TARGET_DIR'}/");

	# generate /cdrom/.disk/info to solve ubiquity scan disk problem
	!system("echo \"$VAR{'TIME'}\" >  $VAR{'CDROM'}/.disk/info") or warn "$!\n";

	# to fix acpid bug
	&do_chroot('apt-get install acpid');

	# to fix icon bug
	&do_chroot('/usr/lib/libgtk2.0-0/gtk-update-icon-cache -f /usr/share/icons/hicolor/');

	&do_chroot('dpkg -l > packages.txt');
	&system_call("mv packages.txt $VAR{'INFO'}/");
}  

sub apt_clean {
	# clean up
	print "[$0] Clean up the Live CD system...";

	# remove list
	open(R, 'remove.txt') or die "$!\n"; 
	my $dir;
	for (<R>) { 
  		chomp; 
  		next if /^\s/;
  		if (/^#/) {
  			$dir = (split/ /, $_)[1];
  			&system_call("mkdir -p $VAR{'LEFT'}/$dir");
  		} else {
  			&system_call("mv $VAR{'SYSTEM'}$_ $VAR{'LEFT'}/$dir/") if ( -e "$VAR{'SYSTEM'}$_" );
  		}
	}
	close(R);

	&do_chroot('dpkg-reconfigure linux-image-generic');
	&do_chroot('depmod -a');
	&do_chroot('update-initramfs -u');

	&do_chroot('apt-get clean');
	&do_chroot('localepurge');

	&do_chroot('rm -rf /var/lib/apt/lists/*');
	&do_chroot('mkdir /var/lib/apt/lists/partial');
	&do_chroot('rm -rf /var/cache/apt/*');
	&do_chroot('mkdir -p /var/cache/apt/archives/partial');
	&do_chroot('rm -f /var/lib/dpkg/*-old');
	&do_chroot('rm -f /var/cache/debconf/*-old');

	# solve umount /proc problem ...
	&do_chroot('/etc/init.d/acpid stop');
	&do_chroot('umount /proc');
	&system_call('/etc/init.d/acpid start');
	print "OK.\n";
}  

sub make_squashfs {
	# compress
	&system_call("./post-config/usr/bin/mksquashfs $VAR{'SYSTEM'} $VAR{'CASPER'}/filesystem.squashfs -ef $VAR{'SYSTEM'}/proc -b 262144");
}

sub make_iso {
	&system_call("rm -f $VAR{'SYSTEM'}/boot/*.bak");
	&system_call("cp $VAR{'SYSTEM'}/vmlinuz $VAR{'CDROM'}/");
	&system_call("cp $VAR{'SYSTEM'}/initrd.img $VAR{'CDROM'}/initrd.gz");
  
	# &system_call("cp /usr/lib/grub/i386-pc/stage2_eltorito $VAR{'GRUB'}/");
	chdir $VAR{'CDROM'};
	&system_call("mkisofs -R -U -V $VAR{'ISOLABEL'} -b boot/grub/stage2_eltorito -no-emul-boot -boot-load-size 4 -boot-info-table -o ../$VAR{'TIME'}.iso .");
}

sub test_iso {
	chdir "../";
	chomp(my $pwd = `pwd`);
	print "Image file: $pwd/$VAR{'TIME'}.iso is created successfully\n";
	&system_call("md5sum $VAR{'TIME'}.iso > $VAR{'TIME'}.iso.md5");
	# &system_call("qemu -cdrom $VAR{'TARGET_DIR'}.iso &");
}

1;
