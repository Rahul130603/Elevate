# Elevate Android demo

Install `Elevate.apk` on Android. This is a signed debug APK for direct testing, not a Play Store release.

On launch, choose a connection and press Connect:

- **Same Wi-Fi · Laptop server**: enter the laptop's LAN address, for example `http://192.168.1.56:3000`. Phone and laptop must use the same Wi-Fi, Docker must be running, and Windows Firewall must allow port 3000 on the private network. The laptop IP may change.
- **Public HTTPS server**: enter the actual deployed server's HTTPS URL. This works outside your Wi-Fi while that server is running. The APK does not publish or host the backend.

Both addresses are remembered separately. Close and reopen the app to switch servers.

## Admin reminders (1.3.1)

Open **Admin → Reminders**. Press **Enable notifications**, allow phone notifications and **Alarms & reminders**, then return to the app. Press **Test notification** to schedule a device alert 10 seconds later; put the app in the background to check delivery.

Choose a date and enter a time, reason, and advance notice to save a reminder. A successful save verifies the notification is in the phone's pending queue. If permission or scheduling fails, the page explains the issue and keeps the reminder for in-app alerts. Enable notifications again to restore upcoming device reminders. Reminders are saved separately on each device; reminders created in a laptop browser are not synced to the phone.

Admin **Notifications → Reminders** shows save/update confirmations, reminders when their time arrives, and test notifications, including the reason and event/notification times. History is saved on the device and contributes to the bell unread count. Opening Notifications marks reminder history as read. Android reminders due while the app is closed are recorded in history when the admin portal next opens.

Browser reminders require the admin portal to remain open. Android reminders are scheduled locally, including while the phone is idle. The APK must connect to a server running the updated frontend. Real phone delivery still needs to be tested on the target device.

News has **Translated News** and **Local Language News** modes. Translated News translates verified industry headlines. Local Language News fetches the selected-language edition, preserves publisher headlines, and checks industry relevance using an internal English translation. Sparse industries may have fewer local-language reports.

The build and APK signature can be checked on this laptop; device behavior must also be tested on a phone. Google web sign-in may be restricted inside Android WebView and needs a separate native OAuth integration for a production mobile release. Email/password sign-in uses the existing server.

Rebuild: run `android\build_apk.bat` from the project after the tools in `.build-tools` have been installed. Keep `.env`, server secrets and databases on the server; they are not required on the phone.
