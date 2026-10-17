@echo off
cd /d "%~dp0.."
for /d %%J in ("%CD%\.build-tools\jdk-*") do set "JAVA_HOME=%%J"
set "ANDROID_HOME=%CD%\.build-tools\android-sdk"
set "GRADLE_USER_HOME=%CD%\.build-tools\gradle-cache"
set "PATH=%JAVA_HOME%\bin;%PATH%"
call npx vite build
if errorlevel 1 exit /b 1
call npx cap sync android
if errorlevel 1 exit /b 1
copy /y "android\launcher.html" "android\app\src\main\assets\public\index.html"
cd android
call gradlew.bat assembleDebug --no-daemon
if errorlevel 1 exit /b 1
copy /y "app\build\outputs\apk\debug\app-debug.apk" "..\Elevate.apk"
echo APK ready: Elevate.apk
