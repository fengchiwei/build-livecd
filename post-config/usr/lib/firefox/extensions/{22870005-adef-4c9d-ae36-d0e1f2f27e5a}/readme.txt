======================
package.bat 使用說明：
======================

說明：
  package.bat 為DOS的 batch file，目的用來自動打包新同文堂的安裝檔。


使用步驟：

  1. 先安裝 gnu zip，下載網址：http://gnuwin32.sourceforge.net/packages/zip.htm
  2. 設定 zip 安裝的路徑，如果不會設定安裝的路徑將 zip.exe 複製到
     windows 安裝目錄也可以。
  3. 修改 package.bat 中的 @set WorkPath=  來指定你的工作目錄。
  4. 執行 package.bat 即可自動打包新同文堂的安裝檔。


======================
檔案用途及其他說明：
======================

  1. 版本號目前散落在四個檔案中
    install.js
    install.rdf
    chrome/content/tongwen/constants.js
    chrome/content/tongwen/contents.rdf

  2. install.rdf 請用可支援 UTF-8 的編輯器編輯，並且儲存時不要加入 BOM 標記
	(Firefox 1.0 或 Mozilla suit 1.7 前版本不支援 BOM mark)	，建議使用 EmEditor
	編輯 UTF-8 編碼的檔案。

  3. 語系的編輯同上，一樣要記得不要加入 BOM 標記。

  4. 在 update.xml 中的 tongwen-version 是要填寫目前發行的版本，而不是先前的版本
      例如：我要發行 0.2.7.6，那 tongwen-version 就是 0.2.7.6，而不是 0.2.7.5。

  5.  utools.htm、createPrefix2.html 為兩個小工具，並不包括在新同文堂的source code中，
       兩個小工具目的是為修改詞彙轉換表而做的，方便開發者使用。

  6. /tools/ 內所有檔案工具檔案不包括在「新同文堂」內，只供開發者使用，請看 tools/readme.txt。

  7. 檔案說明:

        /chrome/content/tongwen/constants.js		公用程式，常數
        /chrome/content/tongwen/tongwen.js 			主程式
        /chrome/content/tongwen/s2t.js				簡轉繁、繁轉簡單字表
        /chrome/content/tongwen/s2t_phrase.js		簡轉繁、繁轉簡修正詞彙表
        /chrome/content/tongwen/tongwen_filter.js	副程式，網址過濾功能
		/chrome/content/tongwen/settings_redefine_phrase.js	副程式，重訂內部詞彙功能
		/chrome/content/tongwen/treeView.js			副程式，公用程式

        /chrome/content/tongwen/tongwen_conv.js		副程式，繁簡轉換 function 
        /chrome/content/tongwen/zhuyin_conv.js		副程式，注音文轉換 function	(v0.2.9.2b 實驗版獨有，其他版本沒有)
        /chrome/content/tongwen/zhuyin.js			副程式，注音文單字表		(v0.2.9.2b 實驗版獨有，其他版本沒有)
        /chrome/content/tongwen/xmlextra.js			常數，公用程式

        /chrome/content/tongwen/tongwen.xul			main interface
        /chrome/content/tongwen/toolbarbutton.xul	toolbar button interface
        /chrome/content/tongwen/contextmenu.xul		right-click menu interface

        /chrome/content/tongwen/settings/settings.js		一般設定畫面程式
        /chrome/content/tongwen/settings/settings.xul		設定畫面介面
        /chrome/content/tongwen/settings/settings_filter.js	網址過濾設定畫面程式

======================
『新同文堂』修改記錄
======================

2007-07-21 (passerby)
	* v0.3.4
    * 更新轉換表
    * 新增三個 toolbar button (文字放大,縮小,還原)
    * 刪除 statusbar的文字縮放功能及所有相關設定
	
2007-07-09 (passerby)
	* v0.3.3
    * 新增顯示/隱藏statusbar icon選項
    * 設定視窗可修改大小
    * 更新轉換表
    * 修改支援 Thunderbird 2.0

2007-02-21 (passerby)
	* v0.3.2
    * fix v.0.3.2.0 自訂快速鍵 bug
    * 新增 statusbar 縮放文字大小
    * 新增 自訂快速鍵功能 (設定晝面按 Backspace會取消該自訂快速鍵設定)

2007-01-30 (passerby)
	* v0.3.1.2
    * fix tongwen perference observer doest not released at closing windows (memory leak)
    * 修正未完整下載網頁時按 '網頁轉繁體(轉簡體)'後不能手動再轉繁體
    * 加入 <HTML lang = '???'>偵測以決定網頁轉成繁體或簡體
    * 修改一些修正詞彙：'喂'不再轉成'餵'

2007-01-09 (passerby)
	* v0.3.0.0.0
    * 重寫"重訂內部詞彙"功能，防止匯入大量詞彙時引起嚴重過慢的問題
    * 修正匯出檔案不能取代 已存在的檔案的Bug
    * 網址過濾的'瀏覽該網址'功能修正
    * 新增一些修正詞彙。

2006-12-27 (passerby)
	* v0.2.9.9.0
    * 轉換速度輕微加快、細部功能修正

2006-12-16 (passerby)
	* v0.2.9.8.5
    * 修正 v.0.2.9.8 剪貼簿簡轉繁的轉換失效問題
    * 加入匯入/匯出 按鈕，刪除外部詞彙表功能並以"重訂內部詞彙"功能代替
    * 還原 v.0.2.9.6 所作的修改，簡轉繁，"裡" 優先轉為 "裡"

2006-11-14 (passerby)
	* v0.2.9.7.0
    * 新增自動轉換的詳細設定(主要是避免產生過度轉換的詞彙)
    * 更改重訂詞彙轉換表格式，令輸入資料更直覺 (新格式不兼容 v0.2.9.6或更早版本)

2006-06-14 (passerby)
	* v0.2.9.6.0
    * 修正不能使用中文路徑問題
    * 網址過濾表的右鍵菜單加入 "瀏覽該網址" 選項
    * 簡轉繁時，"里"優先轉成"里"，不再用優先轉為"裡"，"里"的相關修正詞彙全部刪除

2006-05-09 (softcup)
	* v0.2.9.5.0
    * 新增對 Mozilla Thunderbird 的支援

2006-05-03 (passerby)
	* v0.2.9.4.5
    * 修正 v0.2.9.3.7 b 會導致 flashgot 和 BBCode 在右鍵菜單的圖標失效問題
    * 加入匯出/匯入重訂詞彙表、匯出/匯入網址過濾表功能
    * 加入是否顯示工具列圖示選項

2006-04-08 (passerby)

    * v0.2.9.3.6a
    * 加入"重訂內部詞彙轉換表" 功能 (alpha測試版本，有少量Bug)
    * 加入一些詞彙修正


2006-03-04 (passerby & softcup)

    * v0.2.9.2b (實驗版，也叫特別版）
    * 加回隱藏了的熱鍵，按F12 繁體與簡體間切換
    * 新增翻譯注音文功能
    * 簡轉繁修正詞彙加多 2500 個
    * 轉換表數個單字修正 

2006-02-14 (passerby)

    * v0.2.9.1
    * 建基於 新同文堂 0.2.9的修改
    * 大量詞彙表字串修正
    * 詞彙轉換方法修正
    * 刪除註解減少 entension file sizes (會另外提供有註解的版本詞彙表的給有興趣修改人士下載)
    * 加入回報『新同文堂』錯誤連結
    * 滑鼠右鍵指令加入icon (icon 取自 CuteMenus - Crystal SVG (另一個 firefox 套件) ) 

2006-02-09 (softcup)

    * 0. v0.2.9。
    * 1. 修正詞彙轉換的問題。
    * 2. 修改轉換方式：移除設定畫面中，選擇轉換方式的畫面。
    * 目前改為自動判斷，遇到 frames 與 forms 時採用 createTreeWalker 其餘則使用 innerHTML 的方式，避免 innerHTML 破壞原本的網頁結構，對於不含 frames 與 forms 的網頁又能加快轉換速度。
    * 3. 新增一項文字縮放的設定：是否切換縮放設定值時，就要執行設定的縮放大小。
    * 4. 修正 Yus 提到的 focus 的問題。
    * 5. 新增網址過濾功能。
    * 6. 新增三個簡轉繁的對應
          o 锜 → 錡
          o 巌 → 巖
          o 赟 → 贇 

2006-01-01 (passerby)

    * 0. v0.2.8.1.3。
    * 1. 加快createTreeWalker 的轉換速度
    * 2. 修正了文字縮放輸入0%或不輸入產生的版面問題。
    * 3. 文字縮放效果會即時看時，如果啟用了文字縮放，文字縮放效果會一直維持續。
    * 4. 大約修正了innerHTML方法會令form button失效的問題。
    * 5. 大約修正了innerHTML方法會令 iframe 沒有轉換之問題，但內容比較多的網頁有時也會出現 iframe 內容沒有轉換之問題。
    * 6. 轉換速度比原來的innerHTML 方法會慢一點。 

2005-12-17 (passerby)

    * 0. v0.2.7.9。
    * 1. 自動轉換的速度加快，load event 改做 DOMContentLoaded event。
          o 因為 load event 要待整頁下載完畢才開始網頁內容翻譯，其實只要 html text 完整就應該可以開始翻譯，不需等待 image、flash 下載完畢才開始翻譯網頁內容，有些情況可能會較不穩定，但大多數情況翻譯速度較快。 
    * 2. 初步修正 innerHTML方法沒有翻譯 iframe、frame document的問題，但暫時還有問題。
    * 3. 修正沒有翻譯 form button 問題。 

2005-12-14 (passerby)

    * 0. v0.2.7.8。
    * 1. 改善createTreeWalker方法的詞彙翻譯速度，主要優化使用內部詞彙翻譯時速度，改善中文文混雜網頁內容的翻譯速度。
    * 2. 加入詞彙轉換方法中的術語解釋。 

2005-12-08 (passerby)

    * 0. v0.2.7.7。
    * 1. 修正一律都會做詞彙轉換的問題。 

2005-12-02

    * 0. v0.2.7.6。
    * 1. 修正0.2.6.2 後的版本 createTreeWalker 簡轉繁時部份詞彙沒有翻譯的問題，修正詞彙轉換方法缺漏。 (passerby)
    * 2. 將自動轉換與文字縮放的功能加入右鍵選單中。 (softcup) 

2005-11-30

    * 0. v0.2.7.5。
    * 1. 改善 createTreeWalker 方法的翻譯速度。 (passerby)
    * 2. 改善翻譯剪貼簿速度。 (passerby) 

2005-11-30

    * 0. v0.2.7.4。
    * 1. 調整繁簡轉換核心。 (passerby)
    * 2. 修正文字縮放的設定值無法儲存的問題。
    * 3. 調整文字縮放的選單。 

2005-11-26

    * 0. v0.2.7。
    * 1. 新增右鍵選單顯示設定。
    * 2. 在 Extension Uninstaller 中顯示版本號 (若要可以顯示，請先移除後再安裝)。 

2005-11-23

    * 0. v0.2.6.2。
    * 1. 修正 Firefox 1.5 中，自訂工具列上的圖示亂掉的情況。
    * 2. 修正 無法在 Firefox 1.0.7 底下執行的問題。 

2005-11-23

    * 0. v0.2.6.1。
    * 1. 修改 passerby 所加入的功能中的詞彙轉換順序。
    * 2. 新增 Firefox 1.5 的安裝描述檔。 

2005-11-21

    * 0. v0.2.6。
    * 1. 加入 passerby 的修改。
    * 2. 將是否使用 innerHTML 方法加入設定畫面 (使用 innerHTML 才能用到 passerby 的修改)。 

2005-07-12

    * 1. 修改成不需使用 jslib。
    * PS：手冊的部分我暫時沒放進去 (雖然選單上還有這個功能項)。 