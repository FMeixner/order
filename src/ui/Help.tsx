/* Kurze Anleitung, erreichbar über das ? oben rechts. */
import REFS from "../../data/modules/references.json";
import { Collapse } from "./common";
export function Help() {
  return (
    <div className="stack help-body">
      <h3>Der Ablauf</h3>
      <ul>
        <li><strong>Heute</strong> zeigt die Einheit des Tages. Oben wählst du den Trainingstag der Woche. Mit ‹ › neben der Wochenzahl blätterst du: künftige Wochen als Vorschau, vergangene zum Nachtragen. Tage mit Schwert tragen „Schwert“ im Tagesknopf. Die Vorschau zeigt den Schwertblock auch, wenn das Profil des Tages kein Schwert hat, darunter den Ersatz (meist der Mobility-Flow für Hüfte und Schulter). So siehst du, welchen Tag du auf zuhause legen solltest.</li>
        <li><strong>Plan</strong>: oben „Deine Woche“ (Ort je Wochentag und welche Einheit an welchem Tag), darunter „Lebensabschnitte“ und dein Jahr als Stapel. Das Band zeigt das Jahr auf einen Blick. Jede Karte: oben der Name der Phase, darunter der Orden, darunter der Zeitraum. Symbole: Balken = Alltagslast (1 bis 3), ▶ = läuft, ☆ = empfohlen, ✓ = selbst gewählt, Lanzen = Testwoche am Ende. − / + verlängert oder kürzt um eine Woche, alles danach rückt mit. Der Ordensname öffnet die Details, eine Testwoche ihre Vorschau, der Stift die Bearbeitung: Name, Alltagslast, Testwoche am Ende, Ordenswahl mit Empfehlung, Teilen und Verbinden, unter „Mehr“ Zeitraum, eigener Wochenplan und Schwerpunkt.</li>
        <li><strong>Almanach</strong>: Orden (alle Programme), Bestien (mit Bestzeiten, zum freien Jagen), Übungen (Arbeitsgewicht, 1RM, Verlauf) und das Log.</li>
        <li>Lebensabschnitte: Beschreibe dein Jahr in Abschnitten mit eigenem Namen, Länge und Alltagslast (oder nimm die Vorlage Semester-Rhythmus), dazu die Richtung des Jahres und wie oft du testen willst. „Künftige Phasen neu vorschlagen“ baut daraus Phasen und Orden; ob ein Abschnitt einen langen Orden oder mehrere kürzere bekommt, entscheidet, was deine Richtung am besten voranbringt. Kurze Abschnitte (unter 3 Wochen) gehen in der Nachbarphase auf, Phasen dürfen über Abschnittsgrenzen laufen. Laufende und vergangene Phasen bleiben.</li>
        <li>Eine Phase behält den Stand ihres Ordens ab ihrem Start. Ändert sich ein Orden durch ein Update, steht im Plan „Neue Fassung verfügbar“; erst mit „Übernehmen“ gilt sie für die laufende Phase.</li>
        <li><strong>Setup</strong>: Profil, Equipment, Können, Sicherung.</li>
      </ul>

      <h3>Eine Übung eintragen</h3>
      <ul>
        <li>Die Vorgabe ist konkret, etwa „3 × 13 · 25 kg“. Gewicht einmal pro Übung eintragen (oder den Vorschlag lassen), nach jedem Satz den Kreis antippen: Das heißt „Ziel geschafft“, die Pause startet. Nur bei AMRAP trägst du die Zahl ein.</li>
        <li>Antippen der Vorgabe zeigt die Details: den Bereich dahinter (oben angekommen steigt das Gewicht), was du zuletzt geschafft hast und was als Nächstes kommt.</li>
        <li>Nach dem letzten Satz kurz Feedback geben:
          <strong> Zu schwer</strong> = Ziel verfehlt (die App fragt, wie viele im letzten Satz gingen), <strong>Schwer</strong> = gerade so geschafft, <strong>OK</strong> = letzte Runde mit einer Wiederholung Reserve geschafft,
          <strong> Leicht</strong> = 3 oder mehr, <strong>Sehr leicht</strong> = deutlich zu leicht (die App fragt, wie viele je Satz gingen).</li>
        <li>Fehlen 2 oder mehr Wiederholungen zum unteren Ende des Bereichs, geht das Gewicht eine Stufe runter.</li>
        <li>Am Ende „Einheit abschließen“. Erst dann rechnet die App die Vorschläge für das nächste Mal.</li>
        <li>Aufwärmsatz: hängt von der Last und dem Risiko ab, nicht von den Wiederholungen. Langhantel ab 50 kg ein Satz, ab 80 kg zwei; Maschine ab 80 kg ein Satz; Kurzhantel oder Kettlebell ab 24 kg je Hantel ein Satz. Kabel, Körpergewicht und schwungvolle Übungen wie Swings brauchen keinen, dafür reicht das allgemeine Warm-up. Je Körperhälfte bekommt nur die erste so schwere Übung des Tages einen, erkennbar am gestrichelten Kreis „0“ vor den Sätzen. Dosis: 8 Wiederholungen mit der Hälfte des Arbeitsgewichts, bei zwei Sätzen 50 % × 5 und 75 % × 3. Abhaken wie einen Satz, danach 30 s bis zum ersten Arbeitssatz.</li>
      </ul>

      <h3>So steigert die App</h3>
      <ul>
        <li>Bei einem Bereich wie 8–10 arbeitest du dich erst in den Wiederholungen hoch. Schaffst du in allen Sätzen 10, kommt die nächste Gewichtsstufe, die es in deinem Profil gibt.</li>
        <li>„OK“ und „Leicht“ bringen je eine Stufe mehr, „Sehr leicht“ zwei. „Schwer“ hält das Gewicht. Zweimal hintereinander „Schwer“ nimmt 5 % weg.</li>
        <li>Große Sprünge zwischen deinen Hanteln (etwa 10 auf 12 kg): Die App hebt die Obergrenze an, zum Beispiel auf 16 Wiederholungen, und springt erst dann. Danach startet sie mit einer geschätzten Zahl an Wiederholungen. Der Hinweis steht in Orange bei der Übung.</li>
        <li>Anderer Ort: Gleiche Übung, gleiche Daten. Gibt es das Gewicht dort nicht, rechnet die App auf die Stufen des Profils um. War es zuletzt „leicht“, darf es die nächsthöhere Stufe sein (12 kg leicht im Studio → 13 kg zuhause), sonst die nächstniedrigere mit mehr Wiederholungen.</li>
        <li>Ohne Gewicht steigen Übungen über Wiederholungen oder über eine schwerere Variante (Stufe 1, 2, 3). Gezählt wird vom Geschafften: 2 × 20 bei Ziel 15 ergibt als nächstes Ziel 21.</li>
        <li>Zusatzlast: Nacken, Schienbein und Waden steigen bis 30 Wiederholungen, Rumpf und Beine bis 25, Oberkörper bis 20 (bei Leitern: die letzte Stufe zweimal am oberen Ende). Danach kommt dieselbe Übung mit Weste oder Gürtel, beides ist austauschbar, und es geht weiter wie bei Hanteln: erst Wiederholungen, dann Gewicht. Klimmzüge, Dips und andere Übungen, die der Orden von Anfang an schwer will, laufen gleich mit Zusatzlast.</li>
        <li>In der ersten Woche wählst du die Startgewichte selbst: so, dass am Ende noch 2–3 Wiederholungen gegangen wären.</li>
      </ul>

      <h3>Körpergewicht zählt</h3>
      <ul>
        <li>Liegestütz, Klimmzug oder Pistol Squat sind vollwertiges Krafttraining, wenn die Sätze nah ans Muskelversagen gehen. Für Einsteiger reichen wenige Wiederholungen, für Geübte sind 20–30 fordernd. Liegestütze in Stufen brachten in Studien ähnliche Kraftzuwächse wie Bankdrücken (Calatayud et al., 2015; Kotarsky et al., 2018), bei vergleichbarer Belastung auch ähnliches Muskelwachstum (Kikuchi &amp; Nakazato, 2017). Bei leichter Last entscheidet die Nähe zum Versagen (Refalo et al., 2023).</li>
        <li>Orden mit Kondition oder Reise setzen deshalb auf Stufen mit Körpergewicht: ohne Aufbau, überall gleich. Orden für maximalen Muskelaufbau und Maximalkraft bleiben beim Eisen.</li>
        <li>Stufen steigen, wenn alle Sätze zweimal am oberen Ende liegen, zum Beispiel Liegestütz → Deficit → Archer.</li>
      </ul>

      <h3>Bestien</h3>
      <ul>
        <li>Zwei Familien: <strong>Morgenlandbestien</strong> (Namen aus Mesopotamien, Persien und Arabien: Humbaba, Lamassu, Simurgh, Ifrit …) arbeiten gegen externen Widerstand, also Hanteln, Kettlebell, Langhantel, Band oder Sandsack. <strong>Nordbestien</strong> (Volkssagen aus Wald, Moor und Gebirge: Kobold, Undine, Kelpie …) nur mit dem eigenen Körper; Stange, Ringe oder Rudergerät können dazugehören.</li>
        <li>Lastbestien (Morgenland) brauchen genau ein Item (Langhantel, Kurzhantel, Kettlebell, Band oder Sandsack) und haben einen festen Timecap. Alle Lastübungen laufen mit demselben Gewicht bzw. Band. Der Rekord ist das schwerste Gewicht (oder stärkste Band), mit dem du die Bestie im Timecap bezwingst. „Bench Press 50 %“ heißt 50 % deines 1RM; ist es noch unbekannt, legst du das Gewicht selbst fest.</li>
        <li>Jeder Orden hat mindestens eine Bestie pro Woche. Bei ruhigeren Orden kommt in jeder zweiten Woche eine lange Bestie im Grundlagentempo; diese Zeit zählt nicht für die Bestzeit.</li>
        <li>Laufen ersetzen (Wetter, Reise, Knie): Unter ⚙ Anpassen „Laufen ersetzen“ wählen. Rudergerät, Rad, Seilspringen oder Stepper werden nach Belastungszeit umgerechnet, nicht 1:1: 400 m Laufen ≈ 500 m Rudern ≈ 1000 m Rad ≈ 2 Min Seil oder Stepper, Sprints werden zu kurzen Sprints auf dem Gerät. Dauerläufe bleiben gleich lang im gleichen Tempo. „Bestie“ macht aus einem Laufblock eine Bestie ähnlicher Dauer.</li>
        <li>Jede Bestie gibt es <em>entfesselt</em> (die volle Fassung) und <em>mutiert</em>. Ist ein Skill (Setup › Können) nicht angekreuzt, kommt sie mutiert: Nur die Übungen dieses Skills werden durch ihren Ersatz getauscht, etwa Pistols → doppelt so viele Squats, Dragon Flags → dreimal so viele Leg Raises. Dieselbe Bestie kommt nie zwei Wochen hintereinander.</li>
        <li>Cardio am Ort: Gibt der Trainingsort nicht her, was ein Cardio-Element braucht — keine Strecke für Sprints auf dem Laufband, kein Rudergerät im Park, kein Rad —, wird nur dieses Element umgerechnet und ersetzt (gleiche Belastungszeit wie bei „Laufen ersetzen“), der Rest der Bestie bleibt. Sie zählt dann ebenfalls als mutiert, und alle mutierten Fassungen einer Bestie teilen sich eine Bestzeit; das entfesselte Original behält seine eigene. Was am Ort geht, stellst du unter Setup › Equipment ein: „Laufen möglich“, „Sprints möglich“ und „Springseil“ sind eigene Schalter (Vorgabe: Laufen ja, Sprints nein, Springseil ja), Rudergerät und Rad stehen als Geräte. Ohne Rudergerät und Rad wird auf die Laufstrecke umgerechnet, fehlt die auch, bleibt das Springseil. Kann der Ort eine Lücke durch nichts füllen, passt die Bestie dort nicht — aus dem Bestiarium genommen wird sie dafür nicht, sie läuft nur an anderen Orten. Der Bestienpool selbst ändert sich dadurch nicht.</li>
        <li>Reiter „Almanach“: Orden, Bestiarium (alle Bestien mit Übungen, Länge oder Timecap, Ausrüstung, Bestzeiten bzw. Rekorden), Übungen (Arbeitsgewicht, 1RM selbst eintragen oder aus dem Log geschätzt, Verlauf) und das Log.</li>
        <li>Schritt für Schritt: Nach „▶ Start“ zeigt eine Leiste unten, was gerade dran ist und was danach kommt. Wiederholungen tippst du mit „Fertig“ ab, Zeitstationen (Halten, Pausen, Seil, Stepper) laufen mit Countdown und gehen von selbst weiter. Der letzte Schritt stoppt die Uhr und speichert die Zeit. Zu früh weiter? „‹“ geht einen Schritt zurück; nach dem Stopp lässt „Wieder aufnehmen“ die Uhr ab dem ersten Start weiterlaufen.</li>
        <li>Ortsregel: Im Studio (Profil mit „Stationen weit auseinander“) kommen keine Bestien, die Laufband oder Rudergerät mit Stange, Ringen, Langhantel oder Kasten mischen. Band oder Kettlebell kannst du zum Gerät mitnehmen, das bleibt erlaubt. Zuhause und draußen geht alles.</li>
        <li>Zwei Bestien an einem Tag: Nach der ersten startet automatisch die 2-Minuten-Pause.</li>
        <li>Freie Jagd: Im Almanach unter Bestien lässt sich jede Bestie direkt jagen, entfesselt oder mutiert. Die Zeit zählt für Bestzeit, Log und Flugblatt, aber nicht als Trainingseinheit.</li>
        <li>Finisher: In manchen Orden kommt statt eines Arm- oder Rumpf-Supersets eine kurze Bestie aus einem kleinen Pool, die sich abwechseln. Passt keine zum Ort, bleibt das Superset.</li>
        <li>Pullups in Bestien sind immer strikt. Mutiert werden daraus Assisted Pullups, mit Band oder Kipping; bei Muscle-Ups genauso.</li>
        <li>Bestienwahl in allen Orden: Einzelbestie, Doppel (×2) und Serie aus zwei Bestien sind gleichrangig. Die Dauer passt zum Zeitfenster des Tages, das Ziel des Ordens gewichtet (Kraft, Kondition, Ausdauer, Beweglichkeit). Vorrang hat Abwechslung: Was in der Phase schon dran war, kommt erst wieder, wenn alles Passende durch ist. Ist eine Bestie für den Slot zu lang, kommt sie als Kurzform mit weniger Runden (eigene Bestzeit): Leitern behalten die ersten Stufen (16/12/8/4 → 16/12), Buy-in und Buy-out bleiben, gekürzt wird der Innenteil. Die Bestie passt immer in die Zeit, die vom Tag übrig ist. Über den ganzen Orden bevorzugt die Wahl Bestien für Muskeln, die die festen Übungen wenig treffen.</li>
      </ul>

      <h3>Anderer Ort heute</h3>
      <ul>
        <li>Unter ⚙ Anpassen (neben dem Namen der Einheit auf <em>Heute</em>) wählst du den Ort für diese Einheit, zum Beispiel Zuhause statt Studio. Die App nimmt dann die Übungen und Gewichtsstufen dieses Profils. Der Wochenplan bleibt unverändert.</li>
        <li>Gibt es dort dein Gewicht nicht, rechnet die App um: leichter mit mehr Wiederholungen, höchstens 30 (KB Swing 24 kg × 15 im Studio wird zuhause mit 20 kg zu 24 Wiederholungen), schwerer mit weniger. Passt es nicht, korrigiert deine Rückmeldung das nächste Ziel.</li>
      </ul>

      <h3>Übung tauschen</h3>
      <ul>
        <li>Passt dir eine Übung nicht (Gerät besetzt, zwickt, keine Lust): auf <strong>⇄</strong> neben dem Namen tippen und eine Alternative mit ähnlichem Bewegungsmuster wählen.</li>
        <li>Der Tausch gilt für diese Stelle, getrennt je Ort, und bleibt bei Updates erhalten. Die neue Übung bekommt ihre eigenen Gewichte.</li>
        <li>Zurücktauschen: wieder auf ⇄, oder unter Setup › Getauschte Übungen.</li>
      </ul>

      <h3>Testwoche</h3>
      <ul>
        <li>Nach dem Speichern der Werte erscheint die Auswertung: je Bereich Punkte von 0 bis 100 (etwa ein Perzentil), der Vergleich mit deinem letzten Test und ein Vorschlag für die nächste Phase.</li>
        <li>Für den Normvergleich braucht die App Geburtsjahr und Geschlecht (Setup › Profil) und dein Körpergewicht aus dem ersten Cup. Normen gibt es noch nicht für jedes Alter; dann zählt nur dein eigener Verlauf.</li>
      </ul>

      <h3>Allrounder oder Spezialist</h3>
      <ul>
        <li>Allrounder (Standard): Nach einer Testwoche bekommt die nächste Phase einen kleinen Schwerpunkt-Slot für deinen schwächsten Bereich. Das hält, was der Orden sonst liegen lässt. Aufbauen kann ein Slot nicht, dafür ist er zu klein (etwa 10–15 Min. pro Woche).</li>
        <li>Beweglichkeit kommt jeden Trainingstag kurz ins Cool-down, Schnelligkeit und Sprungkraft zweimal pro Woche frisch an den Anfang, Kraftausdauer und Anaerob einmal pro Woche an den kürzesten Tag.</li>
        <li>Trainiert der Orden deinen schwächsten Bereich selbst, nimmt der Slot den zweitschwächsten. Würde der Bereich das Ziel des Ordens stören (Ausdauer neben Muskelaufbau) oder passt er nicht in einen Slot (Maximalkraft, Skill), schlägt die App ihn für die Blockfolge vor: Plan › Blockfolge vorschlagen, „Defizite zuerst“.</li>
        <li>Als Defizit zählt nur, was deutlich unter der Norm liegt (bei mehreren Tests höchstens 40 Punkte, bei einem höchstens 30) oder jenseits des Messfehlers schlechter wurde. So läuft die App nicht jedem Zufall hinterher.</li>
        <li>Spezialist (Setup): kein Slot, die Blockfolge bleibt, wie du sie planst. Je Phase kannst du den Slot im Plan auch fest wählen oder ausschalten.</li>
      </ul>

      <h3>Orte</h3>
      <ul>
        <li>Ein Ort ist ein Name plus das, was dort steht. Eine Kategorie gibt es nicht: Die App nimmt die Übung des Ordens, wenn das Equipment reicht, sonst die nächste Variante aus dem Orden, und erst dann einen Ersatz aus der Bibliothek.</li>
        <li>„Laufen möglich“, „Sprints möglich“ und „Springseil“ sagen, was an diesem Ort geht (Vorgabe: Laufen ja, Sprints nein, Springseil ja). Sie steuern die Bestien: Fehlt die Strecke, das Rudergerät oder das Rad, werden nur die betroffenen Cardio-Elemente umgerechnet — Details unter Bestien.</li>
        <li>Fehlen Weste oder Scheiben, läuft die Übung ohne Zusatzlast, außer der Orden sieht dafür eine eigene Fassung vor (etwa Klimmzüge bis kurz vor Schluss statt schwerer Fünfer).</li>
      </ul>

      <h3>Der Aschekurier (Erzähler)</h3>
      <ul>
        <li>Unter Setup › Erzähler einschalten. Ein Flugblatt berichtet über jeden Orden: ein Widersacher als Endgegner, die Bestien sind sein Gefolge. Die Ausgabe der Woche öffnet das kleine Feder-Logo in der Ordenskarte auf <em>Heute</em> (ein Punkt heißt: neue Ausgabe), alle Ausgaben stehen im Log, am Ende eine Sonderausgabe.</li>
        <li>Einheiten treffen den Widersacher. Volle Wochen, Bestzeiten und mehr Gewicht treffen zusätzlich, einer davon doppelt (die Schwachstelle). Den W20 wirfst du selbst für den Widersacher und trägst ihn in der Wochenausgabe ein; die Zahl bleibt stehen. Der Wurf allein trifft nie: Erst die volle Woche danach ist die Antwort – nach einer Zwanzig trifft sie doppelt so hart. Besiegte Widersacher stehen in der Galerie im Log, entkommene kehren in einem späteren Orden derselben Szene zurück.</li>
        <li>Ruhige Wochen kosten nichts. Der Widersacher fällt nie vor dem letzten Akt; mit etwa 90 % der Einheiten ist er besiegt, sonst entkommt er gezeichnet.</li>
        <li>Die Testwoche wird zum Turnier der Klingen. Jede Klinge muss neu verdient werden: besser, gehalten (im Messfehler) oder diesmal nicht.</li>
        <li>Eigene Welt: eine JSON-Datei im Aufbau von <code>data/narrative/generic.json</code> unter Setup › Erzähler laden. Sie bleibt auf dem Gerät und in deiner Sicherung.</li>
      </ul>

      <h3>Können</h3>
      <ul>
        <li>Unter Setup › Können hakst du ab, was sauber sitzt: Klimmzug, Pistol Squat, Muscle-Up und mehr. Fehlt ein Skill, nimmt die App eine leichtere Variante (Hinweis „leichter“), und Bestien mit dieser Übung kommen mutiert.</li>
        <li>Übungsleitern bleiben der Lernweg zum Skill. Mit abgehaktem Skill starten sie auf der passenden Stufe.</li>
        <li>Schwert: Was du übst, hängt von deinem Können ab, nicht vom Orden. Der Lernweg hat sechs Stufen: Hiebe, Kombiformen, Drehhau, Klingentanz (Drehungen, tiefe Hiebe, Formen am Stück), Doppelmesser (zwei kurze Stöcke), Wanderflechte mit Heaven Six. Sitzt der Test einer Stufe, hakst du sie unter Schwert ab; ab der nächsten Einheit kommt die nächste Stufe. Ab Stufe 2 beginnt jeder Schwertblock mit kurzen Basics (Zorn-, Zwerch-, Scheitelhau) zum Einnorden; der Tag wird dadurch etwas länger, die Bestie bleibt. Der Orden bestimmt nur das Format, etwa 5 Minuten als Klammer oder 20 Minuten Lernweg. Geübt wird ohne Zusatzgewicht.</li>
      </ul>

      <h3>Pausen</h3>
      <ul>
        <li>Die App kürzt die Pausen aus den Orden um 15 s: schwere Grundübungen nie unter 2 Minuten, alles andere nie unter 60 s. Für Muskelaufbau macht das kaum einen Unterschied, solange die Pause über etwa 60–90 s liegt (Singer et al., 2024); für Maximalkraft sind längere Pausen besser, deshalb die Untergrenze (Grgic et al., 2018). Kontrastpaare behalten ihre 3 Minuten.</li>
              <li>Nach dem letzten Satz einer Übung läuft kein Timer, du gehst direkt zur nächsten.</li>
      </ul>

      <h3>Drei oder fünf Tage</h3>
      <ul>
        <li>Vier Tage sind die Basis. Bei drei Tagen arbeitet die App das Wichtigste aus dem vierten Tag in die anderen ein: doppelte Bewegungsmuster fallen weg, der Rest läuft dichter mit Supersets und kürzeren Pausen.</li>
        <li>Bei fünf Tagen kommt ein Zusatztag zwischen die schweren Tage: eine Bestie plus etwas, das es nur dann gibt, je nach Orden zum Beispiel Unterarme, Nacken, Füße, Seilspringen oder Qigong.</li>
      </ul>

      <h3>Tagesanpassung: Kurz · Intensiv · Leise · Kein Platz</h3>
      <ul>
        <li>Unter ⚙ Anpassen neben dem Namen der Einheit. Kurz, Leise und Kein Platz lassen sich kombinieren, Intensiv steht allein. Die Zahl am Zahnrad zeigt, wie viele Anpassungen aktiv sind.</li>
        <li><strong>Kurz:</strong> die vier Kernübungen, Bestie eine Klasse und jede Schwertübung einen Satz kürzer (keine Übung fällt weg), Ziel 35 Minuten — wird die Einheit damit länger, gehen die Sätze runter (mindestens einer je Übung, Kernübungen zuletzt). Grundlagen- und Ausdauertage ohne Kraftübungen behalten ihren Inhalt und laufen kürzer, Richtung 35 Minuten. Das ist kein Deload, sondern Zeit und Tagesform: Das Leben geht vor, und eine kurze Einheit ist ein echter Erfolg. Ausgeglichen wird nur, wenn das Ziel des Ordens leidet: Muskeln, die der Orden aufbaut, bleiben an der unteren Grenze deines Volumenbereichs, alle anderen bei der Erhaltung (4 Sätze pro Woche). Erst kommt ein Satz mehr an passenden Übungen dazu, dann wandern weggefallene Kernübungen auf einen anderen Tag, und wenn die Zeit knapp wird, laufen Übungen als Superset. Kein Ausgleichstag überschreitet sein Zeitlimit und wächst höchstens 15 Minuten über seine normale Dauer — drei kurze Tage machen also keinen langen vierten. Spontan gleichen nur die Tage danach aus; ist es der letzte Tag der Woche, entfällt der Ausgleich. Der Grund steht in den Details der betroffenen Übung (Dosis antippen).</li>
        <li><strong>Intensiv:</strong> Bestien kommen eine Klasse länger (der Tag darf bis zu 15 Minuten länger werden), jede Schwertübung bekommt einen Satz mehr. Kraft, Hypertrophie und Ausdauer bleiben, wie geplant. Nur an Tagen mit Bestie oder Schwert.</li>
        <li><strong>Leise:</strong> die Bestie kommt als leise Bestie, ohne Sprünge, Burpees, Split Lunges, Sprints, Läufe oder Langhantel vom Boden; Mountain Climbers und Swings bleiben. Laute Übungen im Training werden ersetzt: Deadlift durch Romanian Deadlift, Sprünge durch KB Swings oder Goblet Squats, Medizinballwürfe durch Woodchopper oder Push-Ups. Kein Laufen, keine Intervalle, Finisher bleiben Superset, kurzes Warm-up. Nur wenn es für eine Bestie keine leise Fassung gibt, wandert sie auf einen anderen Tag dieser Woche (notfalls kürzer oder mit Supersets, höchstens 5 Minuten mehr). Etwa für die Wohnung oder den Arbeitsplatz; mit Kurz zusammen wird es noch ruhiger.</li>
        <li><strong>Kein Platz:</strong> alles auf der Stelle. Farmer's Carry wird zum Marschieren auf der Stelle (40 Schritte), Walking Lunges zu Reverse Lunges, Crawls zu Mountain Climbers; Bestien ohne Lunge Walk, Crawl, Weitsprung oder Sprint.</li>
        <li>Kurz, Leise und Kein Platz lassen sich im Anpassen-Menü für einen Wochentag fixieren („Für jeden Freitag fixieren“), über alle Phasen; Plan › Deine Woche zeigt, was fixiert ist. Dann plant die App die Woche schon darauf hin: Ein gemerkter Kurztag gleicht über die ganze Woche aus. Kurz geht nur für einen Wochentag.</li>
        <li>Deficit Push-Ups brauchen Liegestützgriffe, Yoga-Blöcke, Ringe oder Kurzhanteln (Setup › Equipment). Fehlt das am Ort, kommen Banded Push-Ups, ohne Band normale Push-Ups mit einem Satz mehr.</li>
      </ul>

      <h3>Entlastungswoche</h3>
      <ul>
        <li>Vorschlag der App, wenn es Zeit ist: halbe Sätze, mindestens zwei, und keine Bestien. Gewichte, Übungen und Trainingstage bleiben, wie sie sind. Angenommen oder abgelehnt wird direkt in der Einblendung; über „Weiter normal trainieren“ jederzeit widerrufbar. Ein „nein“ gilt nur für die eine Woche.</li>
        <li>Empfohlen wird nach Rhythmus — in Phasen ab acht Wochen ab der fünften Woche alle vier Wochen — oder reaktiv, wenn du in zwei Wochen dreimal „zu schwer“ gemeldet hast. Nie in oder direkt vor einer Testwoche und nie dicht nach der letzten Entlastung.</li>
        <li>Warum kein Extra-Wachstum zu erwarten ist: Eine Woche Komplettpause mitten im Programm hat das Muskelwachstum nicht verbessert und die Unterkörper-Kraft sogar leicht verschlechtert (Coleman et al., 2024); Entlastungswochen mit weniger Volumen und Frequenz haben Wachstum und Kraftausdauer nicht gebremst (Pancar et al., 2026). Die Entlastung ist Ermüdungs- und Risikomanagement, kein Trainingsreiz.</li>
        <li>Warum die leichte Woche besser ist als gar nicht trainieren: Beinkraft hält drei bis fünf Tage Pause aus, die Kraft oben war nach fünf Tagen schon messbar leichter (Travis et al., 2022). Weitertrainieren mit halber Last schlägt das Aussetzen.</li>
      </ul>

      <h3>Alltagslast</h3>
      <ul>
        <li>Ist in einer Phase viel los, läuft etwa die Hälfte der Übungen eines Tages an Maschine oder Kabel, wenn das Studio sie hat. Was ohnehin an Maschine oder Kabel läuft, zählt mit: Ein Maschinentag bleibt unverändert. Der erste große Lift des Tages bleibt frei.</li>
        <li>Warm-up und Cool-down anpassen: in der Einheit aufklappen, „✎ Bearbeiten“. Mit ✕ fliegt eine Übung raus, über „+ Übung hinzufügen“ kommt eine aus dem Katalog dazu. Das gilt dauerhaft für diesen Tag des Ordens, auch in späteren Phasen. „Auf Vorgabe des Ordens zurücksetzen“ macht es rückgängig. Das Training selbst bleibt fest.</li>
      </ul>

      <h3>Timer</h3>
      <ul>
        <li>Zeitübungen starten mit 4 Sekunden Vorlauf, die letzten 5 Sekunden piepen. Der Ton braucht einmal einen Fingertipp auf die Seite.</li>
        <li>Übungen für links und rechts: Nach Ablauf der linken Seite startet die rechte von selbst, wieder mit 4 Sekunden Vorlauf.</li>
      </ul>

      <h3>Literatur</h3>
      <Collapse title="Quellen der App" meta={`${REFS.refs.length} · geprüft ${REFS.checked.split("-").reverse().join(".")}`}>
        <ul className="refs small">
          {REFS.refs.map((r) => <li key={r.short}>{r.text} <a href={r.url} target="_blank" rel="noreferrer">Link</a></li>)}
        </ul>
      </Collapse>

      <h3>Deine Daten</h3>
      <ul>
        <li>Alles bleibt auf diesem Gerät, in diesem Browser. Öffne die App immer auf demselben Weg (am besten über das Symbol auf dem Startbildschirm).</li>
        <li>Im Log: „Wochenüberblick“ zählt harte Sätze pro Muskel, als Richtwert ohne Wertung: das helle Feld ist der Wachstumsbereich, die schmale Linie zeigt, wo in etwa die Erhaltung beginnt. „Verlauf“ zeigt jede Übung und Bestie über die Zeit.</li>
        <li>Nach 10 Tagen oder mehr ohne Training läuft die erste Woche automatisch mit −1 Satz und etwas leichteren Gewichten.</li>
        <li>Automatische Sicherung (Setup › Sichern und Wiederherstellen, Standard wöchentlich): Nach einer abgeschlossenen Einheit legt die App order-sicherung.json in den Download-Ordner. Am Rechner kannst du stattdessen eine feste Datei wählen, die bei jeder Einheit überschrieben wird. Browserdaten löschen trifft diese Dateien nicht.</li>
        <li>Wiederherstellen: Einrichtung › „Schon mal eingerichtet?“ › Sicherung laden, dann die neueste Datei wählen.</li>
      </ul>
    </div>
  );
}
