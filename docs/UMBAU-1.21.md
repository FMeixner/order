# Umbauplan ab 1.21: Makro-Perspektive und Coaching

Stand: 10.11.2026, App 1.20.0. Entworfen mit dem Nutzer, zur Ausführung durch einen Coding-Agenten.
Dieses Dokument ist die Vorgabe. Wo es etwas offen lässt, gilt `AGENTS.md`; wird etwas komplizierter als hier
beschrieben, erst den Nutzer fragen.

## Arbeitsweise

- Ein Paket = ein Release (Reihenfolge unten). Nach jedem Paket: `CHANGELOG.md`, `npm version`, `npm run build`,
  `npx vitest run`, `npm run e2e`, Commit, Push auf `main`, CI und Pages prüfen (Ablauf in `AGENTS.md`).
- Nie committen, solange ein Test rot ist. Keine zwei Pakete in einem Commit.
- Logik in `src/engine/` (ohne React, mit Test), Ansicht in `src/ui/`. Neue Statistik gehört in den Reiter „Stand“.
- Gestaltung: modern, klar, dunkel zuerst (Tokens oben in `src/index.css`). Kein Fantasy-Look, keine neuen Farben
  außer den Zeichenfarben, die es schon gibt (`--k` je Zeichen, Klassen `kl-<id>`).
- Texte Deutsch, Du-Form, knapp. Keine Wertung bei ausgefallenem Training („Alltag ist Trumpf“).
- Jede zitierte Studie in `data/modules/references.json` (Test `references.test.ts` prüft die Hilfe).
- Screenshots zur Kontrolle im Dark Mode bei 390 × 844 (Playwright `test.use({ colorScheme: "dark" })`).

## Reihenfolge

| Paket | Version | Inhalt |
|---|---|---|
| **PB** | **1.22.0** | **Bestien-Dosis: die Woche zählt, der Pool dosiert (Pilot King) — Vorrang** |
| P1 | 1.23.0 | Zeitstrahl: ganzes Jahr und ab heute, Jahresbilanz der Zeichen |
| P2 | 1.24.0 | Befinden nach jeder Einheit, Auswertung im Stand |
| P3 | 1.25.0 | Volumen Soll-Ist im Stand |
| P4 | 1.26.0 | Schutz vor Programm-Hopping: Begründung und Ideenparkplatz |
| P5 | 1.27.0 | Wochenrückblick |
| P6 | 1.28.0 | Defizit-Phasen: „gehalten“ zählt als Erfolg |
| P7 | 1.29.0 | Ausklang nach Bestie und Finisher |
| P8 | 1.30.0 | Entlastung nach Signalen |
| P9 | 1.31.0 | Zuspitzung vor der Testwoche |
| P10 | 1.32.0 | Explosives vor Ausdauer (Prüfung der Orden) |
| P11 | 1.33.0 | Schätzwerte lernen aus dem Log |
| P12 | 1.34.0 | Kleines an der Oberfläche: Tagesknöpfe, Hilfe mit Suche |

1.21.0 ist vergeben (Orden Gladiator, 10.11.2026). Die Versionen unten folgen dieser Tabelle; wo im Text noch eine
alte Nummer steht, gilt die Tabelle.

---

## PB · Bestien-Dosis: die Woche zählt, der Pool dosiert (1.22.0) — Vorrang

Konzept und Rechnungen: `docs/BESTIEN-DOSIS.md` (Friedrichs Reißbrett vom 10.11.2026, unverändert abgelegt).
Dieses Kapitel ist die verbindliche Bauvorgabe; wo es vom Konzept abweicht, gilt dieses Kapitel (Abweichungen
sind markiert und begründet).

### Warum
King, Pilgrim und Alchemist fühlen sich schwach und unprogressiv an. Ihre Bestien sind Varianz- und Zeitinstrumente,
keine Fortschrittsnerven. Gesucht ist ein Bestienpool je Woche, der eine Dosis je Bewegungskategorie erfüllt und
über die Blockwochen sanft steigt — ohne eine einzige Bestie zu ändern.

### Feste Regeln (Friedrich, nicht verhandelbar)
- Bestien stehen fest, Wiederholungen einer Runde ändern sich nie. Keine neuen Bestien, keine Stufen-Kuration.
- Dosisformen nur: **voll**, **Partial k/R** (jede Rundenzahl ab 1), **Doppel**, **Triple**, dazu die bestehende
  **Serie** zweier Bestien (`pair` in `pickWith`).
- Zielkriterium: Ziel erreichen, Überhang bis +15 % ist ideal, darüber leicht abgewertet.
- Fenster: das Klassenfenster des Tages, geprüft gegen die **formeffektiven** Minuten. Keine Wochen-Obergrenze.
- Der Pool-Filter ist ein Gewicht, nie eine Sperre. Rangfolge: Zeitfenster > Varianz > Dosis.
- Deload: Ziele × 0,5. Testwoche: Dosis aus. Keine neue UI-Karte; die Wirkung zeigt sich im `why` der Bestie.

### Zählung (Abweichung vom Konzept, wichtig)
Das Konzept nennt die Dosis „dieselbe Skala wie volume.ts“. Das stimmt nicht: `beastSets` verteilt eine Übung
über ihre Muskelanteile (Push-ups zählen für Brust, Trizeps und Schultern), das Konzept rechnet **eine Kategorie je
Übung**. Nachgerechnet: Aufhocker + Asag + Peri ergeben über Muskelanteile push 8 · pull 3 · legs 5 · core 4, über eine
Kategorie je Übung (mit den Overrides unten) 4 · 4 · 4 · 4 wie im Konzept.

Verbindlich ist die Konzept-Zählung, als eigene Funktion, nicht über `beastSets`:
- Je Übung genau eine Kategorie: `push` (Brust, Trizeps, Schultern), `pull` (Rücken, Bizeps), `legs` (Quadrizeps,
  Gesäß, Beinbeuger, Waden), `core` (Rumpf, Unterarme). Ableitung: Kategorie mit der größten Summe der Anteile aus
  `musclesOf`; Gleichstand → Reihenfolge push, pull, legs, core. Laufen, Rudern, Pausen (`CARDIO` in `volume.ts`)
  zählen nicht.
- **Overrides** in `data/modules/beastdose.json` → `categories` (Übung → Kategorie), mindestens:
  Thrusters, Burpees (und Burpee-Varianten) = push · Snatch-, Swing-, Deadlift-Familie = legs · Supermen, Hangs =
  core · Face Pull, Band Upright Rows, Pull Press, Reverse Fly = pull · OA Band Curl-and-Press = push.
- Bestie: Runden × 0,5 je Übung in ihrer Kategorie (Leitern: Anteil wie `shortBeast`). Partial k/R skaliert wie
  `shortBeast`, Doppel × 2, Triple × 3.
- Feste Slots des Ordens: Sätze × 1 je Übung in ihrer Kategorie (gleiche Zuordnung), aus der geplanten Woche
  (`focusFor` aller Rollen der Woche).
- Einheit überall: **App-Sätze**. Die Volumen-Karte (P3) bleibt bei Muskelanteilen; sie zeigt etwas anderes
  (Muskel), die Dosis zeigt Bewegungsmuster.

### Ziel der Woche
- Neues optionales Ordensfeld `beast_dose`:
  ```json
  "beast_dose": { "push": [12, 14, 17, 17], "pull": [9, 11, 13, 13], "legs": [12, 14, 17, 17], "core": [12, 14, 16, 16], "quality_from": 4 }
  ```
  Werte = **Gesamtziel** (feste Slots + Bestien) je Blockwoche; nach dem letzten Wert gilt der letzte.
  In einem Zeichen zählt die Klammerwoche (`klammerWeek`), sonst die Blockwoche.
- Bestienziel je Kategorie = max(0, Gesamtziel − feste Slots der geplanten Woche).
- Ist das Bestienziel mit den Slots der Woche nicht erreichbar (Summe der besten Einzelbeiträge je Slot), wird es auf
  das Erreichbare gekürzt; das `why` sagt es ehrlich („Zug: 13 geplant, 11 erreichbar — die Woche hat zwei
  Bestienplätze“).
- Kein Nachholen: Was in Woche N ausfiel, erhöht Woche N+1 nicht („Alltag ist Trumpf“).
- Ohne `beast_dose` ändert sich für den Orden nichts. **Pilot: nur King.** Gladiator, Pilgrim, Alchemist erst nach
  Rückmeldung des Nutzers.

### Wahl
- Bestienplätze der Woche in Tagesreihenfolge (`dayRoleMap`) nacheinander wählen; jeder Platz sieht das Restziel
  (Ziel − schon gewählte Plätze dieser Woche). Deterministisch wie heute (Seed).
- Kandidaten wie heute (`pickWith`: single, double, pair, Kurzform) plus: **alle** Partials k = 1 … R−1 für
  `canShorten`-Bestien, die ins Fenster passen (nicht nur die längste Kurzform), und **Triple**, wenn `inSlot(m × 3)`.
  Bestien, die `canShorten` nicht erfüllen (Teile, Wiederholung, AMRAP, `noShort`), haben keine Partials — das bleibt.
- Dosis-Gewicht `poolWeight(cand, rest)`: für jede Kategorie mit Restziel > 0 Anteil der Abdeckung; Fehlbetrag in
  `pull` zählt doppelt (Flaschenhals des Bestands); Überhang über +15 % je Kategorie leicht negativ. Das Gewicht wird
  **nach** Zeitfenster und Varianz addiert und darf die Varianzregel nicht überstimmen (Test `weekbeasts.test.ts`
  bleibt grün).
- Qualität ab `quality_from`: Kandidaten mit Übungen aus `data/modules/beastdose.json` → `advanced` (Startliste:
  Archer Pushup, Clapping Pushups, Clapping Pullups, Commando Pullups, Muscle-Ups und Familie) in einer Kategorie mit
  Restziel bekommen einen festen Bonus. Ersetzt wird nichts; „mehr Archer“ entsteht über die Auswahl.
- Lastbestien (Morgenland/Süd): Last weiter über `suggestLoad`; sie ist die letzte Stufe der Progression.

### Sichtbar
- `why` der Bestie, eine Zeile: „Dosis Woche 3: Druck 17, Zug 13, Beine 17, Rumpf 16 — diese Bestie bringt
  +3 Zug, +2 Rumpf.“ Bei Partial/Doppel/Triple steht die Form im Namen wie heute bei Kurzformen.
- Hilfe: Absatz „Bestien: die Woche zählt, der Pool dosiert“ (Empfehlung, nie Sperre; Formen; Zählung).

### Technik
- NEU `src/engine/beastdose.ts`: `categoryOf(exercise)`, `beastDose(beast): Dose` (App-Sätze je Kategorie),
  `formDose(beast, form)`, `fixedDose(focus, roles)`, `doseGoal(state, block, week): Dose | null`,
  `poolWeight(cand, rest): number`.
- NEU `data/modules/beastdose.json`: `categories` (Overrides), `advanced`. Validator: jede Übung existiert.
- `plan.ts` `pickWith`/`pickBeast`: Kandidaten erweitern, Restziel durchreichen, Gewicht einrechnen.
- `types.ts`: `Focus.beast_dose?`. Validator: vier Kategorien, Zahlen ≥ 0, `quality_from` ≥ 1.
- King: `beast_dose` mit den Zahlen oben (Konzept, Reißbrett-Runde 4) — erst nach Bestätigung durch den Nutzer.

### Tests (`beastdose.test.ts`)
- Fixpunkt: Aufhocker + Asag + Peri (alle voll) = 4 · 4 · 4 · 4 App-Sätze, 36 Minuten.
- Zählung: Partial 2/4 halbiert, Doppel verdoppelt, Triple verdreifacht; Cardio zählt nicht; Leiter-Partial wie
  `shortBeast`.
- Ziel: Woche 1–4 nach Tabelle, Woche 6 = letzter Wert; Deload × 0,5; Testwoche null; ohne `beast_dose` null.
- Wahl: King Woche 4 trifft das Bestienziel in jeder Kategorie oder meldet das Erreichbare; keine Bestie zweimal in
  der Woche, wenn es Alternativen gibt (Varianz vor Dosis).
- Die Lösungszahlen aus dem Konzept (6.499 Lösungen usw.) **nicht** als Unit-Test: Sie hängen am Bestand, und der
  wird laufend kuratiert. Stattdessen `scripts/beastdose-report.mjs` (Aufzählung, manuell).

### Offen (beim Nutzer, vor dem Bau klären)
1. King-Zahlen bestätigen (Tabelle oben).
2. Pilgrim: Dosisziel mit Zeit-Äquivalent für aerobe Anteile, oder nur Auswahl? (Vorgabe bis zur Antwort: kein Ziel.)
3. King `chaos_b` bekommt einen Bestienplatz? (Vorgabe: nein, nicht ohne Zustimmung.)
4. Gladiator in die Pilotrunde?

---

## P1 · Zeitstrahl (1.23.0)

### Warum
Der Zeitstrahl ist die Makro-Perspektive. Wer in einer Fettverlust- oder Urlaubsphase steckt, soll auf einen Blick
sehen, dass das Jahr Kraft, Muskeln und Skill enthalten hat und wieder enthalten wird. Heute scrollt das Bild
waagerecht, etwa fünf Monate sind sichtbar, Vergangenes fällt aus dem Blick.

### Verhalten
Zwei Ansichten, umschaltbar mit einem `Seg` über dem Bild („Jahr“ | „Ab heute“). Die Wahl wird in
`AppState.yearView?: "year" | "ahead"` gemerkt (Standard `"year"`).

1. **Jahr**: das ganze Trainingsjahr mit Vergangenheit, ohne Scrollen auf die Breite gepasst.
   - Fenster: 52 Wochen. Anfang = Montag des frühesten Starts aus Lebensabschnitten und Plan. Liegt heute hinter dem
     Ende, rückt das Fenster in ganzen Jahren weiter, bis heute darin liegt. Reicht der Plan über das Fenster
     hinaus, endet das Bild trotzdem nach 52 Wochen (Rest steht in „Ab heute“ des Folgejahres).
   - Segmente tragen nur Symbole: Zeichen-Tier (`KlammerIcon`), Ordenssymbol (`OrderIcon`). Namen erscheinen erst
     ab 64 px Segmentbreite (Messung per CSS-Containerabfrage oder berechnet aus Wochen × Pixel je Woche).
   - Vergangenes mit 55 % Deckkraft, aber farbig — es bleibt lesbar, es ist Teil der Bilanz.
2. **Ab heute**: zwei Wochen zurück bis 26 Wochen voraus, ebenfalls auf die Breite gepasst, mit Namen.

In beiden Ansichten:
- Drei Bahnen, von oben: **Last** (schmal, 8 px: Farbe je Woche aus `weekLoad`-Logik über die Abschnitte —
  niedrig `--teal`, mittel `--amber`, hoch `--red`; Dauerlast-Orden (`dauerlast`) schraffiert), **Zeichen** (30 px),
  **Orden** (30 px). Die Namen der Lebensabschnitte entfallen im Bild; sie stehen im Detailstreifen.
- Testwochen: schmale Kerbe in Bernstein über Zeichen- und Ordensbahn.
- Kalorien: kleines `Sign` (deficit/maintenance/surplus) rechts im Zeichen-Segment, wenn es breiter als 40 px ist.
- Heute: senkrechte Marke über alle Bahnen, darüber das Datum („10.11.“).
- Monatsleiste: Anfangsbuchstaben (J F M A M J J A S O N D), Quartalsstriche kräftiger, Jahreszahl am Januar.
- Kein waagerechtes Scrollen mehr; `WEEK_PX` und der Scroller entfallen.

**Antippen** eines Zeichens öffnet darunter einen Detailstreifen (zweites Antippen schließt):
```
Bär · Masse            30.11.26 – 31.1.27 · 9 Wochen · Überschuss
[Slayer 8 Wo.] [Testwoche]
Abschnitt: Vorlesungszeit Winter (mittel) · Dauerlast
```
Im Plan-Reiter springt ein Tipp auf einen Orden im Detailstreifen zur Karte der Phase (bestehende Callbacks
`onBlock`, `onKlammer`, `onTest`) und hebt sie 1,5 s hervor (Klasse `flash`). Die Liste bleibt der Ort zum
Bearbeiten. „Später · n Orden“ in der Liste bleibt.

**Jahresbilanz** unter dem Bild (das ist der Kern der Makro-Perspektive):
- Eine Zeile je Zeichen, das im Fenster vorkommt, sortiert nach Wochen: Tier-Symbol, Name mit Stichwort,
  ein Balken in Zeichenfarbe mit zwei Teilen (hinter dir: volle Farbe; vor dir: 45 % Deckkraft), rechts
  „22 Wo.“ Der `title` nennt die Aufteilung („8 hinter dir, 14 vor dir“).
- Darunter ein Satz, nur wenn die laufende Phase ein Defizit hat oder auf Reisen liegt:
  „Dieses Jahr: 22 Wochen Masse, 8 Wochen Kraft, 8 Wochen Explosiv. Das Nächste: Bär · Masse ab 30.11.“
  (Zeichen der laufenden Phase weglassen; höchstens drei nennen; das nächste Zeichen ist das erste künftige mit
  anderer Art.)
- Testwochen zählen nicht mit. Phasen ohne Zeichen zählen unter „ohne Zeichen“ und nur, wenn es sie gibt.

Orte: Plan (oben, mit Antippen → Liste), Stand (Karte „Dein Jahr“, mit Jahresbilanz), „Jahr planen“ Schritt 2 und 4
(Entwurf statt gespeichertem Plan, ohne Jahresbilanz in Schritt 2).

### Technik
- Neu `src/engine/yearview.ts`:
  - `yearWindow(plan, sections, today): { start: string; end: string }` (52 Wochen, Regeln oben)
  - `aheadWindow(today): { start; end }`
  - `weekLoads(sections, plan, start, end): { monday: string; load: Load; dauer: boolean }[]`
    (Last der Woche: Abschnitt, sonst Phase; `dauer` über `dauerlast` aus `weekplan.ts`)
  - `signShare(plan, start, end, today): { kind: KlammerId | "none"; past: number; ahead: number }[]`
    (Wochen je Zeichen im Fenster, an `today` geteilt, Testwochen ausgenommen, eine Dezimale)
  - `macroLine(plan, today, share): string | null` (der Satz; null, wenn die laufende Phase weder Defizit noch Reise ist)
- `src/ui/YearPicture.tsx` umbauen: Props `window: { start; end }`, `labels: boolean`; Breite 100 %, Segmente in
  Prozent. `klammernOf`, `fill` bleiben. Detailstreifen als lokaler Zustand `open: meso-Id | null`.
- Neu `src/ui/YearBalance.tsx` (Jahresbilanz).
- `types.ts`: `AppState.yearView`. Kein Migrationsschritt nötig (optional).

### Tests
- `yearview.test.ts`: Fenster beginnt am frühesten Start; rückt nach 52 Wochen weiter; `signShare` summiert auf die
  Trainingswochen des Fensters und teilt an heute; Testwochen zählen nicht; `macroLine` nur bei Defizit oder Reise
  und ohne das laufende Zeichen; `weekLoads` markiert Dauerlast.
- e2e: Plan zeigt den Zeitstrahl ohne waagerechtes Scrollen (`scrollWidth <= clientWidth`); Umschalten auf
  „Ab heute“ merkt sich die Wahl; Antippen eines Zeichens zeigt den Detailstreifen; Stand zeigt die Jahresbilanz.

### Abnahme
Bei 390 px Breite ist das ganze Jahr sichtbar, heute markiert, die Vergangenheit farbig. Unter dem Bild steht, wie
viele Wochen jedes Zeichen im Jahr hat. In einer Defizit-Phase steht der Satz mit Masse/Kraft/Skill darunter.

---

## P2 · Befinden nach jeder Einheit (1.24.0)

### Warum
Affekt sagt Dabeibleiben besser voraus als Vorsätze (Ekkekakis-Linie). Heute fragt die App das Befinden nur im
King ab (`focus.affect_rule`), und nur dort wirkt es (`affectDowngrade`).

### Verhalten
- Die Frage „Wie hat sich die Einheit angefühlt?“ steht in jeder Einheit auf der Abschlusskarte, als fünf Knöpfe
  statt elf: −2 · −1 · 0 · +1 · +2 mit Beschriftung an den Enden („schlecht“, „sehr gut“). Freiwillig; ohne Wahl
  wird nichts gespeichert. Gespeichert wird wie bisher in `state.feeling`, auf der alten Skala: −5, −3, 0, +3, +5.
  So rechnet `affectDowngrade` (zweimal ≤ −1) unverändert. Ausgewertet wird auf der Anzeige-Skala −2 bis +2
  (gespeicherter Wert ÷ 2,5; alte Elfer-Werte werden genauso geteilt).
- Die King-Regel bleibt, wie sie ist.
- Stand, neue Karte „Befinden“ (unter „Bereiche“): 
  - Mittelwert der letzten vier Wochen als Zahl und Wort (unter −0,5 „zäh“, bis +0,5 „neutral“, darüber „gut“).
  - Je Tagestyp der laufenden Phase (Rollenname) eine Zeile mit Punktreihe der letzten sechs Werte
    (Punkte in `--red`/`--muted`/`--teal`) und Mittelwert. Sortiert vom besten zum schwächsten.
  - Ein Hinweis, nur wenn ein Tagestyp bei mindestens drei Werten im Mittel unter −0,5 liegt:
    „<Tag> fühlt sich seit drei Einheiten zäh an. Unter Anpassen lässt er sich kürzen oder tauschen.“
    Keine automatische Änderung am Training.
  - Unter fünf Werten insgesamt: nur „Noch zu wenige Einheiten mit Befinden.“

### Technik
- `src/engine/affect.ts`: `affectSummary(state, today): { mean4w: number | null; n: number; byRole: { role: string; name: string; values: number[]; mean: number }[]; flag: string | null }`.
- `SessionView.tsx`: Bedingung `focus.affect_rule && hard` für die Anzeige entfernen (die Regel selbst bleibt an
  `affect_rule` gebunden); neue Skala.
- `Dashboard.tsx`: Karte „Befinden“.

### Tests
`affect.test.ts` (Mittelwert, Fenster vier Wochen, Hinweis erst ab drei Werten, Skalenumrechnung);
e2e: Einheit abschließen mit „+1“ speichert einen Wert; Stand zeigt die Karte.

---

## P3 · Volumen Soll-Ist im Stand (1.25.0)

### Warum
Der Richtwert des Nutzers (`volumeRange(user)`, bei ihm 12–16 harte Sätze je Muskel und Woche) ist die direkteste
Coaching-Größe. Heute steht das Volumen aufklappbar und ohne Zielband.

### Verhalten
- Stand, Karte „Volumen diese Woche“ (ersetzt den Volumen-Teil im Aufklapper; „Verlauf“ bleibt aufklappbar):
  je Muskel (`MUSCLES` aus `volume.ts`) eine Zeile: Name, Balken 0–20 Sätze mit hinterlegtem Zielband
  (`volumeRange`) und Erhaltungsmarke (`maintenanceVolume`), rechts die Zahl.
- Zwei Balken übereinander oder ein Balken mit Marke: **geplant** (aus `focusFor` der laufenden Woche, alle Rollen)
  als Umriss, **erledigt** (aus `weeklyVolume`) gefüllt.
- Farbe wertneutral: unter Erhaltung `--amber`, sonst `--teal`; über dem Band keine Warnfarbe.
- Im Defizit (Phase `kcal === "deficit"`) gilt als Zielband Erhaltung bis unterer Richtwert, mit dem Satz
  „Im Defizit hält weniger Volumen den Stand.“
- Entlastungs- und Testwochen: Karte zeigt „Entlastungswoche: Volumen zählt nicht.“

### Technik
`volume.ts`: `plannedVolume(state, block, week): Record<string, number>` (Sätze je Muskel aus allen Rollen der Woche,
gleiche Zählung wie `weeklyVolume`, Bestien über `beastSets`). `Dashboard.tsx`: Karte. Test in `volume.test.ts`:
geplant ≥ erledigt bei vollständiger Woche; Deload liefert null.

---

## P4 · Schutz vor Programm-Hopping (1.26.0)

### Warum
Programm-Hopping ist das dokumentierte Hauptrisiko des Nutzers. Er will externe Regeln statt Stimmung.

### Verhalten
- **Ideenparkplatz**: Im Plan-Reiter ein Knopf „Idee notieren“ (neben „+ Phase anhängen“). Öffnet ein Textfeld;
  gespeichert in `AppState.ideas?: { date: string; text: string; done?: boolean }[]`. Liste aufklappbar „Ideen für
  später“ mit Abhaken und Löschen.
- **Laufende Phase ändern** (Orden wechseln, Phase kürzen, teilen, löschen — alles, was eine Phase mit
  `start <= heute <= end` trifft): Vor dem Speichern erscheint ein Dialog:
  „Du bist in Woche 6 von 9. Was ist der Grund?“ mit drei Knöpfen: „Schmerz oder Verletzung“, „Alltag hat sich
  geändert“, „Neue Idee“. Die ersten beiden speichern sofort (mit Eintrag in `AppState.planChanges?: { date; blockId; reason }[]`).
  „Neue Idee“ bietet an: „Als Idee für später notieren“ (Standard, hervorgehoben) oder „Trotzdem ändern“.
- Künftige Phasen bleiben frei änderbar. „Jahr planen“ ändert laufende Phasen ohnehin nicht (`planYear` hält sie).
- In der Testwoche zeigt die Auswertung offene Ideen: „3 Ideen warten. Jetzt ist der Moment, sie einzuplanen.“

### Technik
`src/engine/guard.ts`: `touchesRunning(before: PlanBlock[], after: PlanBlock[], today): PlanBlock | null`.
Einhängen an der einen Stelle, an der der Plan gespeichert wird (`onChange` der `PlanList` in `App.tsx`).
Tests: Änderung an künftiger Phase → null; Verlängern der laufenden Phase um eine Woche → null (kein Hopping);
Ordenswechsel, Kürzen, Löschen der laufenden → Phase.

---

## P5 · Wochenrückblick (1.27.0)

### Verhalten
- Ist die Woche geschafft (`weekDone` in `Today.tsx`) oder ist Sonntag, zeigt die Heute-Ansicht über den
  Tagesknöpfen eine schmale Karte „Woche 7“: 
  `3 von 4 Einheiten · 1 verdichtet · Befinden +1 · 2 Gewichte gesteigert`.
  Ausgefallenes heißt „verdichtet“ oder „entfallen“, nie „verpasst“.
- Ein Tipp öffnet Details: je Einheit eine Zeile (Tag, Name, Dauer, Befinden), darunter gesteigerte Übungen.
- Schließen merkt sich `AppState.weekSeen?: Record<string, true>` (Schlüssel `blockId:week`); die Karte kommt nicht wieder.

### Technik
`src/engine/weekreview.ts`: `weekReview(state, block, week)`. Gesteigert = Übung, deren `SlotState.weight` oder
`target` in dieser Woche gestiegen ist (Vergleich der Sätze der Einheit mit der vorigen Einheit derselben Übung im
Log). Tests mit zwei aufeinanderfolgenden Wochen.

---

## P6 · Defizit: „gehalten“ zählt (1.28.0)

### Warum
Die Angst vor Leistungsverlust im Defizit ist Abbruchgrund Nr. 1 des Nutzers. Im Defizit ist Halten das Ziel.

### Verhalten
- In Phasen mit `kcal === "deficit"`: Schließt eine Übung mit gleichem Gewicht und gleichen Wiederholungen wie
  beim letzten Mal, zeigt die Karte nach dem Abschluss ein kleines grünes „gehalten“ (statt nichts).
- Wochenrückblick (P5) zählt im Defizit „4 Übungen gehalten, 1 gesteigert“.
- Stand, Karte „Volumen“ (P3) und „Verlauf“: Unterzeile „Defizit-Phase: Halten ist das Ziel.“
- Fällt eine Kernübung in zwei Einheiten nacheinander (Gewicht oder Wiederholungen runter), ein sachlicher
  Hinweis: „<Übung> gibt nach. Bei ausreichend Eiweiß und Schlaf fängt sich das meist; sonst Defizit eine Woche pausieren.“
  Keine automatische Änderung.

### Technik
`progression.ts`: `trendOf(prev: SessionEntry, cur: SessionEntry): "up" | "held" | "down"` (bestes Satzprodukt
Gewicht × (1 + Wdh/30)). Tests für alle drei Fälle.

---

## P7 · Ausklang (1.29.0)

### Warum
Sinkt die Intensität zum Ende, wird die Einheit angenehmer erinnert (Hutchinson et al., 2020; an Krafttraining
gezeigt, Erleben gemessen — Wirkung auf Dabeibleiben über Monate nicht direkt belegt). Viele Einheiten enden mit
Bestie oder Drop-Set.

### Verhalten
- Endet der Trainingsteil einer Einheit mit Bestie, Finisher-Superset oder einer Übung mit `finish`, steht das
  Cool-down unter der Überschrift „Ausklang“ und beginnt mit einem Punkt „2 Minuten locker gehen, Atem
  beruhigen“ (Timer 120 s), danach die normalen Dehnungen.
- Kein neuer Block, keine zusätzlichen Übungen sonst. Am Kurztag entfällt der Zusatzpunkt.
- Hilfe: ein Absatz mit Quelle und der Einschränkung.

### Technik
`plan.ts` bei den Cool-down-Listen: Drill `{ id: "cd-walk", name: "Locker gehen, Atem beruhigen", mode: "hold", value: 120 }`
voranstellen, wenn der letzte Trainingsblock hart ist (`isHardEnd(role)`). Test in `warmcool.test.ts`.
Quelle in `references.json`: Hutchinson, J. C., Zenko, Z., Santich, S., & Dalton, P. C. (2020). Increasing the
pleasure and enjoyment of exercise: A novel resistance-training protocol. *Journal of Sport and Exercise
Psychology, 42*(2), 143–152. (Vor dem Eintragen Band und Seiten prüfen.)

---

## P8 · Entlastung nach Signalen (1.30.0)

### Warum
Eine feste Pause brachte Trainierten in neun Wochen keinen Vorteil für Muskel und kostete etwas Kraft (Coleman et
al., 2024 — dort eine volle Woche Pause, nicht halbe Sätze; kurze Studie). Der Rhythmus bleibt als Angebot, die
Signale bekommen mehr Gewicht.

### Verhalten (`deloadAdvice` in `deload.ts`)
- Rhythmus-Woche (5, 9, 13 …): Die Empfehlung erscheint nur, wenn mindestens ein Signal vorliegt; sonst die
  leise Zeile „Entlastung wäre dran. Dir geht es gut: weiter, oder trotzdem entlasten?“ mit beiden Knöpfen
  gleichrangig (bisher ist „Entlasten“ hervorgehoben).
- Signale (letzte 14 Tage), jedes zählt einen Punkt: dreimal „zu schwer“ (wie bisher); Befinden im Mittel unter
  −0,5 bei mindestens drei Werten (P2); zwei Kernübungen mit Trend „down“ (P6); hohe Last der Woche (`weekLoad`).
  Ab zwei Punkten: Empfehlung mit Begründung in Worten („zweimal zu schwer, Befinden zäh“), „Entlasten“ hervorgehoben.
- Unverändert: nie in oder direkt vor der Testwoche, nie dicht nach der letzten Entlastung.

### Technik
`DeloadAdvice` bekommt `signals: string[]`. Tests in `deload.test.ts` für jede Kombination.
Quelle: Coleman, M., Burke, R., Augustin, F., Piñero, A., Maldonado, J., Fisher, J. P., Israetel, M., Androulakis
Korakakis, P., Swinton, P., Oberlin, D., & Schoenfeld, B. J. (2024). Gaining more from doing less? The effects of a
one-week deload period during supervised resistance training on muscular adaptations. *PeerJ, 12*, e16777.

---

## P9 · Zuspitzung vor der Testwoche (1.31.0)

### Verhalten
- Die Woche vor der Testwoche läuft heute mit −1 Satz. Neu: Sätze auf etwa 60 % (aufgerundet, mindestens zwei),
  Gewichte und Wiederholungen unverändert, Satzende-Techniken aus, Bestien eine Klasse kürzer, Sprünge und
  Sprints bleiben vollständig (wenige, frische Versuche).
- Tag auf der Heute-Karte: „Zuspitzung vor der Testwoche“ statt „−1 Satz“.
- Gilt gleich in jeder Phase, damit Testwochen vergleichbar bleiben.

### Technik
`weekplan.ts`: `taperShape(f)` neben `deloadShape`; greift in `focusFor`, wo heute die Vorwoche behandelt wird
(`beforeTest` in `Today.tsx`, `sysReduced`). Tests: Sätze 60 %, Power-Slots (`kind`/Name in `BALLISTIC`) unverändert.
Hilfe anpassen (Abschnitt Testwoche).

---

## P10 · Explosives vor Ausdauer (1.32.0)

### Warum
Gleichzeitiges Ausdauertraining stört Muskel und Maximalkraft kaum, Explosivkraft aber schon (Schumann et al., 2022).

### Verhalten
- Prüfung in `scripts/validate.mjs` für Orden mit Hauptziel `power` oder `speed`: In keiner Rolle steht ein
  Lauf-, Intervall- oder Bestienblock vor einer Sprung-, Wurf- oder Sprintübung. Verstöße sind Fehler.
- Bekannter Fall: Gladiator „Spiel“ (Pogo Hops/Skater Jumps nach den Sprint-Intervallen). Vor dem Umstellen den Nutzer fragen, es ist seine Kuration.
- Orden-Dateien entsprechend umstellen (kompakt halten, Formatierer aus `AGENTS.md`-Regel: nicht mit `indent=2`).
- Bestienwahl im Falken: am Tag nach einem Sprint- oder Sprungtag keine Bestie der Klassen „uralte“/„verfluchte“
  (`pickBeast` in `plan.ts`, über die Rolle des Vortags in `dayRoleMap`).
Quelle: Schumann, M., Feuerbacher, J. F., Sünkeler, M., Freitag, N., Rønnestad, B. R., Doma, K., & Lundberg, T. R.
(2022). Compatibility of concurrent aerobic and strength training for skeletal muscle size and function: An updated
systematic review and meta-analysis. *Sports Medicine, 52*(3), 601–612.

---

## P11 · Schätzwerte lernen (1.33.0)

### Verhalten
- Die Verhältnisse in `data/modules/transfer.json` sind Erfahrungswerte. Hat der Nutzer für zwei Übungen einer
  Familie eigene Stände (beide in den letzten 12 Wochen aktualisiert), gilt sein Verhältnis statt des hinterlegten.
- Kette: Bench Press ↔ Chest Press gemessen, Incline nur hinterlegt → Incline wird über den gemessenen Anker
  geschätzt. Abschlag 15 % bleibt, bei gemessenem Verhältnis 10 %.
- Setup › Können: aufklappbar „Deine Verhältnisse“ (Liste: Übung, Verhältnis hinterlegt → gemessen). Nur Anzeige.

### Technik
`progression.ts`: `ownRatios(slots): Record<string, number>` (je Familie relativ zum Anker, aus
`weight × (1 + target/30)`); `estimateFrom` nutzt sie. Tests in `handover.test.ts`.

---

## P12 · Kleines an der Oberfläche (1.34.0)

- **Tagesknöpfe** (Heute): Bei vier Tagen und Bildschirmbreite unter 420 px zwei Reihen zu je zwei Knöpfen
  (`.days` → `grid-template-columns: repeat(2, 1fr)` per Containerabfrage), Rollenname ohne Trennung, Ort in
  derselben Zeile wie der Wochentag. Bei drei Tagen bleibt eine Reihe.
- **Hilfe**: Suchfeld oben (filtert Abschnitte nach Überschrift und Text, Treffer hervorgehoben); Abschnitte
  aufklappbar, alle zu, außer es wird gesucht. Kein Text geht verloren.
- **Plan-Liste**: „Später · n Orden“ zeigt aufgeklappt die Zeichen als Gruppen wie bisher; kein Umbau über P1 hinaus.

---

## Nicht tun
- Keine neue Hauptnavigation, keine weiteren Reiter.
- Keine automatischen Trainingsänderungen aus Befinden oder Trend — nur Hinweise; der Nutzer entscheidet.
- Keine Ranglisten, keine Streak-Zähler mit Verlustangst.
- Laufende Phasen nicht still ändern (`frozen` beachten).
- Die Länge einer Einheit auf dem Bildschirm bleibt, wie sie ist (Entscheidung vom 10.11.2026).
