@echo off
title The Scan Menu Print Agent - Windows Startup Installer
echo ========================================================
echo Installing The Scan Menu Print Agent to Windows Startup...
echo ========================================================

set SCRIPT_DIR=%~dp0
set VBS_SCRIPT=%TEMP%\create_shortcut.vbs
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set TARGET_BAT=%SCRIPT_DIR%start-agent.bat

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = "%STARTUP_FOLDER%\ScanMenuPrintAgent.lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "%TARGET_BAT%" >> "%VBS_SCRIPT%"
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> "%VBS_SCRIPT%"
echo oLink.Description = "The Scan Menu Local Thermal Print Agent" >> "%VBS_SCRIPT%"
echo oLink.WindowStyle = 7 >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"

cscript //nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%"

echo.
echo [SUCCESS] ScanMenu Print Agent is now configured to start automatically on Windows boot!
echo.
pause
