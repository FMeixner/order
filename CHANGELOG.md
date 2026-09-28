# Changelog

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionen nach [Semantic Versioning](https://semver.org/lang/de/).

## [0.3.0] – 2026-09-28

### Neu
- Übung tauschen: ⇄ neben jeder Übung bietet Alternativen mit ähnlichem Bewegungsmuster an, verfügbare zuerst. Die Wahl gilt je Stelle und Ort, bleibt bei Updates erhalten und führt eigene Gewichte. Übersicht und Zurücksetzen unter Setup. Gruppen in `data/modules/swaps.json`.
- Auswertung der Testwoche: Punkte je Bereich gegen Alters- und Geschlechtsnormen, Vergleich mit dem letzten Test, Vorschlag für die nächste Phase (bei niedrigem WHO-5 zuerst Erholung). Normen mit Quellen in `data/modules/norms.json`; vorerst Männer, je nach Test 24–59 Jahre.
- Geburtsjahr und Geschlecht im Profil (optional, nur für den Normvergleich).
- Kraft-Tests mit Variante (Beinpresse oder Kniebeuge, Brustpresse oder Bankdrücken, Latziehen oder Klimmzug).

## [0.2.0] – 2026-09-28

### Neu
- Phasen mit hoher Alltagslast: Etwa die Hälfte der freien Übungen eines Tages läuft an Maschine oder Kabel, sofern das Studio sie hat. Der erste große Lift bleibt frei, Kontrastpaare bleiben frei. Geführte Varianten führen eigene Gewichte. Zuordnung in `data/modules/guided.json`.
- Schwert als Equipment im Profil: schaltet Hiebe, Kombiformen und Schwert-Intervalle frei. Ohne Schwert greift eine Ersatzübung.
- Anleitung über „?“ oben rechts.
- Orden-Auswahl mit Filter nach Ziel; klarere Beschriftung, was ein Orden verträgt.
- Hinweis zu Startgewichten in der ersten Woche.

### Geändert
- Der Schalter „Doppelmesser“ entfällt. Alte Sicherungen übernehmen ihn als Schwert im Heim-Profil.

## [0.1.0] – 2026-09-28

Erste Version.

### Neu
- Einrichtung in vier Schritten: Equipment-Profile, Wochenplan, Jahresplan mit Phasen, Orden je Phase.
- Equipment-Profile mit echten Hantelstaffeln, Langhantel, Kabel- und Maschinenschritten, Weste und Bändern. Steigerungen landen nur auf vorhandenen Lasten.
- 18 Orden als bearbeitbare JSON-Dateien, mit Validierung (`npm run validate`).
- Übungsauswahl je Profil (Studio, Zuhause, Unterwegs) mit Rückfall, wenn Equipment fehlt.
- Progression: double, weight, topset, reps, Variantenleiter, hold, minutes.
- Kontrastpaare mit 30 s Übergang und 3 Min Pause; Supersets; A/B-Wochen.
- Bestiarium mit 81 Circuits, Stoppuhr, Bestzeiten, gemessene Dauer bestimmt die Klasse.
- Warm-up und Cool-down mit Seitengewichtung für Asymmetrien.
- Schwert als Equipment: schaltet Hiebe und Kombiformen frei.
- Testwoche mit fünf Cups und WHO-5.
- Einheitlicher Timer: 4 s Intro, Töne in den letzten 5 s, Pausen ohne Intro, Intervalle.
- Feeling Scale mit Dosisanpassung (King).
- Log, Bestzeiten, Testergebnisse, Export als Text; Sichern und Laden als JSON.
- Installierbar als App (PWA), offline nutzbar.

### Noch nicht enthalten
- Auswertung der Testwoche gegen Altersnormen und Schwerpunkt-Vorschlag.
- Automatischer Vorschlag einer Blockfolge aus dem Jahresplan.
