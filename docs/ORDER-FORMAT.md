# Orden-Format (Schema 1)

Ein Orden ist eine JSON-Datei in `data/orders/`. Der Dateiname ist die `id`. Die vollständigen Typen stehen in `src/types.ts`; `npm run validate` prüft alles.

## Kopf

| Feld | Bedeutung |
|---|---|
| `id`, `name`, `tagline`, `description` | Kennung, Anzeigename, ein Satz, Beschreibung |
| `goals` | `primary` plus `secondary`: hypertrophy, strength, power, speed, conditioning, endurance, fatloss, skill, mobility, wellbeing, test |
| `nutrition` | deficit, maintenance, surplus, any |
| `load_fit` | Alltagslast, die der Orden verträgt: high, medium, low |
| `session_min`, `level` | typische Dauer, Niveau |
| `weeks` | `{ "min": 8, "max": 12 }` |
| `test_week` / `test_weeks` | letzte Woche ist Testwoche / explizite Wochen |
| `deload_weeks` | Wochen mit −1 Satz |
| `affect_rule` | Feeling Scale nach harten Tagen, nächste Bestie ggf. leichter |
| `travel` | hat eine brauchbare Reisevariante |
| `week_4`, `week_3` | Rollen in Reihenfolge der Trainingstage |
| `roles` | die Trainingstage |

Hat jemand mehr Trainingstage als `week_4` Rollen, kommen weitere Rollen aus `roles` dazu (z. B. eine optionale Wochenend-Einheit).

## Rolle

```json
"kraft_a": {
  "name": "Kraft A", "location": "gym", "minutes": 50,
  "warmup": ["base", "lower_prep"], "cooldown": ["cd_general"],
  "blocks": [ … ]
}
```

`location` (gym, home, reise) beschreibt den gedachten Ort; welche Übung wirklich kommt, entscheidet das Equipment-Profil des Tages. `warmup` und `cooldown` verweisen auf Listen in `data/modules/correctives.json`.

## Blöcke

| type | Inhalt |
|---|---|
| `single` | `slot` |
| `superset` | `slots`, `rest` nach der Runde |
| `contrast` | `heavy`, `explosive`, `transfer` (Standard 30 s), `rest` (Standard 180 s) |
| `beast` | `pool` (feste Liste) oder `classes` (plage, bestie, ungeheuer, uralte, verfluchte), `draw` rotate oder random, `benchmark_every` |
| `module` | `"module": "sword"`: Schwert-Variante aus `data/modules/sword.json`, nur wenn das Profil ein Schwert hat; sonst `fallback`-Slot |
| `menu` | `options`: Name → Slot; der Nutzer wählt |

Jeder Block kann `rotation: "A"` (ungerade Blockwoche) oder `"B"` tragen.

## Slot

```json
{"id": "cl-ua-2", "name": "Lat Pulldown",
 "home": {"name": "Pull-Up", "reps": "AMRAP-2", "prog": "reps"},
 "reise": {"name": "Band Pulldown", "reps": "12-15", "prog": "reps"},
 "sets": 3, "reps": "8-10", "prog": "double", "rest": 120}
```

- `name` ist die Studio-Übung. `home` und `reise` sind Ersatz (Text oder Objekt mit eigener Dosis). Fehlt `home`, gilt die Studio-Übung; fehlt `reise`, gilt `home`. `null` heißt: entfällt.
- Fehlt im Profil Equipment für die bevorzugte Stufe, nimmt die App die nächste machbare.
- `reps`: `"8-10"`, `"12"`, `"10/Seite"`, `"AMRAP"`, `"AMRAP-2"` oder Freitext wie `"40 m"`.
- `kind`: strength (Standard), hold (`hold` Sekunden), timer (`minutes`), interval (`interval: {work, rest, rounds}`).
- `prog`: double, weight, topset, reps, ladder (`ladder: [Stufen]`), hold, minutes, none. `step` und `max` für hold/minutes.
- `gate_week`: erst ab dieser Blockwoche. `proposal: true`: Dosis noch nicht bestätigt.
- Die `id` trägt die Historie. Gleiche `id` und gleicher Übungsname heißt gleiche Historie.

## Progression

- **double**: Wiederholungen im Bereich hocharbeiten. Alle Sätze am oberen Ende oder Feedback »Leicht« → nächste vorhandene Laststufe, Wiederholungen wieder unten. »Sehr leicht« → zwei Stufen. Zweimal »Schwer« → −5 %.
- **weight**: feste Wiederholungen. OK hält, Leicht +1 Stufe, Sehr leicht +2, zweimal Schwer −5 %.
- **topset**: erster Satz Top-Satz wie weight, danach −10 %.
- **reps**: +1 Wiederholung, wenn alle Sätze geschafft und nicht Schwer.
- **ladder**: zweimal hintereinander alle Sätze am oberen Ende → nächste Stufe, zweimal Schwer → eine zurück.
- **hold / minutes**: +`step` bis `max`, wenn nicht Schwer.

Laststufen kommen aus dem Equipment-Profil: Kurzhanteln und Kettlebells als Liste, Langhantel als Stange plus zwei kleinste Scheiben, Kabel und Maschinen als Schrittweite, Weste als Liste.

## Geführte Varianten

`data/modules/guided.json` ordnet freien Übungen eine Maschinen- oder Kabelvariante zu. In Phasen mit Alltagslast „hoch“ tauscht die App etwa die Hälfte der freien Übungen eines Tages, beginnend bei den späteren; der erste freie Lift und schwere Sätze in Kontrastpaaren bleiben frei. Getauscht wird nur, wenn das Equipment-Profil Maschinen bzw. Kabel hat.
