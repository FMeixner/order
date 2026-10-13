# Hinweise für Coding-Agenten

Order ist eine Trainings-PWA (Vite, React 19, TypeScript). Live: https://fmeixner.github.io/order/ (GitHub Pages, Deploy bei jedem Push auf `main`).

## Leitlinie
Einfach zu bedienen, visuell aufgeräumt, konkret – Details nur auf Wunsch (aufklappen, „i“). Usability geht vor Funktionsfülle: Wird etwas komplizierter, erst nachfragen.

## Struktur
- `data/` – Inhalte als JSON: `orders/*.json` (Orden, Format in `docs/ORDER-FORMAT.md`), `beasts.json`, `exercises.json`, `modules/*.json` (Warm-up-Listen, Tauschgruppen, Muskeln, Normen …). Geprüft von `scripts/validate.mjs`.
- `src/engine/` – Logik ohne UI:
  - `plan.ts` (Jahresplan, Bestienwahl, Warm-up-Listen)
  - `weekplan.ts` (`focusFor`: eingefrorene Fassung → 3-Tage-Form → Kurztag → Schwerpunkt-Slot → eigene Warm-up-Änderungen)
  - `shortday.ts` (Kurztag mit Ausgleich)
  - `progression.ts` (`suggest`, `advance`)
  - `resolve.ts` (Übung am Ort: Equipment, Skills, Tausch, `instead`-Ersatz, geführte Varianten)
  - `warmup.ts`, `duration.ts`, `saga.ts` (Erzähler „Aschekurier“)
- `src/ui/` – React-Ansichten; die Einheit ist `SessionView.tsx`.
- `src/store.ts` – Zustand im `localStorage` unter `order:v1`, Migrationen für alte Stände (Testfälle in `src/fixtures/`).

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
- UI-Texte auf Deutsch, Du-Form, knapp.
