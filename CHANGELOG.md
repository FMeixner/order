# Changelog

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionen nach [Semantic Versioning](https://semver.org/lang/de/).

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
- Optionales Schwert-Modul (Doppelmesser).
- Testwoche mit fünf Cups und WHO-5.
- Einheitlicher Timer: 4 s Intro, Töne in den letzten 5 s, Pausen ohne Intro, Intervalle.
- Feeling Scale mit Dosisanpassung (King).
- Log, Bestzeiten, Testergebnisse, Export als Text; Sichern und Laden als JSON.
- Installierbar als App (PWA), offline nutzbar.

### Noch nicht enthalten
- Auswertung der Testwoche gegen Altersnormen und Schwerpunkt-Vorschlag.
- Automatischer Vorschlag einer Blockfolge aus dem Jahresplan.
