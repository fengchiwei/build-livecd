#!/sbin/itype
# This is a i file, used by initng parsed by install_service

# NAME:
# DESCRIPTION:
# WWW:

daemon system/getty/1 {
	need = system/bootmisc system/mountfs/home;
	provide = virtual/getty/1;
	term_timeout = 3;
	exec daemon = /sbin/getty 38400 tty1;
	respawn;
	last;
}

daemon system/getty/* {
	need = system/bootmisc system/mountfs/home;
	provide = virtual/getty/${NAME};
	term_timeout = 3;
#	exec daemon = /sbin/getty -n -l /usr/local/bin/autologin 38400 tty${NAME};
	exec daemon = /sbin/getty 38400 tty${NAME};
	respawn;
}

virtual system/getty {
#	need = system/getty/2 system/getty/3 system/getty/4 system/getty/5 system/getty/6;
	need = system/getty/2;
	use = system/mountfs/essential service/issue;
}
