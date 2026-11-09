# Changelog

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionen nach [Semantic Versioning](https://semver.org/lang/de/).

## [1.15.0] – 2026-11-09

### Geändert
- **Erhaltungsdosis in jedem Orden:** Jeder Orden hält jetzt jeden großen Muskel mit mindestens 4 harten Sätzen pro Woche (Arme mindestens 2), bei vier und bei drei Trainingstagen. Wo es fehlte, kamen kompakte Grundübungen dazu, mit dem Hinweis „Erhaltung: schwer genug, 2 Wiederholungen Reserve“:
  - Magician: Erhaltungsblock (Goblet Squat + Chin-Up, DB Romanian Deadlift).
  - Monk, Paladin, Dancer, King, Pilgrim, Acrobat, Huntsman, Pugilist, Scout, Troubadour, Herald: einzelne Übungen oder Sätze, meist als Superset mit dem Gegenspieler.
- **Hirsch · Erneuerung statt Erholung:** Der Hirsch ist jetzt eine Atempause von 4–6 Wochen ohne eigene Testwoche. Er bereitet das nächste Zeichen vor, das direkt danach kommt und mit der Testwoche endet. Nur wenn Beweglichkeit oder Erholung dein wichtigstes Ziel ist, bleibt er ein volles Zeichen.
- Im Hirsch hält der Schwerpunkt-Slot dein wichtigstes Jahresziel warm (Erhalt).

## [1.14.0] – 2026-11-09

### Neu
- **Schätzung der Maximalkraft ohne Norm:** Testest du an der Maschine (keine belastbare Norm), schätzt die App den Bereich aus Klimmzügen, Liegestützen und Standweitsprung. Die Schätzung erscheint mit „~“ und gestricheltem Balken, als Rangfolge, nicht als Perzentil.
  - Als Schwachstelle zählt sie nur, wenn sie klar hinten liegt (bis 25 Punkte), und dann halb so stark wie ein gemessenes Defizit.
  - Ist Kraftausdauer oder Sprungkraft schon selbst ein Defizit, zählt die Schätzung nicht doppelt.
  - Die Tagesbilanz sagt nach dem Studio-Cup, dass die Schätzung mit Zuhause- und Park-Cup folgt, und zeigt sie, sobald sie da ist.

## [1.13.0] – 2026-11-09

### Neu
- **Werkzeug in jedem Orden:** Jeder Orden arbeitet mindestens einmal pro Woche mit Stab, Schwert oder langem Stock.
  - Neue Übungen mit Klinge oder Stock, mit Handgelenkgewicht schwerer: **Klingen-Seitheben** (seitliche Schulter, langer Hebel), **Schwert-Hebeln** (Unterarme) und **Klingen-Außenrotation** (Rotatorenmanschette). Ohne Schwert im Profil kommen Kurzhantel, Band oder Wrist Curl.
  - Knight und Barbarian bekommen Klingen-Seitheben, Barbarian und Mercenary Schwert-Hebeln. Olympian endet den Sprinttag mit Langschwert-Hieben.
  - Neues Warm-up „Stab“ (Stabkreise, Zepterhaltung mit Atem) für Smith, Herald, Skirmisher, Acrobat und Monk; neues Cool-down „Stab-Zeitlupe“ für Pilgrim, Huntsman und Troubadour.
- **Ortsregel im Planer:** Studio-Orden (Smith, Knight, Olympian und alle mit Studio-Tagen) brauchen mindestens die Hälfte ihrer Studio-Tage im Studio. Hat deine Woche weniger Studio-Tage, oder läuft der Abschnitt auf Reisen, schlägt der Planer die Gegenstücke ohne Studio vor: Mercenary statt Smith, Barbarian statt Knight, Skirmisher statt Olympian. Von Hand bleibt alles wählbar.

## [1.12.2] – 2026-11-09

### Geändert
- Brustpresse und Beinpresse vergeben keine Normpunkte mehr. Die Vergleichswerte des Cooper Institute stammen von alten Universal-DVR-Geräten; heutige Maschinen haben andere Hebel, so dass etwa 100 kg an der Brustpresse fälschlich als P99 erschienen. Der Wert steht weiter als Orientierung da, der Bereich Maximalkraft zählt nur noch Kniebeuge und Bankdrücken mit Punkten. Dein eigener Verlauf bleibt der Maßstab.
- Werte mit Orientierungsnorm sind in der Tagesbilanz als solche gekennzeichnet.

## [1.12.1] – 2026-11-09

### Geändert
- Testwoche klappt automatisch ein wie eine Einheit: Warm-up und Cool-down, sobald alles abgehakt ist, ein Cup, sobald jeder Test gespeichert ist. Fertiges trägt ein ✓ und lässt sich jederzeit wieder aufklappen.

## [1.12.0] – 2026-11-09

### Neu
- **Tagesbilanz:** Unter jedem Testtag steht, sobald ein Wert gespeichert ist, wie du abschneidest: Wert, Punkte gegen die Altersnorm und Vergleich mit dem letzten Test.
- **Ergebnis der Testwoche:** Sind alle Cups eingetragen (oder ist die Woche vorbei), steht oben eine Zusammenfassung: Bereiche gegen die Norm als Balken, was besser wurde, stärkster Bereich und Baustelle. Beim Erzähler folgt der Ausgang des Turniers.
- **Orden nach Schwachstellen optimieren:** Der Knopf unter dem Ergebnis öffnet „Jahr planen“ mit den Defiziten aus der Testwoche. Ohne Jahresziel startet der Assistent mit „Defizite zuerst“.

### Geändert
- Testwoche aufgeräumt: Hinweis und Turnier-Einleitung liegen hinter Symbolen (i und Feder) wie bei jedem Orden, nicht mehr als Karten über den Cups.
- Nach der Testwoche kein „Willkommen zurück“ mit −1 Satz mehr: Testwerte zählen als Training, die Testwoche ist die Pause.

## [1.11.0] – 2026-11-09

### Neu
- **Zeichen neu setzen:** Änderst du in „Jahr planen“, Schritt 2, die Lebensabschnitte, erscheint ein Knopf „Zeichen neu setzen“. Er ordnet Zeichen, Orden und Kalorien neu nach Zielen und Zeiträumen; eigene Wahl aus dem Assistenten und alte Festlegungen künftiger Phasen fallen dabei weg. Wer weiterblättert oder übernimmt, ohne zu tippen, bekommt die neue Zuordnung automatisch.
- **Testwoche wie eine Einheit:** Jeder Testtag hat ein Warm-up zum Abhaken mit Timer, einmal für den ganzen Tag (der zweite Cup am Ort braucht keins), und am Ende ein Cool-down. Die Übungen selbst bleiben gleich, damit die Testwerte vergleichbar bleiben.
- **Cluster-Sätze:** Smith macht Kniebeugen und Deadlift in Phasen mit hoher Alltagslast in Portionen mit 20 s Pause (Deadlift als Einzelwiederholungen). Scout macht den Hang Power Clean immer so. Gleiche Anpassung, weniger Ermüdung, schnellere Wiederholungen.

### Geändert
- Zeichen sitzen genauer auf den Abschnittsgrenzen: Passt eine Grenze in 8–16 Wochen, schneidet das Zeichen den Abschnitt nicht mehr an.

## [1.10.1] – 2026-11-09

### Geändert
- Assassin: Drop-Set am letzten Satz von Lat Pulldown, Cable Overhead Triceps Extension und Cable Chest Fly. Im Defizit sinkt das Volumen; Drop-Sets halten den Muskelreiz in kurzer Zeit.

## [1.10.0] – 2026-11-09

### Neu
- **Satzende-Techniken** für Orden mit Körpergewicht, Band und Kurzhantel. Der letzte Satz ausgewählter Übungen läuft verlängert, ein Zeichen am Namen zeigt es an:
  - **Myo-Reps** an Isolationsübungen: drei Atemzüge Pause, dann 3–5 Wiederholungen, bis zu vier Mini-Sätze.
  - **Drop-Set** an Kurzhantel-Seitheben: etwa ein Viertel leichter, sofort weiter, zweimal.
  - **Mechanischer Drop** an Push-Ups und Klimmzügen: zum Beispiel Deficit Push-Up → Push-Up → Incline Push-Up oder Pull-Up → Chin-Up → Negativ.
  - Bei Barbarian an Band Fly, Seitheben, Pullover, Waden und Leg Curl; bei Conqueror an Deficit und Pike Push-Up; bei Mercenary nur an den Einstiegsübungen (Kraft bleibt sauber).
  - In Entlastungswochen entfällt das Satzende. Bei hoher Alltagslast bleibt es nur an kleinen Ergänzungsübungen. Power-Orden wie Skirmisher bekommen keines.
- Scout spielt beim Erzähler in der Wildnis.

## [1.9.0] – 2026-11-09

### Neu
- **Barbarian**, ein Bär-Orden ohne Studio: Muskelaufbau mit Kurzhanteln, Bändern, Stange und eigenem Körper. Oberkörper und Unterkörper im Wechsel, jeder Muskel zweimal pro Woche. Übungen mit tiefer Dehnung (Deficit Push-Up, Bulgarian Split Squat, DB RDL, DB Pullover, Überkopf-Trizeps) und je eine Isolation zum Einstieg. Unterwegs gibt es Band-Varianten. Er passt zu hoher Alltagslast und zählt im Stier halb.

## [1.8.0] – 2026-11-09

### Neu
- **Skirmisher**, ein Falke-Orden für draußen: Sprünge (Broad Jump, Skater, Split Jump), Sprints und Richtungswechsel, explosives Ziehen und Drücken an Stange und Boden (Chest-to-Bar, Clap Push-Up) und ein Kettlebell-Tag (Swing, Press, Cossack Squat, Get-Up). Das braucht nur den eigenen Körper, ein Band und eine Klimmzugstange. Wenige Wiederholungen und volle Pausen machen ihn auch für volle Wochen verträglich. Reisetauglich, mit Nordic Curls zum Schutz der hinteren Oberschenkel.
- Damit hat der Falke einen Orden für hohe Alltagslast und für den Urlaub. Im Fuchs und im Stier zählt Skirmisher halb.

## [1.7.1] – 2026-11-09

### Geändert
- Mercenary heißt Mercenary und ist reisetauglich: Kurzhanteln stehen zu Hause, im Studio und in jedem Hotel-Gym.

## [1.7.0] – 2026-11-09

### Neu
- **Mercenary**, ein Kraft-Orden für zu Hause: etwa 70 % Kurzhantel (DB Bench Press, Goblet Reverse Lunge, Staggered Stance RDL, Schulterdrücken, Rudern) und 30 % Skill-Kraft (Archer Pull-Ups, Archer Push-Ups, Pistol Squats). Dazu ein Power-Tag mit DB Snatches und Supermen. Ohne schwere Last vom Boden passt er auch zu hoher Alltagslast. Heimat ist der Stier; im Fuchs läuft er früh mit, in Bär und Wolf zählt er halb.
- Neue Übungen: Archer Pull-Up, Staggered Stance DB RDL, DB Snatch, Superman, Goblet Reverse Lunge.

### Geändert
- Keine Entlastung in der Woche direkt vor der Testwoche eines Zeichens: Die Testwoche entlastet selbst, und eine Entlastung davor würde die Testwerte schönen.
- „Bauchroller“ heißt wieder „Bauchroller“.

## [1.6.0] – 2026-11-09

### Geändert
- **Warm-up macht nur bereit.** Jeder Tag wärmt gezielt auf, was er trainiert: Oberkörper, Unterkörper, Sprünge, Lauf oder Schwert. Kraft- und Aufbauübungen sind aus dem Warm-up verschwunden. Neck Curl Complex und Rumpfübungen laufen jetzt im Trainingsteil, wo sie hingehören. An Bestientagen gibt es ein knappes Ganzkörper-Warm-up (World's Greatest Stretch, Inchworm).
- **Cool-down dehnt, was trainiert wurde,** mit wenigen großen Dehnungen, die viel auf einmal erfassen, 45–60 Sekunden zum Hineinsinken: Puppy Pose und Türrahmen nach Oberkörpertagen, Couch Stretch, Pigeon und Wall Hinge nach Beintagen.
- **Isolation zum Einstieg:** Viele Kraft- und Muskelorden beginnen mit ein bis zwei Isolationsübungen, zum Beispiel Cable Fly vor Bench Press, Leg Extension vor Leg Press oder Leg Curl vor Front Squat. Das wärmt vor, die Grundübung danach braucht einen Aufwärmsatz weniger. Kraftorden wählen dafür Muskeln, die der erste Lift nicht braucht.
- **Neue Ausrüstung:** Black Roll und Black-Roll-Ball (Setup › Equipment). Ohne Rolle kommt ein Ersatz im Stehen. 

## [1.5.0] – 2026-11-09

### Geändert
- **Kurz verdichtet statt zu streichen.** Ein Kurztag behält bis zu fünf Übungen, paart Gegenspieler als Supersets (Brust/Rücken, Quadrizeps/Beinbeuger, Bizeps/Trizeps) und nimmt erst dann Sätze weg. Ziel sind 30 statt 35 Minuten.
- **Kurz in der Entlastungswoche:** Die Entlastung hat Vorrang. Kurz kürzt dann nur noch auf die vier Kernübungen und ein knappes Warm-up, ohne Supersets und ohne Ausgleich an anderen Tagen.
- **Entlastung am Ordenswechsel:** Der Vorschlag alle vier Wochen rastet auf die erste Woche eines neuen Ordens ein, wenn der Wechsel höchstens zwei Wochen daneben liegt. So unterbricht die Entlastung keinen Orden mitten im Aufbau.
- **Herald** bleibt der Orden für Wochen mit wenig Zeit, ohne dass du „Kurz“ wählen musst. Er passt halb zu Stier und Bär, wird aber nie vorgeschlagen: Du wählst ihn bewusst.

## [1.4.6] – 2026-11-09

### Geändert
- Smith passt jetzt auch zu hoher Alltagslast. Im Studio läuft dann etwa die Hälfte der Kraftübungen an Maschine oder Kabel (Leg Press, Chest Press, Lat Pulldown …). Die erste Hauptübung des Tages bleibt frei. Damit hat der Stier bei hoher Last zwei passende Orden.

## [1.4.5] – 2026-11-08

### Geändert
- King ist der Bestien-Orden, auch für volle Wochen:
  - Neu: Chaos C mit Bestie, ATG Split Squat und Table Row.
  - Redner und Haltung sind ein gemeinsamer Tag: Resonanzatmung, Stab, Pullover mit Deficit Push-Up, Face Pull mit Chin Tuck, lockere Grundlage.
  - Bei hoher Alltagslast läuft Chaos B mit Seil im mittleren Puls statt Sprints.
  - Laufende King-Phasen behalten ihre Fassung bis „Übernehmen“.

## [1.4.4] – 2026-11-08

### Geändert
- Fünf Orden passen jetzt auch zu hoher Alltagslast: Pugilist, King, Dancer, Huntsman und Conqueror. Sie arbeiten mit Körpergewicht, Runden und Bestien statt schwerer Langhantel. Solche Einheiten bei mittlerem bis höherem Puls tun auch in vollen Wochen gut, solange die Kalorien reichen. Schwere Grundübungen (Smith, Olympian, Scout) bleiben bei mittlerer Last.
- Damit passen bei hoher Last 14 statt 9 Orden. Wolf, Fuchs und Hirsch brauchen dort keine Lückenfüller mehr.

## [1.4.3] – 2026-11-08

### Geändert
- Assassin braucht mittlere Alltagslast. Bei hoher Last plant die App kein Defizit, und ohne Defizit verliert der Orden seinen Zweck. Er rutscht deshalb nicht mehr in Phasen mit hoher Last; von Hand geht er weiter.

## [1.4.2] – 2026-11-08

### Geändert
- Pilgrim passt zu hoher Alltagslast. In solchen Phasen wird der Intervalltag kürzer (3 × 4 Minuten statt 4 × 4) und jede zweite Woche zur lockeren Grundlage. Lockere Ausdauer kostet wenig Erholung, harte Intervalle viel. Damit hat der Wolf bei hoher Last einen Orden, der das Ziel trägt, nicht nur Assassin.

## [1.4.1] – 2026-11-08

### Geändert
- Paladin wechselt vom Wolf zum Hirsch: Hauptziel Beweglichkeit und Belastbarkeit (Sehnen, Gelenke), Nebenziele Kraft und Kondition. Er passt jetzt auch zu hoher Alltagslast, weil er über Halten und Positionen arbeitet, nicht über schwere Sätze. Der Hirsch braucht dort keine Lückenfüller mehr.

## [1.4.0] – 2026-11-08

### Neu
- Sechstes Zeichen: **Fuchs · Skill** (Turnen, Parkour, Kampfsport). Heimat von Acrobat, Huntsman und Pugilist; Dancer läuft spät mit. Saison Frühling und Herbst, Erhaltung, reisetauglich.

### Geändert
- Pugilist hat Skill als Hauptziel und den Fuchs als Heimat (vorher Wolf).
- Mitläufer eines Zeichens rücken vor, wenn ihr Hauptziel ein Jahresziel ist: z. B. Dancer im Fuchs bei Ziel Beweglichkeit, Smith im Bär bei Ziel Kraft. Fremde Orden zieht ein Jahresziel nicht ins Zeichen.
- Falke: Acrobat und Huntsman laufen nur noch mit.

## [1.3.2] – 2026-11-08

### Geändert
- Bereiche: eine Spalte „im Blick“ statt zwei Punkten. Jeder Bereich zeigt „gut“ oder den Grund („fehlt im Plan“, „fällig“, „noch nie trainiert“, „knapp im Plan“, „bald fällig“). Beide Messungen stehen beim Antippen.
- Status-Symbol im Plan zählt „bald“ und „fehlt“ wie die Liste.

## [1.3.1] – 2026-11-08

### Geändert
- Testwoche sieht aus wie jede andere Woche: Tage als Knöpfe oben (Tag, Ort, Cups, ✓ wenn erledigt), der gewählte Tag zeigt seine Cups. Vorgewählt ist heute, sonst der nächste offene Testtag.
- Almanach: Orden zeigen alle Zeichen, in denen sie sinnvoll sind — voll, wo sie das Ziel tragen; blass, wo sie im Verlauf kuratiert mitlaufen (z. B. Smith: Stier voll, Bär blass; Olympian: Falke voll, Stier blass).
- Assistent Schritt 2: Jedes Zeichen sagt, warum es so geschnitten ist (wo es endet, ob es einen Abschnitt teilt) und warum es so viele Orden hat.

## [1.3.0] – 2026-11-08

### Neu
- Bereiche statt Residual-Uhren, Domänen-Bilanz und Jahresbalance: eine Liste mit neun Bereichen in Alltagssprache (Kraft, Muskel, Spritzigkeit, Kraftausdauer, Intervalle, Grundausdauer, Beweglichkeit, Sehnen, Skill) und je zwei Punkten — Frische (wie lange der letzte Reiz her ist; frisch, bald fällig, fällig) und Im Plan (Wochen im nächsten halben Jahr; Richtwert 4, sonst knapp oder fehlt). Darunter Tipps für fällige Bereiche, die Abwechslungs-Regel und die Waage Spezialist ↔ Allrounder. Schritt 3 im Assistenten heißt jetzt „Bereiche“.
- Mehrere Jahresziele mit Priorität 1–3: In Reihenfolge antippen; Priorität 1 zählt dreifach, 2 doppelt, 3 einfach bei der Wahl der Zeichen. Ohne Ziel gilt Allround oder „Defizite zuerst“.
- Testwoche auf Tage verteilt: Studio, Zuhause und Park liegen auf deinen Trainingstagen (Studio zuerst, Park gern am Wochenende); der heutige Test-Cup ist aufgeklappt. Ab dem Wochenende davor (oder wenn die Woche geschafft ist) ist die Testwoche echt geplant und eintragbar, nicht mehr nur Vorschau.

- Schwerpunkt: ein Slot je Orden, in der Jahresgesamtschau befüllt — mit genau einem Zweck: Testdefizit, Double down (im Zeichen des wichtigsten Ziels), Erhalt (was der Plan sonst verfallen ließe; Hochrechnung der Uhren über Orden, Bestien und frühere Slots) oder Sekundärziel. Nie gegen den Orden (Interferenz bleibt ausgeschlossen), derselbe Bereich nicht zweimal in Folge. Schwerpunkt 2 entfällt. Der Slot steht im Phasenblatt mit Zweck (nicht mehr unter „Mehr“), im Assistenten unter jedem Orden und zählt halb für „Im Plan“.
- Bestien-Budget rechnet immer mit vollen Sätzen: −1 Satz ändert die Bestie nicht mehr.

### Geändert (Modelljahre geprüft)
- Defizite werden wieder planbar: Dauerlast zählt nur zusammenhängende Wochen mittlerer Last; „hohe Last“ heißt jetzt: mehr als die Hälfte der Wochen. Ein Defizit-Zeichen bleibt in einzelnen Orden mit hoher Last auf Erhaltung. Sommer ohne hohe Last zieht Zeichen, die ein Defizit tragen; Saison nach Anteil der Wochen statt nach Fenstermitte. Im Semesterjahr landet so ein Wolf mit zehn Wochen Defizit in der Sommerpause.
- Ein Zeichen ohne passenden Träger für die Alltagslast ist praktisch ausgeschlossen, auch wenn es Ziel Nr. 1 ist (Falke im Hochlast-Semester bekam vorher Acrobat und Herald statt eines Schnellkraft-Ordens).
- Abwechslung übers Jahr: Jede frühere Verwendung eines Ordens im letzten Jahr kostet bei der Wahl (Troubadour war Lückenfüller in fast jedem Zeichen).
- Höchstens zwei Überschuss-Zeichen im Jahr.
- Bestien zählen in der Bilanz: ein Viertel Woche Kraftausdauer und Intervalle je Woche mit Bestie (Erhaltungsdosis).
- GPP / Wolf bevorzugt Juni bis August.
- Assistent Schritt 2: Lebensabschnitte stehen oben und führen, die Zeichen darunter.
- Almanach: Jeder Orden zeigt ein Tier — die Zeichen, deren Ziel er trägt; sonst blass das Zeichen, in dem er mitläuft (Acrobat und Huntsman im Falken, Herald im Stier).

## [1.2.0] – 2026-11-08

### Geändert
- Stapel nach Zeichen gruppiert: Ein Kopf je Zeichen (Tier, Stichwort, Kalorien, Zeitraum; antippen öffnet den Assistenten bei den Orden), darunter nur noch die Orden. Zeichenname und Kalorien stehen nicht mehr an jedem Orden, das Lastsymbol fällt weg (die Last zeigt das Jahresbild).
- Testwoche im Stapel nur noch als Symbol am Orden davor — antippen zeigt die Cups. Die eigene Testwochen-Karte entfällt; im Jahresbild bleibt der Streifen, weil er dort die Zeit zeigt.
- Weit Voraus klappt ein: Der Stapel zeigt bis zum Ende des übernächsten Zeichens, der Rest liegt hinter „Später · n Orden“; das ganze Jahr zeigt das Jahresbild.
- Status „empfohlen“/„gewählt“ an künftigen Orden entfällt; nur „läuft“ bleibt.
- Almanach: keine vorgesehene Dauer mehr (das Zeichen bestimmt, wie lange ein Orden läuft) — außer bei fester Länge („fest 12 Wochen“, Monk). Alltagslast und „unterwegs“ als Symbole, dazu das Zeichen, dessen Ziel der Orden trägt. Der Einleitungssatz entfällt.

### Entfernt
- Warnung „kürzer, als der Orden gedacht ist“: Orden laufen flexibel, die Länge regelt das Zeichen.

## [1.1.0] – 2026-11-08

### Geändert
- Klammern heißen in der App jetzt „Zeichen“, mit Tieren als Namen und eigenen Symbolen: Bär (Muskelzuwachs), Stier (Kraft), Falke (Athletik), Wolf (Allround und Kondition), Hirsch (Regeneration). Hinter dem Tier steht überall ein Stichwort — Bär · Masse, Stier · Kraft, Falke · Explosiv, Wolf · Kondition, Hirsch · Erholung —, weil die Tiere allein weniger verraten als die Ordensnamen. Die Logik bleibt gleich; Hinweise und Assistent sprechen von Zeichen („im Zeichen des Bären“).
- Jahresbild auf dem Handy: feste Breite je Woche statt gestaucht aufs Display, waagerecht scrollbar, springt beim Öffnen auf heute; eine Monatsleiste oben und ein weicher Rand zeigen, dass es weitergeht. Namen von Abschnitten, Zeichen und Orden sind dadurch lesbar.
- Wo „Zeichen“ bisher kleine Warn- und Statussymbole meinte, heißen diese in der Anleitung jetzt „Symbole“.

## [1.0.0] – 2026-11-08

### Neu
- Klammern: Fünf übergeordnete Ziel-Klammern — Muskelzuwachs, Kraft, Athletik, GPP / Allround, Regeneration (Arbeitsnamen, kuratiert in `data/modules/klammern.json`) — halten ein Ziel über 8–16 Wochen und enden mit der Testwoche. Darin laufen ein bis drei Orden: bis 8 Wochen einer, bis 12 zwei, darüber drei. Die Klammer bindet das Ziel, die Orden bringen die Variation (gleitender Fokus statt Ordenshopping).
- Klammern rasten an den Grenzen der Lebensabschnitte ein, mit ein bis zwei Wochen Spielraum; sie dürfen Abschnitte überspannen, ein langer Abschnitt trägt zwei. Laufende Klammern bleiben beim Neuplanen ganz.
- Ordenswahl in der Klammer nach Zielbindung (trägt der Orden das Ziel — Zeit-Orden unter 35 Minuten nur teilweise), Variation (nicht zweimal derselbe) und Verlauf (Aufbau früh, Umwandlung und Zuspitzung spät). Hausorden: Wer im Assistenten Orden markiert, bekommt nur aus diesen Vorschläge; der Almanach zeigt weiter alle.
- Kalorien je Klammer mit fester Rangfolge: Last zuerst (kein Defizit bei hoher Last; mittlere Last wird nach acht Wochen ohne ruhigen Abschnitt zur Dauerlast und zählt wie hohe), dann Kalender (Winter Überschuss für Aufbau, Sommer Defizit-Fenster), dann Reise (Erhaltung, kohlenhydratbetont, Athletik passt), zuletzt der Grundmodus der Klammer.
- Jahres-Assistent „Jahr planen“ in vier Schritten: Ziel → Klammern → Schwachstellen → Orden. Jeder Schritt zeigt den Vorschlag und lässt ihn überschreiben. Was von Hand gewählt wird (Orden, Kalorien, Klammer-Art), wird gepinnt und bleibt beim nächsten Planen stehen.
- Jahresbild im Plan: drei Ebenen — Lebensabschnitte mit Last, Klammern mit Kalorien, Orden mit Warnzeichen — und der Strich für heute. Antippen öffnet Orden, Klammer oder Testwoche.
- Zeichen statt Sätze: Hinweise, unpassende Orden, Zielbindung (● ◐ ○), Kalorien (↓ = ↑) und Pins erscheinen als Symbole mit Tooltip; der Text steht im Phasenblatt.
- Athletik-Klammer: Huntsman trägt den Verlauf früh und spät mit, damit der dritte Orden nicht auf einen Kraft-Orden ausweicht. Scout bleibt Orden — in der Athletik-Klammer ist er neben Olympian der zweite Träger der Leitachse.
- Domänen-Bilanz: neue Zeile „Sehnen“ (ohne Pflicht, wie Masse), gezählt nach dem Anteil an Halteübungen eines Ordens.

### Geändert
- Plan-Tab entschlackt: „Jahr planen“ ersetzt „Künftige Phasen neu vorschlagen“, „Jahr füllen“, „+ Mesozyklus anhängen“ und „Blockfolge vorschlagen“ — ein Generator statt vier. Lebensabschnitte, Richtung und Testwochen stehen im Assistenten, der Jahresblick (Uhren, Bilanz, Balance) in Schritt 3; im Plan bleibt ein Status-Zeichen.
- „Deine Woche“ ist nach Setup umgezogen.
- Der Stapel ist kompakt: eine Zeile je Phase mit Klammer, Orden, Wochen und Stift.
- Phasenblatt: Orden zuerst, mit Zielbindung je Kandidat; Name, Alltagslast, Zeitraum, Wochenplan und Schwerpunkte unter „Mehr“. Teilen und Verbinden innerhalb einer Klammer lassen die Klammer stehen.
- Entlastungswoche: Der Rhythmus (ab Woche 5 alle vier Wochen) zählt über die ganze Klammer, nicht über den einzelnen Orden — kurze Orden bekamen vorher nie eine Rhythmus-Entlastung.
- Abwechslungs-Regel der Bilanz: Eine Klammer zählt als eine Phase.

### Behoben
- Testwochen-Regel: Lebensabschnitte zeigten ohne gesetzten Wert „keine“, „Jahr füllen“ plante aber nach jeder Phase. Jetzt gilt überall derselbe Standard (nach jeder Klammer).

### Entfernt
- Mesozyklus-Wizard (Formen 4+4 bis 5+5+5, Akzent-Modus), Coach „Jahr füllen“ und der Blockfolge-Dialog. Bestehende Mesozyklen laufen unverändert weiter.

## [0.99.4] – 2026-11-07

### Neu
- Coach-Jahres-Füllung: „Jahr füllen“ füllt alles hinter der laufenden Phase in einem Zug mit Mesozyklen — das Ziel sagen, die Marken in den Lebensabschnitten setzen, ein Klick, der Rahmen steht. Die Form jedes Mesozyklus folgt der Alltagslast der Abschnitte (hohe Last: 6+4, ruhige: das Triple), die Orden folgen der Empfehlung als Kette — mit Jahresziel, roten Uhren und Bilanz —, und ein Rest von unter neun Wochen verlängert den letzten Teil statt ein Loch zu lassen.
- Die Testwochen folgen der eingestellten Regel (nach jedem Mesozyklus, zweimal im Jahr, keine), und jeder Teil bekommt einen Kalorien-Vorschlag aus der bestehenden Empfehlung (Aufbau: Überschuss, niedrige Last: Defizit-Fenster, hohe Last: Erhaltung).
- Vergangenes und die laufende Phase bleiben unberührt; die Meso-Id eines laufenden Blocks löst sich, wenn seine zukünftigen Partner ersetzt werden (gleiche Grammatik wie Teilen und Verbinden). Alles ist Vorschlag: Jede Phase lässt sich danach ändern wie immer. Ohne Abschnitte füllt der Coach 52 Wochen Standardform.

## [0.99.3] – 2026-11-07

### Behoben
- Herald-Regel gilt jetzt auch fürs Jahresziel: Zeit-Orden unter 35 Minuten zählten beim Ziel „Kraft“ oder „Muskelaufbau“ voll wie jeder andere (primary strength plus secondary hypertrophy) — die Volumen-Grenze steckte nur im Akzent-Modus. Ihr Zielanteil zählt jetzt halbiert (gedimmt wie ein Nebenziel), mit Begründung in der Empfehlung; Testwochen bleiben neutral. Der 25-Minuten-Herald rutscht damit hinter die Träger (Smith, Troubadour) statt auf Platz drei zu landen — wählbar bleibt er, für Jahre mit wenig Zeit ist er die richtige Wahl.

## [0.99.2] – 2026-11-07

### Neu
- Neuer Orden Scout (jetzt 19 Orden): Reaktivität und Drehgeschwindigkeit — Reaktion auf Ansage (Richtung rufen, sofort hinein), Seilsprints, Schwert-Intervalle mit Drehhau-Serien und ein Krafttag mit Hang Power Cleans, Back Squat und Nordic Curls. Vier kurze Einheiten, jeder Reiz frisch und mit voller Qualität: Reaktivität klingt ohne frischen Nervenzustand am schnellsten ab. Olympian behält Beschleunigung und Sprints, der Scout dreht und antwortet. Neue Übungen im Katalog: Hang Power Clean, Seilsprints, Skater Jumps, Reaktion auf Ansage. Nach Olympian führt der Weg jetzt auch zum Scout.

## [0.99.1] – 2026-11-07

### Geändert
- Feilen an Usability und Einfachheit: Der Plan-Tab gehört wieder dem Jahr. Die Blockfolge steht jetzt direkt unter Woche und Lebensabschnitten; die drei Analyse-Karten (Residual-Uhren, Domänen-Bilanz, Jahresbalance) sind zu einem zusammengeklappten „Jahresblick“ am Tab-Ende geworden, mit einer Statuszeile („2 Uhren rot · Lücken: …“ oder „alles im Lot“). Die Mechanik läuft im Hintergrund unverändert weiter: Uhren, Bilanz und Lenkung fließen weiter in alle Vorschläge ein.
- Die beiden Warn-Tafeln über der Blockfolge (Uhren über Budget, Bilanz-Lücken) sind entfallen — dieselbe Information steht komprimiert in der Jahresblick-Zeile, und die Vorschläge begründen sich ohnehin am Kandidaten.
- Domänen-Bilanz kompakt: Statt der vollen Matrix steht die Tabelle Bereich × Halbjahr; Lücken und Abwechslungs-Verstöße als eine Zeile. Die Zählregeln (Hauptziel voll, Nebenziel halb) stehen nur noch in der Anleitung.
- Anleitung stark gekürzt: Residual-Uhren, Domänen-Bilanz, Lenkung und Kalorien von je drei bis vier Absätzen auf je zwei kurze Punkte; Mesozyklen- und Plan-Absätze entsprechend gestrafft. Kernaussagen unverändert, Formulierungen auf das Wesentliche.

## [0.99.0] – 2026-11-07

### Neu
- Akzent-Modus: „+ Mesozyklus anhängen“ kann eine Ziel-Domäne festhalten („Akzent halten“). Jeder Teil des Mesozyklus trägt sie als Hauptziel, und die Orden rotieren zwischen denen, die sie trainieren — etwa Slayer und Knight für Muskelaufbau, Smith und Troubadour für Kraft. Zeitoptimierte Orden bleiben draußen, sie tragen die Dosis eines Akzents nicht. Die Abwechslungs-Regel der Bilanz weist die Folge bewusst als Warnung hin; Teilen oder Verbinden löst den Akzent mit dem Mesozyklus auf.
- Kalorien-Layer: Jeder Mesozyklus-Teil kann einen Kalorien-Modus tragen — Defizit, Erhaltung oder Überschuss. Die App schätzt den Burn des Ordens nach seinen Übungen (Bestien zählen am meisten, Intervalle und Timer liegen dahinter, reine Kraftsätze wenig) und warnt bei Kombinationen, die nicht tragen: Defizit auf einem Orden für Überschuss, Defizit auf hohem Burn bei hoher Alltagslast, Defizit auf einem Aufbau-Akzent. Die Warnung steht an der Phase und im Plan-Stapel (amberfarben) — nichts wird gesperrt. Bei hoher Alltagslast sinkt die Burn-Schätzung, weil ohnehin etwa die Hälfte der Kraftübungen geführt läuft.
- Kalorien-Empfehlung: Bei niedriger Alltagslast und einem Orden, der verträgt, schlägt die App das Defizit vor — Defizit-Fenster gehören in niedriglastige Phasen. Bei Aufbau-Akzenten empfiehlt sie Überschuss, bei hoher Alltagslast Erhaltung. Wie immer: Vorschlag, du entscheidest.
- Alltags-Anbindung: Beim Anlegen eines Mesozyklus lesen die Teile die Alltagslast aus deinen Lebensabschnitten (statt pauschal mittel), und die Form-Empfehlung folgt dem Zeitraum dahinter — hohe Last rät zu kürzeren Teilen (6+4) und kürzeren Ordnern, niedrige Last zum Triple mit zeithungrigeren Orden. Die Ordensvorschläge ziehen bei hoher Last kürzere Orden vor, bei niedriger zeithungrige. Lücken der Bilanz und rote Uhren haben weiter Vorrang vor der Last-Empfehlung.
- Neue Hilfe-Abschnitte „Kalorien“ und Nachträge zu Mesozyklen (Akzent-Modus, Alltagslast); Einsteiger sehen Kalorien-Modus und Akzent nicht.

## [0.98.0] – 2026-11-07

### Neu
- Lenkung: Rote Residual-Uhren fließen jetzt in die Vorschläge ein — als Empfehlung, nie als Einplanung. Die Eskalationsleiter hat drei Stufen: Blockfolge und Meso-Wizard ziehen Orden vor, deren Bereiche die roten Uhren halten („hält rote Uhren: …“ steht als Begründung am Kandidaten); Schwerpunkt 2 priorisiert die rote Domäne als Vertiefung, wenn sie ein Slot-Modul hat und der Orden sie nicht selbst trainiert; als letzte Stufe empfiehlt die Uhr-Karte eine Gelegenheit aus dem Bestand, etwa eine Bestie mit Sprintanteil. Uhren ohne Slot-Modul (Kraft, Sehnen) und störende Bereiche (Ausdauer neben Muskelaufbau) bleiben dem Orden überlassen.
- „+ Mesozyklus anhängen“ empfiehlt eine Form: Bei Lücken der Domänen-Bilanz oder mehreren roten Uhren rät die App zu 5+5+5 — drei Orden decken mehr Bereiche ab —, sonst zur Standardform 6+6. Die Empfehlung begründet sich selbst, die Form bleibt frei wählbar.
- Die Auswertung der Testwoche fasst am Ende des Mesozyklus zusammen, welche Uhren rot sind und welche Bereiche im Halbjahr unterversorgt sind — gleiche Anlaufstelle wie „Für den Mesozyklus übernehmen“, jetzt residual- und bilanzgeführt.
- Wie Uhren und Bilanz bleibt die Lenkung Bewertung: Nichts wird gesperrt, nichts automatisch eingeplant. Die Uhr zeigt, der Wizard schlägt vor, du entscheidest.

## [0.97.0] – 2026-11-07

### Neu
- Domänen-Bilanz im Plan: Eine Matrix Bereich × Mesozyklus zeigt effektive Wochen — das Hauptziel eines Ordens zählt voll, jedes Nebenziel halb, Kondition zählt für Kraftausdauer und Anaerob. Einzelne Phasen ohne Mesozyklus stehen als eigene Spalte, rechts die Summen je Halbjahr. Masse läuft als eigene Zeile über die Kraft mit; Fett verlieren und Wohlbefinden bleiben Wunschziele ohne Pflicht.
- Allround-Regel: Jeder Bereich, den die Testwoche misst, braucht mindestens 4 effektive Wochen je Halbjahr (4 von 26). Geprüft wird ein Halbjahr erst, wenn mindestens die Hälfte geplant ist. Eine Lücke steht als Hinweis unter dem Jahresband und in der Karte — die Bilanz warnt, bevor die Testwoche enttäuscht.
- Abwechslungs-Regel: Kein Hauptziel in mehr als zwei Phasen in Folge; drei gleiche Hauptziele hintereinander sind ein Hinweis. Harlequin bleibt der Joker und unterbricht jede Reihe.
- Wie die Uhren ist die Bilanz Bewertung, kein Planer: Nichts wird gesperrt oder eingeplant. Vorschläge für den nächsten Mesozyklus, die unterversorgte Bereiche vorziehen, sind ein späterer Schritt.

## [0.96.0] – 2026-11-07

### Neu
- Residual-Uhren im Plan: Jeder Bereich bekommt eine Uhr, die zählt, wie viele Tage seit seinem letzten wirksamen Reiz vergangen sind — abgeleitet aus den erledigten Einheiten, ohne neue Eingaben. Die Budgets sind die Haltefenster: Sprungkraft & Schnelligkeit 7 Tage, Kraftausdauer und Anaerob 14, Ausdauer, Beweglichkeit und Sehnen 21, Kraft & Masse 30. Über dem Jahresstapel steht eine Warnung, wenn Uhren über Budget sind.
- Halten ist nicht Besserwerden: Die Budgets garantieren nur, dass ein Bereich nicht verfällt. Besser wird ein Bereich durch Akzente — Orden mit dem Ziel, Mesozyklus-Teile, Schwerpunkte —, gemessen in der Testwoche. Rote Uhren sperren nichts und planen nichts: Sie sind die Lenkhilfe für die nächste Wahl.
- Zuordnung ohne neue Eingaben: Bestien zählen für Kraftausdauer und Anaerob (ihre Sprint- und Sprunganteile für Sprungkraft), Kontrast-Explosivteile für Sprungkraft, Kraft-Sätze für Kraft (Masse läuft mit), Halteübungen für Sehnen & Bindegewebe, Lauf- und Ruderblöcke für Ausdauer, Intervalle für Anaerob, Schwerpunkt-Module für die Uhr ihres Bereichs, Flows für Beweglichkeit. Warm-up und Cool-down zählen nicht, die freie Jagd zählt wie jede Bestie.
- Einsteiger sehen die Uhren nicht — wie die Jahresbalance sind sie ein Werkzeug für Fortgeschrittene.

## [0.95.0] – 2026-11-07

### Geändert
- Mesozyklen als Formen: „+ Mesozyklus anhängen“ legt nicht mehr starr zwei Hälften à sechs Wochen an, sondern bietet zwei Teile (4+4, 5+5, 6+4, 4+6, 6+5, 6+6) oder drei Teile (5+5+5) zur Wahl — der Mesozyklus passt so in die Lücke des Jahres, etwa 5+5+5 plus Testwoche in ein 16-Wochen-Fenster. Die Testwoche steht hinter dem letzten Teil. Bestehende 6+6-Mesozyklen aus 0.94 bleiben unverändert.
- Die Teile bilden eine Kette: Jeder Teil folgt aus den Successors des vorherigen, die Blockfolge und die Ordenswahl im Plan binden Teil für Teil. Die Auswertung der Testwoche schlägt die Schwerpunkte für alle Teile gleichzeitig vor („Für den Mesozyklus übernehmen“). Wer eine Phase teilt oder zwei verbindet, löst den Mesozyklus weiterhin komplett auf.
- Monk bleibt ein ganzer Block: Zwölf feste Wochen Wohlbefinden lassen sich nicht als Akzent verkürzen, die Vorschläge lassen Monk aus den Mesozyklus-Teilen heraus. Ordensreihen mit Spiel (etwa Slayer, 10–15) bleiben bewusste Akzente. Manuell wählbar bleibt alles.
- Warnhinweis am letzten Mesozyklus-Teil: Sprungkraft und Schnelligkeit klingen ohne Reiz in wenigen Wochen ab — im letzten Teil vor der Testwoche messen sie sich nicht mehr im Vollbesitz. Die App warnt, sperrt aber nicht.
- Slayer → Smith ist neu eine empfohlene Nachfolge: Masse oben, dann Kraft an der Langhantel.

## [0.94.0] – 2026-11-06

### Neu
- Mesozyklen: „+ Mesozyklus anhängen“ legt zwei kurze Phasen von je sechs Wochen an, die zusammengehören, plus eine Testwoche am Ende (12+1). Kein Messen dazwischen — die Testwoche ist die Klammer, die den Mesozyklus abschließt. Wer die Übungen schon sitzt hat, profitiert ab Woche 1; die sechs Wochen sind dann ein bewusster Akzent, kein Verstoß gegen die Ordenslänge (die App straft sie im Paar nicht ab, alleinstehend bleibt die Empfehlung bestehen).
- Die zweite Hälfte folgt aus den Successors der ersten — Orden, die gut aufeinander folgen, mit naheliegenden oder überlappenden Zielen. Die Wahl ist im Plan auf diese Nachfolger beschränkt, und die Blockfolge plant Mesozyklen paareweise. Slayer → Olympian ist neu eine empfohlene Nachfolge: Masse oben, dann Sprungkraft und Schnelligkeit.
- Die Auswertung der Testwoche schlägt die Schwerpunkte für beide Hälften gleichzeitig vor („Für die nächsten 12 Wochen übernehmen“) und schreibt sie in beide Blöcke — die zweite Hälfte rechnet mit denselben Testwerten. Einzelne Phasen bleiben erlaubt und funktionieren alleinstehend; wer eine Phase teilt oder zwei verbindet, löst das Paar auf.

## [0.93.0] – 2026-11-06

### Geändert
- Jede Phase hat jetzt zwei Schwerpunkte statt eines. Schwerpunkt 1 heilt die Schwachstelle aus der letzten Testwoche (bisher: der Schwerpunkt-Slot), Schwerpunkt 2 vertieft das Sekundärziel des Ordens — beim Allrounder stattdessen das zweite Defizit aus der Testwoche, wenn es eines zeigt. Beide zusammen dürfen höchstens ein Viertel der geschätzten Wochenzeit; bei Überschreitung kürzt zuerst Schwerpunkt 2 seine Tagesverteilung. Nie zwei Slots am selben Tag, nie zwei auf derselben Achse der Jahresbalance: Ein Bereich, der jeden Trainingstag braucht (Beweglichkeit), lässt dem zweiten keinen Raum — das zweite Defizit läuft dann über die Blockfolge.
- Spezialisten heilen jetzt mit. Bisher bekamen sie gar keinen Slot („die volle Zeit dem Orden"), jetzt nehmen sie am Schwachstellen-Slot genauso teil; die Allrounder/Spezialist-Wahl steuert nur noch Schwerpunkt 2 — beim Spezialisten bleibt er fest auf der Vertiefung des Ordensziels.
- Die Auswertung der Testwoche zeigt beide Schwerpunkte der nächsten Phase mit Begründung und hat einen Knopf „Für die nächste Phase übernehmen", der die Vorschläge als feste Wahl in den nächsten Block schreibt. Defizite stehen jetzt auch für Spezialisten da.

## [0.92.0] – 2026-11-06

### Geändert
- Lückenregel gedeckelt: Leichte Übungen mit großen Gewichtssprüngen — Face Pulls, Laterale Raises — liefen bisher bis zu 20 Wiederholungen hoch, bevor das nächste Gewicht kam, und landeten danach wieder bei zehn. Zwanzig Wiederholungen sind Kraftausdauerarbeit außerhalb des wirksamen Bereichs; die Aufwärtsphase endet jetzt bei 15. Die Landung nach dem Sprung bleibt der Epley-Schätzung überlassen und liegt weiter um zehn.

### Entfernt
- Initiate zieht ein: Der ehrliche Wiedereinstieg war ein Orden ohne eigene Domäne — Allgemeinvorbereitung, Erhalt und sanfter Einstieg tragen Troubadour und Harlequin bereits, und als Neuorientierung nach einer langen Phase und der Testwoche taugt jeder andere Orden. Laufende Initiate-Phasen laufen mit ihrem eingefrorenen Inhalt zu Ende und wandern danach auf Troubadour.

## [0.91.0] – 2026-11-06

### Behoben
- Kurztag kürzt gleichmäßig: Bisher wurden die leichten Übungen zuerst auf einen Satz plattgedrückt, bevor die schweren Grundübungen dran waren. Jetzt rotiert die Kürzung über alle Übungen des Tages, auch ein Satz einer schweren Kernübung darf fallen. Supersets und Kontrastpaare werden nur noch im Ganzen gekürzt: Beide Teile behalten immer dieselbe Satzanzahl, ungleiche Stände werden vorher angeglichen — ein Superset mit einem Satz im ersten und zwei im zweiten Teil ist kein durchführbares Superset.

### Entfernt
- Zwei Orden ziehen ein: Soldier (Entlasten, testen, Schwachstellen trainieren) und Gladiator (Physis mit Weste und Konditionsintervallen). Soldier spielte eine Rolle, die die ganze App spielt — Schwachstellen ausgleichen ist die Aufgabe der Testwoche mit dem Schwerpunkt-Slot, nicht eines eigenen Ordens; sechs bis acht Wochen Allgemeinvorbereitung tragen zudem nichts, was nicht Troubadour und Harlequin schon tragen. Gladiator wiederholte Slayers Aufbau mit anderem Namen und anderen Geräten. Laufende Phasen laufen mit ihrem eingefrorenen Inhalt zu Ende (Soldier → Troubadour, Gladiator → Slayer).
- Mit Soldier entfällt der Blocktyp „menu“ (Schwerpunkt-Wahl am Tag) aus App, Datenprüfung und Erzähler.

### Geändert
- Slayer trägt Gladiators Erbe: zehn bis fünfzehn Wochen, und läuft eine Körpergewichts-Übung aus (etwa 20+ saubere Liegestütze in der Tiefe), wechselt sie zur Gewichtsweste und progressiert mit ihr weiter — Weste, Gürtel oder Rucksack mit Scheiben, je nachdem, was das Profil hergibt.
- Nachfolger neu verteilt: Assassin → Slayer, Troubadour; Knight → Paladin, Smith, Troubadour, Slayer; Olympian → Smith, Huntsman, Troubadour; Smith → Knight, Olympian, Troubadour; Slayer → Conqueror, Troubadour.

## [0.90.0] – 2026-11-03

### Neu
- Zwei neue Orden: Paladin („Aegis") und Dancer („Tänzerin"). Ein Orden zieht erst ein, wenn eine Testwoche zeigt, dass er eine Schwachstelle schließt — beide stehen damit zur Auswahl.
- Paladin: Belastbarkeit für Knie, Hüfte, Schulter und Nacken neben Schwert und Schreibtisch. Montag Knie und Hüfte (ATG Split Squat, Sissy Squat, Nordic Negative, Tibialis, Copenhagen, Rückwärtsgehen), Dienstag Schulter und Ellbogen (DB Pullover, Deficit Push-Up, Face Pull, Außenrotation, Unterarme, Dead Hang), Donnerstag Schwert und Sehnen (Einzelmesser, dazu Wall Sit, Spanish Squat, Halt in der Dehnung, KB Halo — mit Bestie), Freitag Rücken (KB Rumpfbeuge & Aufrichten, Jefferson-Curl-Leiter, Suitcase Side Bend, Suitcase Carry, KB Windmill, Plage).
- Dancer: Belastbare Endpositionen für die Schwertformen. Montag Hüfte (KB Cossack Squat, Pancake mit Last, Jefferson-Curl-Leiter, Hüftbeuger-Halt, Spagat-Übergang), Dienstag Schulter und Brustwirbelsäule (DB Pullover, Deficit Push-Up, Brücken-Leiter, German Hang, KB Windmill, KB Halo), Donnerstag Stab und Flow (Stab-Lernweg, Mobility-Nachlauf, Bestie — ohne Stock ein Tai-Chi-Flow), Freitag Beine in der Dehnung (ATG, Sissy, Bodyweight Leg Extension, Nordic Negative, Plage).
- KB Windmill in beiden Orden (3×6/Seite): Der Rumpf trägt die Last schräg über dem Kopf — dasselbe Muster, das die Schwertform stabil hält, wenn die Klinge oben kreist.
- Zwei Verlaufstests im Durendal-Cup: Dead Hang und Wall Sit, je zwei Versuche, der bessere zählt. Sekunden statt Selbst-Rating — die Bestie wird messbar, ob der Griff oder die Hüfte zuerst aufgibt.
- Neue Erzählszenen: der Paladin kämpft auf der Wehr (Mauerbrecher, Meisterin der Sturmleitern, Rostkönig), die Tänzerin im Tanzsaal des abgebrannten Opernhauses (Choreografin, Spiegelmann, Taktgeberin).

### Geändert
- Nachfolger-Netz: Paladin schließt nach Knight und Monk, Dancer nach Initiate, Alchemist und Acrobat.
- 15 neue Übungen (u. a. KB Windmill, Spanish Squat, KB Rumpfbeuge & Aufrichten, Suitcase Side Bend, German Hang, Pancake mit Last) und drei Muskel-Zuordnungen in `muscles.json`.

## [0.89.0] – 2026-11-03

### Neu
- Drei Waffenstile: Das Schwert-Modul bekommt Gesellschaft. Das Langschwert ist ein eigener Lernweg ab null (nicht abgekürzt aus dem Messer): Grundhiebe je Führungsseite (rechts vor, links vor), dann die Meisterhiebe Krumphau und Schielhau, der Zorn-Ort — der Hieb, der in den Langort-Stich übergeht — und als Formstufe der Lange Tanz. Slayer und Conqueror fechten künftig Langschwert.
- Stab-Modul: Haltung & Atem, Hiebe in Zeitlupe (an den Langschwertformen orientiert, mit dem Atem getaktet), Zeptertanz. Der Alchemist übt auf dem Stabtanz-Tag den Lernweg — die geführte Stabmeditation bleibt im Atem-Tag —, der King trägt die Zeptermeditation im Redner-Tag als Stab-Lernweg. Ohne Stock greift der Ersatz: beim Alchemist ein Tai-Chi-Flow, beim King das offene Gewahrsein.
- Klinge & Faust: Neue Messer-Stufe nach den Kombiformen, vor dem Drehhau. Der Block (Oberblock), der steigende Wechselhau (Handfläche oben, Klinge am Körper entlang — der historische Wechselhau, hier früher einsortiert) und seine Kombination (Steigen → Kopfwechsel → Zornhau) kommen aus der freien Form zurück in den Kanon; dazu die Off-Hand: Kreuzblock, Doppelstoß, Hieb mit Fauststoß — nach Lecküchner, wo die linke Hand das Ringen vorbereitet. Der Drehhau liegt jetzt hinter dem Klinge-&-Faust-Gate.
- Stich-Check objektiviert: Der Stiche-Skill wird über eine zählbare Ringstich-Serie geprüft — 15 gültige am Stück, der erste ungültige beendet den Versuch, zwei Versuche, der bessere zählt — statt über ein Selbst-Rating. Eine Serie ist ein Messinstrument; „fühlt sich sauber an" ist keins.

### Geändert
- Die Lernweg-Logik (Stufen, Echos, freies Üben, Zeitschätzung, Kurztag) gilt einheitlich für alle drei Waffen; die Ordens-Anzeigen nennen Messer, Langschwert und Stab beim Namen.

## [0.88.0] – 2026-11-03

### Entfernt
- Der Herzrate-Pilot (Web Bluetooth) ist wieder draußen. Der Test hat sein Ergebnis geliefert: Die Gear Sport bewirbt den Standard-Heart-Rate-Service nicht, Chrome zeigt sie im Auswahldialog gar nicht erst — der Pilot ist damit gegen eine Samsung-Uhr blind, und eine Erweiterung hätte nur bestätigt, was das proprietarye Ökosystem ohnehin verschließt. Die Satz-Zeitstempel (doneAt) bleiben: Sie machen das Log exakter und sind die Grundlage, falls die Herzrate später über eine Quelle mit offenem Standard (etwa eine Brustgurt) an Bord kommt.

## [0.87.0] – 2026-11-03

### Neu
- Satz-Zeitstempel: Jedes Abhaken eines Satzes schreibt die Uhrzeit mit. Erst das macht die Sätze später Herzraten zuordenbar (Welcher Wert gehörte zur Beinpresse? Wie fiel die Herzrate in der Pause danach?) — und macht das Log auch ohne Herzrate exakter. Abwählen nimmt den Stempel wieder weg; Zeitblöcke bekommen ihn genauso.
- Pilot unter Setup › Herzrate: Verbindungstest über Web Bluetooth. Die App sucht ein Gerät mit dem Bluetooth-Standard-Heart-Rate-Service und zeigt live Herzrate, Paketanzahl, Min/Max und den Empfangszeitpunkt des letzten Pakets. Nur ein Test — gespeichert wird nichts. Zeigt, ob die Uhr mitspielt (dafür vorher vom Telefon trennen); eine Brustgurte sendet garantiert über diesen Service.

## [0.86.0] – 2026-11-03

### Neu
- Vorschau bis zur Testwoche: Der Wochen-Pfeil auf „Heute" führt in der letzten Ordenswoche einen Klick weiter — direkt in die Testwoche, die danach folgt. Dort stehen die Cups mit Warm-ups, Testprotokollen und Turnier-Einleitung zum Ansehen: ob das Update sitzt, welche Tests kommen, gegen welche Bestie das Finale läuft. Eine Vorschau: Werte eintragen kann man erst, sobald die Woche läuft. Gilt genauso für Testwochen, die im Orden liegen (statt der bisherigen reinen Cup-Liste).

## [0.85.0] – 2026-11-03

### Geändert
- Der Stichtest misst die Serie, nicht die Stoppuhr: „Stichtest: Serie bis zum ersten Fehler" — gültige Stiche durch die Ringöffnung in Folge, der erste ungültige (Ring berührt oder in Bewegung) beendet die Serie. Eine feste Anzahl hätte eine Decke: Wer 20 schafft, schafft sie wieder — ohne messbaren Progress. Die offene Serie hat keine (19 → 38 ist eine echte Steigerung). Zwei Versuche, der bessere zählt. Neue Kennung (t-stichserie, Wiederholungen statt Zeit).
- Die Crunches sind zurück im 40-BPM-Takt — mit den DOSB-Normbändern aus dem erweiterten Leistungskatalog Kraft (32/43/57 Männer, 27/37/48 Frauen, jeweils 35–39). Das freie Tempo von 0.84.0 hätte die Normmessung entwertet; der Takt ist das Protokoll.

### Neu
- Normen für den Hochsprung: Hochsprung ist eine offizielle Disziplin des Deutschen Sportabzeichens (Kategorie Koordination, Erwachsene). Bronze/Silber/Gold für 35–39: 1,25/1,35/1,45 m (Männer), 0,95/1,05/1,15 m (Frauen). Der Test zählt damit nicht mehr nur über den Verlauf.

## [0.84.0] – 2026-11-03

### Geändert
- Die Testwoche läuft an drei Tagen statt fünf: Studio, Zuhause, Park. Der Parktag vereint Excalibur und Joyeuse (der Cooper-Lauf läuft direkt hinterher), der Zuhausetag Durendal und Arondight, der Studiotag bleibt Balmung. Fünf Cups, drei Tage — die Cups bleiben domänengebunden, zwei am selben Tag laufen einfach im Anschluss.
- Sprint 10 m ist gestrichen: Der 5-10-5 streift die Beschleunigungsqualität bereits, der 30-m-Sprint bleibt als einziger Zeuge der Maximalgeschwindigkeit. Neu im Park: Hochsprung (beste übersprungene Lattenhöhe, 5-cm-Schritte, drei Fehlversuche beenden) — zählt über den Verlauf, Normen gibt es dafür keine.
- Der Skill-Test misst jetzt Präzision statt Dauerleistung: „Stichtest: 20 gültige Treffer" — die Zeit für 20 Stiche durch die Ringöffnung, Ring unberührt, ungültige zählen nicht, zwei Versuche, der bessere zählt. Neue Kennung (t-skill20, Zeitmessung); die alten Skill-Wiederholungen bleiben unangetastet in den Altdaten.
- Eine Bestie statt zwei: „Kraftausdauer" und „Belastbarkeit" waren dieselbe Messung — Zeit auf einem Bodyweight-Metcon. Das Arondight-Finale wählt jetzt aus allen sechs Zeit-Bestien die mit Bestzeiten-Historie (eine, die man kennt, damit Verbesserung erfassbar ist); der Joyeuse-Benchmark entfällt.
- Crunches ohne 40-BPM-Takt: so viele saubere Wiederholungen wie möglich, das Tempo ergibt sich. Die DOSB-Normbänder gelten für das Takt-Protokoll und sind deshalb raus — Crunches zählen jetzt nur noch über den Verlauf.
- Rudern und Burpees im Balmung-Cup getauscht: Die 500 m folgen direkt auf die 5RM-Reihe, die Burpees stehen ganz am Ende, wenn alles andere im Kasten ist.

### Neu
- Empfehlung der 5RM-Variante aus dem letzten Orden: Die App sagt je Test, welche Variante im vorangegangenen Orden trainiert wurde — dieselbe Variante testen, sonst ist der Wert nicht vergleichbar. Wurde keine der Übungen trainiert, empfiehlt sie die geführte Variante mit Sicherheitshinweis: Nach Wochen ohne die Übung ist ein 5RM an der freien Variante riskant. Den Klimmzug mit Gewicht zählt sie nur, wenn Zusatzgewicht eingetragen war. Eine Empfehlung, keine Sperre.

## [0.83.0] – 2026-11-03

### Geändert
- Die Testwoche misst sauberer getrennt: Der Uhr-VO2max-Test ist raus — er duplizierte den Cooper-Test als Konstrukt, und die Auswertung ließ ihn doppelt von drei Stimmen in die Domäne Ausdauer zählen. Der Cooper-Test bleibt die eine aktive VO2max-Referenz, der Ruhepuls den Alltagskontext. Damit wiegt die Ausdauer gleich, ohne dass dieselbe Messung zweimal zählt.
- Das Körpergewicht ist in den Balmung-Cup gezogen, direkt vor die 5RM-Reihe — dorthin, wo es gebraucht wird: Die Maximalkraft-Norm rechnet relativ zum Körpergewicht. Der Durendal-Cup misst dafür jetzt nur noch Beweglichkeit, Kraftausdauer und Koordination. Der Hinweis „Körpergewicht fehlt“ nennt jetzt den richtigen Cup.

## [0.82.0] – 2026-11-02

### Geändert
- Die Testwoche läuft auf vier statt fünf Tagen: Der Arondight-Cup ist aufgelöst, seine zwei Tests sind dorthin gezogen, wo das Material steht. Das Körpergewicht (morgens nüchtern, gleiche Waage) ist an den Durendal-Cup gewandert, ebenso der Skill-Test (2 Min Kombiformen) und die Kraftausdauer-Bestie als Finale — Durendal misst jetzt Beweglichkeit, Kraftausdauer und Koordination. Die 500 m Ruderung schließen den Balmung-Cup im Studio ab (all-out nach der Maximalkraft-Reihe); zuhause war sie ohne Rudergerät nicht durchführbar. Joyeuse ist auf „Park“ festgezogen. Vier Cups, vier Tage: Park, Zuhause, Studio, Park — Outdoor und Studio werden nicht gemischt. Gespeicherte Werte bleiben vergleichbar: Die Tests behalten ihre Kennungen, sie ziehen nur um.

## [0.81.0] – 2026-10-29

### Neu
- „Kombiformen: freie Bahn“ (3 Minuten zügige Kombis am Stück) gibt der Kombiformen-Stufe ihr Dauerelement — bisher war die Stichbahn das einzige Conditioning im Lernweg.

### Geändert
- Die Ringstiche laufen ab der Kombiformen-Stufe als verdichtete Basics im Einnorden mit (je 6 Wiederholungen, Ring unberührt): Die volle Fassung zeigt sich nur auf der Stich-Stufe selbst — wer den Stich-Skill abgehakt hat, verlor die Ringstiche bisher ganz aus dem Blick.

## [0.80.0] – 2026-10-28

### Neu
- Zwei Stich-Übungen an Turnringen in der Stiche-Stufe: „Ringstich: Hoch und Tief“ (Ringe hoch auf der Oberstich- und niedrig auf der Unterstich-Linie) und „Ringstich: Tief und Mittel“ (niedrig und mittig). Die Spitze läuft auf gerader Linie durch die Ringöffnung, der Ring bleibt unberührt — berührt, pendelt er sichtbar; dann erst der nächste Stich, wenn er still hängt. Im Wechsel zwischen den Ringen, Rückzug auf derselben Linie; später freie Kombis statt strengem Wechsel.

## [0.79.1] – 2026-10-28

### Behoben
- Das Auto-Einklappen von Warm-up und Cool-down hat nie gegriffen: „Fertig“ wurde auch bei einem leeren oder kürzeren Häkchen-Array gemeldet, der Zustandswechsel zum Einklappen trat beim Abhaken der letzten Übung daher nicht ein. Jetzt zählt die Länge mit — ist alles abgehakt, klappt die Karte nach kurzer Zeit ein wie eine Übungskarte.

### Neu
- Schwert-, Flow- und Schwerpunkt-Blöcke sind jetzt aufklappbare Karten wie das Warm-up (mit Übungsanzahl) und fallen nach dem Abhaken der letzten Übung ebenfalls ein.

## [0.79.0] – 2026-10-28

### Neu
- „Springseil“ ist ein eigener Equipment-Schalter am Trainingsort (Setup › Equipment, Vorgabe: ja; das Preset „Unterwegs: nur Bänder“ startet ohne). Seilspringen ist damit nicht mehr der bedingungslose Ersatz: Kann der Ort eine Cardio-Lücke der Bestie durch kein Gerät füllen, passt die Bestie an diesem Ort nicht — aus dem Bestiarium genommen wird sie dafür nicht, sie läuft nur an anderen Orten.

### Geändert
- „Kurz“ kürzt das Schwerttraining über die Sätze, nicht über die Übungen: Jeder Hieb und jede Kombi bleibt drin, jede Schwertübung läuft mit einem Satz weniger (mindestens einem). Der Ersatz-Flow ohne Schwert läuft weiterhin in der Kurzfassung (erste Hälfte der Übungen).

## [0.78.0] – 2026-10-28

### Neu
- Bestien passen sich ans Equipment des Trainingsorts an: Gibt der Ort nicht her, was ein Cardio-Element der Bestie braucht — keine Strecke für Sprints (Laufband), kein Rudergerät im Park, kein Rad —, wird nur dieses Element nach Belastungszeit umgerechnet und ersetzt (400 m Laufen ≈ 500 m Rudern ≈ 1000 m Rad ≈ 2 Min Seilspringen; Row-Kalorien ≈ 4,5 s je Kalorie), der Rest der Bestie bleibt. Sie zählt als „mutiert“ und teilt sich mit allen mutierten Fassungen eine Bestzeit; das entfesselte Original behält seine eigene. Der Bestienpool selbst ändert sich nicht.
- Zwei neue Equipment-Schalter: „Laufen möglich“ und „Sprints möglich“ (Setup › Equipment, je Ort). Vorgabe: Laufen ja, Sprints nein — im Park oder Stadion also selbst „Sprints möglich“ ankreuzen. Fehlen Rudergerät und Rad, wird auf die Laufstrecke umgerechnet, fehlt die auch, bleibt Seilspringen. Rudergerät und Rad schließen eine Bestie nicht mehr aus, sondern lösen die Ersetzung aus.

### Geändert
- „Kurz“ ersetzt „Leicht“ und gilt an jedem Tag: die vier Kernübungen, Bestie eine Klasse kürzer, Schwerttraining in der Kurzfassung, Ziel 35 Minuten — wird die Einheit damit länger, gehen die Sätze runter (mindestens einer, Kernübungen zuletzt). Grundlagen- und Ausdauertage ohne Kraftübungen behalten ihren Inhalt und laufen kürzer, Richtung 35 Minuten. Kein Deload, sondern Zeit und Tagesform; eine kurze Einheit ist ein echter Erfolg. Das eingesparte Volumen wird wie bisher in den übrigen Tagen der Woche verankert, wenn das Ziel des Ordens es braucht — am letzten Tag der Woche entfällt der Ausgleich, und kein Ausgleichstag wächst mehr als 15 Minuten über seine normale Dauer: Drei kurze Tage machen also keinen langen vierten.
- Der Schalter „Leicht“ (−1 Satz je Übung, Bestien nur als Plage) ist entfallen. Entlastungswochen, Testwochen und Rückkehr nach Pause laufen unverändert mit −1 Satz.

### Entfernt
- „Cardio erfassen“ (0.77.0) ist zurückgebaut: Erfassung außerhalb der Einheiten, Entlastung des Beintags, Läufe-Sektion im Log und der zugehörige Hilfe-Abschnitt entfallen wieder. Läufe außerhalb der Einheiten laufen unverändert über die Laufblöcke der Orden.

## [0.77.0] – 2026-10-28

### Neu
- Cardio erfassen: Läufe und anderes Cardio außerhalb der Einheiten unter ⚙ Anpassen eintragen — heute oder gestern, Minuten und Pace-Empfindung (locker, zügig, hart). Ein hart gewerteter Lauf („Hart“ oder ab 60 Minuten) entlastet den Beintag am selben und am Folgetag: Waden und Beinbeuger einen Satz weniger, Oberschenkel erst ab vier Sätzen, Gesäß bleibt unangetastet. Die frei werdende Zeit füllt eine leichte Bestie (Plage) oder, am Tag ohne Bestie, ein Mobility-Flow; der Grund steht in den Details der betroffenen Übung. Nicht zusätzlich zu Wochen, die ohnehin leichter laufen (−1 Satz, Entlastungswoche, Testwochen), nicht auf Intensiv-Tage und nicht auf erledigte Einheiten. Alle Einträge stehen im Log unter „Läufe“ und im Text-Export.

## [0.76.0] – 2026-10-27

### Geändert
- Schwert-Lernweg: Höhere Stufen schließen die tieferen ein. Die Hiebe laufen als kurze Basics schon immer mit — jetzt folgen die Stiche derselben Logik: Ab der Kombiformen-Stufe stehen Ober-, Mittel- und Unterstich als kurzes Einnorden je 6 pro Seite mit im Block (ein Satz, mit Ausfallschritt und betonter Rückziehung). Wer eine Stufe erreicht hat, übt sie nicht ab, sondern hält sie warm. Der Donnerstagsblock wird dadurch auf höheren Stufen etwa zwei Minuten länger.

## [0.75.0] – 2026-10-26

### Geändert
- Der Orden „Witcher“ heißt jetzt „Slayer“ — der Name passt zum Muster der Ordensnamen. Alles bleibt, wie es war: dieselben Rollen und Tage, dieselben Übungen, die Weibselform „Amazon“, alle Slot-Ids und damit Gewichte, Stufen und Bestzeiten.
- Läuft gerade eine Slayer-Phase, wandert sie mit um; alte Einheiten im Log bleiben anzeigbar. Warm-up-Anpassungen des Ordens bleiben ebenfalls erhalten.

## [0.74.0] – 2026-10-26

### Neu
- Schwert-Lernweg: neue Stufe 2 „Stiche“, zwischen den Hieben und den Kombiformen. Ober-, Mittel- und Unterstich je 12 pro Seite mit Ausfallschritt, dazu der Stichwechsel als Kette und fünf Minuten gerade Bahn in deinem Tempo. Der Test: gerade Linie, stabile Spitze, jeder Stich betont zurückgezogen.

### Geändert
- Die Kombiformen rücken auf Stufe 3 und brauchen jetzt den Stiche-Test. Wer schon bei ihnen oder weiter vorne war, hakt den Stiche-Test unter Setup › Können ab — dann läuft der Weg wie gewohnt weiter.

## [0.73.0] – 2026-10-26

### Neu
- Karten klappen jetzt von selbst ein, sobald alles erledigt ist — wie bei den Übungen schon immer: auch Warm-up, Cool-down und Bestien ziehen sich nach kurzer Zeit zusammen und lassen den Blick frei für das, was noch offen ist. Antippen öffnet wieder.

### Geändert
- „OK“ steigert jetzt schon: Wer die letzte Runde mit einer Wiederholung Reserve geschafft hat, bekommt beim nächsten Mal automatisch die nächste Stufe (bei Hanteln mit großem Sprung erst +1 Wiederholung). „Schwer“ hält das Gewicht. Die frühere „Dreimal OK“-Nachfrage fällt damit weg — dreimal dasselbe Feedback gibt keine neuen Informationen mehr.
- „OK“ heißt in der Hilfe jetzt klar: letzte Runde mit einer Wiederholung Reserve geschafft.

## [0.72.1] – 2026-10-22

### Neu
- Neue Übung: Sandbag Push Press — Sandsack vor der Brust, Beinschub hilft über Kopf. Skaliert mit jedem Sack, ohne Kopf-Risiko.

### Geändert
- Pazuzu: Sandbag Halo ersetzt durch 12 Sandbag Push Press — der Sack wächst mit dem Gewicht, Halos um den Kopf sind unter Zeitdruck nichts für Sandsäcke. Ground-to-Shoulder von 9 auf 10, alternierend links/rechts.
- Div: Ground-to-Shoulder von 9 auf 10 (alternierend, gerade Zahl je Runde).
- Kusarikku: Halo ersetzt durch KB Swing. Halos sind eine Übung für Kontrolle, nicht für Speed — sie gehören nicht in Bestien.
- Neue Kuratierregeln der Datenprüfung: Bestien enthalten keine Halos, Ground-to-Shoulder nur in gerader Zahl je Runde (beide Fassungen einer Bestie, work und parts). Übungsbeschreibungen für Halos und Ground-to-Shoulder entsprechend geschärft.
- Muskel-Zuordnung im Wochenüberblick: Sandbag Push Press zählt für Schultern und Nacken, Sandbag Ground-to-Shoulder für Gesäß, Beine und Schultern.

## [0.72.0] – 2026-10-22

### Neu
- Wochenüberblick: Eine schmale Linie je Muskel zeigt, wo in etwa der Erhaltungsbereich von Kraft und Masse liegt — etwa die Hälfte des unteren Richtwerts (z. B. 5 Sätze bei Fortgeschrittenen). Das helle Feld bleibt der Wachstumsbereich; zwischen Linie und Feld reicht es zum Halten, darunter wird es meist knapp.

## [0.71.1] – 2026-10-21

### Geändert
- Lizenz: Order steht ab dieser Version unter der GNU Affero General Public License 3.0 (AGPL-3.0). Wer die App weitergibt oder als Dienst anbietet, muss den Quelltext offenlegen. Für alle Versionen bis einschließlich 0.71.0 gilt weiterhin MIT.

## [0.71.0] – 2026-10-20

### Neu
- Entlastungswoche: Die App empfiehlt nach Rhythmus (ab der fünften Woche alle vier Wochen, in Phasen ab acht Wochen) oder reaktiv (dreimal „zu schwer“ innerhalb von zwei Wochen) eine Woche mit halben Sätzen — Bestien und Finisher ruhen, Gewichte, Übungen und Trainingstage bleiben. Angenommen oder abgelehnt wird in der Einblendung auf der Startseite, widerrufbar über „Weiter normal trainieren“; ein „Nein“ gilt nur für die eine Woche. Nie empfohlen in oder direkt vor einer Testwoche, nie dicht nach der letzten Entlastung.
- Der Aschekurier druckt eine eigene Zeile für die Entlastungswoche („Die Pressen laufen langsamer“).
- Hilfe: neuer Abschnitt zur Entlastungswoche mit der Forschungslage (Coleman et al., 2024; Pancar et al., 2026; Travis et al., 2022), Literaturliste entsprechend erweitert.

### Behoben
- Wochen-Vorsprung: Wer die laufende Woche komplett abschließt und danach auch die Folgewoche (etwa beim schnellen Durchklicken oder Nachtragen), blieb in der Folgewoche hängen — die Ansicht sprang nur eine Woche vor. Jetzt springt sie über jede voll erledigte Woche hinweg bis zur ersten offenen (auch über eine Phasengrenze, vor der Testwoche hält sie an).

## [0.70.0] – 2026-10-20

### Geändert
- Der Aschekurier hat eine Stimme: Alle Erzähltabellen sind in dunkel-epischer Tonalität neu geschrieben (näher an Mystik als an Stenogramm), mit längeren Perioden und selteneren Versalschlagzeilen. Die warmen Randnotizen (aside) bleiben unverändert.
- Feuilleton: Jede Wochenmitteilung bekommt eine sinnliche zweite Zeile aus der Stadt — Nebel, Uhrmacher, Tauben, Kanäle.
- Leitmotiv ({motiv}): Jeder Orden zieht einmal ein wiederkehrendes Motiv der Stadt, das im Feuilleton und im Finale zurückkehrt.
- Tell des Widersachers ({tell}): Jeder Orden zeichnet einmal ein Erkennungsmerkmal des Widersachers, das in Steckbrief, Rückschlag und Stand verwoben wird.
- Akkord-Kurve: Wochen-, Feuilleton- und Lagentexte liegen ab Akt 2 in eigenen Varianten vor (week_full_2, lage_3 …), der Orden verdichtet sich zum Finale hin. Ohne Variante fällt die Ausgabe auf die Basistabelle zurück; eigene Welten funktionieren unverändert weiter.

## [0.69.0] – 2026-10-20

### Geändert
- Wurf des Widersachers: Der W20 gehört jetzt dem Widersacher. Du würfelst physisch und trägst die Zahl im Wochenblatt ein. 1–7 ist ein rein erzählerischer Patzer, 8–14 läuft nur ins Protokoll, 15–19 (Rückschlag) und 20 (dunkle Stunde) beantwortet die Woche mit einer bzw. zwei zusätzlichen Einheiten-Treffern in der Folgewoche. Schaden entsteht nie direkt aus dem Würfel, und die Spielebene vergibt keine trainingsrelevanten Vorteile.
- Galerie der Widersacher: Über dem Archiv der Chronik zeigt eine dauerhafte, aus dem Log abgeleitete Galerie jeden entkommenen und besiegten Widersacher mit Ausgang.
- Entkommene Widersacher kehren im nächsten Orden derselben Szene zurück (Rache-Kapitel mit eigenem Prolog).
- Neue Erzähltabellen für Patzer, Rückschlag, dunkle Stunde, Erwiderungen und Rückkehr; alte Kritisch-/Hohe-Treffer-Tabellen entfallen.

## [0.68.0] – 2026-10-20

### Neu
- Fünf Sandsack-Bestien im Morgenland: **Pazuzu**, **Edimmu**, **Rabisu**, **Div** und **Ghaddar**, alle mit festem Timecap und Startgewicht 20 kg. Sandsack im Equipment-Profil eintragen, dann kommen sie in die Bestienwahl; Steigerungen laufen in 5-kg-Schritten.
- Neue Übungen: Sandbag Deadlift, Sandbag Romanian Deadlift, Sandbag Bent-Over Row, Sandbag Ground-to-Shoulder, Sandbag Halo, alle mit Beschreibung.
- Die Datenprüfung wacht jetzt mit über die Kuratierregel für Sandsack-Bestien: nur Sandsack-Übungen, ein tragbares Gerät pro Bestie.

## [0.67.0] – 2026-10-19

### Geändert
- Ordensvorschau aufgeräumt: oben Leitsatz und Eckdaten, darunter je Tag nur Name, Minuten und die Übungen ohne Dosis. Antippen zeigt Sätze und Wiederholungen, „Mehr zum Orden“ die Beschreibung, Ernährung, Passung und Quellen.
- Magier heißt Magician (Enchantress).

## [0.66.0] – 2026-10-19

### Geändert
- Magier und King halten jetzt auch die Kraft im Druck-Zug-Beine-Muster: Superset aus DB Pullover und Deficit Push-Ups (Brust und Haltung), ATG Split Squat (Kraft, Beweglichkeit und Knie-Prehab, erst eine Seite komplett), dazu Face Pull. King: Turkish Get-Up an Chaos A.
- Rückwärtsgehen am Ende der Grundlage (Magier) und am Redner-Tag (King), 5 Min.
- Neue Übungen: DB Pullover, ATG Split Squat, Rückwärtsgehen.

## [0.65.0] – 2026-10-19

### Geändert
- Alchemist heißt jetzt **Magier** und bereitet aufs Sprechen vor Publikum vor: Stabmeditation mit dem Besenstiel (neuer geführter Flow), Balance und Resonanzatmung; Haltungskraft (Face Pull, Prone Y-T-W, KB Romanian Deadlift, Suitcase Carry, Nacken) mit einer Plage; Grundlage im Sprechtempo; Stabtanz und Body Scan. Cool-down für Brust, Nacken und Kiefer.
- **King** neu als Anführer-Orden: zwei Chaos-Tage (wechselnde Bestien, Intervalle, KB-Komplex mit Halo), ein Redner-Tag (Grundlage, Resonanzatmung, Meditation) und ein Tag Haltung und Kraft (Turkish Get-Up, Farmer's Carry, Face Pull, Chin Tucks, Side Plank, Bestie). Die Feeling-Scale-Regel bleibt.
- Neue Übungen: Prone Y-T-W, KB Halo, Resonanzatmung. Neue Cool-down-Liste „Redner“ (Brust im Türrahmen, Nacken, Hals, Kiefer lösen, Summen) auch im Katalog.

## [0.64.1] – 2026-10-19

### Geändert
- Assassin, Montag: ohne Plage (etwa 50 Min). Die Woche war mit Bestie am Montag zu viel. Gilt nach „Übernehmen“ im Plan.

## [0.64.0] – 2026-10-19

### Neu
- Bestien Schritt für Schritt: Nach „▶ Start“ zeigt eine Leiste unten, was gerade dran ist und was danach kommt. Wiederholungen tippst du mit „Fertig“ ab, Zeitstationen (Halten, Pausen, Seil, Stepper) laufen mit Countdown und Tönen und gehen von selbst weiter. Der letzte Schritt stoppt die Uhr. Der Rundenzähler entfällt.
- Laufen ersetzen (⚙ Anpassen): Rudergerät, Rad, Seilspringen oder Stepper statt Laufen, umgerechnet nach Belastungszeit statt 1:1 (400 m Laufen ≈ 500 m Rudern ≈ 1000 m Rad ≈ 2 Min Seil oder Stepper). Gilt für Laufblöcke und Bestien; Dauerläufe bleiben gleich lang im gleichen Tempo. „Bestie“ ersetzt wie bisher den Laufblock.
- Ortsregel für Bestien: Im Studio keine Bestien mehr, die Laufband oder Rudergerät mit Stange, Ringen, Langhantel oder Kasten mischen (etwa Ifrit). Band oder Kettlebell zum Gerät mitnehmen bleibt erlaubt. Einstellbar je Ort: „Stationen weit auseinander“.
- Übungen: Laufband, Rudergerät, Fahrrad-Ergometer und Stepper als Cardio auf Zeit.
- Warm-up-Katalog: Ausschütteln auf der Stelle (45 s).

### Behoben
- „Sprint oder Seilspringen“ (King) und „Intervalle: Burpees oder Seilspringen“ (Gladiator) verlangten fälschlich Ringe und fielen ohne Ringe weg.

## [0.63.1] – 2026-10-18

### Geändert
- Witcher zuhause: Die Ringrudern-Leiter endet jetzt mit Archer Ring Row statt mit einarmigem Kurzhantelrudern.

## [0.63.0] – 2026-10-17

### Geändert
- Mehr direkte Rumpfarbeit, Richtwert etwa 6 Sätze pro Woche aus zwei Mustern (Einrollen und Rotation oder Anti-Rotation). Grundübungen fordern den Rumpf vor allem stabilisierend, die Bestien nur zufällig.
  - Soldier: Hanging Leg Raise (Studio A) und Cable Woodchopper (Studio B).
  - King: Hollow Hold nach der harten Bestie A, Side Plank nach Bestie C.
  - Troubadour: Pallof Press 3 statt 2 Sätze, dazu Hanging Leg Raise an Kraft B (50 Min).
  - Monk: Dead Bug an Kraft A, Side Plank 3 Sätze.
  - Initiate: Dead Bug und Side Plank je 3 Sätze.
  - Pilgrim: Dead Bug an der Kraft-Erhaltung (50 Min).
  - Witcher: Cable Crunch am Dienstag, dazu Russian Twist und Pallof zuhause.
  - Assassin bleibt bis zur Testwoche, wie er ist. Herald und Huntsman bleiben ohne Zusatz: kurze Ganzkörpersätze bzw. Parkour fordern den Rumpf genug.

## [0.62.0] – 2026-10-17

### Geändert
- Kein geplanter Kurztag mehr: Jeder Dienstag ist normal lang. Kürzen geht weiter über „Anpassen › Kurz“.
  - Gladiator, Dienstag: „Arme, Schultern und Rumpf“ mit je 4 Sätzen Seitheben, Bayesian Curl und Überkopf-Trizeps, 3 Sätzen Face Pull, Cable Crunch und einer Plage (etwa 50 statt 30 Min).
  - Knight, Unterkörper A: dazu eine Plage (etwa 50 Min).
  - Acrobat, Animal Flow: dazu eine Plage (etwa 40 Min).
  - Ein alter, in der Phase gespeicherter Kurztag wirkt nicht mehr.
- Schwert sichtbar planen: Tage mit Schwert tragen „Schwert“ im Tagesknopf. Die Vorschau und der Almanach zeigen den Schwertblock mit deiner Stufe auch für ein Profil ohne Schwert, darunter den Ersatz.
- Ersatz ohne Schwert bei Assassin, Soldier und Witcher: statt eines leeren Timers „Mobility-Flow“ der geführte Flow „Mobility: Hüfte und Schulter“ (90/90, weltbeste Dehnung, Hüftbeuger, Thorax-Rotation, Ausschultern, tiefe Hocke, Wandengel).

## [0.61.0] – 2026-10-17

### Geändert
- Orden nach den Gestaltungsprinzipien durchgesehen (beidseitig statt abwechselnd, wo gleichwertig; lieber mehr Sätze einer Übung als zwei ähnliche):
  - Zuhause überall Double DB Row statt einarmigem Rudern; Herald und Initiate rudern auch im Plan beidseitig.
  - Knight: Oberkörper A ohne Chest Press, Unterkörper A ohne Beinpresse (je 45 Min). Unterkörper B mit tiefer Beinpresse 4×10–12 statt Bulgarian Split Squat.
  - Smith: Tag 1 ohne Bulgarian Split Squat, dafür 4 Sätze Klimmzug. Tag 4 ohne Walking Lunge, Hammer Curl einzeln.
  - Gladiator: Arm-Einheit mit je 4 Sätzen Bayesian Curl und Überkopf-Trizeps statt vier Übungen (30 Min). Unterkörper mit 4 Sätzen Kniebeuge statt zusätzlicher Beinpresse (55 Min). Zuhause KB Cossack Squat statt Bulgarian Split Squat.
  - Conqueror: Studio-Kraft ohne Pistol (Box) und Table Row (55 Min). Unterwegs bleibt einbeinig, weil dort die Last fehlt.
  - Initiate: Goblet Squat statt Split Squat. Troubadour: Beinpresse statt Walking Lunge. Herald: KB Cossack Squat statt Walking Lunge, Goblet Squat mit Pause statt Split Squat. Monk: KB Cossack Squat statt Reverse Lunge.
  - Bewusst einseitig bleiben Olympian, Pilgrim und Huntsman, weil Sprint, Laufen und Parkour es verlangen.
  - Eine laufende Phase behält ihre Fassung, bis du „Übernehmen“ tippst.

### Entfernt
- Schalter „Viel unterwegs“ an der Phase und das Koffer-Symbol. Er wirkte nur auf die Ordensempfehlung; ob ein Orden unterwegs geht, steht weiter im Almanach.

## [0.60.0] – 2026-10-17

### Geändert
- Übungskatalog bereinigt, doppelte Einträge zusammengeführt: Cable Biceps Curl → Cable Curl, Lat Pulldown (Overhand) → Lat Pulldown, Bent-Over Row → Barbell Row, Rope Crunch → Cable Crunch, Medizinball-Brustwurf → Medicine Ball Chest Pass. Dein Verlauf zieht mit; eine laufende Phase behält ihre Fassung.
- Übungskarte aufgeräumter: Hinweise zur Übung, „Statt …“ nach Tausch und „bis der Skill sitzt“ stehen jetzt in den Details (Antippen der Dosis). Superset-Kopf kürzer.
- Vorschau: Der Schwertblock zeigt jede Übung mit Dosis und deine Stufe.

### Behoben
- Der Hinweis zur Kabelstation erschien auch, wenn zuhause Kurzhanteln statt Kabel kamen.
- Assassin, Freitag zuhause: Schrägbank-Curl und Seitheben mit Kurzhanteln beidseitig (10–12 bzw. 12–15), nicht „je Seite“.

## [0.59.3] – 2026-10-17

### Geändert
- Anderer Ort mit leichterer Last: bis zu 30 Wiederholungen statt höchstens 5 über dem Bereich (KB Swing 24 kg × 15 wird mit 20 kg zu 24, 28 kg × 15 zu 30).

## [0.59.2] – 2026-10-17

### Behoben
- Anderer Ort mit leichterer Last: Die App erhöht jetzt die Wiederholungen, statt beim alten Ziel zu bleiben. Beispiel: KB Swing mit 24 kg × 15 im Studio wird zuhause mit 20 kg zu 20 Wiederholungen. Höchstens 5 über dem Bereich, weil die Umrechnung bei vielen Wiederholungen sonst zu hoch greift.

## [0.59.1] – 2026-10-16

### Geändert
- Melusine: 20 Hip Raises (beidbeinig) statt 40 einbeinig.

## [0.59.0] – 2026-10-16

### Geändert
- Assassin, letzte Fassung vor dem Start (gilt bis zur Testwoche):
  - Montag: Unterkörper wie bisher, dazu Trizeps über Kopf.
  - Dienstag: Chest Press, Chest-Supported Row, Lat Pulldown, Face Pull, Incline Cable Curl. Nur Übungen, die an kleinen Kabeltürmen bequem gehen; als Kurztag bleiben Chest Press, Rudern, Face Pull und Curl, der Pulldown wandert dann auf den Donnerstag.
  - Freitag: KB Swing, Dip, Lat Pulldown (V-Griff), Cable Fly, Bayesian Curl mit Seitheben an einer Station.
- Neue Übung: Incline Cable Curl.

## [0.58.3] – 2026-10-16

### Geändert
- Assassin, Dienstag wieder als voller Tag (~50 Min.): Chest Press, Rudern im Untergriff, Cable Fly, Rear Delt Fly, Curl, Trizeps über Kopf. Fly und Trizeps kommen vom Freitag, der damit kürzer wird (~50 statt ~60 Min.).
- Als Kurztag bleiben am Dienstag die vier Kernübungen; den Rest gleicht die App bei Bedarf aus (zum Beispiel ein Satz mehr Dip am Freitag).

## [0.58.2] – 2026-10-16

### Geändert
- Assassin, Freitag: Bayesian Cable Curl und Cable Lateral Raise im Wechsel an derselben Kabelstation (Rolle unten, D-Griff), keine Kurzhanteln mehr am Kabelzug. Cable Fly und Trizeps über Kopf laufen einzeln.
- Supersets aus zwei Kabelübungen sind erlaubt, wenn beide an derselben Station laufen; die Karte nennt dann Höhe und Griff.

## [0.58.1] – 2026-10-16

### Geändert
- Assassin, Montag: Die Plage kommt wieder aus allen kurzen Bestien, nicht mehr aus einer festen Auswahl.

## [0.58.0] – 2026-10-16

### Geändert
- Assassin nach Erholung zwischen den Tagen geordnet: Montag Unterkörper, Dienstag und Freitag Oberkörper. So belastet kein Tag dieselben Muskeln wie der Tag davor, auch wenn Freitag auf Sonntag rutscht.
  - Montag: Leg Press, Lying Leg Curl, KB Cossack Squat mit Wadenheben, Cable Woodchopper, dazu eine kurze Plage ohne Drücken, Ziehen und weite Sprünge.
  - Dienstag: Chest Press, Rudern im Untergriff, Rear Delt Fly, Curl (auch als Kurztag mit allen vier).
  - Freitag: KB Swing zuerst, Dip, Lat Pulldown mit V-Griff, Fly mit Seitheben, Schrägbank-Curl mit Trizeps über Kopf.
  - Woodchopper statt Russian Twist: Drehung im Stand aus der Hüfte, wie beim Hieb.
- Supersets aus zwei Maschinen oder Kabeln gibt es nicht mehr, auch nicht nach einem Tausch oder an einem anderen Ort: Die beiden Übungen kommen dann nacheinander.

## [0.57.0] – 2026-10-16

### Geändert
- Assassin neu, mit weniger Volumen für die Phase im Defizit: 15 statt 22 Übungen pro Woche, etwa 20 % weniger Sätze, dafür mehr Sätze pro Übung. Oberkörper-Kernübungen schwer (6–8 Wiederholungen), Beine und Isolation 8–15. Etwa 10 harte Sätze pro Muskel und Woche, Beine etwas weniger.
  - Montag: Leg Press, Lat Pulldown, Cable Chest Fly, Seated Leg Curl (statt liegend), Trizeps über Kopf.
  - Dienstag: Chest Press, Rudern beidarmig, Seitheben, Curl. Bleibt auch als Kurztag mit allen vier.
  - Freitag: KB Swing, KB Cossack Squat (statt Bulgarian Split Squat), Dip, Lat Pulldown (V-Griff), Rear Delt Fly, Russian Twist mit Wadenheben.
  - Die neue Fassung gilt in der laufenden Phase erst nach „Übernehmen“ im Plan.
- Kurztag: vier Kernübungen, wenn der Orden vier markiert und der Tag bei gut 30 Minuten bleibt; sonst wie bisher drei.
- Neue Übungen: Double DB Row, KB Cossack Squat.

## [0.56.1] – 2026-10-16

### Geändert
- Aufwärmsätze richten sich jetzt nach Last und Verletzungsrisiko statt nach Wiederholungen: Langhantel ab 50 kg ein Satz, ab 80 kg zwei; Maschine ab 80 kg ein Satz; Kurzhantel oder Kettlebell ab 24 kg je Hantel ein Satz. Kabel, Körpergewicht und Swings, Snatches oder Sprünge bekommen keinen. Weiterhin nur die erste so schwere Übung je Körperhälfte.

## [0.56.0] – 2026-10-15

### Geändert
- Schwert: Ab Stufe 2 beginnt jeder Schwertblock mit kurzen Basics (Zornhau, Zwerchhau, Scheitelhau je 10 pro Seite), dann kommt deine Stufe. Der Tag wird dadurch etwas länger; die Bestie behält ihre Zeit.
- Stufe 1 übt nur die drei Einzelhiebe; die Kombiformen gehören jetzt ganz zu Stufe 2.
- Die geschätzte Dauer rechnet den Schwertblock jetzt mit deiner Stufe (etwa 3 Sekunden je Hieb).

## [0.55.0] – 2026-10-15

### Neu
- Schwert-Lernweg, Stufe 4 Klingentanz (zwischen Drehhau und Doppelmesser): historischer Wechselhau (von unten steigend, dann von oben auf die andere Seite), Wendehieb (180° mit festem Blickpunkt), Ausfallhieb, Unterhau, tiefer Zwerchhau in der halben Kniebeuge und eine Form am Stück, die jede Woche um 20 Sekunden wächst (bis 3 Minuten). Test im Skillcheck: Klingentanz.
- Letzte Stufe mit Heaven Six, dem Sinawali-Muster mit sechs Schlägen auf Kopfhöhe.

## [0.54.1] – 2026-10-15

### Geändert
- Schwert: Der Hieb mit Unterarmdrehung heißt jetzt Drehhau (Stufe 3 im Lernweg, Drehreihe, Drehhau-Serien). In den historischen Fechtbüchern meint „Wechselhau“ etwas anderes: einen Hieb, der von unten steigt und dann von oben auf die andere Seite fällt. Diesen historischen Wechselhau gibt es später mit dem Klingentanz.

## [0.54.0] – 2026-10-15

### Neu
- Schwert-Lernweg: Was du am Schwert übst, hängt von deinem Können ab, nicht vom Orden. Fünf Stufen (Hiebe, Kombiformen, Wechselhau, Doppelmesser, Wanderflechte), jede mit einem Test unter Setup › Können › Schwert. Die Schwert-Karte zeigt deine Stufe und was die nächste öffnet. Geübt wird ohne Zusatzgewicht.

### Geändert
- Witcher: Masse am Oberkörper, athletischer Unterkörper, Schwert als Fertigkeit. Montag ohne schwere Kniebeuge, dafür Seitheben und eine Plage für die Beine. Dienstag als voller Tag mit Seitheben und Reverse Curl (Unterarm und Griff). Donnerstag 20 Minuten Schwert auf deiner Stufe, dann Oberkörper und ein Rumpf-Finisher ohne Beinarbeit. Freitag bleibt schwer und explosiv.

## [0.53.0] – 2026-10-14

### Geändert
- Einrichtung, Schritt „Dein Jahr“: Du beschreibst dein Jahr in Abschnitten (oder nimmst die Vorlage Semester-Rhythmus), wählst die Richtung (Allround, Schwerpunkt oder „Weiß nicht“) und wie oft du testen willst. „Vorschlag erstellen“ legt Phasen, Orden und Testwochen an; danach stimmst du im Stapel fein ab. Wer lieber selbst plant, legt die Phasen wie bisher direkt an.

## [0.52.0] – 2026-10-14

### Neu
- Plan › Lebensabschnitte: Beschreibe dein Jahr in Abschnitten mit eigenem Namen, Länge (− / + Wochen) und Alltagslast, oder nimm die Vorlage Semester-Rhythmus. Dazu wählst du die Richtung des Jahres und ob du nach jeder Phase, zweimal im Jahr oder gar nicht testen willst.
- „Künftige Phasen neu vorschlagen“ baut aus den Abschnitten Phasen und Orden. Ob ein Abschnitt einen langen Orden oder mehrere kürzere bekommt, entscheidet, was deine Richtung am besten voranbringt. Kurze Abschnitte gehen in der Nachbarphase auf, gleich belastete Abschnitte hintereinander können durchlaufen. Laufende und vergangene Phasen bleiben.

## [0.51.3] – 2026-10-14

### Behoben
- Leise und Kein Platz: Eine schon festgehaltene Bestie ohne echte Zeit (auch mit 0 Sekunden) weicht jetzt, wenn sie nicht zum Tag passt, etwa Kobold mit Broad Jumps an einem Tag ohne Platz. Mit eingetragener Zeit bleibt sie, wie sie war.

## [0.51.2] – 2026-10-14

### Geändert
- Phasenkarten mit Symbolen statt Text: Balken für die Alltagslast, Koffer für viel unterwegs, ▶ läuft, ☆ empfohlen, ✓ selbst gewählt, Lanzen für eine Testwoche am Ende.
- „Testwoche am Ende“ stellst du jetzt auf der Bearbeitungsseite ein; die Karte zeigt es nur an.
- Testwochen zeigen beim Antippen eine Vorschau mit den fünf Cups; der Zusatztext auf der Karte entfällt.

## [0.51.1] – 2026-10-14

### Geändert
- Phasenkarten: oben der Name der Phase mit Alltagslast, darunter der Orden mit „empfohlen“, „gewählt“ oder „läuft“, darunter der Zeitraum. Ordenssymbol und Testwochen-Symbol gleich groß und nie mehr unter den Knöpfen.
- Bearbeiten (Stift) öffnet eine eigene Seite: Name, Alltagslast und unterwegs zuerst, dann die Ordenswahl mit Empfehlung, dann Teilen und Verbinden, unter „Mehr“ Zeitraum, eigener Wochenplan und Schwerpunkt. Die Alltagslast lässt sich nur noch dort ändern.

## [0.51.0] – 2026-10-14

### Neu
- Plan als Stapel: Oben zeigt ein Band das Jahr mit Ordenssymbolen, Testwochen und heute. Darunter je Phase eine Karte: − / + ändert die Länge um eine Woche (alles danach rückt mit), „ohne Test“ / „Testwoche am Ende“ schaltet die letzte Woche zur Testwoche, die Last lässt sich antippen. Ein Tipp auf den Ordensnamen zeigt die Empfehlung und zwei Alternativen, „Alle Orden …“ die ganze Liste. Unter ⋯: Details, Phase bearbeiten, Teilen, Mit der nächsten verbinden.
- „+ Phase anhängen“ setzt gleich den empfohlenen Orden.

### Geändert
- Testwochen entstehen nur noch aus der letzten Woche einer Phase. „Danach eine Woche einschieben“ entfällt; bestehende Testwochen bleiben.

## [0.50.1] – 2026-10-14

### Geändert
- Plan: Eine Phase antippen zeigt zuerst, was ihr Orden abbildet; „Phase bearbeiten“ ist der zweite Schritt.
- Plan: Die Jahresbalance ist zunächst eingeklappt.

## [0.50.0] – 2026-10-14

### Neu
- Tagesanpassung „Kein Platz“: alles auf der Stelle. Farmer's und Suitcase Carry werden zum Marschieren auf der Stelle, Walking Lunges zu Reverse Lunges, Crawls zu Mountain Climbers; Bestien ohne Strecke (64 von 81). Fixierbar je Wochentag wie Kurz und Leise.

### Geändert
- Leise gilt jetzt auch für das Training selbst: Langhantel-Deadlift wird zum Romanian Deadlift, Sprünge zu KB Swings oder Goblet Squats, Medizinballwürfe zu Woodchopper oder Push-Ups. Leise Bestien schließen jetzt auch Langhantel vom Boden aus (33 von 81); Mountain Climbers und Swings bleiben erlaubt.

## [0.49.0] – 2026-10-14

### Geändert
- Leise: Statt die Bestie zu streichen oder zu verschieben, kommt eine leise Bestie, ohne Sprünge, Burpees, Split Lunges, Sprints und Läufe (37 der 81 Bestien). Verschoben wird nur noch, wenn es für einen Bestienblock gar keine leise Fassung gibt.

## [0.48.4] – 2026-10-14

### Geändert
- Blockfolge vorschlagen: Die Wirkung steht jetzt als Satz da, etwa „Diese Änderung der Blockfolge führt zu mehr Kraft und Erholung, aber weniger Kondition. Dein Jahr wird breiter: etwa 6 statt 5 von 8 Bereichen.“

## [0.48.3] – 2026-10-13

### Geändert
- Blockfolge vorschlagen: Statt „Jahresbalance 0.78 → 0.64“ steht dort jetzt „Breite übers Jahr: etwa 5 von 8 Bereichen → etwa 4 von 8“, dazu, welche Bereiche gewinnen und verlieren (z. B. „mehr Kraft, weniger Kondition“).

## [0.48.2] – 2026-10-13

### Behoben
- „Blockfolge vorschlagen“ reagiert etwa dreimal so schnell: Die Jahresbalance wird je Variante nur noch einmal berechnet. Der Vorschlag selbst bleibt gleich.

## [0.48.1] – 2026-10-13

### Geändert
- Leise: Passt die Bestie an keinem anderen Tag in die Zeit, paart die App dort Übungen zu Supersets und erlaubt höchstens 5 Minuten mehr. Warum gepaart wurde, steht in den Details der Übung.

## [0.48.0] – 2026-10-13

### Neu
- Testwochen im Plan: bernsteinfarben hervorgehoben, mit eigenem Symbol (gekreuzte Lanzen und Schild).
- Leise: Die Bestie des Tages wandert auf einen anderen Tag dieser Woche, wenn dort Zeit ist, notfalls als kürzere Klasse. Spontan nur auf die Tage danach, fixiert auf jeden Tag. Passt sie nirgends, entfällt sie.

### Geändert
- Kurz und Leise fixierst du nur noch im Anpassen-Menü der Einheit („Für jeden Freitag fixieren“). „Deine Woche“ zeigt fixierte Tage nur noch als Hinweis.

### Behoben
- Nach „Leise“ ließ sich „Intensiv“ nicht mehr wählen.

## [0.47.0] – 2026-10-13

### Neu
- Plan › Deine Woche: Ort je Wochentag, gemerktes Kurz oder Leise und welche Einheit an welchem Tag läuft, an einer Stelle. Wählst du eine Einheit, die schon an einem anderen Tag steht, tauschen die beiden. Ersetzt „Wochenplan“ und „Einheiten auf Tage verteilen“ im Setup.
- Ordenssymbole als dezentes Wasserzeichen hinter den Ordenskarten in Plan und Almanach.

### Behoben
- Eine eigene Verteilung der Einheiten ging verloren, wenn die Woche mehr Trainingstage als Einheiten hatte.

## [0.46.3] – 2026-10-13

### Intern
- Code aufgeräumt: Die Einheit ist in kleinere Dateien aufgeteilt (Satzkarte, Bestie, Warm-up/Cool-down, Inhalte), doppelte Helfer zusammengeführt, eine ungenutzte Funktion entfernt. Für dich ändert sich nichts.

## [0.46.2] – 2026-10-13

### Geändert
- Aschekurier-Logo sitzt direkt neben dem Ordensnamen. Auf schmalen Bildschirmen werden Name und Wochenzähler etwas kleiner, der Zähler zeigt dann nur „3/10“.

## [0.46.1] – 2026-10-13

### Neu
- Setup › Wochenplan: Neben jedem Trainingstag lassen sich Kurz und Leise direkt merken; die Kopfzeile zeigt, was gemerkt ist (z. B. „Fr kurz“).

## [0.46.0] – 2026-10-13

### Neu
- Tagesanpassung als vier Schalter unter ⚙ Anpassen: **Kurz · Leicht · Intensiv · Leise**. Kurz, Leicht und Leise lassen sich kombinieren, Intensiv steht allein.
- Kurz geht spontan: Nur die drei Kernübungen, die Tage danach gleichen aus. Am letzten Tag der Woche entfällt der Ausgleich.
- Kurz und Leise lassen sich je Wochentag merken („Kurz jeden Freitag“), über alle Phasen. Ein gemerkter Kurztag gleicht über die ganze Woche aus.

### Geändert
- Leicht ersetzt „Diese Woche −1 Satz“ und gilt nur für den Tag.
- Intensiv ersetzt „Heute viel Energie“.
- Leise ersetzt den schweißfreien Ort: Wer einen Ort als schweißfrei markiert hatte, hat jetzt Leise an den Wochentagen dieses Orts gemerkt.
- Der Kurztag im Plan entfällt; ein bestehender gilt weiter, bis du für einen Wochentag „Kurz“ merkst oder ihn dort ausschaltest.

## [0.45.0] – 2026-10-13

### Geändert
- Orte haben keine Kategorie mehr (Studio, Zuhause, Unterwegs), nur einen Namen und ihr Equipment. Die App nimmt die Übung des Ordens, wenn das Equipment reicht, sonst die nächste Variante aus dem Orden und erst dann einen Ersatz aus der Bibliothek. Getauschte Übungen gelten jetzt je Ort und sind übernommen.
- Neu in der Ausstattung: Dip-Barren und Bauchroller. Bisher hat die Kategorie das stillschweigend angenommen; vorhandene Studio-Profile haben beides, Zuhause den Bauchroller. Ohne Barren wird aus Dips Ring Dip (mit Ringen) oder Chair Dip.
- Fehlen Weste und Scheiben, läuft eine Übung mit Zusatzlast ohne Last, außer der Orden hat dafür eine eigene Fassung.
- Der Aschekurier ist ein kleines Feder-Logo in der Ordenskarte auf „Heute“; Antippen öffnet die Ausgabe, ein Punkt zeigt eine neue.
- Kurztag: Die Hinweiszeilen über der Einheit entfallen. Warum eine Übung einen Satz mehr hat, verschoben oder als Superset gepaart ist, steht in ihren Details (Dosis antippen).

## [0.44.0] – 2026-10-13

### Neu
- Erledigte Übungen klappen ein: Sind alle Sätze abgehakt und die Rückmeldung gegeben (bei „Zu schwer“ mit Zahl), wird die Übung nach gut zwei Sekunden zu einer schmalen, ausgegrauten Zeile mit Haken. Antippen öffnet sie wieder.

### Geändert
- Warm-up und Cool-down: Bearbeiten ist jetzt ein Stift direkt neben der Überschrift.

## [0.43.1] – 2026-10-13

### Neu
- Hilfe › Literatur: alle Quellen der App mit vollständiger Angabe und Link, geprüft am 13.10.2026. Ein Test stellt sicher, dass jede zitierte Studie in der Liste steht.

### Geändert
- Hilfe „Körpergewicht zählt“: Liegestütze brachten ähnliche Kraftzuwächse wie Bankdrücken; ähnliches Muskelwachstum zeigt nur die Studie mit vergleichbarer Belastung (Kikuchi & Nakazato, 2017). Vorher klang es, als belegten alle drei Studien beides.
- Smith: Quelle eindeutig benannt (Schoenfeld, Grgic et al., 2017, leichte vs. schwere Lasten).

## [0.43.0] – 2026-10-12

### Geändert
- Satzkarte aufgeräumt: konkrete Vorgabe („3 × 13 · 25 kg“) statt Bereich, Antippen eines Kreises heißt „Ziel geschafft“. Kein Zahlenfeld mehr pro Satz (außer AMRAP).
- Rückmeldung mit fünf Stufen: „Zu schwer“ fragt die Wiederholungen im letzten Satz, „Sehr leicht“ die Wiederholungen je Satz (vorbelegt mit Ziel + 2). Die Progression rechnet damit wie bisher.
- Aufwärmsatz als Kreis „0“ vor den Arbeitssätzen, die Dosis steht als Zeile unter der Vorgabe.
- Details auf Wunsch: Antippen der Vorgabe zeigt Bereich, letzte Einheit und den nächsten Schritt.

## [0.42.5] – 2026-10-12

### Geändert
- Zurückgenommen: Satzknöpfe wieder in voller Größe, vier Sätze brechen wie zuvor um.

## [0.42.4] – 2026-10-12

### Geändert
- Bis zu vier Sätze stehen in einer Zeile (ab etwa 350 px Bildschirmbreite): Knopf und Feld werden etwas schmaler und teilen sich die Breite. Ab fünf Sätzen wird wie bisher umgebrochen.

## [0.42.3] – 2026-10-12

### Geändert
- Assassin, Kraft A: Latzug und Rudern wieder 3 Sätze (Cable Chest Fly bleibt bei 4). Mit Kurztag am Dienstag bekommt der Montag dadurch keine Zusatzsätze mehr, die Triceps Extension bleibt bei 3. Ausgleich ist nur noch der Dip am Schwert-Tag.
- Witcher, Kraft Kontrast: Seated Leg Curl 3 × 10–12 (zu Hause und unterwegs Nordic Curl Negative 5–8). Beinbeuger 7 statt 4 Sätze pro Woche.

## [0.42.2] – 2026-10-11

### Geändert
- Aufwärmsatz nur noch vor schweren Mehrgelenksübungen: Bereich beginnt bei höchstens 10 Wiederholungen. KB Swings mit 15–20 bekommen keinen mehr, der Aufwärmsatz geht an die nächste passende Übung derselben Körperhälfte.

## [0.42.1] – 2026-10-11

### Geändert
- Phasen mit hoher Alltagslast: Ziel ist jetzt etwa die Hälfte aller Übungen eines Tages an Maschine oder Kabel, nicht die Hälfte der freien. Was ohnehin geführt ist, zählt mit. Maschinentage wie Assassin Kraft B bleiben dadurch unverändert (KB Swing und Bulgarian Split Squat bleiben frei).

## [0.42.0] – 2026-10-11

### Geändert
- Nie zwei Maschinen oder Kabel als Superset im Studio: weder beim Ausgleich für den Kurztag noch in den Orden-Dateien noch bei den geführten Varianten in Phasen mit hoher Last. Maschine mit Körpergewicht, Kurzhantel oder Kettlebell bleibt erlaubt. Die Datenprüfung meldet solche Paare künftig.
- Assassin, Kraft A: Latzug und Rudern je 2 statt 3 Sätze, Cable Chest Fly 4 statt 3. Mehr Brust, weniger Rücken. Mit Kurztag am Dienstag fällt damit das Superset am Montag weg.
- Angepasste Paare: Smith (DB Lateral Raise statt Cable Lateral Raise), Troubadour (DB Overhead Triceps Extension statt Rope Pushdown), Witcher (DB Rear Delt Fly statt Reverse Pec Deck), Gladiator-Arm-Finisher (DB Biceps Curl statt Cable Curl).

### Behoben
- Kurztag-Bericht: fehlende Sätze mit halben Sätzen statt gerundet („9,5 statt 10“ statt „10 statt 10“).

## [0.41.1] – 2026-10-11

### Behoben
- Bestien wechselten mitten in der Einheit: Die Auswahl wurde bei jedem Klick neu berechnet und hing an Dingen, die sich währenddessen ändern können (Zeitschätzung, eigenes Warm-up, Daten-Update, Zeiten anderer Bestien). Jetzt werden die Bestien beim ersten Eintrag oder Start der Stoppuhr festgehalten. Neu gewählt wird nur nach einer bewussten Anpassung (Ort, −1 Satz, viel Energie, kein Laufen), und auch dann nur Bestien, für die noch keine Zeit steht.

## [0.41.0] – 2026-10-11

### Neu
- Equipment: „Liegestützgriffe oder Yoga-Blöcke“. Deficit Push-Ups gibt es nur noch, wo Griffe, Blöcke, Ringe oder Kurzhanteln da sind. Sonst Banded Push-Up (neu in der Bibliothek), ohne Band normale Push-Ups mit einem Satz mehr. Gilt in allen Orden, auch für Leiterstufen.

### Behoben
- Box Jumps prüfen jetzt, ob am Ort eine Box steht.

## [0.40.1] – 2026-10-11

### Neu
- Black-Roll-Übungen im Katalog zum Hinzufügen: Warm-up kurz und zügig (30 s: Waden, Oberschenkel vorn, Adduktoren, Gesäß, Latissimus, Fußsohle, Brust mit Ball), Cool-down langsam (45–60 s: zusätzlich Beinbeuger, Brustwirbelsäule, Unterarme mit Ball).

### Geändert
- Assassin: Dip zu Hause als Ring Dip (6–10), unterwegs weiter Deficit Push-Up.

## [0.40.0] – 2026-10-11

### Neu
- Warm-up und Cool-down anpassen: In der Einheit unter „✎ Bearbeiten“ Übungen entfernen (✕) oder aus dem Katalog hinzufügen. Gilt dauerhaft für diesen Tag des Ordens, die Zeitschätzung folgt. Zurücksetzen auf die Vorgabe jederzeit möglich.
- „Heute viel Energie“ unter ⚙ Anpassen: Bestien eine Klasse länger (Tageslimit +15 Minuten), Schwertübungen +1 Satz. Kraft, Hypertrophie und Ausdauer bleiben unverändert. Finisher-Pools und Zwischenwert-Bestien bleiben, wie sie sind.

### Geändert
- Assassin, neue Fassung: KB Swing statt Cable Pull-Through, Bulgarian Split Squat statt Leg Extension (auch im Gym), Dip statt Rope Pushdown (zu Hause und unterwegs Deficit Push-Up), Ab Crunch Machine statt Rope Crunch. Laufende Phasen übernehmen sie im Plan über „Übernehmen“.
- Neu in der Bibliothek: Ab Crunch Machine.

## [0.39.0] – 2026-10-11

### Neu
- Zusatzlast nach der Wiederholungsgrenze: Übungen ohne Gewicht steigen bis 30 (Nacken, Schienbein, Waden), 25 (Rumpf, Beine) oder 20 Wiederholungen (Oberkörper). Danach dieselbe Übung mit Weste oder Gürtel, neuer Bereich (15–20, 12–15 oder 8–12), Steigerung wie bei Hanteln. Leitern wechseln nach der letzten Stufe. Ohne passende Last am Ort geht es mit Wiederholungen weiter.
- Zusatzlast nimmt alles, was sich umhängen lässt: Scheiben, Weste, Kurzhanteln oder Kettlebells.

### Geändert
- Eine Übung je Bewegung: „Back Squat Top-Satz“, „Deadlift Top-Satz“, „KB Swing, schwer“, „… + Weste“ und „Weighted Pull-Up/Chin-Up/Dip“ sind mit der Grundübung zusammengeführt. Die Dosierung steht im Slot, die Zusatzlast ist eine Eigenschaft. Gewichte, Verlauf und 1RM wandern mit.
- Bibliothek: 244 statt 254 Übungen; „Dip“ (Barren) ist neu als Grundübung.

## [0.38.1] – 2026-10-08

### Behoben
- Wiederholungs-Progression ohne Gewicht (z. B. Neck Curl 15–25): Das nächste Ziel zählt jetzt vom Geschafften statt vom alten Ziel. 2 × 20 bei Ziel 15 ergibt 21 statt 16. „Sehr leicht“ +2, „Schwer“ hält. Bereits gespeicherte Ziele werden in der Anzeige nachgezogen.

## [0.38.0] – 2026-10-07

### Neu
- Weibliche Ordensnamen, wenn im Profil „weiblich“ eingetragen ist: Queen, Huntress, Gladiatrix, Trobairitz, Dame, Conqueress, Arlecchina und Amazon (statt Witcher). Die übrigen Namen sind neutral. Unter Setup › Profil lässt sich die Grundform wählen.

## [0.37.0] – 2026-10-07

### Neu
- Phasen behalten ihren Orden-Stand: Ab Start läuft eine Phase mit der Fassung des Ordens von diesem Tag. Ändert ein Update den Orden, steht im Plan „Neue Fassung verfügbar“, mit „Übernehmen“ gilt sie auch für die laufende Phase.
- Durchklick-Tests im Browser (Playwright), bei jedem Push in der CI: Einheit abschließen, freie Jagd mit Rundentracker und „Wieder aufnehmen“, Kurztag, Sicherung speichern und laden, Seitenwechsel im Warm-up, schweißfreier Ort.
- Alte Datenstände (0.1, 0.20, 0.30) als feste Testfälle: Laden, Plan, Einheiten, Flugblatt, Volumen und Export/Import laufen.
- Normen für Frauen ergänzt: Beinpresse (20–49 Jahre, Kategorien) und 500 m Rudern (30–39, nur Orientierung). Jede Norm für Männer hat jetzt ein Gegenstück.

### Geändert
- Hilfe: Almanach, Aufwärmsätze, Rundentracker, freie Jagd, Finisher, Kurztag, schweißfreier Ort, Seitenwechsel, eingefrorene Phasen.

### Behoben
- Freie Jagd: Eine Zeit von 0 s (sofort abgehakt) wurde nicht eingetragen.

## [0.36.0] – 2026-10-07

### Geändert
- Bestien nach Kuratierung: neue Übungen, Runden und Startwerte bei Aufhocker, Fliegender Holländer (ohne Handstand), Golem, Huldra, Klabautermann, Kobold, Krampus, Mittagsfrau, Nachtkrapp, Sylphe, Waldschrat, Wechselbalg, Wila, Huma, Humbaba, Kusarikku, Peri, Qarin, Roch (Band), Sirrusch (Langhantel) und Zahhak. Zwerg braucht die Stange.
- Tiamat ist jetzt reines Körpergewicht und heißt als Nordbestie Fafnir.
- Kurzformen: Leitern behalten die ersten Stufen (16/12/8/4 → 16/12), Buy-in und Buy-out bleiben, gekürzt wird der Innenteil. Bestien mit zwei Runden lassen sich auf eine kürzen. Einzelne Bestien sind als nicht kürzbar markiert.

## [0.35.0] – 2026-10-07

### Neu
- Kurztag (Plan › Phase bearbeiten): Ein Tag läuft nur mit drei Kernübungen. Die App prüft das Wochenvolumen je Muskel: Aufbau-Muskeln bleiben an der unteren Grenze des Volumenbereichs, alle anderen bei der Erhaltung (4 Sätze). Leidet nichts, bleiben die anderen Tage unverändert. Sonst gleichen sie aus: +1 Satz an passenden Übungen, weggefallene Kernübungen wandern auf einen anderen Tag, Supersets halten das Zeitlimit. Was nicht ganz reicht, steht offen da.
- Kernübungen sind in allen Orden markiert.

### Geändert
- Standardlänge statt fester Kurztage: Assassin Dienstag ist jetzt „Oberkörper und Gesäß“ (45 Min, mit Schrägbank-Brustpresse, Pushdown und Hip Thrust Maschine), Gladiator Dienstag „Arme und Schultern“ (40 Min), Witcher Dienstag heißt „Arme und Schultern“. Der bisherige kurze Dienstag entsteht über den Kurztag.

## [0.34.0] – 2026-10-07

### Neu
