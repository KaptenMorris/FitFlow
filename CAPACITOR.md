# Bygg FitFlow till Google Play (Capacitor)

Preview-sandlådan kan inte bygga Android-paket — det måste göras på din egen dator med Android Studio.

## 1. Exportera till GitHub
Klicka "GitHub → Connect" uppe till höger i Lovable och klona repot lokalt.

## 2. Installera Capacitor
```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android
```

## 3. Bygg webben + lägg till Android
```bash
npm run build
npx cap add android
npx cap sync
```

## 4. Öppna i Android Studio
```bash
npx cap open android
```

## 5. Bygg signerad release
I Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**.
Skapa en ny keystore (spara den säkert — du behöver den för alla framtida uppdateringar).

## 6. Ladda upp till Google Play
1. Skapa konto på https://play.google.com/console (~$25 engångsavgift)
2. Skapa app, fyll i butiksinformation, ikoner och screenshots
3. Ladda upp `.aab`-filen
4. Skicka in för granskning (1–7 dagar)

## Uppdatera appen senare
Efter ändringar i Lovable:
```bash
git pull
npm run build
npx cap sync
```
Bygg sedan en ny `.aab` i Android Studio med en högre `versionCode`.

## Bra tillägg
- `@capacitor/push-notifications` — push
- `@capacitor/camera` — kamera
- `@capacitor/preferences` — lokal lagring
- `@capacitor/splash-screen` — splash

## Smartklocka via Google Health Connect (steg, puls, kalorier, sömn)

Sidan **Profil → Smartklocka & Health Connect** läser data via plugin `capacitor-health-connect`. Plugin är **inte** installerat i web-bygget (det skulle krascha utan native), så lägg till det i Android-bygget:

```bash
npm install capacitor-health-connect
npx cap sync android
```

Lägg till i `android/app/src/main/AndroidManifest.xml` (inuti `<application>`):

```xml
<activity-alias
  android:name="ViewPermissionUsageActivity"
  android:exported="true"
  android:targetActivity=".MainActivity"
  android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
  <intent-filter>
    <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
    <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
  </intent-filter>
</activity-alias>
```

Och i `<manifest>`-roten:

```xml
<uses-permission android:name="android.permission.health.READ_STEPS" />
<uses-permission android:name="android.permission.health.READ_HEART_RATE" />
<uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />
<uses-permission android:name="android.permission.health.READ_SLEEP" />
<queries>
  <package android:name="com.google.android.apps.healthdata" />
</queries>
```

Användaren behöver också **Health Connect**-appen från Play Store (förinstallerad på Android 14+) och måste koppla sin klocka (Wear OS / Fitbit / Samsung Health / Garmin Connect etc.) till Health Connect en gång.