# Changelog

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionen nach [Semantic Versioning](https://semver.org/lang/de/).

## [0.14.0] – 2026-09-29

### Neu
- Log › Wochenüberblick: harte Sätze pro Muskel und Woche, mitbeteiligte Muskeln halb, mit Richtwert nach Erfahrung (Einsteiger 6–10, Fortgeschrittene 10–16, Erfahrene 12–20) oder eigenem Wert. Wertneutral, ohne Ampel. Zuordnung in `data/modules/muscles.json`.
- Log › Verlauf: Linie je Übung (bester Satz als geschätztes 1RM, Wiederholungen oder Haltezeit) und je Bestie (Zeit), mit Tabelle.
- Trainingserfahrung im Profil und in der Einrichtung. Einsteiger überspringen den Skillcheck und sehen keine Normvergleiche, keine Jahresbalance und kein „Skills trainieren“.
- Wiedereinstieg: Nach 10 Tagen oder mehr Pause läuft die Woche mit −1 Satz; Übungen, die 14 Tage oder länger ruhten, starten 10 % leichter.
- Testauswertung mit Messfehler: Unterschiede unterhalb der kleinsten sinnvollen Veränderung heißen „gleich (im Messfehler)“.
- Helles Design (automatisch oder fest), Erinnerung an die Sicherung, Hinweis auf den Skillcheck, Rückfragen vor Löschen und Einschieben.

### Geändert
- Schriften liegen in der App statt bei Google: keine Datenübertragung an Google, funktionieren offline.
- Barrierefreiheit: Kontraste auf gewählten und erledigten Tageskarten, Hinweistexten und der Jahresbalance angehoben; Tippflächen größer (Satz-Kreise 42–44 px, Info und Tausch 32 px, Feedback 40 px); kleinste Schrift 12,5 px. axe-core meldet in Heute, Plan und Log (hell und dunkel) keine Verstöße mehr.

## [0.13.0] – 2026-09-29

### Neu
- Drei-Tage-Woche verdichtet statt gestrichen: Das Wichtigste aus dem vierten Tag wandert auf die übrigen Tage, doppelte Bewegungsmuster fallen weg, Supersets und 15 s kürzere Pausen halten die Einheiten bei etwa 60 Minuten, eine Bestie pro Woche bleibt.
- Fünf Tage: Jeder Orden hat einen Zusatztag (`bonus`) mit Bestie und etwas, das es nur dann gibt (Unterarme, Nacken, Füße und Schienbein, Seilspringen, Handgelenke und Handstand, Schulterpflege, Qigong). Er liegt zwischen den schweren Tagen.
- Harlequin: jede Woche ein anderer Orden, Kraft- und Konditionswochen im Wechsel.
- Normen für Frauen: FRIEND (VO2max), DOSB Sportabzeichen (Standweitsprung, Medizinball, Liegestütz, Crunches, Klimmzug), CHMS (Sit and Reach), Cooper Institute (Bankdrücken relativ), Powerlifting (van den Hoek et al., 2024), Cooper-Lauf (Sekundärquelle).

### Geändert
- Pausen allgemein 15 s kürzer, mit Untergrenzen (schwer nie unter 2 Min, sonst nie unter 60 s). Kontrastpaare und Supersets unverändert.
- Normen Männer: Perzentil-Stützstellen korrigiert (Sit and Reach P20/P80, Powerlifting P10/P90); Quellen präzisiert; Cooper-Center-Werte für Maschinen als Orientierung markiert, weil ihre Herkunft nicht nachprüfbar ist.

## [0.12.0] – 2026-09-29

### Neu
- Testwoche als eigener Block im Plan: „Letzte Woche als Testwoche“ (kürzt die Phase) oder „Danach eine Woche einschieben“ (verschiebt die späteren Phasen). Die Woche davor läuft mit −1 Satz, eine Testwoche im Orden entfällt dann.
- Geführte Flows wie beim Schwert, als Ketten mit Wiederholungen je Seite: Yoga-Flow (Sonnengruß, Krieger), Yin, Qigong Baduanjin, Tai-Chi-Grundformen, Slow Flow, Animal Flow, Mobility. Ersetzen die groben Zeitblöcke in Monk, Alchemist, King, Acrobat und Initiate. Daten in `data/modules/flows.json`.

### Behoben
- Die Dauer oben in der Einheit berücksichtigt „−1 Satz“.

## [0.11.0] – 2026-09-29

### Neu
- Jeder Orden hat mindestens eine Bestie pro Woche. Eisen-Orden (Knight, Smith, Witcher, Gladiator, Olympian, Soldier): eine kurze pro Woche. Ruhige Orden (Alchemist, Monk, Acrobat, Initiate): A-Woche kurz, B-Woche lang im Grundlagentempo, ohne Bestzeit.
- Laufen abwählbar: „Heute kein Laufen möglich“ macht aus dem Lauf eine Bestie ähnlicher Dauer.
- Skills trainieren (Setup › Können): Bestien mit fehlenden Skills kommen als hexed-Variante mit leichterer Übung, in jeder zweiten Woche bevorzugt, mit eigener Bestzeit.
- Orden-Vorschau zeigt die Übungen so, wie sie mit deinem ersten Equipment-Profil (und Skillcheck) dran wären, ohne Ersatzlisten.
- Dauer in der Einheit wird für die jeweilige Woche geschätzt.

### Geändert
- Körpergewicht: Conqueror, Pilgrim, Pugilist und King setzen bei Drücken, Ziehen und einbeinigen Übungen auf Stufen mit Körpergewicht und weite Wiederholungsbereiche (z. B. Liegestütz 10–25 → Deficit → Archer). Quellen in den Orden und in der Anleitung.
- Superset-Unterüberschriften („Arme“, „Zusatz“) entfernt; Anzeige einheitlich „Im Wechsel“.
- Assassin: Muscle-Up-Technik aus dem Warm-up genommen.

## [0.10.0] – 2026-09-29

### Neu
- Blockfolge vorschlagen (Plan): Die App wählt für alle künftigen Phasen einen Orden, passend zu Alltagslast, Reise und Länge, mit guten Übergängen, ohne Wiederholung direkt hintereinander, und ausgerichtet auf Allround oder einen gewählten Schwerpunkt. Zeigt die Jahresbalance vorher und nachher; laufende und vergangene Phasen bleiben.
- Damit sind beide Punkte aus „Noch nicht enthalten“ (0.1.0) erledigt; die Auswertung der Testwoche kam mit 0.3.0.

## [0.9.3] – 2026-09-29

### Geändert
- Doppel und Triple laufen am Stück ohne Pause, wie eine lange Bestie, mit eigener Bestzeit („Troll ×2“). Nur Paare aus zwei verschiedenen Bestien haben 2 Min Pause dazwischen, und dort zählt jede Zeit für ihre Bestie. Doppel/Triple und Paare wechseln sich ab.

## [0.9.2] – 2026-09-29

### Geändert
- Bestien-Serien: Zeit je Teil statt einer Gesamtzeit. Jede Zeit zählt für die Bestzeit ihrer Bestie, auch im zweiten Durchgang. Bei Paaren wechselt die Reihenfolge, damit jede Bestie auch mal zuerst kommt. Nach jedem Teil startet die Pause automatisch.

## [0.9.1] – 2026-09-29

### Neu
- Bestien-Serien: Passt keine Bestie in die gewünschte Klasse (Equipment oder Skillcheck), baut die App eine Serie aus kürzeren: dieselbe Bestie zwei- oder dreimal oder zwei verschiedene hintereinander, mit 2 Min Pause dazwischen. Wechselt von Woche zu Woche.

## [0.9.0] – 2026-09-29

### Neu
- Skillcheck in der Einrichtung und unter Setup › Können: 15 Skills von Klimmzug bis Planche-Liegestütz. Fehlt ein Skill, ersetzt die App betroffene Übungen durch leichtere Varianten und lässt Bestien mit dieser Übung weg. Übungsleitern bekommen ohne Skill eine leichtere erste Stufe und starten mit Skill weiter oben. Daten in `data/modules/skills.json`.

## [0.8.2] – 2026-09-28

### Geändert
- Neues App-Symbol: Schild mit O statt Säulentempel.

## [0.8.1] – 2026-09-28

### Geändert
- Dosis als Bereich („3 × 10–12“), dazu „zuletzt“ mit den Wiederholungen und dem Gewicht der letzten Einheit. Die Wiederholungen trägst du selbst ein; ein Tipp auf den Kreis ohne Zahl springt ins Feld.

## [0.8.0] – 2026-09-28

### Geändert
- Eingabe: ein Gewicht pro Übung (Top-Satz: Back-off rechnet die App), Wiederholungen je Satz als kompakte Zeile. Antippen übernimmt die Zielwiederholungen.
- Progression: Liegt der schwächste Satz 2 oder mehr Wiederholungen unter dem unteren Ende, geht es eine Laststufe runter.
- Hinweis zu Startgewichten entfernt.
- Vorschau zeigt die Übungen der Bestie.

## [0.7.0] – 2026-09-28

### Neu
- Wochen blättern: Pfeile neben der Wochenzahl. Künftige Wochen als Vorschau (Übungen, Dosis, A/B-Wechsel, Entlastung, Testwoche), vergangene Wochen zum Nachtragen mit dem passenden Datum.

## [0.6.1] – 2026-09-28

### Geändert
- Jahresbalance zählt Warm-up und Cool-down anteilig: Cool-down nach Dauer für Beweglichkeit (ruhige Cool-downs für Erholung), Warm-up zur Hälfte. Grenzen der Skala: unter 0,62 spezialisiert, ab 0,80 allround.
- Troubadour: Hauptziel Kraft statt Wohlbefinden, passend zum Inhalt.

## [0.6.0] – 2026-09-28

### Neu
- Jahresbalance im Plan: Skala von Spezialist bis Allrounder und Verteilung auf acht Bereiche, für das Planjahr oder ein Kalenderjahr.

### Geändert
- Witcher, Kontrast-Tag: 3 statt 4 Runden je Kontrastpaar, schwere Einzelübungen 3 Sätze. Schulterdrücken und der Arm-Superset liegen jetzt am Armtag (40 Min). Kontrast-Tag etwa 60 Min.

## [0.5.0] – 2026-09-28

### Geändert
- Einheiten auf ihre angegebene Dauer gebracht. Neu: eine Schätzung der Dauer aus Sätzen, Pausen, Aufwärmsätzen, Umbau, Warm-up und Cool-down; ein Test prüft jede Einheit auf ±8 Min. Ergänzt: Smith (je 2–3 Zusatzübungen), Knight (4 Sätze auf den ersten beiden Übungen, je eine Übung mehr), Olympian, Troubadour, Gladiator Oberkörper, Conqueror Studio, Witcher Arme, Acrobat, Alchemist, Pugilist. Angaben korrigiert bei Monk, Herald, Initiate, Assassin.
- Tagesansicht aufgeräumt: Dosis und Gewichtsvorschlag in einer Zeile, Symbole rechts, keine wiederholten Einheiten-Wörter in den Satzzeilen, Feedback-Knöpfe erst nach dem ersten Satz, A/B-Woche nur noch oben.

## [0.4.0] – 2026-09-28

### Neu
- Lückenregel für große Gewichtssprünge: Fängt der Wiederholungsbereich den Sprung zur nächsten vorhandenen Last nicht ab, hebt die App die Obergrenze an (höchstens 20), bis man nach dem Sprung wieder unten im Bereich landet. Nach dem Sprung werden die Zielwiederholungen aus der Leistung vorher geschätzt (Epley). Bei festen Wiederholungen und Sprüngen über 7,5 % kommen bei „Leicht“ erst +1 bis +2 Wiederholungen, dann die Last. Hinweis direkt bei der Übung.

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
