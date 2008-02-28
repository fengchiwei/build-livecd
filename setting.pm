# setting variables
$ENV{'LANG'} = 'C';
$ENV{'LC_ALL'} = 'C';

($y, $m, $d, $h) = (localtime)[5, 4, 3, 2];

# user should modify here
$project_name 		= "pud"; # your project name
$code_name 		= "hardy"; # used for build dir
$VAR{'TIME'} 		= sprintf("%s-%.4d%.2d%.2d-%.2d", $code_name, $y+1900, $m+1, $d, $h);
$VAR{'TARGET_DIR'} 	= $opts{'d'} || '../'.$project_name.'_builddir/'.$VAR{'TIME'};
$VAR{'SYSTEM'} 		= $VAR{'TARGET_DIR'}.'/system';
$VAR{'CDROM'} 		= $VAR{'TARGET_DIR'}.'/cdrom';
$VAR{'INFO'} 		= $VAR{'TARGET_DIR'}.'/cdrom/info';
$VAR{'LEFT'}		= $VAR{'TARGET_DIR'}.'/left';
$VAR{'TEMPLATE'} 	= 'config';
$VAR{'POST'} 		= 'post-config';
$VAR{'CDROM-TEMP'} 	= 'cdrom';
$VAR{'CASPER'} 		= $VAR{'CDROM'}.'/casper';
$VAR{'GRUB'}		= $VAR{'CDROM'}.'/boot/grub';
$VAR{'CORENAME'}	= "hardy"; # core name of ubuntu
$VAR{'REPOURL'}		= "http://archive.ubuntu.com/ubuntu"; 
# this is the repository url of ubuntu, you can use urls below:
# http://tw.archive.ubuntu.com/ubuntu
# http://apt.ubuntu.org.tw/ubuntu
# http://archive.ubuntulinux.org/ubuntu
# http://ubuntu.cn99.com/ubuntu/

$VAR{'ISOLABEL'}	= "'PUD GNU/Linux'"; # the label of iso file, the single qutotation marks must be exist.

@action = qw/bootstrap base_config apt_update apt_install pud_lize apt_clean make_squashfs make_iso test_iso/;
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

1;
