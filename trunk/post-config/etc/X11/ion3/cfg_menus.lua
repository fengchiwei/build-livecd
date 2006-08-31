--
-- Ion menu definitions
--


-- Main menu
defmenu("mainmenu", {
    submenu("執行程式",         "appmenu"),
--    menuentry("Lock screen",
--            "ioncore.exec_on(_, ioncore.lookup_script('ion-lock'))"),
--    menuentry("Help",           "mod_query.query_man(_)"),
    submenu("佈景主題",           "stylemenu"),
--	submenu("Debian",           "Debian"),
    submenu("X Window 程序",          "sessionmenu"),
})


-- Application menu
defmenu("appmenu", {
    menuentry("終端機 (rxvt-unicode)",       "ioncore.exec_on(_, '/usr/bin/rxvt.sh')"), --x-terminal-emulator
    menuentry("瀏覽器 (firefox)",        "ioncore.exec_on(_, 'firefox')"), -- sensible-browser')"),
    submenu("網路應用",         "netmenu"),
    submenu("多媒體",         "mediamenu"),
    submenu("系統工具",         "adminmenu"),
    menuentry("執行...",         "mod_query.query_exec(_)"),
})

-- Net application menu
defmenu("netmenu", {
    menuentry("網頁瀏覽 (firefox)",          "ioncore.exec_on(_, 'firefox')"), 
    menuentry("即時通訊 (gaim)",          "ioncore.exec_on(_, 'gaim')"), 
    menuentry("BBS 連線 (pcmanx)",          "ioncore.exec_on(_, 'pcmanx')"),
    menuentry("P2P 下載 (amule)",          "ioncore.exec_on(_, 'amule')"),
    menuentry("FTP 連線 (gftp)",          "ioncore.exec_on(_, 'gftp')"),
    menuentry("無線網卡驅動 (ndisgtk)", "ioncore.exec_on(_, 'sudo ndisgtk')"),
})

-- Multimedia application menu
defmenu("mediamenu", {
    menuentry("音樂播放 (beep-media-player)",          "ioncore.exec_on(_, 'beep-media-player')"), 
    menuentry("影音播放 (vlc)",          "ioncore.exec_on(_, 'vlc')"), 
    menuentry("圖片瀏覽 (gqview)",          "ioncore.exec_on(_, 'gqview')"),
})

-- Admin application menu
defmenu("adminmenu", {
    menuentry("PDF 閱讀 (epdfview)",          "ioncore.exec_on(_, 'epdfview')"), 
    menuentry("CHM 閱讀 (xchm)",          "ioncore.exec_on(_, 'xchm')"), 
    menuentry("文字編輯 (gvim)",          "ioncore.exec_on(_, 'gvim')"),
    menuentry("檔案管理 (thunar)",          "ioncore.exec_on(_, 'thunar')"),
    menuentry("解壓縮程式 (xarchiver)",          "ioncore.exec_on(_, 'xarchiver')"),
    menuentry("記事本 (leafpad)",          "ioncore.exec_on(_, 'leafpad')"),
})

-- Session control menu
defmenu("sessionmenu", {
    menuentry("儲存現在狀態",           "ioncore.snapshot()"),
    menuentry("重新啟動 Ion",        "ioncore.restart()"),
--    menuentry("執行 TWM",    "ioncore.restart_other('twm')"),
    menuentry("結束圖形介面",           "ioncore.shutdown()"),
    menuentry("關於 Ion",      "mod_query.show_about_ion(_)"),
--    menuentry("重新啟動",          "ioncore.exec_on(_, 'sudo reboot')"),
--    menuentry("關機",          "ioncore.exec_on(_, 'sudo shotdown now')"),
})


-- Context menu (frame/client window actions)
defctxmenu("WFrame", {
    menuentry("關閉程式",          "WRegion.rqclose_propagate(_, _sub)"),
    menuentry("強制關閉",           "WClientWin.kill(_sub)",
                                "_sub:WClientWin"),
    menuentry("加上標記",     "WRegion.set_tagged(_sub, 'toggle')",
                                "_sub:non-nil"),
    menuentry("貼上已標記視窗",  "WFrame.attach_tagged(_)"),
    menuentry("清除標記",     "ioncore.clear_tags()"),
    menuentry("窗框資訊",    "mod_query.show_clientwin(_, _sub)",
                                "_sub:WClientWin"),
})

-- Auto-generated Debian menu definitions
if os.execute("test -x /usr/bin/update-menus") == 0 then
    if ioncore.is_i18n() then
        dopath("debian-menu-i18n")
    else
        dopath("debian-menu")
    end
end
