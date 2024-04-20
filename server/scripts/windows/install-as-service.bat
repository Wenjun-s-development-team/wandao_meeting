@ECHO off
SET installpath=C:\wdmeeting

nssm install wdmeeting "%installpath%\wdmeeting.exe"
:: nssm set wdmeeting AppParameters "启动参数"
nssm set wdmeeting Description "万道视频会议服务"
nssm set wdmeeting DisplayName "WD-Meeting"
nssm set wdmeeting Start SERVICE_DELAYED_AUTO_START
nssm set wdmeeting AppStdout "%installpath%\wdmeeting.log"
nssm start wdmeeting
pause
