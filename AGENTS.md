# Hinweise für Coding-Agenten

Order ist eine Trainings-PWA (Vite, React 19, TypeScript). Live: https://fmeixner.github.io/order/ (GitHub Pages, Deploy bei jedem Push auf `main`).

## Leitlinie
Einfach zu bedienen, visuell aufgeräumt, konkret – Details nur auf Wunsch (aufklappen, „i“). Usability geht vor Funktionsfülle: Wird etwas komplizierter, erst nachfragen.

## Struktur
- `data/` – Inhalte als JSON: `orders/*.json` (Orden, Format in `docs/ORDER-FORMAT.md`), `beasts.json`, `exercises.json`, `modules/*.json` (Warm-up-Listen, Tauschgruppen, Muskeln, Normen …). Geprüft von `scripts/validate.mjs`.
- `src/engine/` – Logik ohne UI:
  - `plan.ts` (Jahresplan, Bestienwahl, Warm-up-Listen)
  - `weekplan.ts` (`focusFor`: eingefrorene Fassung → 3-Tage-Form → Kurz (gemerkt: ganze Woche, spontan: Folgetage) → Schwerpunkt-Slot → eigene Warm-up-Änderungen)
  - `shortday.ts` (Kurztag mit Ausgleich)
  - `dayadj.ts` (Tagesanpassung Kurz · Leicht · Intensiv · Leise · Kein Platz; fixierbar je Wochentag in `dayFlags`). Leise/Kein Platz wirken über das Tagesprofil (`withDay`): Bestien per `beastForDay` in `plan.ts`, Übungen per `loud`/`space` in `exercises.json` mit `instead`-Ersatz; verschoben wird nur ohne passende Fassung (`quietMoves` in `weekplan.ts`)
  - `progression.ts` (`suggest`, `advance`)
  - `resolve.ts` (Übung am Ort: Hauptübung, dann Varianten des Slots, dann `instead`-Ersatz; Orte haben keine Kategorie; Tausch je Ort; geführte Varianten)
  - `warmup.ts`, `duration.ts`, `saga.ts` (Erzähler „Aschekurier“)
  - Schwert-Lernweg in `plan.ts` (`swordLevel`, `swordList`): Stufen in `data/modules/sword.json` (`levels`, `leveled`), Skills der Gruppe `schwert` in `skills.json`. Varianten in `leveled` zeigen den Inhalt der Stufe; der Orden bestimmt nur das Format. Gewichtsfrei.
- `src/ui/` – React-Ansichten. Die Einheit: `SessionView.tsx` (Ansicht, Vorschau) mit `session/` (`ctx.ts` Kontext, `items.ts` Inhalte sammeln und Bestien festhalten, `SlotCard.tsx`, `BeastCard.tsx`, `Drills.tsx`).
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
- Handverlesene Favoriten des Nutzers haben bei gleichwertigen Optionen Vorrang (Liste im Logbuch, Roadmap „Später“).
- Richtwert etwa 10 harte Sätze pro Muskel und Woche, mit möglichst wenigen Übungen; im Defizit eher am unteren Rand.
- Ein Kurztag kann vier Kernübungen tragen (etwa 30 Minuten).
- Jeder Trainingstag ist normal lang geplant, auch der Dienstag; gekürzt wird nur über „Anpassen › Kurz“. Kein Orden plant einen Kurztag ein (das alte `shortRole` der Phase wirkt nicht mehr).
- Schwert hat eine Sonderrolle: Tagesknopf und Vorschau zeigen den Schwertblock auch für ein Profil ohne Schwert, darunter den Ersatz. Ersatz ohne Schwert: `fallbackFlow` (geführter Flow aus `flows.json`, z. B. `mobility`) oder `fallback` (eine Übung, z. B. Schattenboxen).
- Aufwärmsätze nur nach Last und Verletzungsrisiko (`warmCount` in `warmup.ts`), nicht nach Wiederholungen oder Mehrgelenkigkeit.

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
- UI-Texte auf Deutsch, Du-Form, knapp.
