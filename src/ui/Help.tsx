/* Kurze Anleitung, erreichbar über das ? oben rechts. */
export function Help() {
  return (
    <div className="stack help-body">
      <h3>Der Ablauf</h3>
      <ul>
        <li><strong>Heute</strong> zeigt die Einheit des Tages. Oben wählst du den Trainingstag der Woche.</li>
        <li><strong>Plan</strong> ist dein Jahr in Phasen. Jede Phase hat einen Orden und eine Alltagslast.</li>
        <li><strong>Orden</strong> listet alle Programme mit Details.</li>
        <li><strong>Log</strong> zeigt abgeschlossene Einheiten, Bestzeiten und Tests.</li>
        <li><strong>Setup</strong>: Equipment, Wochenplan, Sicherung.</li>
      </ul>

      <h3>Eine Übung eintragen</h3>
      <ul>
        <li>Wiederholungen und Gewicht eintragen, dann den Kreis mit der Satznummer antippen. Die Pause startet automatisch.</li>
        <li>Nach der letzten Serie kurz Feedback geben:
          <strong> Schwer</strong> = gerade so geschafft, <strong>OK</strong> = 1–2 Wiederholungen wären noch gegangen,
          <strong> Leicht</strong> = 3 oder mehr, <strong>Sehr leicht</strong> = deutlich zu leicht.</li>
        <li>Am Ende „Einheit abschließen“. Erst dann rechnet die App die Vorschläge für das nächste Mal.</li>
      </ul>

      <h3>So steigert die App</h3>
      <ul>
        <li>Bei einem Bereich wie 8–10 arbeitest du dich erst in den Wiederholungen hoch. Schaffst du in allen Sätzen 10, kommt die nächste Gewichtsstufe, die es in deinem Profil gibt.</li>
        <li>„Leicht“ bringt eine Stufe mehr, „Sehr leicht“ zwei. Zweimal hintereinander „Schwer“ nimmt 5 % weg.</li>
        <li>Ohne Gewicht steigen Übungen über Wiederholungen oder über eine schwerere Variante (Stufe 1, 2, 3).</li>
        <li>In der ersten Woche wählst du die Startgewichte selbst: so, dass am Ende noch 2–3 Wiederholungen gegangen wären.</li>
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
