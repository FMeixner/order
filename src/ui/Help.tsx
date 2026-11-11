/* Kurze Anleitung, erreichbar über das ? oben rechts. */
import REFS from "../../data/modules/references.json";
import { Collapse } from "./common";
export function Help() {
  return (
    <div className="stack help-body">
      <h3>Der Ablauf</h3>
      <ul>
        <li><strong>Heute</strong> zeigt die Einheit des Tages. Oben wählst du den Trainingstag der Woche. Mit ‹ › neben der Wochenzahl blätterst du: künftige Wochen als Vorschau, vergangene zum Nachtragen. Tage mit Schwert tragen „Schwert“ im Tagesknopf. Die Vorschau zeigt den Schwertblock auch, wenn das Profil des Tages kein Schwert hat, darunter den Ersatz (meist der Mobility-Flow für Hüfte und Schulter). So siehst du, welchen Tag du auf zuhause legen solltest.</li>
        <li><strong>Plan</strong>: oben das Jahresbild in drei Ebenen — Lebensabschnitte (Balken = Alltagslast), Zeichen (Ziel und Kalorien) und Orden (Variation), dazu der Strich für heute. Antippen öffnet Orden, Zeichen oder Testwoche. Darunter der Stapel, nach Zeichen gruppiert: − / + ändert die Länge wochenweise, der Stift öffnet das Phasenblatt, das Testwochen-Symbol am Orden zeigt die Cups. Weit Voraus liegt hinter „Später“. „Jahr planen“ führt durch den Assistenten, das Symbol links daneben zeigt rote Uhren und Lücken. Symbole: ▲ Hinweis, ⦸ passt nicht, Schloss = von Hand gesetzt, ↑ = ↓ Überschuss, Erhaltung, Defizit, ● ◐ ○ trägt das Ziel des Zeichens ganz, teilweise, nicht. Text steht im Tooltip und im Phasenblatt.</li>
        <li><strong>Almanach</strong>: Orden (alle Programme), Bestien (mit Bestzeiten, zum freien Jagen), Übungen (Arbeitsgewicht, 1RM, Verlauf) und das Log.</li>
        <li>Jahr planen (Assistent): 1 Ziel — Richtung, Testwochen, Hausorden (aus diesen schlägt die App vor). 2 Zeichen — deine Lebensabschnitte, darüber die Zeichen; jedes Zeichen lässt sich antippen und tauschen. 3 Schwachstellen — rote Uhren und Lücken, die Vorschläge greifen sie auf. 4 Orden — je Zeichen die Orden mit Zielbindung, antippen zeigt Alternativen; dazu die Kalorien je Zeichen. Was du von Hand wählst, wird gepinnt und bleibt beim nächsten Planen stehen. Laufende Zeichen und Vergangenes bleiben unberührt.</li>
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

      <h3>Dosis: Bestien zählen wie Sätze</h3>
      <ul>
        <li>Bestien laufen nicht neben dem Training her, sie zählen genauso. Eine Bestie zählt so, wie du sie brichst: Schaffst du 25 Push-ups am Stück, sind 50 Push-ups zwei Päckchen, und ein Päckchen ist ein halber Satz. Halb, weil Bestienrunden oft weit vor dem Muskelversagen enden. Venus mit vier Runden aus 50 Push-ups, 20 Crunches und 50 Squats bringt so 4 Sätze Drücken, 2 Rumpf und 2 Beine — verteilt über die Muskeln wie jede Übung im Studio. Halten und Strecken zählen ein Päckchen je Runde, Laufen und Rudern zählen als Kondition.</li>
        <li>Die Päckchengröße startet nach deinem Niveau. Push-ups und Klimmzüge folgen nach jeder Testwoche deinem Testwert (60 % des Maximums). Unter Setup › Päckchen trägst du eigene Werte ein. Wer stärker wird, braucht weniger Päckchen für dieselbe Bestie — dann wählt die App mehr Runden oder härtere Bestien.</li>
        <li>Zwei Achsen je Orden: Muskel (harte Sätze je Muskel und Woche) und Kondition (Minuten). Jede steigt, steigt sanft oder bleibt stark — je nach Ziel des Ordens. Pilgrim baut Ausdauer auf, King steigt sanft auf beiden, Magician steigt sanft in der Ausdauer.</li>
        <li>Die Welle: Zwischen zwei Entlastungen steigt das Ziel Woche für Woche, vom unteren zum oberen Richtwert deines Niveaus. Danach wird es schwerer (Stufe 2 bevorzugt Bestien mit Archer, Clapping oder Muscle-Ups, Stufe 3 auch Lastbestien) und das Volumen beginnt wieder unten. Die Welle wendet auch, wenn du die Entlastung auslässt. Mehr Volumen bringt mit abnehmendem Ertrag mehr (Pelland et al., 2024); ständig steigendes Volumen war bei Trainierten einem gleichbleibenden nicht überlegen (Aube et al., 2022) — darum Wellen statt einer endlosen Treppe.</li>
        <li>Geplant wird zu Beginn des Ordens: Was die Bestienplätze nicht erreichen können, senkt die ganze Welle gleichmäßig. Ziele gelten je Muskel; die Bestien füllen in vier Gruppen auf (Push, Pull, Beine, Rumpf): Klimmzüge in einer Bestie füllen Rücken oder Bizeps, Squats Quadrizeps oder Gesäß. Die Bestienwahl schiebt keine Gruppe mehr als 15 % über das Ziel, wo es anders geht; Abwechslung geht vor, ein Überhang von höchstens einem Satz ist der Preis dafür. Intervalle wachsen mit der Welle um bis zu zwei Runden, nie über das Zeitlimit des Tages. Für die Ausdauer zählt vor allem die Intensität (Hickson et al., 1985).</li>
        <li>An jeder Bestie steht, was sie zur Woche beiträgt.</li>
        <li>Rumpf hat in jedem Orden ein festes Ziel (unterer Richtwert deines Niveaus), unabhängig von Welle und Modus: Rumpfarbeit ermüdet wenig und passt gut ins Superset. Was weder feste Übungen noch Bestienplätze erreichen können, senkt das Ziel, damit es erreichbar bleibt.</li>
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
        <li>Ein Testtag läuft wie eine Einheit: ein Warm-up zum Abhaken für den ganzen Tag, die Cups, am Ende das Cool-down. Hinweise (i) und der Erzähler (Feder) liegen hinter Symbolen.</li>
        <li>Unter jedem Testtag steht die Tagesbilanz, sobald ein Wert gespeichert ist: Wert, Punkte gegen die Altersnorm (0–100, etwa ein Perzentil) und der Vergleich mit deinem letzten Test. So weißt du schon nach dem Kraft-Cup, wo du stehst.</li>
        <li>Ist jeder Cup eingetragen (oder die Woche vorbei), steht oben das Ergebnis der Testwoche: Bereiche gegen die Norm, was besser wurde, beim Erzähler der Ausgang des Turniers. Darunter „Orden nach Schwachstellen optimieren“: öffnet „Jahr planen“ mit den Defiziten aus den Tests. Die ausführliche Auswertung mit Vorschlägen bleibt darunter aufklappbar.</li>
        <li>Nach der Testwoche kommt keine eigene Entlastung und kein „Willkommen zurück“: Die Testwoche ist die Pause.</li>
        <li>Für den Normvergleich braucht die App Geburtsjahr und Geschlecht (Setup › Profil) und dein Körpergewicht aus dem Balmung-Cup. Normen gibt es noch nicht für jedes Alter; dann zählt nur dein eigener Verlauf.</li>
      </ul>

      <h3>Zeichen</h3>
      <ul>
        <li>Ein Zeichen hält ein Ziel über 8–16 Wochen und endet mit der Testwoche: Bär (Muskelzuwachs), Stier (Kraft), Falke (Athletik), Fuchs (Skill: Turnen, Parkour, Kampfsport), Wolf (Allround und Kondition) oder Hirsch (Erneuerung). Der Hirsch ist eine Atempause von 4–6 Wochen: Wie ein Hirsch sein Geweih abwirft und ein größeres nachschiebt, macht er Gelenke, Sehnen, Beweglichkeit und Kopf fit für das nächste Zeichen, das direkt danach kommt und mit der Testwoche endet. Jeder Hirsch-Orden hält mit einem Erhaltungsblock Kraft und Muskel (mindestens 4 harte Sätze pro großem Muskel und Woche), und der Schwerpunkt-Slot hält dein wichtigstes Ziel warm. Nur wenn Beweglichkeit oder Erholung dein wichtigstes Ziel ist, bleibt der Hirsch ein volles Zeichen. Darin laufen ein bis drei Orden — bis 8 Wochen einer, bis 12 zwei, darüber drei. Das Zeichen bindet das Ziel, die Orden bringen die Variation.</li>
        <li>Zeichen rasten an den Grenzen deiner Lebensabschnitte ein, mit ein bis zwei Wochen Spielraum; sie dürfen Abschnitte überspannen, ein langer Abschnitt trägt zwei.</li>
        <li>Die Orden wählt die App nach Zielbindung (trägt der Orden das Ziel), Variation (nicht zweimal derselbe) und Verlauf (Aufbau früh, Umwandlung und Zuspitzung spät). Zeit-Orden unter 35 Minuten tragen ein Ziel nur teilweise.</li>
        <li>Jahresbogen: Zeichen bauen aufeinander auf — Masse wird zu Kraft, Kraft zu Explosivität, dann Kondition, dann wieder Masse. Das vorige Zeichen bereitet das nächste vor (Issurin, 2010). Die App gibt dieser Folge einen kleinen Vorrang; Ziele, Alltagslast und Jahreszeit wiegen schwerer. Wie viel die Reihenfolge allein bringt, ist nicht gut belegt.</li>
        <li>In einem Zeichen mit drei Orden laufen erst zwei Aufbau-Orden, die Umwandlung kommt zuletzt, direkt vor der Testwoche. Wer zwei Studio-Tage hat, baut Masse und Kraft im Studio; Orden ohne Studio sind für Reisen und Zeiten ohne Studio.</li>
        <li>Übergabe zwischen Orden: Dieselbe Übung nimmt ihr Gewicht mit. Wechselt der Wiederholungsbereich (Bench Press 4 × 8–12 im Aufbau, dann 4 × 4–6 im Kraft-Orden), rechnet die App das Gewicht um, vorsichtig für das obere Ende des neuen Bereichs (Formel nach Epley, 1985). Der Hinweis steht an der Übung; deine Rückmeldung justiert in ein, zwei Einheiten.</li>
        <li>Die Entlastung zählt über das ganze Zeichen: ab der fünften Woche alle vier Wochen, auch wenn ein Orden darin kürzer läuft.</li>
        <li>Warnung am letzten Teil: Sprungkraft und Schnelligkeit klingen ohne Reiz in wenigen Wochen ab — im letzten Orden vor der Testwoche misst sie die Testwoche nicht mehr im Vollbesitz.</li>
      </ul>

      <h3>Stand: dein Dashboard</h3>
      <ul>
        <li>Der Reiter „Stand“ bündelt, was vorher verteilt war: oben dein Jahr in drei Ebenen, dann jeder Bereich in einer Zeile mit <strong>Test</strong> (Punkte ≈ Perzentil der Altersnorm aus der letzten Testwoche, ~ ist eine Schätzung, der Pfeil zeigt die Richtung seit dem Test davor) und <strong>Zustand</strong> (gut, bald, fehlt). Ein Dreieck markiert Schwachstellen aus den Tests. Antippen zeigt die Zahlen dahinter.</li>
        <li>Darunter: woran der Schwerpunkt-Slot gerade arbeitet, die Waage Spezialist ↔ Allrounder, die Bilanz der letzten Testwoche mit „Auswertung“ und „Orden nach Schwachstellen optimieren“, und aufklappbar Volumen und Verlauf.</li>
        <li>Setup liegt jetzt oben rechts hinter dem Regler-Symbol.</li>
      </ul>

      <h3>Bereiche: im Blick</h3>
      <ul>
        <li>Neun Bereiche — Kraft, Muskel, Spritzigkeit, Kraftausdauer, Intervalle, Grundausdauer, Beweglichkeit, Sehnen, Skill — mit einem Zustand: <strong>gut</strong>, <strong>bald</strong> oder <strong>fehlt</strong>. Zu finden im Reiter „Stand“ und in „Jahr planen“, Schritt 3; das Symbol links neben „Jahr planen“ zählt „bald“ und „fehlt“ und führt zum Stand.</li>
        <li>Dahinter stehen zwei Messungen (Antippen zeigt beide): wie lange der letzte Reiz her ist (Spritzigkeit hält etwa eine Woche, Kraftausdauer und Intervalle zwei, Grundausdauer, Beweglichkeit und Sehnen drei, Kraft und Muskel einen Monat) und wie viele Wochen das nächste halbe Jahr den Bereich trägt (Hauptziel voll, Nebenziel halb, Schwerpunkt-Slot halb; Richtwert vier).</li>
        <li>„fehlt“: keine Woche im Plan. „bald“: fällig, noch nie trainiert, knapp im Plan oder bald fällig. Muskel und Sehnen haben keinen Richtwert.</li>
        <li>Was „bald“ oder „fehlt“ ist, ziehen die Vorschläge: Zeichen, Orden und der Schwerpunkt-Slot (Erhalt) bevorzugen, was es hält. Darunter steht, womit du einen Bereich ohne Umplanen bedienst.</li>
        <li>Abwechslung: Kein Hauptziel mehr als zweimal in Folge (ein Zeichen zählt als eins) — Harlequin unterbricht die Reihe. Die Waage zeigt, ob das nächste halbe Jahr eher Spezialist oder Allrounder ist. Alles bleibt Hinweis, nichts wird gesperrt.</li>
      </ul>

      <h3>Kalorien: Energie zur Last passen</h3>
      <ul>
        <li>Jedes Zeichen trägt einen Kalorien-Modus. Die Rangfolge: Last zuerst — kein Defizit bei hoher Last, und mittlere Last zählt nach acht Wochen ohne ruhigen Abschnitt als hohe (Dauerlast). Dann der Kalender: im Winter Überschuss für Aufbau, im Sommer Defizit-Fenster. Auf Reisen Erhaltung, kohlenhydratbetont — dazu passt Athletik. Zuletzt der Grundmodus des Zeichens.</li>
        <li>Du kannst den Modus je Zeichen im Assistenten oder je Phase im Phasenblatt ändern; die App zeigt Konflikte als Symbol, sie sperrt nichts.</li>
      </ul>

      <h3>Schwerpunkt: ein Slot je Orden, im Jahr verteilt</h3>
      <ul>
        <li>Jeder Orden (ab 45 Minuten) hat einen Schwerpunkt-Slot — eine kleine Zusatzdosis, höchstens ein Viertel der Wochenzeit. Befüllt wird er in der Jahresgesamtschau: Nicht jede Phase muss alles schaffen, das Jahr muss stimmen.</li>
        <li>Vier Zwecke, in dieser Rangfolge: <strong>Testdefizit</strong> (deutlich unter der Norm oder schlechter geworden, und der Orden trainiert es nicht selbst) · <strong>Double down</strong> im Zeichen deines wichtigsten Ziels (der Orden trainiert den Bereich selbst, der Slot legt nach) · <strong>Erhalt</strong> (der Plan ließe den Bereich sonst verfallen — je länger vernachlässigt, desto eher) · <strong>Sekundärziel</strong> des Ordens.</li>
        <li>Nie gegen den Orden: Ausdauer und Intervalle bekommen neben Muskel-, Kraft- und Schnellkraft-Orden keinen Slot (Interferenz) — sie gehen in die Wahl der Zeichen. Derselbe Bereich zweimal in Folge wird vermieden, außer bei einem Testdefizit.</li>
        <li>Beweglichkeit kommt jeden Trainingstag kurz ins Cool-down, Schnelligkeit und Sprungkraft zweimal pro Woche frisch an den Anfang, Kraftausdauer und Anaerob einmal pro Woche an den kürzesten Tag.</li>
        <li>Als Defizit zählt nur, was deutlich unter der Norm liegt (bei mehreren Tests höchstens 40 Punkte, bei einem höchstens 30) oder jenseits des Messfehlers schlechter wurde. So läuft die App nicht jedem Zufall hinterher.</li>
        <li>Im Phasenblatt steht der Schwerpunkt mit Zweck; „Automatisch“, eine eigene Wahl oder „Aus“. Im Assistenten (Schritt 4) steht er unter jedem Orden, in Schritt 3 zählt er halb für die Wochen im Plan.</li>
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

      <h3>Ansage-Drill</h3>
      <ul>
        <li>Die App ist dein Partner: Sie ruft zufällig eine Richtung, einen Hieb oder einen Schlag, per Sprache und in großer Schrift (wählbar: beides, nur Ton, nur Schrift). Du entscheidest im Moment und bewegst dich. Der Abstand zwischen den Ansagen ist zufällig, damit nichts vorhersehbar wird. Feste Farben: links blau, rechts orange, vor grün, zurück bernstein, „Nicht …!“ rot.</li>
        <li>Varianten: Richtung (Scout), Antritt draußen (Skirmisher), Klinge (Scout, mit Schwert oder Stock; ohne kommen Richtungen), Schattenboxen (Pugilist), Stab (King, ruhig und genau statt schnell; ohne Stock entfällt er).</li>
        <li>Stufen: Richtungen und Schattenboxen steigern sich über die Wochen im Orden (Woche 3 mit Schritten oder Serien, ab Woche 5 Gegenteil-Ansagen wie „Nicht links!“ oder Konter). Klinge und Stab folgen deinem Lernweg: Gerufen wird nur, was du schon gelernt hast. Die neueste Stufe kommt öfter dran.</li>
        <li>Kurztag: halb so viele Runden. Entlastungs- und leichtere Wochen: eine Runde weniger.</li>
        <li>Warum: Bewegung mit Denkanforderung ist eine plausible Brücke zur kognitiven Fitness (Tomporowski & Pesce, 2019), und Training wirkt messbar, wenn auch klein, auf die Kognition (Ludyga et al., 2020). Dass gerade dieses Format mehr bringt als normales Training, ist nicht direkt belegt. Darum heißt es hier „Entscheiden unter Zeitdruck“, nicht Gehirntraining.</li>
      </ul>
      <h3>Tagesanpassung: Kurz · Intensiv · Leise · Kein Platz · Fällt aus</h3>
      <ul>
        <li>Unter ⚙ Anpassen neben dem Namen der Einheit. Kurz, Leise und Kein Platz lassen sich kombinieren, Intensiv steht allein. Die Zahl am Zahnrad zeigt, wie viele Anpassungen aktiv sind.</li>
        <li><strong>Kurz:</strong> verdichtet statt zu streichen. Bis zu fünf Übungen (Kernübungen zuerst), Gegenspieler laufen als Superset (Brust und Rücken, Quadrizeps und Beinbeuger, Bizeps und Trizeps), Bestie eine Klasse und jede Schwertübung einen Satz kürzer, Ziel 30 Minuten. Reicht das nicht, gehen die Sätze gleichmäßig runter: erst bis zwei, dann fällt die fünfte Übung, dann bis einer. Grundlagen- und Ausdauertage ohne Kraftübungen behalten ihren Inhalt und laufen kürzer. In einer Entlastungswoche gilt die Entlastung; Kurz kürzt dann nur noch auf die vier Kernübungen, ohne Supersets und ohne Ausgleich. Für Wochen, in denen du absehbar wenig Zeit hast, gibt es Herald: ein Orden, der auf 25 Minuten ausgelegt ist. Das ist kein Deload, sondern Zeit und Tagesform: Das Leben geht vor, und eine kurze Einheit ist ein echter Erfolg. Ausgeglichen wird nur, wenn das Ziel des Ordens leidet: Muskeln, die der Orden aufbaut, bleiben an der unteren Grenze deines Volumenbereichs, alle anderen bei der Erhaltung (4 Sätze pro Woche). Erst kommt ein Satz mehr an passenden Übungen dazu, dann wandern weggefallene Kernübungen auf einen anderen Tag, und wenn die Zeit knapp wird, laufen Übungen als Superset. Kein Ausgleichstag überschreitet sein Zeitlimit und wächst höchstens 15 Minuten über seine normale Dauer — drei kurze Tage machen also keinen langen vierten. Spontan gleichen nur die Tage danach aus; ist es der letzte Tag der Woche, entfällt der Ausgleich. Der Grund steht in den Details der betroffenen Übung (Dosis antippen).</li>
        <li><strong>Intensiv:</strong> Bestien kommen eine Klasse länger (der Tag darf bis zu 15 Minuten länger werden), jede Schwertübung bekommt einen Satz mehr. Kraft, Hypertrophie und Ausdauer bleiben, wie geplant. Nur an Tagen mit Bestie oder Schwert.</li>
        <li><strong>Leise:</strong> die Bestie kommt als leise Bestie, ohne Sprünge, Burpees, Split Lunges, Sprints, Läufe oder Langhantel vom Boden; Mountain Climbers und Swings bleiben. Laute Übungen im Training werden ersetzt: Deadlift durch Romanian Deadlift, Sprünge durch KB Swings oder Goblet Squats, Medizinballwürfe durch Woodchopper oder Push-Ups. Kein Laufen, keine Intervalle, Finisher bleiben Superset, kurzes Warm-up. Nur wenn es für eine Bestie keine leise Fassung gibt, wandert sie auf einen anderen Tag dieser Woche (notfalls kürzer oder mit Supersets, höchstens 5 Minuten mehr). Etwa für die Wohnung oder den Arbeitsplatz; mit Kurz zusammen wird es noch ruhiger.</li>
        <li><strong>Kein Platz:</strong> alles auf der Stelle. Farmer's Carry wird zum Marschieren auf der Stelle (40 Schritte), Walking Lunges zu Reverse Lunges, Crawls zu Mountain Climbers; Bestien ohne Lunge Walk, Crawl, Weitsprung oder Sprint.</li>
        <li>Kurz, Leise und Kein Platz lassen sich im Anpassen-Menü für einen Wochentag fixieren („Für jeden Freitag fixieren“), über alle Phasen; Setup › Deine Woche zeigt, was fixiert ist. Dann plant die App die Woche schon darauf hin: Ein gemerkter Kurztag gleicht über die ganze Woche aus. Kurz geht nur für einen Wochentag.</li>
        <li><strong>Fällt aus:</strong> Eine Einheit klappt diese Woche nicht? Unter ⚙ Anpassen „Fällt aus“ wählen. Die App verdichtet die Woche: Erst wandern die Kernübungen auf die offenen Tage danach, dann bekommt jeder Muskel, der sonst unter die Erhaltung fiele (4 Sätze pro Woche), einen Satz mehr oder die passende Übung. Der Rest entfällt, Bestien und Module zuerst. Schwere Grundübungen laufen nie im Superset, und es gibt nie zwei Beintage direkt hintereinander. Kein Tag wird länger als sein Zeitlimit; wer will, erlaubt beim Auslösen bis zu 15 Minuten mehr. Bleibt nur eine Einheit, wird sie Ganzkörper aus den Kernübungen beider Tage, je zwei Sätze. Etwa ein Drittel des üblichen Volumens hält Kraft und Muskeln über Wochen (Bickel et al., 2011): eine dünne Woche kostet also nichts. „Doch trainieren“ nimmt es zurück.</li>
        <li>Deficit Push-Ups brauchen Liegestützgriffe, Yoga-Blöcke, Ringe oder Kurzhanteln (Setup › Equipment). Fehlt das am Ort, kommen Banded Push-Ups, ohne Band normale Push-Ups mit einem Satz mehr.</li>
      </ul>

      <h3>Entlastungswoche</h3>
      <ul>
        <li>Vorschlag der App, wenn es Zeit ist: halbe Sätze, mindestens zwei, und keine Bestien. Gewichte, Übungen und Trainingstage bleiben, wie sie sind. Angenommen oder abgelehnt wird direkt in der Einblendung; über „Weiter normal trainieren“ jederzeit widerrufbar. Ein „nein“ gilt nur für die eine Woche.</li>
        <li>Empfohlen wird nach Rhythmus — in Phasen ab acht Wochen ab der fünften Woche alle vier Wochen — oder reaktiv, wenn du in zwei Wochen dreimal „zu schwer“ gemeldet hast. Nie in oder direkt vor einer Testwoche — die Woche davor läuft ohnehin mit −1 Satz, jedes Mal gleich, damit die Testwerte vergleichbar bleiben; eine volle Entlastung würde sie schönen —, und nie dicht nach der letzten Entlastung. Liegt ein Ordenswechsel bis zu zwei Wochen neben dem Rhythmus, kommt die Entlastung in die erste Woche des neuen Ordens.</li>
        <li>Warum kein Extra-Wachstum zu erwarten ist: Eine Woche Komplettpause mitten im Programm hat das Muskelwachstum nicht verbessert und die Unterkörper-Kraft sogar leicht verschlechtert (Coleman et al., 2024); Entlastungswochen mit weniger Volumen und Frequenz haben Wachstum und Kraftausdauer nicht gebremst (Pancar et al., 2026). Die Entlastung ist Ermüdungs- und Risikomanagement, kein Trainingsreiz.</li>
        <li>Warum die leichte Woche besser ist als gar nicht trainieren: Beinkraft hält drei bis fünf Tage Pause aus, die Kraft oben war nach fünf Tagen schon messbar leichter (Travis et al., 2022). Weitertrainieren mit halber Last schlägt das Aussetzen.</li>
      </ul>

      <h3>Alltagslast</h3>
      <ul>
        <li>Dauerlast: Mittlere Last über viele Wochen wirkt wie hohe. Der erste Orden eines mittleren Abschnitts läuft normal; ein Orden, der nach fünf oder mehr Wochen mittlerer Last beginnt, wechselt auf geführt wie in einer Phase mit hoher Last. Läuft ein Orden acht Wochen oder länger in hoher Last, kommt ab seiner Mitte noch eine geführte Übung dazu. Umgestellt wird nie alles: Der erste freie Lift des Tages bleibt frei.</li>
        <li>Neue Übung, bekanntes Gewicht: Hat eine Übung noch kein Gewicht, schätzt die App es aus einer verwandten (Chest Press aus Bench Press, Front Squat aus Back Squat, Kurzhantel aus Langhantel). Die Verhältnisse sind Erfahrungswerte, Maschinen unterscheiden sich stark. Darum startet die Schätzung 15 % tiefer und steht als Schätzung an der Übung.</li>
        <li>Die Last gilt je Woche: Liegen einzelne Wochen einer ruhigen Phase in einem Lebensabschnitt mit hoher Last (Prüfungen), laufen genau diese Wochen in der Form für hohe Last. Auf der Heute-Karte steht dann „Hohe Last“.</li>
        <li>Ist in einer Phase viel los, läuft etwa die Hälfte der Übungen eines Tages an Maschine oder Kabel, wenn das Studio sie hat. Was ohnehin an Maschine oder Kabel läuft, zählt mit: Ein Maschinentag bleibt unverändert. Der erste große Lift des Tages bleibt frei.</li>
        <li>Satzende: Manche Übungen in Orden mit Körpergewicht, Band und Kurzhantel (Barbarian, Mercenary, Conqueror) haben ein Zeichen am Namen. <strong>Myo-Reps</strong>: Nach dem letzten Satz kommen drei Atemzüge Pause, dann 3–5 Wiederholungen, bis zu vier Mal. <strong>Drop-Set</strong>: Nach dem letzten Satz geht es mit etwa einem Viertel weniger Gewicht sofort weiter, zweimal. <strong>Mechanischer Drop</strong>: Nach dem letzten Satz folgt ohne Pause die leichtere Variante, etwa Deficit Push-Up → Push-Up → Incline Push-Up. So kommen leichte Lasten nah genug ans Muskelversagen und wirken, ohne mehr Zeit zu kosten. In Entlastungswochen entfällt das Satzende; bei hoher Alltagslast bleibt es nur an kleinen Ergänzungsübungen.</li>
        <li>Cluster-Satz: Ein Satz läuft in Portionen mit 20 s Pause dazwischen, zum Beispiel Deadlift als 3 einzelne Wiederholungen. Langfristig bringt das gleich viel Kraft und Muskel wie Sätze am Stück, ermüdet aber weniger und hält jede Wiederholung schnell (Davies et al., 2021). Smith nutzt Cluster an Kniebeugen und Deadlift nur in Phasen mit hoher Alltagslast; Scout macht den Hang Power Clean immer als Einzelwiederholungen.</li>
        <li>Warm-up macht nur beweglich und bereit für den Tag, ohne Kraft- oder Aufbauübungen; Cool-down dehnt mit wenigen großen Dehnungen (45–60 s) die Teile, die trainiert wurden. Black Roll und Black-Roll-Ball stehen unter Setup › Equipment; fehlen sie am Ort, kommt ein Ersatz ohne Rolle. Viele Kraftorden beginnen mit einer oder zwei Isolationsübungen (etwa Cable Fly vor Bench Press): Das wärmt vor, die Grundübung danach braucht einen Aufwärmsatz weniger.</li>
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

