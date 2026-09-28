# Order

Dein Trainingsjahr in Phasen. Du trägst ein, womit du trainierst und an welchen Tagen, teilst dein Jahr in Phasen und schließt dich für jede Phase einem Orden an. Die App sagt dir jeden Tag, welche Übung mit deinem Equipment passt, welches Gewicht als Nächstes kommt und wann die Pause vorbei ist.

Läuft im Browser und lässt sich auf dem Handy wie eine App installieren. Alle Daten bleiben auf deinem Gerät.

**Zur App:** https://fmeixner.github.io/order/

## So funktioniert es

1. **Equipment-Profile** (mindestens eins): Studio, Zuhause, Unterwegs. Du trägst ein, welche Kurzhanteln, Kettlebells, Scheiben, Bänder und Geräte es gibt. Die App steigert nur auf Gewichte, die es bei dir wirklich gibt.
2. **Wochenplan**: an welchen Tagen du trainierst und mit welchem Profil. Drei oder vier Tage sind Standard.
3. **Jahresplan**: Phasen mit Datum, Alltagslast und ob du viel unterwegs bist. Pro Phase ein Orden; die App zeigt, welche Orden passen.
4. **Trainieren**: Unter *Heute* steht die Einheit. Nach jedem Satz Wiederholungen und Gewicht eintragen, nach der Übung kurz Feedback geben (Schwer, OK, Leicht, Sehr leicht). Daraus kommt der Vorschlag fürs nächste Mal.

## Die 18 Orden

| Orden | Schwerpunkt |
|---|---|
| Initiate | Einstieg und Wiedereinstieg, Variantenleitern statt Gewicht |
| Knight | Muskelaufbau, Oberkörper/Unterkörper, jeder Muskel 2× pro Woche |
| Smith | Maximalkraft mit Top-Satz und Back-off |
| Olympian | Schnelligkeit und Sprungkraft |
| Pilgrim | Herz-Kreislauf und Ausdauer |
| Troubadour | Kraft und Ausdauer im Gleichgewicht |
| Herald | Einheiten unter 30 Minuten |
| Monk | Kraft, Yoga, Meditation |
| King | Harte Tage und bewusste Erholung, gesteuert über das Erleben |
| Alchemist | Statische Kraft, Beweglichkeit, Ruhe |
| Acrobat | Körpergewichts-Skills und Flow |
| Huntsman | Parkour und wechselnde Circuits |
| Pugilist | Rumpf, Nacken, Runden |
| Assassin | Fett verlieren, Kraft halten |
| Witcher | Muskelaufbau mit Kontrastpaaren |
| Soldier | Entlasten, testen, Schwachstellen trainieren |
| Gladiator | Physis mit Weste und Konditionsintervallen |
| Conqueror | Unterwegs belastbar bleiben |

## Inhalte bearbeiten

Alle Inhalte liegen als lesbare JSON-Dateien in [`data/`](data):

- `data/orders/*.json`: ein Orden pro Datei. Eine neue Datei ist nach dem nächsten Build ein neuer Orden.
- `data/exercises.json`: Übungskatalog mit Equipment-Art und Beschreibung.
- `data/beasts.json`: das Bestiarium (81 Circuits).
- `data/modules/`: Warm-up- und Cool-down-Listen, Schwert-Modul, Testwoche, geführte Varianten, Tauschgruppen (`swaps.json`) und Normen für die Testwoche (`norms.json`).

Das Format steht in [`docs/ORDER-FORMAT.md`](docs/ORDER-FORMAT.md). `npm run validate` prüft alle Dateien und meldet, was fehlt oder nicht passt.

## Entwickeln

```bash
npm install
npm run dev          # lokaler Server
npm run validate     # Daten prüfen
npm test             # Tests
npm run build        # Web-Ausgabe in dist/
npm run build:single # eine einzelne HTML-Datei in dist-single/
```

Versionen folgen [Semantic Versioning](https://semver.org/lang/de/). Jede Änderung auf `main` baut die App und veröffentlicht sie über GitHub Pages. Versionen stehen in `package.json` und als Releases auf GitHub. Änderungen stehen im [CHANGELOG](CHANGELOG.md).

## Auf dem Handy installieren

Link in Chrome (Android) oder Safari (iOS) öffnen, dann *Zum Startbildschirm hinzufügen*. Danach startet Order wie eine App und funktioniert auch offline. Unter *Setup → Sichern* regelmäßig eine Sicherung speichern.

## Grundlagen

Die Orden stützen sich, wo möglich, auf Studien; die Quellen stehen im jeweiligen Orden unter *Details*. Wo die Belege dünn sind, steht das in der Beschreibung. Order ersetzt keine ärztliche oder therapeutische Beratung.

## Lizenz

MIT, siehe [LICENSE](LICENSE).
