# FLOW Neustart: Regelwerk-Extraktion (Tabula-Rasa, quellengebunden)

## Arbeitsstatus

Dieser Stand ist strikt quellengebunden. Im aktuellen Repository sind keine der verlinkten wissenschaftlichen Volltexte lokal enthalten, und externe Abrufe der angegebenen URLs liefern in dieser Laufumgebung HTTP 403 (CONNECT tunnel failed). Deshalb wurde keine inhaltliche Regel aus den genannten Quellen erfunden oder geraten.

Konsequenz:
- Nur verifizierbare Fakten aus dieser Sitzung sind dokumentiert.
- Alle fachlichen Regeln/Variablen sind als "In den Quellen nicht definiert" markiert, solange kein Volltext vorliegt.

## Zugriffstest auf Schluesselquellen

- RUEG Normalization README: nicht abrufbar (HTTP 403)
- Anselm Normalization: nicht abrufbar (HTTP 403)
- Falko-Handbuch PDF: nicht abrufbar (HTTP 403)
- WISE-Publikation: nicht abrufbar (HTTP 403)
- Litkey-Publikation: nicht abrufbar (HTTP 403)

## Phase 1: Extraktion der Grundlagen-Variablen (Architektur)

### Ergebnis

- Normalisierungsebenen (z. B. konkurrierende Zielhypothesen): In den Quellen nicht definiert (Volltext nicht verfuegbar).
- Exakte Grenzen pro Ebene: In den Quellen nicht definiert.
- Oberste Korrekturmaximen: In den Quellen nicht definiert.
- Fehler, die auf unterster Ebene explizit nicht korrigiert werden duerfen: In den Quellen nicht definiert.

### Programmierbare Platzhalterstruktur (ohne inhaltliche Befuellung)

```yaml
architecture:
  normalization_levels: []
  global_maxims: []
  forbidden_on_lowest_level: []
  source_trace: []
```

## Phase 2: Extraktion der orthografischen Variablen (Wortebene)

### Ergebnis

Aus Litkey/Anselm/WISE konnten mangels Volltext keine verifizierten Fehlertypen extrahiert werden.

### Datenblatt-Template (fuer spaetere Befuellung)

```yaml
orthography_variables:
  - variable_name_source: ""
    trigger_condition: ""
    repair_action: ""
    source_example: ""
    source_ref: ""
```

### Aktueller Status

- Konsonanten-Variablen: In den Quellen nicht definiert.
- Vokal-Variablen: In den Quellen nicht definiert.
- Gross-/Kleinschreibung: In den Quellen nicht definiert.
- Klitika: In den Quellen nicht definiert.
- Morphemfehler: In den Quellen nicht definiert.

## Phase 3: Extraktion der syntaktischen Variablen (Satzebene)

### Ergebnis

Aus Falko-Richtlinien konnten mangels Volltext keine verifizierten Satzregeln extrahiert werden.

### Datenblatt-Template

```yaml
syntax_rules:
  - rule_name_source: ""
    condition: ""
    repair_step: ""
    source_example: ""
    source_ref: ""
```

### Aktueller Status

- Wortstellung: In den Quellen nicht definiert.
- Kongruenz (Kasus/Numerus/Genus): In den Quellen nicht definiert.
- Satzbau/Reparaturlogik: In den Quellen nicht definiert.

## Phase 4: Abhaengigkeiten und Konfliktloesungen

### Ergebnis

- Ambiguitaetsaufloesung: In den Quellen nicht definiert.
- Prioritaetsregeln bei Konflikten zwischen Variablen: In den Quellen nicht definiert.
- Hierarchie zwischen Orthografie- und Syntaxeingriffen: In den Quellen nicht definiert.

### Platzhalter fuer Konflikt-Engine

```yaml
conflict_resolution:
  priority_order: []
  ambiguity_policies: []
  tie_breakers: []
```

## Phase 5: Selbstkontrolle und iterative Verbesserung

Da keine extrahierten Regeln vorliegen, kann kein quellenkonformer Testlauf auf Beispielsaetze erfolgen.

### Teststatus

- Interner Regeltest auf 3 komplexe Beispielsatzfaelle: nicht durchfuehrbar.
- Widerspruchspruefung Orthografie vs. Syntax: nicht durchfuehrbar.
- Mehrdeutigkeits-Sackgassenanalyse: nicht durchfuehrbar.

## Was fuer die naechste Iteration benoetigt wird

Damit die geforderte vollstaendige, programmierbare Regelbasis geliefert werden kann, wird einer der folgenden Inputs benoetigt:

1. Volltexte (PDF/HTML) im Repository, oder
2. Freigegebener Netzwerkzugriff auf die angegebenen Quellen, oder
3. Ein bereits exportierter Textkorpus aus den relevanten Richtlinien.

Sobald die Inhalte verfuegbar sind, kann diese Datei inhaltlich (nicht strukturell) in der geforderten 5-Phasen-Form vollstaendig befuellt werden.
