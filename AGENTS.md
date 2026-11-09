# Hinweise für Coding-Agenten

Order ist eine Trainings-PWA (Vite, React 19, TypeScript). Live: https://fmeixner.github.io/order/ (GitHub Pages, Deploy bei jedem Push auf `main`).

## Leitlinie
Einfach zu bedienen, visuell aufgeräumt, konkret – Details nur auf Wunsch (aufklappen, „i“). Usability geht vor Funktionsfülle: Wird etwas komplizierter, erst nachfragen.

## Struktur
- `data/` – Inhalte als JSON: `orders/*.json` (Orden, Format in `docs/ORDER-FORMAT.md`), `beasts.json`, `exercises.json`, `modules/*.json` (Warm-up-Listen, Tauschgruppen, Muskeln, Normen …). Geprüft von `scripts/validate.mjs`.
- `src/engine/` – Logik ohne UI:
  - `plan.ts` (Jahresplan, Bestienwahl, Warm-up-Listen)
  - `weekplan.ts` (`focusFor`: eingefrorene Fassung → 3-Tage-Form → Kurz (gemerkt: ganze Woche, spontan: Folgetage) → Schwerpunkt-Slot → eigene Warm-up-Änderungen)
  - `shortday.ts` (Kurztag = Verdichtung, seit 1.5: bis fünf Übungen, Gegenspieler-Supersets (`pairAntagonists`), dann Sätze runter (bis zwei, dann fällt die fünfte, dann bis eins), Ziel 30 Minuten; Bestie eine Klasse und jede Schwertübung einen Satz kürzer; Grundlagen-/Skill-Tage kürzen die Dauer; Ausgleich mit Deckel +15 Minuten je Tag. In der Entlastungswoche `shortDeload`: erst halbieren, dann nur kürzen — keine Supersets, kein Ausgleich)
  - `dayadj.ts` (Tagesanpassung Kurz · Intensiv · Leise · Kein Platz; fixierbar je Wochentag in `dayFlags`). Leise/Kein Platz wirken über das Tagesprofil (`withDay`): Bestien per `beastForDay` in `plan.ts`, Übungen per `loud`/`space` in `exercises.json` mit `instead`-Ersatz; verschoben wird nur ohne passende Fassung (`quietMoves` in `weekplan.ts`)
  - `cardio.ts` („Laufen ersetzen“ je Einheit; und Cardio am Ort: fehlt „Laufen möglich“/„Sprints möglich“/„Springseil“/Rudergerät/Rad, werden nur diese Elemente in Bestien umgerechnet — die Bestie zählt als mutiert; füllt der Ort eine Lücke durch kein Gerät, wird sie dort gar nicht gewählt. `beastLocSub` greift in `serve` in `plan.ts`)
  - `deload.ts` (Entlastungswoche: Empfehlung nach Rhythmus oder Signalen in `deloadAdvice`, Wochenentscheid in `AppState.deload` („ja“/„nein“), Umformung `deloadShape` greift in `focusFor`: halbe Sätze, keine Bestien und Finisher)
  - `progression.ts` (`suggest`, `advance`)
  - `resolve.ts` (Übung am Ort: Hauptübung, dann Varianten des Slots, dann `instead`-Ersatz; Orte haben keine Kategorie; Tausch je Ort; geführte Varianten)
  - `warmup.ts`, `duration.ts`, `saga.ts` (Erzähler „Aschekurier“)
  - `cardio.ts` (Laufen ersetzen nach Belastungszeit, `swapRunBeast`; Ortsregel `mixesStations`/`spreadOut`, wirkt in `beastFits`), `beaststeps.ts` (Bestie als Schrittfolge für den Ablauf in `BeastCard.tsx`)
  - Schwert-Lernweg in `plan.ts` (`swordLevel`, `swordList`): Stufen in `data/modules/sword.json` (`levels`, `leveled`), Skills der Gruppe `schwert` in `skills.json`. Varianten in `leveled` zeigen den Inhalt der Stufe; der Orden bestimmt nur das Format. Gewichtsfrei.
- `src/ui/` – React-Ansichten. Die Einheit: `SessionView.tsx` (Ansicht, Vorschau) mit `session/` (`ctx.ts` Kontext, `items.ts` Inhalte sammeln und Bestien festhalten, `SlotCard.tsx`, `BeastCard.tsx`, `Drills.tsx`).
- `src/engine/klammer.ts` (seit 1.0: Klammern — `planYear` ist der einzige Generator für künftige Phasen: Fenster an Abschnittsgrenzen (`placeWindows`), Klammer-Art (`kindScore`), Orden (`orderScore`: Zielbindung, Variation, Verlauf), Kalorien (`kcalOfKlammer`: Last → Kalender → Reise → Grundmodus), Pins (`PlanBlock.pin`) bleiben stehen). Klammer = Phasen mit gemeinsamer `meso`-Id und `klammer`-Art; in der Oberfläche heißen Klammern „Zeichen“ (Bär, Stier, Falke, Wolf, Hirsch), im Code bleibt `klammer`; Inhalte in `data/modules/klammern.json`. Warnungen als Codes (`flagsOf`), das UI zeigt Zeichen (`src/ui/Signs.tsx`).
- `src/ui/YearWizard.tsx` (Jahr planen: Ziel → Klammern → Schwachstellen → Orden), `src/ui/YearPicture.tsx` (Jahresbild in drei Ebenen).
- `src/ui/PlanStack.tsx` (Plan als Stapel, Logik in `src/engine/stack.ts`: Länge ±1 Woche, Testwoche am Ende, Teilen, Verbinden; Empfehlung je Phase per `rankFor` in `sequence.ts`)
- `src/ui/SectionsCard.tsx` (Plan › Lebensabschnitte; `SectionList`, `AimPicker` auch fürs Onboarding). Logik in `src/engine/sections.ts`: Abschnitte gehören dem Nutzer, `proposePhases` schlägt künftige Phasen vor (Zonen gleicher Last, kurze Abschnitte < 3 Wochen gehen auf, Teilung nach Zielerreichung über `aimScore` + `stepScore`, Testwochen nach `testPolicy`); Laufendes bleibt.
- `src/ui/YearSetup.tsx` (Onboarding-Schritt „Dein Jahr“: Abschnitte → Richtung → Testwochen → Vorschlag als Stapel; „Lieber Phasen selbst anlegen“ zeigt die Phasenliste direkt).
- `src/ui/WeekCard.tsx` (Plan › Deine Woche), `src/ui/OrderIcon.tsx` (Ordenssymbole, eigene Strichzeichnungen; keine fremden Marken nachbilden).
- `src/engine/slots.ts` – gemeinsame Helfer (`isStrength`, `isHeavy`, `planMinutes`).
- `src/store.ts` – Zustand im `localStorage` unter `order:v1`, Migrationen für alte Stände (Testfälle in `src/fixtures/`).

## Gestaltung von Orden (Vorgaben des Nutzers, 16.10.2026)
- Vorrang haben Übungen mit tiefer Dehnung und vollem Bewegungsumfang.
- Bei gleichwertigen Optionen beidseitig gleichzeitig statt links/rechts im Wechsel (Double DB Row statt 1-Arm DB Row, Cable Woodchopper statt Russian Twist, KB Cossack Squat statt Bulgarian Split Squat). Einseitig nur, wenn das Ziel es verlangt.
- Lieber 4 Sätze einer Übung als 2 + 2 von zwei ähnlichen: weniger Übungswechsel spart Zeit und Kopf.
- Einseitige Übungen nach Ziel: Kraft und Hypertrophie erst eine Seite komplett, dann die andere (schwächere Seite zuerst, Wiederholungen angleichen); Power und Kondition im Wechsel (Jumping Lunges, Skater Jumps, Bestien).
- Favoriten des Nutzers (`data/modules/favorites.json`, mit Einteilung erste Wahl / gut / Nische) nur als Entscheidung zwischen gleichwertigen Optionen, nicht als Vorgabe. Wird ein Favorit gesetzt, wo er nicht gleichwertig ist, den Grund dazuschreiben. Neue Favoriten dort ergänzen und einordnen.
- Richtwert etwa 10 harte Sätze pro Muskel und Woche, mit möglichst wenigen Übungen; im Defizit eher am unteren Rand.
- Ein Kurztag verdichtet (Herald-Logik): Kernübungen zuerst, Gegenspieler als Supersets, dann weniger Sätze, Ziel 30 Minuten; Bestie eine Klasse kürzer, jede Schwertübung einen Satz weniger. An jedem Tag wählbar; kein Deload, sondern Zeit. Fällt Kurz in eine Entlastungswoche, gilt die Entlastung, Kurz kürzt nur noch.
- Herald ist der Orden für Wochen mit wenig Zeit: wählbar, halb passend für Stier und Bär, nie Vorschlag des Planers (`orderScore`: unter 35 Minuten −3).
- Entlastung (Rhythmus ab Woche 5 alle vier) rastet auf einen Ordenswechsel ±2 Wochen ein (`rhythmWeeks` in `deload.ts`).
- Jeder Trainingstag ist normal lang geplant, auch der Dienstag; gekürzt wird nur über „Anpassen › Kurz“. Kein Orden plant einen Kurztag ein (das alte `shortRole` der Phase wirkt nicht mehr).
- Schwert hat eine Sonderrolle: Tagesknopf und Vorschau zeigen den Schwertblock auch für ein Profil ohne Schwert, darunter den Ersatz. Ersatz ohne Schwert: `fallbackFlow` (geführter Flow aus `flows.json`, z. B. `mobility`) oder `fallback` (eine Übung, z. B. Schattenboxen).
- Aufwärmsätze nur nach Last und Verletzungsrisiko (`warmCount` in `warmup.ts`), nicht nach Wiederholungen oder Mehrgelenkigkeit. Ging eine Isolationsübung für einen Hauptmuskel voraus, ein Satz weniger (schwere Langhantel mindestens einer).
- Warm-up (Vorgabe 09.11.2026): nur Beweglichkeit und Bereitschaft für den Tag (short_base + bis zu drei passende Listen), keine Kraft- oder Aufbauübungen — die gehören in den Trainingsteil (Neck Curl Complex ist eine Trainingsübung). Cool-down: wenige große Dehnungen der trainierten Teile, 45–60 s (`cd_upper`, `cd_lower`, `cd_general`). So kurz wie möglich, so lang wie nötig. Drills mit `needs` (roll, ball) brauchen die Ausrüstung, sonst `instead`.
- Reihenfolge (Vorgabe 09.11.2026): 1–2 Isolationsübungen vor der ersten Grundübung (erweitertes Warm-up, leichte Vorermüdung), dann die Grundübungen, dann die restlichen Isolationen. Hypertrophie-Orden: Synergist (Curl vor Row, Fly vor Bench). Kraft-Orden: nur Muskeln, die der erste Lift nicht braucht (Leg Curl vor Front Squat). Kein Griff-Ermüden vor Ziehen und Heben, keine Rumpfübung vor schweren Kniebeugen.
- Orden-Dateien kompakt halten (eine Zeile je Block, Supersets je Slot eine Zeile), nicht mit `indent=2` neu schreiben.

## Arbeitsablauf je Release
1. Eintrag in `CHANGELOG.md` (Keep a Changelog, Deutsch, für Nutzer formuliert).
2. `npm version X.Y.Z --no-git-tag-version`
3. `npm run build` (Datenprüfung, `tsc -b`, Vite).
4. `npx vitest run` und `npm run e2e` (Playwright). Für einen eigenen Chromium-Pfad: `PW_CHROMIUM=<pfad>`.
5. Commit, Push, CI und Pages prüfen. Scheitert nur das Pages-Deployment: neuen Lauf per `workflow_dispatch` starten, den fehlgeschlagenen Job nicht wiederholen (sonst „Multiple artifacts“).

## Regeln
- Keine persönlichen Daten ins Repo (keine Einrichtungsdateien, keine privaten Welten für den Erzähler).
- Kein Leaderboard.
- Laufende Phasen sind eingefroren (`PlanBlock.frozen`): Änderungen an Orden-Dateien gelten dort erst nach „Übernehmen“ im Plan.
- Im Studio nie zwei Maschinen oder Kabel als Superset (prüft `validate.mjs`).
- Typprüfung mit `npx tsc -b`; `tsc --noEmit -p .` prüft hier nichts.
- Bestien einer Einheit werden beim ersten Eintrag festgehalten (`beastRuns`); nur bewusste Anpassungen geben sie frei.
- Jede zitierte Studie steht mit vollständiger Angabe und Link in `data/modules/references.json` (Kurzform wie im Text; `src/engine/references.test.ts` prüft Orden-Quellen, Hilfe und Normen). Zitate vor dem Eintragen gegen Titel, Autoren, Jahr und Aussage prüfen.
- Warnungen und Status im Plan als Zeichen (`Sign`, `FlagSign`) mit Text im title, nicht als Sätze; der ausführliche Satz gehört ins Phasenblatt.
- Die Heute-Ansicht bleibt aufgeräumt: keine neuen Funktionsblöcke oben auf der Tageskarte; Erfassungs- und Tagesform-Funktionen gehören ins „Anpassen“-Menü.
- UI-Texte auf Deutsch, Du-Form, knapp.
