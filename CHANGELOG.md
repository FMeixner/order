# Changelog

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionen nach [Semantic Versioning](https://semver.org/lang/de/).

## [0.35.0] – 2026-10-07

### Neu
- Kurztag (Plan › Phase bearbeiten): Ein Tag läuft nur mit drei Kernübungen. Die App prüft das Wochenvolumen je Muskel: Aufbau-Muskeln bleiben an der unteren Grenze des Volumenbereichs, alle anderen bei der Erhaltung (4 Sätze). Leidet nichts, bleiben die anderen Tage unverändert. Sonst gleichen sie aus: +1 Satz an passenden Übungen, weggefallene Kernübungen wandern auf einen anderen Tag, Supersets halten das Zeitlimit. Was nicht ganz reicht, steht offen da.
- Kernübungen sind in allen Orden markiert.

### Geändert
- Standardlänge statt fester Kurztage: Assassin Dienstag ist jetzt „Oberkörper und Gesäß“ (45 Min, mit Schrägbank-Brustpresse, Pushdown und Hip Thrust Maschine), Gladiator Dienstag „Arme und Schultern“ (40 Min), Witcher Dienstag heißt „Arme und Schultern“. Der bisherige kurze Dienstag entsteht über den Kurztag.

## [0.34.0] – 2026-10-07

### Neu
- Ort „schweißfrei“ (Setup › Equipment): An Tagen an diesem Ort keine Bestien, kein Laufen, keine Intervalle, Finisher bleiben Superset, kurzes Warm-up. Dauerschätzung und Bestienwahl der Woche rechnen damit.

## [0.33.1] – 2026-10-06

### Geändert
- Tage können eine eigene Obergrenze haben (`cap`). Assassin: Montag, Donnerstag und Freitag bis 60 Min, am Bestientag passen damit wieder Bestien bis zur Klasse Ungeheuer.

## [0.33.0] – 2026-10-06

### Neu
- Finisher statt Superset: Passt eine Bestie aus einem kleinen Pool zum Ort, kommt sie statt des Supersets, und die Bestien wechseln sich ab. Passt keine, oder käme dieselbe wie letzte Woche, bleibt das Superset.
  - Witcher, Arm-Tag: Arm-Finisher (Lamaschtu, Huldra, Wechselbalg, Peri, Black Shuck, Sirrusch).
  - Gladiator, Oberkörper: A-Woche Superset, B-Woche Arm-Finisher.
  - Conqueror, Studio: Finisher mit Körpergewicht (Wechselbalg, Black Shuck, Huldra, Wassermann, Sirrusch), jetzt am Ende der Einheit.
  - Conqueror, unterwegs: Band-Finisher (Peri, Qarin, Zahhak, Huldra).

## [0.32.0] – 2026-10-06

### Neu
- Aufwärmsatz vor der ersten schweren Mehrgelenksübung jeder Körperhälfte (z. B. Beinpresse am Montag, Schulterpresse am Dienstag, erste Brustpresse am Freitag), abhakbar wie ein Satz, mit Gewicht aus dem Arbeitsgewicht (50 % × 8), danach 30 s Pause. Schwere Langhantel (≤ 6 Wdh, Top-Satz): zwei Steigerungssätze, 50 % × 5 und 75 % × 3.
- Seitenwechsel im Warm-up und Cool-down: Nach Ablauf der linken Seite startet die rechte von selbst, mit 4 s Vorlauf.
- Zeitbudget der Bestie: Sie passt in das, was vom Tag übrig ist (Dauer des Tages, mindestens der Richtwert des Ordens), sonst kommt eine kürzere.
- Muskelbalance über den Orden: Die Bestienwahl bevorzugt Bestien für Muskeln, die die festen Übungen bisher wenig treffen (im Assassin z. B. Gesäß). Nur ein Gewicht, Abwechslung bleibt vorrangig.

### Geändert
- Dauerschätzung: Statt pauschal 4 Min Steigerung vor schwerer Langhantel zählen die Aufwärmsätze einzeln. Soldier Studio B: 50 statt 55 Min.
- Muskelzuordnung ergänzt (Skull Crushers, Pull Press, Band Pull-Aparts, Sumo Pull, Halos, Lizard Crawl, Standups, Combat Rolls).

## [0.31.0] – 2026-10-05

### Neu
- Freie Jagd: Jede Bestie lässt sich im Almanach (Bestien) direkt jagen, entfesselt oder mutiert, außerhalb des Plans. Die Zeit zählt für Bestzeit, Log und Flugblatt, aber nicht als Trainingseinheit.
- Rundentracker an jeder Bestie: Runden abhaken, bei nur einem Durchgang Übung für Übung. Das letzte Häkchen stoppt die Uhr und speichert die Zeit.
- „Wieder aufnehmen“: Zu früh abgehakt oder gestoppt? Die Uhr läuft ab dem ersten Start weiter, gespeichert wird nur die neue Zeit.
- Die Stoppuhr einer Bestie überlebt Reiterwechsel.

### Behoben
- Im Flugblatt zählen nur Bestien mit Zeit als besiegt.

## [0.30.1] – 2026-10-05

### Behoben
- Zwei Bestien an einem Tag: Nach „Stopp“ bei der ersten verschwand sie und eine andere erschien, und das Ergebnis der zweiten überschrieb das der ersten. Jetzt hat jeder Bestien-Block sein eigenes Ergebnis, und die Bestienwahl der laufenden Woche ändert sich nicht mehr, wenn man eine Zeit speichert. Bestzeiten von Doppeln bleiben erhalten.

### Geändert
- Nach der ersten von zwei Bestien startet automatisch die 2-Minuten-Pause.
- Kurzformen zeigen, wie viel der Bestie es ist: „Banshee (2/4 Runden)“.
- Spontaner Zusatztag in einer angebrochenen Woche: Erledigte Einheiten bleiben an ihrem Tag, der Rest folgt in geplanter Reihenfolge. Ein fünfter Tag am Sonntag kommt also nach den vier erledigten.
- Pazuzu ist jetzt eine Nordbestie und heißt Huldra (Archer Rows, Ring Triceps Extensions, Hanging Side Raises, nur Körpergewicht).

## [0.30.0] – 2026-10-03

### Neu
- Lastbestien: Der Gewichtsvorschlag liegt immer auf einer Hantel, die es am Ort gibt. Nach dem Lauf fragt die Karte nach der Technik: sauber und im Timecap → nächstes Mal eine Stufe höher; unsauber oder Timecap gerissen → eine Stufe leichter. Ohne eigene Eingabe zählt der Vorschlag als gemachtes Gewicht.
- Erzähler: Jede Ausgabe berichtet über die besiegten Bestien der Woche (entfesselt, mutiert oder als Serie) und bringt einen Lagebericht aus der Stadt.

### Geändert
- Keine AMRAPs mehr in Bestien: Wila hat jetzt 9 Runden (etwa 9 Min), Lamaschtu 21/15/9 ohne Max-Runde.

## [0.29.1] – 2026-10-03

### Geändert
- Lastbestien: ein Startwert je Bestie (Gewicht oder Band) statt Richtwerten je Übung. Prozent-Bestien rechnen weiter vom 1RM.
- Assassin: keine feste Start-Bestie mehr.

### Entfernt
- Richtwerte je Übung samt 10-%-Regel und Bandstufen je Übung (beast_loads.json, Übungsliste in bands.json).
- Ungenutzte Reste: das Feld „draw“ in den Orden, Ausblenden ganzer Bestien-Familien, Start-Bestie, ein ungenutztes UI-Element.

## [0.29.0] – 2026-10-03

### Neu
- Lastbestien: fester Timecap; ein Gewicht (bzw. Band) für alle Lastübungen; Rekord = schwerstes Gewicht im Timecap. Prozentangaben beziehen sich auf das 1RM, ohne 1RM legt man das Gewicht selbst fest.
- Almanach mit vier Bereichen: Orden, Bestien, Übungen (neu: Arbeitsgewicht, 1RM eintragen oder aus dem Log geschätzt, Verlauf) und Log. Der Reiter „Log“ entfällt.
- Erzähler: Die Lebenspunkte des Gegners starten bei 100 % und sinken mit jeder erledigten Einheit, nicht erst am Wochenende.
- Tag 5 mit zweiter Bestie bei Assassin, Conqueror, Pugilist und Soldier.

### Geändert
- Vokabel: „entfesselt“ (volle Fassung) und „mutiert“ (Übungen mit fehlendem Skill ersetzt) statt Basis und verhext.
- Morgenland-Bestien wieder aktiv und auf ein Item bereinigt: Zahhak (Band Pull-Aparts), Qarin (Band Shrugs), Mantikor (Band Triceps Pushdowns), Sirrusch (Biceps Curls), Karkadann (DB Lunges), Tiamat (DB Halos), Humbaba (Barbell Curls), Lamaschtu (Barbell Curls, Skull Crushers), Huma (Kettlebell), Lamassu (Burpees statt Rudern). Schedu bleibt Bench Press + Muscle-Ups.
- Bestien fallen nicht mehr heraus, weil eine Hantel am Ort nicht genau passt: Das Gewicht legt man selbst fest.

## [0.28.0] – 2026-10-03

### Neu
- Kurzformen: Passt eine Bestie mit gleichen Runden nicht ins Zeitfenster, kommt sie mit so vielen Runden, wie hineinpassen (etwa „Banshee (2 Runden)“). Leitern wie 21/15/9, AMRAP und Buy-in/Buy-out werden nicht gekürzt. Eigene Bestzeit je Rundenzahl, im Bestiarium als „3 Runden“. Kurze Slots (bis 10,5 Min) haben damit statt 7 jetzt 12 verschiedene Bestien in 12 Wochen.

## [0.27.0] – 2026-10-03

### Geändert
- Bestienwahl für alle Orden gleich: ein Pool aus allen Bestien, Doppeln (×2) und Serien aus zwei Bestien, alle gleichrangig. Die Dauer muss ins Zeitfenster des Tages passen, das Ziel des Ordens gewichtet (Kraft, Kondition, Ausdauer, Beweglichkeit). Vorrang hat Abwechslung in der Phase: Was schon dran war, kommt erst wieder, wenn alles Passende durch ist; nie dieselbe Bestie in zwei Wochen hintereinander. Zwischenwert (Conqueror) und Start-Bestie (Assassin: Undine) bleiben.
- Assassin: keine Pool-Grenze mehr, Zeitfenster 10–25 Min.
- Bestien-Karte schlanker: nur noch „Bestie · ~16 Min“, Name, Runden, Übungen, Stoppuhr. Erklärtexte zu Serie, Familie, Klasse und verhext entfernt.
- Reiter „Orden“ und „Bestiarium“ zusammengelegt zum Reiter „Almanach“.

## [0.26.1] – 2026-10-03

### Geändert
- Einheitliche Vokabel „verhext“ statt „hexed“: Namen wie „Undine verhext“, Bestiarium, Hinweise, Hilfe und Setup.
- Clapping und Archer Pushups bleiben ohne eigenen Skill in der Basis. Nordic Curls ohne Fußhalt: verhext kommen Nordic Negatives, kein eigenes Ausrüstungsfeld.

## [0.26.0] – 2026-10-03

### Geändert
- Eine hexed-Logik: Jede Bestie hat ein Basis-Workout. Übungen, deren Skill nicht angekreuzt ist, werden durch ihren Ersatz getauscht, Wiederholungen nach Faktor: Pistols → Squats ×2, Dragon Flags → Leg Raises ×3, Clapping Pullups → Pullups ×2, Alt OA Hanging → Passive Hang ×2, OA Chinups → Chinups ×2, Muscle-Ups → Assisted Muscle-Ups, Pullups → Assisted Pullups, Nordic Curls → Nordic Negatives. Die kuratierten Einzelfassungen aus 0.25.1 sind wieder raus.
- Bestien mit fehlendem Skill fallen nicht mehr aus der Auswahl, sie kommen hexed. Ohne Ersatzregel fallen sie weiter heraus.
- Eine Bestzeit für alle hexed-Varianten einer Bestie (Id „…~hex“). Alte hexed-Zeiten werden beim Laden zusammengeführt.
- Bestiarium zeigt bei fehlendem Skill die hexed-Fassung, so wie sie dran käme.

## [0.25.1] – 2026-10-03

### Geändert
- Dragon Flags bleiben in den Bestien (Wilde Jagd, Tatzelwurm, Nix).
- Entfesselte Fassungen gibt es vorerst nicht. Die gelieferte Fassung (bereinigt) ist die Basis.
- Kuratierte hexed-Fassungen für 13 Bestien mit schweren Übungen (Pistols, Clapping, Dragon Flags, Nordic Curls, einarmiges Hängen, Archer, Clapping Pullups): Lindwurm, Wilde Jagd, Nachtkrapp, Striga, Wilder Mann, Puck, Tatzelwurm, Nix, Aufhocker, Zwerg, Kikimora, Lutin, Dullahan. Sie haben Vorrang vor der automatischen hexed-Variante und stehen im Bestiarium bei der Bestie.

## [0.25.0] – 2026-10-03

### Geändert
- Bestien entrümpelt: seltene Übungen durch gängige ersetzt, in allen Bestien. RTO Ring Pushups → Ring Pushups, Jackie Chan und Chest Tap Pushups → Clapping Pushups, X Pushups → Pushups, C2B Chinups → Chinups, OA Chinup → Chinups ×2, Around-the-World → Toes-to-Bar ×2, Dragon Flags → Leg Raises ×3, Pulse Ups → Reverse Crunches, Side Vaults → Lateral Jumps, Contraction Plank → Plank, Sprawl Springs → Sprawls, Depth High Jumps → Tuck Jumps, Back Extensions → Supermen. Bleiben: Muscle-Ups, Burpee Muscle-Ups, Clapping Pullups, Alt OA Hanging, Archer Pushups, Hanging Knee Wipers, Combat Rolls, Burpee Squat Jumps, Lizard Crawl, Plank Knees-to-Elbow, Obstacle Run.
- Einheitliche Namen: Pullups (immer strikt), Strict Toes-to-Bar, Commando Pullups, Sprints, Mountain Climbers, Tuck Jumps (statt „Jumps“; High Jumps bleiben eigene Übung), Leg Raises, V-Ups, Tuck-Ups.
- Verhexte Pullups und Muscle-Ups heißen jetzt „Assisted … (Band oder Kipping)“.
- Bestzeiten bleiben, auch wenn sich bei 35 Bestien Übungen geändert haben.

## [0.24.1] – 2026-10-03

### Geändert
- Morgenland-Bestien (mit Last) sind vorerst ausgeblendet: Sie kommen in keiner Einheit dran und stehen nicht im Bestiarium. Die Daten und Bestzeiten bleiben erhalten.

## [0.24.0] – 2026-10-02

### Neu
- Reiter „Bestien“: das Bestiarium mit allen 81 Bestien. Je Bestie Familie, Klasse, Länge (gemessen oder geschätzt), Runden, Ausrüstung und Übungen, dazu die Bestzeiten getrennt nach Basis, verhext, ×2 und ×3 (Bestzeit, Datum, letzte Zeit, Anzahl Läufe). Fehlt ein Skill, steht dabei, welcher. Filter: Nord oder Morgenland, bezwungen oder offen, Suche nach Name oder Übung. Bezwungene stehen oben.

### Geändert
- Die Bestzeiten-Liste im Log ist in den neuen Reiter umgezogen.

## [0.23.1] – 2026-10-02

### Geändert
- Assassin: Jede Bestie kommt in der Phase erst wieder, wenn der Pool durch ist (geplant und geloggt). Zehn Wochen ohne Wiederholung, statt dreimal Troll.
- Serien können jetzt auch Doppel sein: dieselbe Bestie zweimal am Stück, zum Beispiel Kobold ×2.

## [0.23.0] – 2026-10-02

### Entfernt
- „Skills trainieren“: Verhexte Bestien kommen nicht mehr als Übung in die Rotation. Skills legen nur noch fest, welche Bestien dran kommen; Bestien mit fehlendem Skill fallen heraus. Eine feste Start-Bestie (Assassin: Undine) kommt notfalls weiter verhext.

### Geändert
- Assassin, „Schwert und Bestie“: neuer Pool mit 20 leichten Nordbestien statt Brechern wie Wilde Jagd, Krampus, Perchta oder Werwolf. Im Wechsel kommt eine Bestie allein (10–17 Min) und eine Serie aus zwei oder drei kurzen hintereinander (bis 22 Min, 2 Min Pause dazwischen). Lastbestien sind aus dem Pool raus.

## [0.22.0] – 2026-10-02

### Geändert
- Kopf der Einheit: Name und Ort stehen schon im Tagesknopf, darunter nur noch „etwa 55 Min“ und das Zahnrad.
- Übungszeile nach der ersten Einheit: konkrete Vorgabe statt Bereich, etwa **3 × 13 @ 10 kg** · zuletzt 3 × 12 (ungleiche Sätze als 12/11/10, Gewicht nur, wenn es abweicht). Darunter kurz: „→ bis 3 × 15, dann 12 kg“.
- Wiederholungsphase: „OK“ und „Leicht“ +1 Wiederholung, „Sehr leicht“ +2, „Schwer“ hält das Ziel.
- Hinweis nach dreimal OK kürzer, mit konkreter Vorgabe.

## [0.21.3] – 2026-10-02

### Behoben
- Undine verhext kam in Woche 2 trotz Sperre wieder. Ursache: Mit Skill-Training ist jede zweite Woche eine Skill-Woche mit verhexten Bestien. Fehlt nur ein Skill (etwa der Muscle-Up), gibt es dort genau eine Kandidatin, und die war in der Vorwoche dran. Die Sperre fand keinen Ersatz und fiel auf sie zurück. Jetzt gilt die Skill-Woche nur, wenn eine verhexte Bestie frei ist, sonst kommt eine normale. Und wenn gar nichts aus dem Pool frei ist, kommt erst eine andere Bestie derselben Länge, dann eine Serie, erst ganz zuletzt eine Wiederholung.
- Test erweitert: alle Orden, alle Trainingstage, auch „alles außer einem Skill“ und alle Tage am selben Ort.

## [0.21.2] – 2026-10-02

### Behoben
- Zeiteingabe bei Bestien und in der Testwoche: Statt nur „12:34“ gehen jetzt auch „12.34“, „12,34“ und „1234“, also auch über den Ziffernblock. „12“ heißt 12 Minuten. Was nicht passt, wird nicht mehr stillschweigend verworfen, sondern mit Hinweis angezeigt. Enter speichert.
- Zeit nachgetragen, Einheit schon abgeschlossen: Die Zeit zählt jetzt auch für die Bestzeit.

## [0.21.1] – 2026-10-02

### Behoben
- Bestie der Vorwoche konnte über einen anderen Trainingstag wiederkommen, etwa über „kein Laufen: Bestie statt Lauf“. Jetzt zählen die geplanten Bestien aller Tage der Vorwoche, mit dem Ort des jeweiligen Tages.
- Eine erledigte Einheit merkt sich ihre Bestie auch ohne eingetragene Zeit. Bisher zählte sie dann für die Rotation nicht als gemacht.

## [0.21.0] – 2026-10-02

### Geändert
- Woche geschafft: Sind alle Trainingstage der laufenden Woche erledigt, zeigt „Heute“ sofort die Folgewoche, voll bearbeitbar, auch über eine Phasengrenze. Die vorige Woche bleibt über ‹ erreichbar.
- Vorwahl beim Öffnen: die heutige Einheit, sonst die nächste offene, sonst die erste offene der Woche.
- Keine Bestie in zwei aufeinanderfolgenden Wochen, auch nicht als verhexte Variante oder als Teil einer Serie. Geprüft wird gegen die geplante Vorwoche (normal und entlastet) und gegen das, was in den sieben Tagen davor tatsächlich gemacht wurde, auch aus der vorigen Phase. Passt sonst nichts, kommt eine Serie aus kürzeren Bestien.
- Die Woche vor einem Zwischenwert (Conqueror) nimmt dessen Bestie nicht mehr.
- Erledigte Einheiten zeigen die Bestie, die tatsächlich gemacht wurde.

## [0.20.1] – 2026-10-02

### Geändert
- Die Last-Familie heißt jetzt **Morgenland**: Namen aus Mesopotamien, Persien und Arabien statt aus den griechisch-römischen Mythen (die nutzt schon Freeletics). Nord bleibt, wie es ist. 26 Bestien haben neue Namen, Mantikor bleibt (persischer Ursprung). Bestzeiten bleiben, weil sie an der internen Kennung hängen.

## [0.20.0] – 2026-10-02

### Geändert
- Zwei Bestien-Familien: **Süd** = Bewegung gegen externen Widerstand (Hanteln, Kettlebell, Langhantel, Band), Namen aus den Mittelmeer-Mythen. **Nord** = nur Körpergewicht (Stange, Ringe, Rudergerät erlaubt), Namen aus nord- und mitteleuropäischen Volkssagen. 27 Süd, 54 Nord. 38 Bestien haben dafür neue Namen; Bestzeiten bleiben, weil sie an der internen Kennung hängen. Neue Südnamen: Atlas, Talos, Antaios, Typhon, Echidna, Geryon, Triton, Satyr, Empusa. Undine bleibt Nord.
- Bestien-Karte und Bestiarium zeigen die Familie.

## [0.19.4] – 2026-10-01

### Behoben
- Start-Bestie (Assassin: Undine) kam in Woche 2 noch einmal. Sie steht jetzt vorn in der Rotation und kommt erst nach einem vollen Durchlauf wieder, nie zweimal hintereinander.

## [0.19.3] – 2026-10-01

### Neu
- Gewichte für Bestien-Übungen ohne eigene Angabe (`data/modules/beast_loads.json`), orientiert an Studio-Kurzhanteln: etwa Swings und Goblet Squat 20 kg, Thrusters 2 × 12 kg, Snatches 16 kg, Curls 2 × 12 kg, Shrugs 2 × 24 kg, Halos 8 kg. Die Karte zeigt das Gewicht am heutigen Ort („· 2 × 11,5 kg“ zuhause).
- Gibt es am Ort keine Hantel bis 10 % neben dem Soll, kommt eine andere Bestie. Angaben im Text wie „(2x5kg)“ gelten vorrangig; „(17.5 kg)“ bei Zweihand-Übungen gilt als Gesamtlast.

## [0.19.2] – 2026-10-01

### Neu
- Bandstärken für Bestien-Übungen (`data/modules/bands.json`): Band Thrusters mittel, Band Deadlift schwer, Skis, Curl-and-Press, Upright Rows, Face Pulls und Außenrotation leicht. Hexed eine Stufe leichter. Die Karte zeigt das passende Band aus deinem Profil („· Band mittel“). Bänder sind nicht herstellerübergreifend genormt, deshalb relative Stufen statt Kilo.

## [0.19.1] – 2026-10-01

### Behoben
- Bestien prüfen ihre Ausrüstung jetzt anhand der Übungen, nicht nur grober Kategorien. Ring Push-ups und Ring Dips brauchen Ringe (eine Klimmzugstange reicht nicht mehr), Face Pulls und Außenrotation ein Band oder Kabel, Kreuzheben und Bankdrücken eine Langhantel, „21c Row“ ein Rudergerät. Kikimora kommt damit nicht mehr ohne Ringe.

### Neu
- Wochenüberblick: Bestien zählen halb mit, jede Übung je Runde ein halber Satz. Laufen, Rudern und Pausen zählen nicht. Mehr Muster für Bestien-Übungen in `muscles.json`.

## [0.19.0] – 2026-10-01

### Neu
- Automatische Sicherung nach abgeschlossenen Einheiten (Setup › Sichern und Wiederherstellen): aus, wöchentlich (Standard) oder nach jeder Einheit. Am Handy als order-sicherung.json im Download-Ordner. Wo der Browser es kann (Chrome/Edge am Rechner), in eine selbst gewählte Datei, die jedes Mal überschrieben wird. Beides überlebt das Löschen der Browserdaten.
- Die Erinnerung „Jetzt sichern“ erscheint nur noch, wenn die automatische Sicherung aus ist.

## [0.18.6] – 2026-10-01

### Neu
- Start-Bestie je Bestien-Block (`first`): Assassin beginnt in Woche 1 mit Undine, ohne Muscle-Up als Undine hexed. Danach rotiert der Pool wie bisher.
- Die App bittet den Browser um dauerhaften Speicher, damit er die Daten nicht von sich aus aufräumt. Gegen manuelles Löschen hilft das nicht.

## [0.18.5] – 2026-09-30

### Geändert
- „⚙ Anpassen“ sitzt in der Zeile mit dem Namen der Einheit, die Karte klappt darunter auf.

## [0.18.4] – 2026-09-30

### Geändert
- Anpassungen für den Tag gebündelt hinter „⚙ Anpassen“ unter den Tagen: Ort, −1 Satz, kein Laufen. Die Zahl am Zahnrad zeigt aktive Anpassungen.
- Kennzeichnung A-/B-Woche entfernt. Übungen im Wechsel laufen weiter wie bisher.

## [0.18.3] – 2026-09-30

### Geändert
- Anderer Ort: Gibt es das Gewicht im heutigen Profil nicht, rechnet die App über die Leistung (Epley) auf dessen Stufen um. Nach „leicht“ oder am oberen Ende darf es die nächsthöhere Stufe sein (12 kg leicht im Studio → 13 kg zuhause, im Studio stattdessen mehr Wiederholungen), sonst die nächstniedrigere mit mehr Wiederholungen.

### Neu
- Dreimal „OK“ mit gleichem Gewicht und ohne mehr Wiederholungen: Die App schlägt einmal die nächste Stufe vor, bei großem Sprung zwei Wiederholungen mehr, mit Hinweis bei der Übung.

## [0.18.2] – 2026-09-30

### Geändert
- Gleiche Übung, gleiche Gewichtsdaten: DB Lateral Raise als reguläre Übung und als Ersatz an anderer Stelle teilen sich Gewicht und Wiederholungsziel. Es zählt der jüngste Stand. Leitern und Übungen ohne Gewicht bleiben an ihrer Stelle.
- Der Gewichtsvorschlag liegt immer auf einer Stufe des heutigen Profils (abgerundet), etwa 12 kg aus dem Studio → 11,5 kg zuhause.

## [0.18.1] – 2026-09-30

### Neu
- Trainingsort pro Tag umschaltbar (Heute, unter den Tagen): Übungen, Ersatz und Gewichtsstufen folgen dem gewählten Equipment-Profil. Gilt nur für diese Einheit, der Wochenplan bleibt.

### Geändert
- Nach dem letzten Satz einer Übung startet kein Pausentimer mehr. Beim Kontrastpaar läuft der Übergang zur explosiven Übung weiter.

## [0.18.0] – 2026-09-30

### Neu
- Allrounder oder Spezialist (Setup). Allrounder ist Standard.
- Schwerpunkt-Slot: Nach einer Testwoche bekommt die nächste Phase eine kleine Erhaltungsdosis für den schwächsten Bereich (Schnelligkeit, Sprungkraft, Beweglichkeit, Kraftausdauer, Anaerob, Ausdauer). Beweglichkeit täglich kurz im Cool-down, Schnelligkeit und Sprungkraft zweimal pro Woche am Anfang, der Rest einmal am kürzesten Tag. Höchstens etwa 15 % der Wochenzeit. Nur in Orden ab 45 Minuten, nicht in Herald, Harlequin, Soldier und den kurzen Orden. Je Phase im Plan fest wählbar oder abschaltbar.
- Trainiert der Orden das Hauptdefizit selbst, nimmt der Slot das zweite. Bereiche, die das Ziel stören (Ausdauer neben Kraft oder Muskelaufbau) oder nicht in einen Slot passen (Maximalkraft, Skill), gehen in den Vorschlag für die Blockfolge.
- Defizit nur, wenn deutlich unter der Norm (mehrere Tests ≤ 40, ein Test ≤ 30 Punkte) oder ohne Norm jenseits des Messfehlers schlechter.
- Blockfolge „Defizite zuerst“ (Standard, sobald eine Testwoche Defizite zeigt). Auswertung der Testwoche nennt Defizite und den Slot der nächsten Phase.
- Soldier: Die drei Schwerpunkt-Plätze sind nach den Defiziten vorbelegt.

### Geändert
- Soldier ist ein Block für allgemeine Vorbereitung ohne eigene Test- und Entlastungswoche (Testwoche als eigener Block davor). Er zählt in der Jahresbalance nicht mehr gleichmäßig für alle Bereiche. Gemischte Jahre mit Soldier stehen deshalb eher bei „mit Schwerpunkt“ als bei „allround“.
- Blockfolge mit Schwerpunkt-Ziel (Kraft, Beweglichkeit …) wertet nur den Hauptteil der Orden. Vorher gewannen Orden mit kurzem Warm-up und ohne Cool-down (Herald) nur wegen fehlender Beweglichkeitsminuten. Kraft über 12 Wochen bei mittlerer Alltagslast ergibt jetzt Smith.
- Filter „Testen“ in der Orden-Auswahl entfällt.

## [0.17.1] – 2026-09-30

### Geändert
- Smith läuft 9 bis 12 Wochen statt fest 9, mit Entlastung in Woche 5 und 10. Die Blockfolge-Suche zieht bei 12 Wochen keine Punkte mehr ab.

## [0.17.0] – 2026-09-30

### Geändert
- Erzähler ist jetzt „Der Aschekurier“, ein Flugblatt statt des Raben: Erstausgabe, eine Ausgabe pro Woche, Steckbrief des Widersachers, Kleinanzeigen und Leserbriefe „In eigener Sache“, Turnierbeilage, Sonderausgabe am Ende. Schlagzeilen fett.
- Die Bestien gehören zum Gefolge des Widersachers („Undine, aus dem Gefolge des Laternenmanns, …“).
- Welt-Pakete können Erzähler und Rubriken umbenennen (`narrator`).

## [0.16.0] – 2026-09-30

### Geändert
- Orden-Vorschau zeigt den Orden so, wie er bei deiner Zahl an Trainingstagen läuft: drei Tage in der verdichteten Form, fünf mit Zusatztag. Hinweise wie „entfällt bei 3 Tagen“ und „ab 5 Trainingstagen“ sind weg, Rollen-Hinweise ebenso.

### Entfernt
- Asymmetrie-Korrektur (Seitengewichtung in Warm-up, Cool-down und Flows): Die Evidenz dafür ist dünn. Beide Seiten bekommen jetzt dasselbe. Alte Angaben werden beim Laden gelöscht.
- Hinweise zu leisen Landungen bei Huntsman und Olympian.

## [0.15.0] – 2026-09-29

### Neu
- Erzähler „der Rabe“ (Setup › Erzähler, standardmäßig aus): Jeder Orden wird eine Geschichte mit Szene, Widersacher und drei Akten. Wochenbericht auf *Heute*, Chronik und Saga im Log. Schaden aus erledigten Einheiten, vollen Wochen, Bestzeiten und Gewichtssteigerungen; je Widersacher eine Schwachstelle; ein W20 pro Woche mit kritischem Treffer und harmlosem Patzer. Ruhige Wochen kosten nichts, der Widersacher fällt nicht vor dem Finale.
- Testwoche als „Turnier der Klingen“ mit Rückbezug auf den letzten Orden. Je Cup: neu verdient, gehalten (im Messfehler) oder diesmal nicht.
- Welt als austauschbares Paket: generische Dark Steamfantasy in `data/narrative/generic.json`; eigene Welten als JSON nur auf dem Gerät laden.
- Alles wird aus dem Log berechnet, mit festen Würfeln: Ein- und Ausschalten verliert nichts.

### Geändert
- Aufgeräumt: Füllhinweise über den Einheiten entfernt (Bonus-Tage „nur bei fünf Tagen“, „passt ins Büro“, Inhaltsaufzählungen, „kurz zum Schluss“ an Bestien). Geblieben sind Hinweise zu Sicherheit und Ausführung.

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
