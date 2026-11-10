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

## Entscheidungen gesammelt (noch nicht gebaut)
- 10.11.2026 · Gladiator „Spiel“: neue Reihenfolge 5-10-5 Shuttle → Pogo Hops + Skater Jumps → Medizinball-Brustpass
  → Sprint oder Seilspringen 10 × 30 s (Explosives frisch, Intervalle als Ausklang). Mit P10 bauen.
- 10.11.2026 · Springseil: neues Equipment-Feld `has.rope` (optional, wie `roll`/`ball`; fehlt = vorhanden, damit alte
  Profile nichts verlieren — beim Anlegen neuer Profile abfragen). Übungen mit Seil (Seilsprints, Seilspringen,
  Single Unders, „Sprint oder Seilspringen“, „Burpees oder Seilspringen“) bekommen `needs: ["rope"]` und je einen
  festen Ersatz ohne Seil (`instead`): Seilsprints → High Knees auf der Stelle, Seilspringen/Single Unders →
  Pogo Hops (Sprungrhythmus, gleiche Zeit), Mischübungen → die seilfreie Hälfte (Sprints bzw. Burpees). In Bestien
  ersetzt die Verhex-Logik nicht; dort gilt dieselbe `instead`-Zuordnung. Validator: jede Übung mit `needs: rope` hat
  `instead`. Mit PB oder vorher als kleines Paket bauen.
- 10.11.2026 · P2 Befinden: Feeling Scale −5 bis +5 für alle Orden (statt fünf Stufen).

## Reihenfolge

| Paket | Version | Inhalt |
|---|---|---|
| **PB** | **1.22.0** | **Dosis: Bestien und Sätze in einer Währung, alle Orden, Muskel und Kondition — Vorrang** |
| P1 | 1.23.0 | Zeitstrahl: ganzes Jahr und ab heute, Jahresbilanz der Zeichen |
| P2 | 1.24.0 | Befinden (Feeling Scale) nach jeder Einheit, Auswertung im Stand |
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

## PB · Dosis: Bestien und Sätze in einer Währung (1.22.0) — Vorrang

Ersetzt den ersten PB-Entwurf (Kategorien, nur King). Entschieden mit dem Nutzer am 10.11.2026.
Hintergrund und Reißbrett-Rechnungen: `docs/BESTIEN-DOSIS.md` (gilt nur noch als Hintergrund; wo es abweicht, gilt
dieses Kapitel).

### Vision (Nutzer)
Workouts wie bei Freeletics oder CrossFit so formalisieren, dass klassische Progression möglich wird. Bestien laufen
nicht separat, sondern stehen gleichberechtigt neben Sätzen und Wiederholungen und werden genauso gerechnet. Jeder
Orden erzeugt auf **beiden Achsen** — Muskel und Herz-Kreislauf — entweder Erhalt oder Progression. Die Dosis soll
von Woche zu Woche steigen; ob über Volumen, Komplexität oder Last, ist zweitrangig. Erst Volumen hoch, dann
Schwierigkeit hoch und Volumen zurück, dann wieder Volumen hoch.

### Feste Regeln
- Bestien stehen fest, Wiederholungen einer Runde ändern sich nie, keine neuen Bestien, keine Stufen-Kuration.
- Dosisformen: voll, Partial k/R (k ≥ 1, nur `canShorten`), Doppel, Triple, Serie (`pair`).
- Fenster: Klassenfenster des Tages gegen formeffektive Minuten. Keine Wochen-Obergrenze.
- Gewicht, nie Sperre. Rangfolge: Zeitfenster > Varianz > Dosis.
- Kein Nachholen ausgefallener Wochen („Alltag ist Trumpf“).

### 1 · Zählung: Päckchen (ersetzt die Runden-Zählung)
Heute zählt `beastSets` je Runde und Übung einen halben Satz, egal ob 5 oder 50 Wiederholungen (Venus 4 × 50 Push-ups
= 2 Sätze). Neu zählt die Bestie, wie der Nutzer sie tatsächlich bricht:
- **Päckchen** je Runde und Übung = ⌈Wiederholungen / Päckchengröße⌉. Ein Päckchen = ein halber Satz (Faktor 0,5,
  Entscheidung des Nutzers: Bestienrunden enden oft weit vor 1–3 Wiederholungen in Reserve).
  Beispiel Venus (4 Runden: 50 Push-ups, 20 Crunches, 50 Squats; Päckchen 25 / 20 / 50): 8 + 4 + 4 Päckchen =
  4 + 2 + 2 Sätze, verteilt über die Muskelanteile aus `musclesOf` wie bei jeder klassischen Übung.
- Leitern (40/30/20/10): je Runde die Wiederholungen dieser Runde.
- Ohne Wiederholungszahl (Halten, Hängen, Tragen, Strecken in Metern, Zeitangaben): 1 Päckchen je Runde.
- Sprints, Läufe, Rudern, Rad, Seilspringen, Pausen (`CARDIO` in `volume.ts`): keine Sätze, sie zählen auf der
  Kondition (Abschnitt 4).
- Sprünge und Würfe (Squat Jumps, Tuck Jumps, Box Jumps, Broad Jumps, Clapping Pushups): Päckchengröße wie eine
  harte Variante (klein), sie zählen.
- **Päckchengröße** aus `data/modules/packets.json`: Tabelle je Übung mit drei Werten
  `[Einsteiger, Fortgeschritten, Erfahren]` (Niveau aus `user.level`), dazu Regeln für alle übrigen Namen
  (Hauptmuskel und Muster, z. B. Oberkörper-Drücken mit Körpergewicht `[10, 20, 25]`, Kniebeuge-Muster `[25, 40, 50]`,
  Rumpf `[15, 25, 30]`, Klimmzug-Familie `[3, 8, 12]`, Handstand-Push-ups `[2, 5, 8]`, Muscle-Ups `[1, 3, 5]`).
  Die Startwerte sind Schätzungen; der Nutzer kuratiert die Tabelle. Validator: jede Übung aus jeder Bestie bekommt
  eine Päckchengröße oder fällt sicher unter Cardio/„1 je Runde“.
- **Nachschärfen nach jeder Testwoche** (eigene Werte schlagen die Tabelle): aus Tests (`t-pushups` → Push-up-Familie,
  `t-pullups` → Klimmzug-Familie) und aus dem Log (bester Satz derselben Übung als klassischer Slot in den letzten
  12 Wochen): Päckchengröße = 60 % der maximalen Wiederholungen, gerundet. Gespeichert in
  `AppState.packets?: Record<string, number>`, nur nach Testwochen aktualisiert (nicht nach Tagesform), in Setup ›
  Können sichtbar und überschreibbar.
- Folge: Wer stärker wird, braucht weniger Päckchen für dieselbe Bestie. Das ist gewollt (relative Intensität, wie ein
  leichter gewordenes Gewicht) und treibt die Wahl zu mehr Runden oder härteren Bestien.
- `beastSets` (volume.ts) rechnet ab jetzt so. Damit zeigen Volumen-Anzeige, Erhaltungsprüfung (`maint.test.ts`)
  und Dosis dieselben Zahlen.

### 2 · Achsen und Modus je Orden
- Zwei Achsen: **Muskel** (harte Sätze je Muskel und Woche, `MUSCLES` aus volume.ts) und **Kondition**
  (Abschnitt 4).
- Je Achse ein Modus: `progress`, `soft` oder `maintain`. Standard aus den Zielen: Ein Ziel der Achse in `goals.primary` oder
  `goals.secondary` → `progress`, sonst `maintain`. Muskel: `hypertrophy`, `strength`. Kondition: `conditioning`,
  `endurance`. Regenerations-Orden (Zeichen Hirsch) standardmäßig `maintain` auf beiden.
  Überschreibbar im Orden: `"dose": { "muscle": "progress", "cardio": "maintain" }`.
- **Entschieden (Nutzer, 10.11.2026)**, als `dose` in die Orden schreiben:

  | Orden | Muskel | Kondition |
  |---|---|---|
  | Pilgrim | maintain | progress |
  | King | soft | soft |
  | Magician (`alchemist`) | maintain | soft |
- Beispiele aus den Zielen: Knight → Muskel steigt, Kondition hält. Gladiator → Kondition steigt, Muskel steigt
  (Kraft sekundär).

### 3 · Ziel je Woche: die Welle
- Spanne je Niveau: Muskel `volumeRange(user)` (heute 6–10 / 10–16 / 12–20 harte Sätze je Muskel und Woche, in
  Setup änderbar), Erhalt `maintenanceVolume(user)`.
- **progress**: Zyklus = Wochen zwischen zwei Entlastungen (`rhythmWeeks`, in einem Zeichen die Klammerwochen).
  Ziel in Zykluswoche s von n: `lo + (hi − lo) × s / (n − 1)`, gerundet auf 0,5. Entlastungswoche: × 0,5.
  Testwoche: kein Ziel.
- Nach jeder Entlastung: **Schwierigkeitsstufe + 1**, Volumen zurück auf `lo`. Stufen:
  1 = alles erlaubt; 2 = Bonus für Bestien mit fortgeschrittenen Übungen (`data/modules/packets.json` → `advanced`:
  Archer-, Clapping-, Commando-Varianten, Muscle-Ups, Handstand-Push-ups, Dragon Flags, Pistol Squats);
  3 = zusätzlich Bonus für Lastbestien (Morgenland/Süd, `suggestLoad`) und Weste, wo vorhanden.
  Die klassischen Übungen steigen weiter über ihre eigene Progression (Wiederholungen, dann Gewicht); sie werden
  nicht umgebaut.
- **soft**: dieselbe Welle und dieselben Stufen, aber von Erhalt bis `lo` statt von `lo` bis `hi`
  (Muskel: `maintenanceVolume` → `volumeRange[0]`; Kondition: Erhalt → unterer Wert der Konditionsspanne).
  Für Orden, deren Hauptreiz woanders liegt, die aber spürbar vorankommen sollen.
- **maintain**: Ziel = Erhalt (Untergrenze; mehr ist erlaubt, nie abgewertet).
- Bestienziel je Muskel = max(0, Ziel − feste Slots der geplanten Woche). Nicht erreichbar → auf das Erreichbare
  kürzen und im `why` sagen.

### 4 · Kondition als zweite Währung
- **Konditionsminuten** je Woche: Bestien mit formeffektiven Minuten (ganz), Intervall-Slots mit ihrer Blockdauer
  (ganz), Läufe und Rudern mit Hinweis „locker“ oder Sprechtempo zur Hälfte.
- Spannen (Startwerte, in Setup änderbar, `user.cardioRange?`): Einsteiger 30–60, Fortgeschritten 45–90, Erfahren
  60–120 Minuten; Erhalt: 20 Minuten an mindestens zwei Tagen. Für den Erhalt zählt vor allem die Intensität
  (Hickson et al., 1985).
- Welle und Stufen wie Abschnitt 3; Formen (Doppel, Triple, Serie) heben die Minuten, Stufe 2+ bevorzugt Bestien,
  deren Bestzeit-Klasse steigt (bestehende Klassenlogik).
- **Feste Konditionsslots wachsen mit** (sonst steigt in Pilgrim und Magician fast nichts, ihre Kondition steckt
  in festen Slots): In `progress` und `soft` folgen Slots mit `kind: "timer"` (Grundlage, lockeres Auslaufen) und
  `kind: "interval"` der Welle der Kondition: Minuten von der kuratierten Dauer bis höchstens + 50 %, Intervalle eine
  Runde mehr je Zykluswoche bis höchstens + 2 Runden (Pilgrim 4 × 4 Min → 5 × 4 → 6 × 4). Nach der Entlastung zurück
  auf die kuratierte Dauer; die Stufe hebt dann die Bestien, nicht die Grundlage. Zeitlimit des Tages gilt
  (`planMinutes` ≤ Limit, sonst weniger Zuwachs). Hohe Alltagslast: kein Zuwachs der Intervalle
  (`highLoadShape` bleibt vorrangig).

### 5 · Wahl
- Bestienplätze der Woche in Tagesreihenfolge; jeder Platz sieht das Restziel beider Achsen.
- Kandidaten: wie heute plus alle Partials k = 1 … R−1 und Triple, wenn sie ins Fenster passen.
- `doseWeight(cand, rest)`: Abdeckung der Muskel-Fehlbeträge (gewichtet nach Fehlbetrag), Abdeckung der
  Konditionsminuten, Überhang über +15 % je Muskel leicht negativ, Stufen-Bonus. Wird nach Zeitfenster und Varianz
  addiert; `weekbeasts.test.ts` bleibt grün.

### 6 · Sichtbar
- `why` der Bestie: „Woche 3 · Stufe 2: Brust 14 von 16, Rücken 11 von 16 — diese Bestie bringt Rücken +3, 18 Min.“
- P3 (Volumen Soll-Ist) nutzt dieses Ziel als Soll; P3 bekommt eine zweite Zeile für die Konditionsminuten.
- Hilfe: Absatz „Dosis: Bestien zählen wie Sätze“ (Päckchen, Faktor 0,5, Welle, Stufen, zwei Achsen, Quellen).

### Technik
- NEU `src/engine/dose.ts`: `packetSize(name, user, state)`, `beastDose(beast, user, state): Share` (Päckchen × 0,5,
  verteilt über Muskelanteile), `cardioMinutes(block | beast | form)`, `doseMode(focus)`, `doseTarget(state, block,
  week): { muscle: Share; cardio: number; stage: number } | null`, `doseWeight(cand, rest)`.
- `volume.ts`: `beastSets` ruft `beastDose` (Signatur bekommt `user`/`state`; alle Aufrufer anpassen).
- NEU `data/modules/packets.json`: `sizes`, `rules`, `advanced`. Validator wie oben.
- `plan.ts` `pickWith`/`pickBeast`: Kandidaten erweitern, Restziel durchreichen, Gewicht einrechnen.
- `types.ts`: `Focus.dose?`, `AppState.packets?`, `UserProfile.cardioRange?`.
- `maint.test.ts` neu rechnen lassen: Mit der Päckchen-Zählung steigen Bestienbeiträge; Orden, die bisher knapp
  waren, können frei werden. Nichts an Orden ändern, ohne den Nutzer zu fragen.

### Tests (`dose.test.ts`)
- Venus-Beispiel wie oben (Päckchen 25/20/50 → 4 / 2 / 2 Sätze, verteilt über Muskelanteile).
- Leiter, Halten (1 je Runde), Cardio (0 Sätze, Minuten), Partial/Doppel/Triple.
- Päckchengröße: Tabelle je Niveau, eigener Wert schlägt Tabelle, Aktualisierung nur nach Testwoche, 60 % gerundet.
- Welle: Woche 1 = lo, letzte Zykluswoche = hi, Entlastung × 0,5, nach Entlastung Stufe + 1 und lo, Testwoche null.
- Modus aus Zielen und Override; Hirsch standardmäßig maintain; Pilgrim/King/Magician wie in der Tabelle.
- soft: Woche 1 = Erhalt, letzte Zykluswoche = `lo`.
- Pilgrim: Intervalle 4 × 4 → 5 × 4 → 6 × 4 in einem Zyklus, nach Entlastung wieder 4 × 4; Grundlage höchstens + 50 %;
  nie über das Zeitlimit des Tages.
- Wahl: Restziel sinkt über die Woche; Varianz schlägt Dosis.

### Offen beim Nutzer (Vorgabe bis zur Antwort in Klammern)
1. Päckchen-Startwerte der häufigsten 30 Übungen gegenlesen (Tabelle steht nach dem Bau in Setup › Können).
3. Konditionsspannen (Startwerte oben).

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
- Die Frage „Wie hat sich die Einheit angefühlt?“ steht in jeder Einheit auf der Abschlusskarte, als **Feeling
  Scale −5 bis +5** (Hardy & Rejeski, 1989; Entscheidung des Nutzers 10.11.2026: validiert, anschlussfähig an die
  Ekkekakis-Literatur). Elf Knöpfe in einer Reihe (bestehende `.fs-scale`), Endbeschriftungen „sehr schlecht“ /
  „sehr gut“, Mitte „neutral“. Freiwillig; ohne Wahl wird nichts gespeichert. Gespeichert wie bisher in
  `state.feeling` (−5 … +5), keine Umrechnung.
- Die King-Regel bleibt, wie sie ist.
- Stand, neue Karte „Befinden“ (unter „Bereiche“): 
  - Mittelwert der letzten vier Wochen als Zahl und Wort (unter −1 „zäh“, −1 bis +1 „neutral“, darüber „gut“).
  - Je Tagestyp der laufenden Phase (Rollenname) eine Zeile mit Punktreihe der letzten sechs Werte
    (Punkte in `--red`/`--muted`/`--teal`) und Mittelwert. Sortiert vom besten zum schwächsten.
  - Ein Hinweis, nur wenn ein Tagestyp bei mindestens drei Werten im Mittel unter −1 liegt:
    „<Tag> fühlt sich seit drei Einheiten zäh an. Unter Anpassen lässt er sich kürzen oder tauschen.“
    Keine automatische Änderung am Training.
  - Unter fünf Werten insgesamt: nur „Noch zu wenige Einheiten mit Befinden.“

### Technik
- `src/engine/affect.ts`: `affectSummary(state, today): { mean4w: number | null; n: number; byRole: { role: string; name: string; values: number[]; mean: number }[]; flag: string | null }`.
- `SessionView.tsx`: Bedingung `focus.affect_rule && hard` für die Anzeige entfernen (die Regel selbst bleibt an
  `affect_rule` gebunden); neue Skala.
- `Dashboard.tsx`: Karte „Befinden“.

### Tests
`affect.test.ts` (Mittelwert, Fenster vier Wochen, Hinweis erst ab drei Werten);
e2e: Einheit abschließen mit „+3“ speichert einen Wert; Stand zeigt die Karte.

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
  −1 bei mindestens drei Werten (P2); zwei Kernübungen mit Trend „down“ (P6); hohe Last der Woche (`weekLoad`).
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
- Gladiator „Spiel“: entschieden, siehe „Entscheidungen gesammelt“ oben.
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
