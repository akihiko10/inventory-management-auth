# Warehouse Mobile - Flutter

Mobile application for the Warehouse Management project.

## Stack
- Flutter + Dart
- REST API / JSON
- Existing Express.js backend
- Existing MongoDB database

## Scope
Mobile is focused on warehouse operations:
- Dashboard ringkas
- Pallet: search, detail, barcode, physical summary, position history
- Warehouse: slot monitoring and pallet movement
- Inbound / Outbound: draft and transaction monitoring
- Dispatch: driver & plate information through transaction workflow
- Manifest: list, generate and reconcile

## API URL
Do not hardcode the PC IP in source code. Run with:

```bash
flutter run --dart-define=API_URL=http://10.52.185.85:3000/api
```

For production:

```bash
flutter run --dart-define=API_URL=https://your-api-domain.com/api
```

## First setup

1. Install Flutter and Android Studio.
2. Create the platform folders in this source directory:

```bash
flutter create .
```

3. Get packages:

```bash
flutter pub get
```

4. Run on a connected Android phone:

```bash
flutter run --dart-define=API_URL=http://YOUR_PC_IP:3000/api
```

5. Build release APK:

```bash
flutter build apk --release --dart-define=API_URL=https://your-api-domain.com/api
```

APK will be at:
`build/app/outputs/flutter-apk/app-release.apk`

## Android permissions
`mobile_scanner` requires camera permission. `android/app/src/main/AndroidManifest.xml` should contain:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

The package normally adds its own requirements through the plugin, but verify this after `flutter create .`.

## Backend requirements for a physical phone
The Express backend must be reachable from the phone. Do not use `localhost` in the phone app.

For local testing:
- PC and phone on the same Wi-Fi.
- Use the PC Wi-Fi IPv4 address, e.g. `10.52.185.85`.
- Allow TCP port 3000 through Windows Firewall if necessary.
- Ensure Express listens on `0.0.0.0`, not only `127.0.0.1`.

Test from the PC:
`http://localhost:3000/api`

Then test from the phone browser:
`http://YOUR_PC_IP:3000/api`

If the phone cannot reach the backend, Flutter will show a network error.
