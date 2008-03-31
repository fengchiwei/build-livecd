#!/sbin/itype
# This is a i file, used by initng parsed by install_service

# NAME: HAL
# DESCRIPTION: Hardware Abstraction Layer
# WWW: http://www.freedesktop.org/Software/hal

daemon daemon/hald {
	need = system/bootmisc daemon/dbus;
	use = daemon/acpid;
	stdall = /dev/null;
	forks;
	env PIDDIR=/var/run/hald;
	env DAEMONUSER=haldaemon;
	env_file = /etc/default/hal;
	pid_file = ${PIDDIR}/hald.pid;

	script daemon = {
		if [ ! -d ${PIDDIR} ]
		then
			/bin/mkdir -p ${PIDDIR}
			chown ${DAEMONUSER}:${DAEMONUSER} ${PIDDIR}
		fi
		/usr/sbin/hald ${DAEMON_OPTS}
	};
}
