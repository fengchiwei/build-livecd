@ rem ---------------------------------------------------------------------------------------------------
@ rem This is ms-batch file,  used to repackage the extension.
@ rem ---------------------------------------------------------------------------------------------------
@ rem  1. You need to set WorkPath first.
@rem  2. Download gnu zip  URL:http://gnuwin32.sourceforge.net/packages/zip.htm
@ rem  3. Copy zip.exe to windows installation folder, e.g. C:\WINDOWS\system32
@ rem     or add an execute path for zip.exe in windows.
@ rem ---------------------------------------------------------------------------

@set ProjectName=tongwen
@set FileNameEx=0.3.4.1
@set WorkPath=C:\NewTongWen
@cd %WorkPath%
@cd chrome
del %ProjectName%.jar
zip -9 -r %ProjectName%.jar . -x CVS %ProjectName%.jar

@cd ..
del %ProjectName%.xpi
@rem zip -r %ProjectName%.xpi . -x CVS %ProjectName%.xpi package.bat package.sh readme.txt update.xml *.xpi
zip -r %ProjectName%.xpi . -x CVS %ProjectName%.xpi package.sh update.xml *.xpi 
zip -r -d %ProjectName%.xpi chrome/content chrome/locale chrome/skin chrome/skin/classic/tongwen/images/Thumbs.db
zip -r -d %ProjectName%.xpi tools/*.txt tools/*.htm tools/*.html tools/*.js tools/*.xml tools/*.xpi

copy /Y %ProjectName%.xpi %ProjectName%_%FileNameEx%.xpi

del %ProjectName%.xpi
rem pause