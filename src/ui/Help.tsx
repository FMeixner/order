/* Kurze Anleitung, erreichbar über das ? oben rechts. */
export function Help() {
  return (
    <div className="stack help-body">
      <h3>Der Ablauf</h3>
      <ul>
        <li><strong>Heute</strong> zeigt die Einheit des Tages. Oben wählst du den Trainingstag der Woche. Mit ‹ › neben der Wochenzahl blätterst du: künftige Wochen als Vorschau, vergangene zum Nachtragen.</li>
        <li><strong>Plan</strong> ist dein Jahr in Phasen. Jede Phase hat einen Orden und eine Alltagslast. „Blockfolge vorschlagen“ wählt die Orden für kommende Phasen, auf Wunsch mit Schwerpunkt.</li>
        <li><strong>Orden</strong> listet alle Programme mit Details.</li>
        <li><strong>Log</strong> zeigt abgeschlossene Einheiten, Bestzeiten und Tests.</li>
        <li><strong>Setup</strong>: Equipment, Wochenplan, Sicherung.</li>
      </ul>

      <h3>Eine Übung eintragen</h3>
      <ul>
        <li>Gewicht einmal pro Übung eintragen. Nach jedem Satz die geschafften Wiederholungen eintragen und den Kreis antippen, die Pause startet. Die Angabe „3 × 10–12“ ist der Bereich, in dem du landen sollst; „zuletzt“ zeigt, was du beim letzten Mal geschafft hast.</li>
        <li>Die Wiederholungen je Satz zählen: Der schwächste Satz setzt das nächste Ziel. Fehlen 2 oder mehr Wiederholungen zum unteren Ende, geht das Gewicht eine Stufe runter.</li>
        <li>Nach der letzten Serie kurz Feedback geben:
          <strong> Schwer</strong> = gerade so geschafft, <strong>OK</strong> = 1–2 Wiederholungen wären noch gegangen,
          <strong> Leicht</strong> = 3 oder mehr, <strong>Sehr leicht</strong> = deutlich zu leicht.</li>
        <li>Am Ende „Einheit abschließen“. Erst dann rechnet die App die Vorschläge für das nächste Mal.</li>
      </ul>

      <h3>So steigert die App</h3>
      <ul>
        <li>Bei einem Bereich wie 8–10 arbeitest du dich erst in den Wiederholungen hoch. Schaffst du in allen Sätzen 10, kommt die nächste Gewichtsstufe, die es in deinem Profil gibt.</li>
        <li>„Leicht“ bringt eine Stufe mehr, „Sehr leicht“ zwei. Zweimal hintereinander „Schwer“ nimmt 5 % weg.</li>
        <li>Große Sprünge zwischen deinen Hanteln (etwa 10 auf 12 kg): Die App hebt die Obergrenze an, zum Beispiel auf 16 Wiederholungen, und springt erst dann. Danach startet sie mit einer geschätzten Zahl an Wiederholungen. Der Hinweis steht in Orange bei der Übung.</li>
        <li>Ohne Gewicht steigen Übungen über Wiederholungen oder über eine schwerere Variante (Stufe 1, 2, 3).</li>
        <li>In der ersten Woche wählst du die Startgewichte selbst: so, dass am Ende noch 2–3 Wiederholungen gegangen wären.</li>
      </ul>

      <h3>Übung tauschen</h3>
      <ul>
        <li>Passt dir eine Übung nicht (Gerät besetzt, zwickt, keine Lust): auf <strong>⇄</strong> neben dem Namen tippen und eine Alternative mit ähnlichem Bewegungsmuster wählen.</li>
        <li>Der Tausch gilt für diese Stelle, getrennt für Studio, Zuhause und Unterwegs, und bleibt bei Updates erhalten. Die neue Übung bekommt ihre eigenen Gewichte.</li>
        <li>Zurücktauschen: wieder auf ⇄, oder unter Setup › Getauschte Übungen.</li>
      </ul>

      <h3>Testwoche</h3>
      <ul>
        <li>Nach dem Speichern der Werte erscheint die Auswertung: je Bereich Punkte von 0 bis 100 (etwa ein Perzentil), der Vergleich mit deinem letzten Test und ein Vorschlag für die nächste Phase.</li>
        <li>Für den Normvergleich braucht die App Geburtsjahr und Geschlecht (Setup › Profil) und dein Körpergewicht aus dem ersten Cup. Normen gibt es noch nicht für jedes Alter; dann zählt nur dein eigener Verlauf.</li>
      </ul>

      <h3>Können</h3>
      <ul>
        <li>Unter Setup › Können hakst du ab, was sauber sitzt: Klimmzug, Pistol Squat, Muscle-Up und mehr. Fehlt ein Skill, nimmt die App eine leichtere Variante (Hinweis „leichter“) und lässt Bestien mit dieser Übung weg.</li>
        <li>Übungsleitern bleiben der Lernweg zum Skill. Mit abgehaktem Skill starten sie auf der passenden Stufe.</li>
      </ul>

      <h3>Alltagslast</h3>
      <ul>
        <li>Ist in einer Phase viel los, läuft etwa die Hälfte der freien Übungen an Maschine oder Kabel, wenn das Studio sie hat. Der erste große Lift des Tages bleibt frei.</li>
        <li>Eine akut schwere Woche (krank, Prüfungen, schlecht geschlafen): oben „−1 Satz“ anhaken.</li>
      </ul>

      <h3>Timer</h3>
      <ul>
        <li>Zeitübungen starten mit 4 Sekunden Vorlauf, die letzten 5 Sekunden piepen. Der Ton braucht einmal einen Fingertipp auf die Seite.</li>
      </ul>

      <h3>Deine Daten</h3>
      <ul>
        <li>Alles bleibt auf diesem Gerät, in diesem Browser. Öffne die App immer auf demselben Weg (am besten über das Symbol auf dem Startbildschirm).</li>
        <li>Unter Setup regelmäßig „Sichern“ tippen. Mit „Sicherung laden“ holst du den Stand auf ein neues Gerät.</li>
      </ul>
    </div>
  );
}
