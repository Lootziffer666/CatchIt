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

## Installation

1. ZIP entpacken
2. In Android Studio öffnen (File → Open)
3. Gradle synchronisieren lassen
4. Grünen Play-Button drücken

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
