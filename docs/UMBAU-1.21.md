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
  `instead`. Mit PB oder vorher als kleines Paket bauen. Stand 11.11.: `has.rope` existiert bereits im
  Equipment-Profil; offen sind nur `needs`/`instead` an den Seilübungen.
- 10.11.2026 · P2 Befinden: Feeling Scale −5 bis +5 für alle Orden (statt fünf Stufen).
- 10.11.2026 · P3 Volumen: Anzeige neutral, kein Hinweis über dem Band. Überschießen wird stattdessen **by design
  verhindert**: Die Dosis wird zu Beginn jedes Ordens als Trajektorie geplant, die exakt machbar ist, und die
  Bestienwahl darf keinen Muskel über die Obergrenze schieben (Details in PB, Abschnitt 3a und 5).
- 10.11.2026 · P4: nur der Ideenparkplatz. Keine Rückfrage, kein „Trotzdem ändern“, keine Bedenkzeit beim Ändern
  laufender Phasen — der Nutzer will frei spielen und Jahrespläne ausprobieren.
- 10.11.2026 · P5: Wochenrückblick nur im Stand (Karte „Letzte Woche“), keine Karte auf Heute.
- 10.11.2026 · P6: wie geplant — „gehalten“ sichtbar; Hinweis nur nach zwei Einheiten in Folge mit Rückgang und nur an Kernübungen, einzelne schwache Tage bleiben still.
- 10.11.2026 · P7: Ausklang wie geplant (2 Min locker gehen mit Atemfokus nach hartem Ende; Kurztag ohne).
- 10.11.2026 · P8: Entlastung nach Signalen wie geplant. Die Dosis-Welle (PB) wendet zur geplanten Zeit auch ohne Entlastungswoche (Stufe + 1, Volumen zurück); nur die halbierte Woche entfällt.
- 10.11.2026 · P9: deutlich zuspitzen wie geplant (Sätze auf 60 %, Intensität halten).
- 10.11.2026 · P10: Prüfung gilt für **alle** Orden mit Sprüngen, Würfen oder Sprints, nicht nur Falke. Verstöße
  listet der Bau auf und fragt vor dem Umstellen (Kuration des Nutzers); Gladiator „Spiel“ ist schon entschieden.
- 10.11.2026 · P11: gemessene Verhältnisse **automatisch** übernehmen (Setup › Können zeigt sie nur). Neu:
  **entfernte Überträge** zwischen Familien (Rudern/Chin-ups → Curls, Dips → Trizeps), mit eigenem Abschlag.
- 10.11.2026 · P12 Tagesknöpfe: **keine 2 × 2-Matrix** (die Wochenfolge muss lesbar bleiben). Stattdessen kurze
  Tageslabels. Der Bau schlägt sie für alle Orden vor; der Nutzer sieht sie durch, bevor sie eingebaut werden.
- 10.11.2026 · King, Pilgrim, Magician: kein Umbau, keine neue Runde jetzt. Die Orden fühlten sich in ihren alten
  Fassungen leicht an („lockeres Joggen, Tai Chi, ein bisschen Turnen“); mit PB steigen sie messbar. Neu bewerten, wenn
  der Nutzer einen davon macht; ein Neuanfang mit neuem Namen bleibt möglich.
- 10.11.2026 · Ordensbeschreibungen: **alle** Orden bekommen neue Texte (eleganter; manche Orden haben ihren Ansatz
  verändert; King, Pilgrim, Magician nennen die Steigerung statt des Haltens). Entwurf in
  `docs/ORDENSTEXTE-ENTWURF.md`, der Nutzer sieht ihn durch; eingebaut wird erst nach seiner Freigabe (Paket PT).
- 10.11.2026 · Notiz an der Übung (neu, in P12): kleiner Stift, nur bei Bedarf, z. B. Sitzhöhe oder Einstellung am Gerät.

## Reihenfolge

| Paket | Version | Inhalt |
|---|---|---|
| ~~PB~~ | 1.22.0 ✓ | Dosis: Bestien und Sätze in einer Währung, alle Orden, Muskel und Kondition — **gebaut 11.11.2026** |
| ~~PT~~ | 1.22.0 ✓ | Neue Ordensbeschreibungen — **mit PB gebaut** (Texte ohne Tage, Rep-Bereiche, Studio-Nuancen) |
| ~~P1~~ | 1.23.0 ✓ | Zeitstrahl: ganzes Jahr und ab heute, Jahresbilanz der Zeichen — **gebaut 11.11.2026** |
| ~~P2~~ | 1.24.0 ✓ | Befinden (Feeling Scale) nach jeder Einheit, Auswertung im Stand — **gebaut 11.11.2026** |
| ~~P3~~ | 1.25.0 ✓ | Volumen Soll-Ist im Stand — **gebaut 11.11.2026** |
| ~~P4~~ | 1.26.0 ✓ | Ideenparkplatz (ohne Sperre oder Rückfrage) — **gebaut 11.11.2026** |
| ~~P5~~ | 1.27.0 ✓ | Wochenrückblick (im Stand) — **gebaut 11.11.2026** |
| ~~P6~~ | 1.28.0 ✓ | Defizit-Phasen: „gehalten“ zählt als Erfolg — **gebaut 11.11.2026** |
| P7 | 1.29.0 | Ausklang nach Bestie und Finisher |
| P8 | 1.30.0 | Entlastung nach Signalen |
| P9 | 1.31.0 | Zuspitzung vor der Testwoche |
| P10 | 1.32.0 | Explosives vor Ausdauer (Prüfung der Orden) |
| P11 | 1.33.0 | Schätzwerte lernen aus dem Log |
| P12 | 1.34.0 | Kleines an der Oberfläche: kurze Tageslabels, Hilfe mit Suche, Notiz an der Übung |
| PH | 1.35.0 | Harlekin: Wiederholung nach 12 Wochen, bei kürzeren Blöcken 4-Wochen-Häppchen (Lösung offen) |
| PG | — | Bestienpool: Lücken der Kombinatorik schließen (Rücken, Rumpf ohne Oberkörper …), neue Bestien entwerfen |

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
- Bestienziel je Muskel = max(0, Ziel − feste Slots der geplanten Woche).

### 3a · Trajektorie zu Beginn des Ordens (Entscheidung des Nutzers: exakt machbar, kein Überschießen)
- `doseTrajectory(state, block)` rechnet beim Start des Ordens **alle** Wochen auf einmal: Ziel je Muskel und
  Konditionsminuten je Woche, Stufe je Woche. Grundlage: Welle (Abschnitt 3), feste Slots je Woche (A/B-Wechsel,
  Wochen mit 3 oder 4 Tagen nach `schedule`), Bestienplätze und ihre Fenster.
- **Machbarkeit vor dem Start, nicht Woche für Woche:** Für jede Woche wird geprüft, ob die Bestienplätze das
  Restziel mit erlaubten Formen erreichen können (obere Schranke: bester Beitrag je Platz und Muskel). Ist ein Ziel
  nicht erreichbar, wird die **ganze Welle** dieses Muskels vor dem Start abgesenkt, sodass jede Woche erreichbar ist
  und die Steigerung gleichmäßig bleibt (kein Knick in Woche 3). Ein Satz im `why` der ersten Woche nennt es einmal.
- **Obergrenze**: je Muskel das Ziel der Woche + 15 %, nie über `volumeRange[1]` (progress) bzw. `volumeRange[0]`
  (soft) bzw. Ziel + 15 % (maintain). Feste Slots allein dürfen sie nicht reißen; wo sie es tun, ist das ein
  Kuratierfehler: Test listet die Fälle je Orden und Niveau, Orden nicht still ändern, den Nutzer fragen.
- Die Trajektorie wird pro Orden und Niveau deterministisch berechnet (Memo über `block.id`, `user.level`,
  `schedule`, `packets`); sie ändert sich nur, wenn sich eines davon ändert, oder nach einer Testwoche
  (neue Päckchengrößen).
- Ausfall, Kurztag, „Fällt aus“: Die Trajektorie bleibt; die Woche wird einfach weniger (kein Nachholen).

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
- **Obergrenze ist hart** (Ausnahme von „nie Sperre“): Ein Kandidat, der einen Muskel über die Obergrenze der
  Woche (3a) schiebt, scheidet aus, solange es einen Kandidaten gibt, der ins Fenster passt und es nicht tut. Mit
  Partials ab einer Runde ist das fast immer der Fall. Gibt es keinen, gewinnt der kleinste Überhang, und das `why`
  sagt es.
- Rangfolge damit: Zeitfenster > Obergrenze > Varianz > Dosis.
- **So gebaut (11.11.2026):** Zeitfenster > Varianz > Obergrenze > Dosis. Varianz zuerst, weil die harte Grenze
  sonst frische Bestien verdrängt und Wiederholungen erzwingt. Überhang bis 1 Satz wird in der ältesten Altersklasse
  toleriert; darüber springt die Wahl zur nächsten Altersklasse, die unter der Grenze bleibt (nie die Vorwoche).
  Ziel je Muskel = max(Welle, feste Sätze): King hat 10,5 feste Sätze Schultern, über dem sanften Gipfel 10.
  Test: < 15 % der Muskelwochen über Obergrenze + 0,6.
- **1.22.1:** Bestien füllen in vier Gruppen auf (Push: Brust, Schultern, Trizeps · Pull: Rücken, Bizeps · Beine:
  Quadrizeps, Beinbeuger, Gesäß · Rumpf); Ziele bleiben je Muskel. Rumpf hat ein festes Ziel (unterer Richtwert des
  Niveaus) in jedem Orden. Machbarkeit je Gruppe: Slot-Kapazität skaliert nur den Anteil über den festen Sätzen.
- `doseWeight(cand, rest)`: Abdeckung der Muskel-Fehlbeträge (gewichtet nach Fehlbetrag), Abdeckung der
  Konditionsminuten, Stufen-Bonus. Wird nach Zeitfenster, Obergrenze und Varianz addiert; `weekbeasts.test.ts`
  bleibt grün.

### 6 · Sichtbar
- `why` der Bestie: „Woche 3 · Stufe 2: Brust 14 von 16, Rücken 11 von 16 — diese Bestie bringt Rücken +3, 18 Min.“
- P3 (Volumen Soll-Ist) nutzt dieses Ziel als Soll; P3 bekommt eine zweite Zeile für die Konditionsminuten.
- Hilfe: Absatz „Dosis: Bestien zählen wie Sätze“ (Päckchen, Faktor 0,5, Welle, Stufen, zwei Achsen, Quellen).

### Technik
- NEU `src/engine/dose.ts`: `packetSize(name, user, state)`, `beastDose(beast, user, state): Share` (Päckchen × 0,5,
  verteilt über Muskelanteile), `cardioMinutes(block | beast | form)`, `doseMode(focus)`, `doseTarget(state, block,
  week): { muscle: Share; cardio: number; stage: number } | null`, `doseWeight(cand, rest)`.
- `dose.ts` zusätzlich: `doseTrajectory(state, block)`, `doseCap(traj, week)`.
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
- Wahl: Restziel sinkt über die Woche; Varianz schlägt Dosis; kein Muskel über der Obergrenze, wenn ein Kandidat
  ohne Überhang ins Fenster passt.
- Trajektorie: für jeden Orden, jedes Niveau und 3- wie 4-Tage-Wochen ist jede Woche erreichbar (nach Absenkung);
  die Welle steigt monoton innerhalb eines Zyklus; feste Slots allein reißen keine Obergrenze (sonst Liste an den
  Nutzer, Test markiert sie als bekannt).

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
- Farbe wertneutral: unter Erhaltung `--amber`, sonst `--teal`; über dem Band keine Warnfarbe und kein Hinweis
  (Entscheidung des Nutzers: Überschießen verhindert die Planung, PB 3a).
- Im Defizit (Phase `kcal === "deficit"`) gilt als Zielband Erhaltung bis unterer Richtwert, mit dem Satz
  „Im Defizit hält weniger Volumen den Stand.“
- Entlastungs- und Testwochen: Karte zeigt „Entlastungswoche: Volumen zählt nicht.“

### Technik
`volume.ts`: `plannedVolume(state, block, week): Record<string, number>` (Sätze je Muskel aus allen Rollen der Woche,
gleiche Zählung wie `weeklyVolume`, Bestien über `beastSets`). `Dashboard.tsx`: Karte. Test in `volume.test.ts`:
geplant ≥ erledigt bei vollständiger Woche; Deload liefert null.

---

## P4 · Ideenparkplatz (1.26.0)

### Warum
Programm-Hopping ist das dokumentierte Hauptrisiko des Nutzers. **Entscheidung (10.11.2026): keine Sperre, keine
Rückfrage, keine Bedenkzeit.** Der Nutzer will mit dem Plan frei spielen und Jahrespläne ausprobieren können; jeder
zusätzliche Bestätigungsschritt wäre Ballast. Geschützt wird nur über den Parkplatz: Neue Ideen bekommen einen Ort,
an dem sie warten können.

### Verhalten
- Im Plan-Reiter ein Knopf „Idee notieren“ (neben „+ Phase anhängen“). Öffnet ein Textfeld; gespeichert in
  `AppState.ideas?: { date: string; text: string; done?: boolean }[]`. Liste aufklappbar „Ideen für später“ mit
  Abhaken und Löschen.
- Laufende Phasen bleiben **ohne jede Rückfrage** änderbar, wie heute.
- In der Testwoche zeigt die Auswertung offene Ideen: „3 Ideen warten. Jetzt ist der Moment, sie einzuplanen.“
  Dasselbe im „Jahr planen“-Assistenten, Schritt 4, als aufklappbare Liste.

### Technik
`types.ts` (`ideas`), `PlanEditor.tsx` bzw. Plan-Liste (Knopf und Liste), `TestWeek.tsx` (`TestSummary`) und
`YearWizard.tsx` (Schritt 4). Test: e2e Idee notieren, abhaken, in der Testwoche sichtbar.

**Annahme (Agent, 11.11.2026):** Der Hinweis auf offene Ideen steht in der Testwoche oben über den Testtagen, nicht erst
in der Auswertung (`TestSummary` erscheint erst, wenn alle Cups Werte haben — dann käme die Erinnerung zu spät).
Komponenten in `src/ui/Ideas.tsx`.

---

## P5 · Wochenrückblick im Stand (1.27.0)

Entscheidung (10.11.2026): **keine neue Karte auf Heute.** Der Rückblick lebt im Stand; Heute bleibt fürs Training.

### Verhalten
- Stand, neue Karte „Letzte Woche“ (zwischen „Bereiche“ und „Testwoche“). Zeigt die zuletzt abgeschlossene
  Trainingswoche (oder die laufende, wenn sie geschafft ist):
  `3 von 4 Einheiten · 1 verdichtet · Befinden +2 · 2 Gewichte gesteigert`.
  Ausgefallenes heißt „verdichtet“ (Fällt aus mit Ausgleich) oder „entfallen“, nie „verpasst“.
- Antippen klappt Details auf: je Einheit eine Zeile (Tag, Name, Dauer, Befinden), darunter gesteigerte und (im
  Defizit, P6) gehaltene Übungen.
- Keine Pflicht, nichts zum Wegklicken, kein Zähler.

### Technik
`src/engine/weekreview.ts`: `weekReview(state, block, week)`. Gesteigert = Übung, deren bestes Satzprodukt
(Gewicht × (1 + Wdh/30)) über dem der vorigen Einheit derselben Übung liegt. Karte in `Dashboard.tsx`.
Tests mit zwei aufeinanderfolgenden Wochen (gesteigert, entfallen, verdichtet).

**Annahme (Agent, 11.11.2026):** Dauer je Einheit aus den Zeitstempeln der abgehakten Sätze (erster bis letzter);
ohne zwei Zeitstempel bleibt sie leer. Ohne Gewicht zählt im Satzprodukt die Wiederholungszahl, ohne beides die
Sekunden. Die Karte steht unter „Befinden“, vor „Testwoche“.

---

## P6 · Defizit: „gehalten“ zählt (1.28.0)

### Warum
Die Angst vor Leistungsverlust im Defizit ist Abbruchgrund Nr. 1 des Nutzers. Im Defizit ist Halten das Ziel.

### Verhalten
- In Phasen mit `kcal === "deficit"`: Schließt eine Übung mit gleichem Gewicht und gleichen Wiederholungen wie
  beim letzten Mal, zeigt die Karte nach dem Abschluss ein kleines grünes „gehalten“ (statt nichts).
- Wochenrückblick (P5, Karte im Stand) zählt im Defizit „4 Übungen gehalten, 1 gesteigert“.
- Stand, Karte „Volumen“ (P3) und „Verlauf“: Unterzeile „Defizit-Phase: Halten ist das Ziel.“
- Fällt eine Kernübung in zwei Einheiten nacheinander (Gewicht oder Wiederholungen runter), ein sachlicher
  Hinweis (einzelne schwache Tage bleiben still; nur Slots mit `core`): „<Übung> gibt nach. Bei ausreichend Eiweiß und Schlaf fängt sich das meist; sonst Defizit eine Woche pausieren.“
  Keine automatische Änderung.

### Technik
`progression.ts`: `trendOf(prev: SessionEntry, cur: SessionEntry): "up" | "held" | "down"` (bestes Satzprodukt
Gewicht × (1 + Wdh/30)). Tests für alle drei Fälle.

**Annahme (Agent, 11.11.2026):** „gehalten“ steht an der eingeklappten Karte nach dem Abschluss der Übung. Der Hinweis
„<Übung> gibt nach“ steht im Stand in der Karte „Volumen diese Woche“, nur in Defizit-Phasen und nur, wenn der zweite
Rückgang in den letzten 14 Tagen lag (`slippingCore` in `progression.ts`; P8 nutzt dieselbe Funktion als Signal).

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
- Die Dosis-Welle (PB) hängt nicht an der Entlastung: Ihre Zyklusgrenzen kommen aus `rhythmWeeks` (geplant), nicht
  aus tatsächlich genommenen Entlastungen. Wird eine Entlastung übersprungen, wendet die Welle trotzdem (Stufe + 1,
  Volumen auf den Start), nur ohne × 0,5. Test: übersprungene Entlastung → Woche danach = Startwert der nächsten Welle.

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
- Setup › Können: aufklappbar „Deine Verhältnisse“ (Liste: Übung, Verhältnis hinterlegt → gemessen). Nur Anzeige;
  übernommen wird automatisch (Entscheidung des Nutzers), ohne Bestätigung.
- **Entfernte Überträge** (Entscheidung des Nutzers): Neben den Familien (nahe Verwandte) gibt es Brücken zwischen
  Familien, damit auch Isolationsübungen nicht bei null starten. In `transfer.json` → `bridges`:
  `{ "from": "Weighted Chin-Up", "to": "Bizeps", "ratio": … }`, Startliste:
  Rudern (Seated Cable Row, Barbell Row, Double DB Row) und Chin-ups/Weighted Chin-ups → Bizeps-Familie;
  Dips (auch mit Körpergewicht) und enges Bankdrücken → Trizeps-Familie; Bench/Overhead Press → Seitheben;
  Back Squat → Beinbeuger/Waden nur, wenn sonst nichts da ist.
- Körpergewichtsübungen als Quelle: Leistung = (Körpergewicht × Anteil + Zusatzlast) × (1 + Wdh/30), Anteil aus
  `transfer.json` (Dips 0,9, Chin-ups/Pull-ups 0,95, Push-ups 0,65); Körpergewicht aus `user.bodyweight`. Ohne
  Körpergewicht keine Brücke aus Körpergewichtsübungen.
- **Rangfolge**: eigener Stand > gemessenes Verhältnis in der Familie > hinterlegtes Verhältnis in der Familie >
  Brücke. Abschläge: gemessen 10 %, Familie 15 %, Brücke 25 %. Das `why` nennt die Quelle („Schätzung aus Dips
  mit Körpergewicht, vorsichtig angesetzt“).
- Auch Brücken lernen: Hat der Nutzer beide Seiten selbst, gilt sein Verhältnis.

### Technik
`progression.ts`: `ownRatios(slots): Record<string, number>` (je Familie relativ zum Anker, aus
`weight × (1 + target/30)`); `estimateFrom` nutzt sie und danach die Brücken. Tests in `handover.test.ts`:
Rangfolge, Abschläge, Dips mit Körpergewicht → Trizeps-Schätzung, keine Brücke ohne Körpergewicht.

---

## P12 · Kleines an der Oberfläche (1.34.0)

- **Tagesknöpfe** (Heute): bleiben **eine Reihe** in Wochenfolge (keine Matrix, Entscheidung des Nutzers). Jede Rolle
  bekommt ein optionales Feld `short` (höchstens 10 Zeichen, z. B. „Beine“ statt „Unterkörper“, „Oben“, „Chaos A“),
  das die Tagesknöpfe zeigen; die volle Bezeichnung bleibt überall sonst. Ohne `short` wie heute, aber ohne
  Silbentrennung (`hyphens: manual`), notfalls zwei Zeilen.
  **Vorgehen:** Der Bau erstellt zuerst `docs/TAGESLABELS-ENTWURF.md` (Tabelle Orden · Rolle · heutiger Name ·
  Vorschlag) und wartet auf die Freigabe des Nutzers; erst dann kommen die Labels in die Orden.
- **Hilfe**: Suchfeld oben (filtert Abschnitte nach Überschrift und Text, Treffer hervorgehoben); Abschnitte
  aufklappbar, alle zu, außer es wird gesucht. Kein Text geht verloren.
- **Plan-Liste**: „Später · n Orden“ zeigt aufgeklappt die Zeichen als Gruppen wie bisher; kein Umbau über P1 hinaus.
- **Notiz an der Übung** (Entscheidung des Nutzers 10.11.2026): für Einstellungen, die man beim nächsten Mal wieder
  braucht („Sitz 4“, „Defizit −3“, „Rolle auf Loch 6“).
  - Kleiner Stift (✎, `--muted`, 28 px Tippfläche) rechts in der Kopfzeile der Übungskarte, neben „i“ und Tauschen.
    Ohne Notiz ist das das Einzige, was man sieht.
  - Antippen öffnet ein einzeiliges Feld direkt unter dem Namen (max. 80 Zeichen, Enter oder Verlassen speichert,
    leeres Feld löscht).
  - Mit Notiz steht sie als kleine graue Zeile unter dem Übungsnamen, ohne Stift-Rahmen; Antippen bearbeitet.
  - Gilt je **Übung und Equipment-Profil** (Studio-Beinpresse ≠ Labor-Beinpresse), über alle Orden und Wochen
    hinweg: `AppState.exNotes?: Record<string, string>`, Schlüssel `${profileId}|${exerciseName}`. Wird die Übung
    getauscht, gilt die Notiz der neuen Übung.
  - Auch in Bestien? Nein, nur an Übungskarten (`SlotCard`). Nicht im Warm-up/Cool-down.
  - Export/Import der Daten nimmt `exNotes` mit; keine Anzeige im Log.
  - Test: e2e Notiz anlegen, Seite neu laden, Notiz steht noch; anderes Profil zeigt sie nicht.

---

## Nicht tun
- Keine neue Hauptnavigation, keine weiteren Reiter.
- Keine automatischen Trainingsänderungen aus Befinden oder Trend — nur Hinweise; der Nutzer entscheidet.
- Keine Ranglisten, keine Streak-Zähler mit Verlustangst.
- Laufende Phasen nicht still ändern (`frozen` beachten).
- Die Länge einer Einheit auf dem Bildschirm bleibt, wie sie ist (Entscheidung vom 10.11.2026).
