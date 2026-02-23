0) Richtungswechsel

Von “Web/React v4/v5” zu Android-only App (APK/AAB).

Neues Ziel: eine echte native App, kein Apple, kein Wrapper-Zwang.

1) Repo-/Projektstruktur (neu)

Aus “nur v4/v5 Dateien” wird ein vollstaendiges Android-Projekt (Gradle, App-Module, Kotlin/Compose Code, Tests, Theme).

Grundidee: v4/v5 bleiben als Legacy-Referenz, die Android-App ist der neue Hauptstand.

2) Build-System (neu/veraendert)

Neu: settings.gradle.kts, Root-build.gradle(.kts), App-build.gradle.kts, gradle.properties (optional), Manifest, Tests etc.

SDK stabilisiert:

compileSdk von 35 (instabil) auf 34

targetSdk auf 34

minSdk 26

Compose ist als Build-Feature aktiviert.

(Zwischenstand hatte Version Catalog; du hast danach “JA + SIMPEL” entschieden => Ziel ist ohne Version Catalog, alles explizit in Gradle.)

Wichtig (JA + SIMPEL):

Neu als Requirement: Gradle Wrapper muss ins Repo (gradlew, gradlew.bat, gradle/wrapper/*), damit ./gradlew assembleDebug out-of-the-box klappt.

3) Brand-/Designsystem (neu)

Ein konsistentes Poster-Brand-System:

Vollton-Hintergruende (Calm/Ready/Warning/Alert)

harte Kanten, keine Schatten, minimalistische Silhouetten

Brand-Farben:

CatchBlack / Off-White / Orange / Red / Yellow (Iris)

“Konsequenter Look” als Regelwerk:

2 Tone + Micro-Accent

semantische Farbe nach Dringlichkeit

4) States: Dringlichkeit vs Flow (neu)

Neu: Trennung in AlertLevel (Farbe/Dringlichkeit) und FlowPhase (wo im Ablauf).

AlertLevel: CALM, READY, WARNING, ALERT

FlowPhase: ASKING, IDLE, TRACKING, ALERTING

Neu: SceneConfig / mapStateToScene(...) als pure function, die das komplette “Look & Feel” bestimmt:

backgroundColor

contentColor (Text/Icon Kontrast)

system bar policy (noch feinzujustieren)

cat variant

headline (und teils subline)

5) Companion-Design (neu)

Companion ist immer der Einstieg (App startet in ASKING).

Erste Frage des Companions soll sein:

“Neuen Termin” oder “Wiederkehrenden Termin”

optional abschaltbar in “Optionen” (later: DataStore/Prefs).

“Weird Companion” (sporadisch) als persoenlicher Moment:

nur in ASKING (und nie in ALERT)

deterministisch per seed

ca. 8% Chance (Produktivwert; zeitweise Demohoeher)

6) Procedural Art Engine (neu)

Neu: prozedurale Katzen-Poster via Compose Canvas/Path, keine Bildassets fuer die Motive.

Neue Varianten (CatVariant):

PORTRAIT_MIN (reduziert: Kopf + Augen)

PEEK_TWO_CATS (zwei Katzen “peek”)

ANGRY_FULLBODY (Alert-Szene)

COMPANION_WEIRD (irrer Blick + unnatuerliches Grinsen)

7) Kritischer Rendering-Fix (neu)

Neu: Offscreen-Compositing fuer das “Grinsen ausschneiden”:

graphicsLayer { compositingStrategy = Offscreen }

Zweck: BlendMode.Clear funktioniert sonst oft nicht sauber (schwarze Artefakte / kein Loch).

8) UX: Dock-Flow statt Wizard (neu)

Neu: “Stacked Tiles / Dock” statt “1 Frage pro Screen”:

beantwortete Kacheln rutschen in den Hintergrund

bleiben antippbar und editierbar

kein Reset, kein “wieder von vorn”

Neue UI-Modelle:

FocusTile/TileType (Destination/Deadline/Safety)

Focused/Docked Zustand

Neue Logik:

Tap macht Tile fokussiert

Answer dockt Tile und fokussiert automatisch die naechste

wenn alles fertig -> Phase springt zu TRACKING

9) Kontrast-Handling (neu/veraendert)

Neu: Textfarbe soll sich dem Hintergrund anpassen (Weiss auf Orange/Rot, Schwarz auf Off-White).

(Es gibt noch Stellen, wo das ueber contentColor-Abfragen geloest wird; robust waere “background luminance”.)

10) Tests (neu)

Neu: Unit Tests fuer SceneLogic:

deterministisch fuer gleiche Inputs

Weird Companion Regeln (nur ASKING, nie ALERT)

(Noch ein Feinschliff: brute-force seed Suche besser bounded machen.)

11) Audio: Start-Miau (neu)

Neu: MP3 cutecatmeow.mp3 soll beim App-Start abgespielt werden.

Umsetzung: Datei nach app/src/main/res/raw/ und Start via MediaPlayer.

Muss abschaltbar sein (Settings), damit’s nicht nervt / respektiert silent vibes.

12) Plattform-Entscheidungen (neu)

Kein Apple Target.

Windows spaeter waere ein eigenes Target (Compose Desktop / anderes Frontend) — unabhaengig davon, ob Android im Root oder in /android liegt.