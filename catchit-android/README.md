# CatchIt — Android App

**Ein Termin. Eine Lösung. Kein Stress.**

## Was ist neu (v2 — ÖPNV-Anbindung)

- **Echte Haltestellensuche** — Tippe einen Namen ein, alle deutschen Haltestellen werden gefunden
- **Live-Abfahrten** — Echtzeitdaten mit Verspätungsanzeige, aktualisiert alle 30 Sekunden
- **Dynamische Dringlichkeit** — Hintergrund + Katze ändern sich automatisch je nach Abfahrtszeit:
  - 🟢 > 15 min → Ruhig (weiß)
  - 🟡 8–15 min → Bereit (orange)
  - 🟠 3–8 min → Achtung (gelb/rot)
  - 🔴 < 3 min → JETZT LOS (rot, wütende Katze)
- **Kein API-Key nötig** — Nutzt die freie v6.db.transport.rest API (gesamtes deutsches Netz)

## Build

Build from the command line (no IDE required):

    cd catchit-android
    ./gradlew assembleDebug

The resulting APK is at `app/build/outputs/apk/debug/app-debug.apk`.

Requirements:
- JDK 17 or newer
- Android SDK with build-tools for compileSdk 36
- ANDROID_HOME or local.properties pointing to your SDK

## Run

1. Open the `catchit-android` folder in Android Studio (File -> Open)
2. Let Gradle sync finish
3. Press the green Run button (or Shift+F10)

Android-only. No iOS support planned.

## Architektur

```
com.catchit/
├── logic/        SceneLogic — Farben, Katze, Dringlichkeit
├── transit/      TransitApi + Repository — HAFAS-Anbindung
├── ui/           HomeScreen — Suche + Abfahrten
│   ├── graphics/ CatPoster — Prozedurale Katzenkunst
│   └── theme/    Material3-Theme
└── MainActivity  Edge-to-Edge + Meow-Sound
```
