#!/bin/sh

case $LANGUAGE in
zh_TW*)
	title="關機"
	description="選擇一樣你要的操作："
	logout="登出"
	shutdown="關機"
	reboot="重新啟動"
	;;
zh_CN*)
	title="关机"
	description="选择一样你要的操作："
	logout="登出"
	shutdown="关机"
	reboot="重新启动"
	;;
*)
	title="Logout"
	description="Select an action to perform:"
	logout="Logout"
	shutdown="Shutdown"
	reboot="Reboot"
	;;
esac

RES=`Xdialog --stdout --title "$title" --no-tags --menubox "$description" 15 40 1 logout "$logout" shutdown "$shutdown" reboot "$reboot"`
case "$RES" in
logout)
	sudo /etc/init.d/startx stop
	;;
shutdown)
	sudo shutdown -h now
	;;
reboot)
	sudo reboot
	;;
esac

