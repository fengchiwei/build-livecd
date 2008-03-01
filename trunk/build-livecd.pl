#!/usr/bin/perl
# build-livecd.pl - PUD GNU/Linux Live CD build script

# Copyright 2006-2008 by 
# Pin-Shiun Chen (penkia) <penkia@gmail.com>

# Patched by 
# Hiweed Leng (hiweed) <hiweed@gmail.com>
# Jia Huan Li <huanlf@gmail.com>
# Zhu Xuan Lin <zxlin67@gmail.com>

# This program is free software; 
# you can redistribute it and/or modify it under the same terms as Perl itself.
# See http://www.perl.com/perl/misc/Artistic.html

use strict;
use warnings;
use Getopt::Std;

use setting;
use function;

our(%VAR, %opts, @action, %act); 
our($y, $m, $d, $h);
our($project_name, $code_name);

getopts('phc:d:', \%opts);


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
	&init;
	#&{$act{$_}} for @action;
	!system("perl make.pl 2>&1 | tee -a $VAR{'TARGET_DIR'}/$VAR{'TIME'}.log") or warn "$!\n";
}

sub usage {
print 	"Usage: perl build-livecd.pl [OPTION] <command>\n".
	"This is a Live CD build script from PUD GNU/Linux".
	"\nOptions:\n".
	"perl build-livecd.pl  \t\t\tautomatically build\n".
	"perl build-livecd.pl  -c <command>\tstart from the specified command to the end\n".
	"\t\t\t\t\tvalid commands are:\n\t\t\t\t\tbootstrap, base_config, apt_update,\n".
	"\t\t\t\t\tapt_install, pud_lize, apt_clean, make_squashfs, make_iso, test_iso\n".
	"perl build-livecd.pl -c <command> -p\tprocess the specified command\n".
	"perl build-livecd.pl -d <target_dir>\tspecify target dir\n";
}

