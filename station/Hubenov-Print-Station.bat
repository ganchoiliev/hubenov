@echo off
REM Доставки Хубенов — станция за печат (Windows)
REM Двойно щракване отваря приложението в режим за АВТОМАТИЧЕН печат.
REM Ако Chrome е инсталиран на друго място, поправи пътя по-долу.
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME% set CHROME="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
start "" %CHROME% --kiosk-printing --user-data-dir="%LOCALAPPDATA%\HubenovStation" "https://hubenov.delivery/op/scan"
