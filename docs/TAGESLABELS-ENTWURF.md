# Tageslabels – Entwurf (P12, zur Freigabe)

Stand 11.11.2026, App 1.34.0. Die Tagesknöpfe auf Heute zeigen künftig ein kurzes Label (`short`, höchstens 10 Zeichen)
statt des vollen Rollennamens; die volle Bezeichnung bleibt überall sonst (Vorschau, Plan, Log, Tooltip am Knopf).
Die App kann `short` schon anzeigen; **eingebaut in die Orden wird erst nach deiner Freigabe** (Entscheidung 10.11.2026).
Ohne `short` steht wie bisher der volle Name, jetzt ohne Silbentrennung, notfalls zweizeilig.

Leitlinien des Vorschlags: Körperteil oder Inhalt statt Gattung („Beine“ statt „Unterkörper“, „Oben“ statt
„Oberkörper“), A/B bleibt, wo ein Orden zwei gleiche Tage hat; Bonus-Tage nur mit ihrem Inhalt; Schwerttage „Klinge“.
Rollen für hohe Alltagslast (`high_load`) erben das Label ihrer gleichnamigen Rolle.

Ändern: Spalte „Vorschlag“ überschreiben oder streichen (dann bleibt der volle Name). Leer = Name passt schon.

| Orden | Rolle | heutiger Name | Vorschlag |
|---|---|---|---|
| Acrobat | `skill_zug` | Skill Zug | Zug |
| Acrobat | `animal_flow` | Animal Flow | Animal |
| Acrobat | `skill_druck` | Skill Druck | Druck |
| Acrobat | `flow_frei` | Freier Flow | Flow frei |
| Acrobat | `bonus` | Bonus: Handgelenke und Handstand | Handstand |
| Magician | `stab_atem` | Stab und Atem | Stab, Atem |
| Magician | `haltung_kraft` | Haltungskraft | Haltung |
| Magician | `grundlage` | Grundlage |  |
| Magician | `stab_tanz` | Stabtanz und Stille | Stabtanz |
| Magician | `bonus` | Bonus: Hände und Handgelenke | Hände |
| Assassin | `kraft_a` | Unterkörper und Trizeps | Unten |
| Assassin | `arme_schultern` | Oberkörper Zug | Oben Zug |
| Assassin | `skill_kondition` | Schwert und Bestie | Klinge |
| Assassin | `kraft_b` | Oberkörper und Swing | Oben Swing |
| Assassin | `bonus` | Bonus: Unterarme und Nacken | Unterarme |
| Barbarian | `oben_a` | Oberkörper A | Oben A |
| Barbarian | `unten_a` | Unterkörper A | Unten A |
| Barbarian | `oben_b` | Oberkörper B | Oben B |
| Barbarian | `unten_b` | Unterkörper B | Unten B |
| Barbarian | `bonus` | Bonus: Arme | Arme |
| Conqueror | `studio_kraft` | Studio-Kraft | Studio |
| Conqueror | `unterwegs_kraft` | Unterwegs-Kraft | Unterwegs |
| Conqueror | `work_capacity` | Belastbarkeit | Belastung |
| Conqueror | `ausdauer` | Ausdauer |  |
| Conqueror | `bonus` | Bonus: Tragen und Griff | Tragen |
| Dancer | `huefte` | Hüfte |  |
| Dancer | `schulter_bws` | Schulter und BWS | Schulter |
| Dancer | `schwert_flow` | Stab und Fluss | Stab |
| Dancer | `beine_dehnung` | Beine in der Dehnung | Beine |
| Dancer | `bonus` | Bonus: Freier Fluss | Fluss |
| Gladiator | `lasten` | Lasten |  |
| Gladiator | `runde` | Runde |  |
| Gladiator | `eisen` | Eisen |  |
| Gladiator | `spiel` | Spiel |  |
| Gladiator | `bonus` | Bonus: Tragen und Griff | Tragen |
| Herald | `flash_a` | Herald A |  |
| Herald | `flash_b` | Herald B |  |
| Herald | `flash_c` | Herald C |  |
| Herald | `bestie_kurz` | Kurze Bestie | Bestie |
| Herald | `bonus` | Bonus: Griff | Griff |
| Huntsman | `parkour` | Parkour |  |
| Huntsman | `bestie_rotation` | Zufallsbestie | Bestie |
| Huntsman | `kraft_sprung` | Kraft und Sprung | Sprung |
| Huntsman | `parkour_frei` | Freie Linie | Linie |
| Huntsman | `bonus` | Bonus: Füße und Landungen | Füße |
| King | `chaos_a` | Chaos A |  |
| King | `redner` | Redner und Haltung | Redner |
| King | `chaos_b` | Chaos B |  |
| King | `chaos_c` | Chaos C |  |
| King | `bonus` | Bonus: Grundlage | Grundlage |
| Knight | `upper_a` | Oberkörper A | Oben A |
| Knight | `lower_a` | Unterkörper A | Beine A |
| Knight | `upper_b` | Oberkörper B | Oben B |
| Knight | `lower_b` | Unterkörper B | Beine B |
| Knight | `bonus` | Bonus: Unterarme und Griff | Griff |
| Mercenary | `druck_beine` | Drücken und Beine | Druck Bein |
| Mercenary | `zug_hinge` | Ziehen und Hüfte | Zug Hüfte |
| Mercenary | `power_skill` | Power und Skill | Power |
| Mercenary | `volumen` | Volumen |  |
| Mercenary | `bonus` | Bonus: Bestie | Bestie |
| Monk | `kraft_a` | Kraft A |  |
| Monk | `yoga_flow` | Yoga-Flow |  |
| Monk | `kraft_b` | Kraft B |  |
| Monk | `yoga_ruhe` | Yoga-Ruhe |  |
| Monk | `bonus` | Bonus: Qigong | Qigong |
| Olympian | `power_unten` | Power Beine | Beine |
| Olympian | `kraft_oben` | Kraft Oberkörper | Oben |
| Olympian | `sprint` | Sprint |  |
| Olympian | `power_hinge` | Power Hüfte | Hüfte |
| Olympian | `bonus` | Bonus: Seil und Füße | Seil, Füße |
| Paladin | `knie_huefte` | Knie und Hüfte | Knie |
| Paladin | `schulter_ellbogen` | Schulter und Ellbogen | Schulter |
| Paladin | `schwert_sehnen` | Schwert und Sehnen | Sehnen |
| Paladin | `ruecken` | Rücken |  |
| Paladin | `bonus` | Bonus: Gelenke pflegen | Gelenke |
| Pilgrim | `intervalle` | Intervalle |  |
| Pilgrim | `kraft_kurz` | Kraft-Erhaltung | Kraft |
| Pilgrim | `bestie_lang` | Lange Bestie | Bestie |
| Pilgrim | `grundlage` | Grundlage |  |
| Pilgrim | `bonus` | Bonus: Füße und Schienbein | Füße |
| Pugilist | `runden_technik` | Technikrunden | Technik |
| Pugilist | `kraft_rotation` | Kraft und Rotation | Rotation |
| Pugilist | `runden_kondition` | Konditionsrunden | Kondition |
| Pugilist | `nacken_rumpf` | Nacken und Rumpf | Nacken |
| Pugilist | `bonus` | Bonus: Seil und Unterarme | Seil |
| Scout | `reaktion` | Reaktion |  |
| Scout | `seil` | Seilsprints | Seil |
| Scout | `schwert` | Klinge schnell | Klinge |
| Scout | `kraft` | Kraft und Hüfte | Kraft |
| Skirmisher | `sprung` | Sprünge |  |
| Skirmisher | `sprint_wechsel` | Sprint und Richtungswechsel | Sprint |
| Skirmisher | `zug_stuetz` | Zug und Stütz explosiv | Zug, Stütz |
| Skirmisher | `kettlebell` | Kettlebell |  |
| Skirmisher | `bonus` | Bonus: Bestie | Bestie |
| Slayer | `kraft_a` | Oberkörper schwer | Schwer |
| Slayer | `arme_kurz` | Schultern und Arme | Arme |
| Slayer | `home_hypertrophie` | Schwert und Oberkörper | Klinge |
| Slayer | `kraft_contrast` | Kraft Kontrast | Kontrast |
| Slayer | `wochenende_kondition` | Wochenend-Kondition | Kondition |
| Smith | `kraft_1` | Kraft 1: Squat und Bench | Squat/Bank |
| Smith | `kraft_2` | Kraft 2: Deadlift und Press | Heben/OHP |
| Smith | `kraft_3` | Kraft 3: Front Squat und Incline | Front/Inc. |
| Smith | `kraft_4` | Kraft 4: Hinge und Carry | Hinge |
| Smith | `bonus` | Bonus: Griff und Tragen | Griff |
| Troubadour | `kraft_a` | Kraft A |  |
| Troubadour | `ausdauer_ruhig` | Ausdauer ruhig | Ruhig |
| Troubadour | `kraft_b` | Kraft B |  |
| Troubadour | `ausdauer_intensiv` | Ausdauer intensiv | Intensiv |
| Troubadour | `bonus` | Bonus: Schulterpflege | Schulter |
