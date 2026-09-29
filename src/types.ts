/* Datenmodell von Order. Die JSON-Dateien in /data folgen genau diesen Typen.
   Wer eine Orden-Datei von Hand bearbeitet, findet hier, welche Felder es gibt. */

export type Tier = "gym" | "home" | "reise";
export type Prog = "double" | "weight" | "reps" | "hold" | "minutes" | "ladder" | "topset" | "none";
export type SlotKind = "strength" | "hold" | "timer" | "interval";
export type Goal =
  | "hypertrophy" | "strength" | "power" | "speed" | "conditioning" | "endurance"
  | "fatloss" | "skill" | "mobility" | "wellbeing" | "test";
export type Load = "high" | "medium" | "low";
export type BeastClass = "plage" | "bestie" | "ungeheuer" | "uralte" | "verfluchte";

/** Ersatz-Übung für eine Equipment-Stufe. Als Text nur der Name, als Objekt mit abweichender Dosis. */
export interface Choice {
  name: string;
  reps?: string;
  sets?: number;
  prog?: Prog;
  hold?: number;
}

export interface Slot {
  /** Stabile Kennung. Historie und Gewichte hängen daran (plus Übungsname). */
  id: string;
  /** Übung auf Stufe gym (Studio). */
  name: string;
  /** Ersatz zuhause. Fehlt: wie gym. null: entfällt. */
  home?: string | Choice | null;
  /** Ersatz unterwegs. Fehlt: wie home. null: entfällt. */
  reise?: string | Choice | null;
  sets?: number;
  /** "8-10", "12", "AMRAP", "AMRAP-2", "10/Seite", "6×20 m" */
  reps?: string;
  prog?: Prog;
  /** Pause nach dem Satz in Sekunden */
  rest?: number;
  kind?: SlotKind;
  /** Sekunden je Satz bei kind "hold" */
  hold?: number;
  /** Minuten bei kind "timer" */
  minutes?: number;
  /** Obergrenze für prog "minutes" oder "hold" */
  max?: number;
  /** Steigerung für reps/hold/minutes (Wdh, s, min) oder Anzahl Gewichtsstufen bei topset */
  step?: number;
  interval?: { work: number; rest: number; rounds: number };
  /** Variantenleiter von leicht nach schwer. Der Slot startet auf Stufe 0. */
  ladder?: string[];
  /** Nur in A-Wochen (ungerade) oder B-Wochen (gerade) */
  rotation?: "A" | "B";
  note?: string;
  /** Dosis ist ein Vorschlag, noch nicht bestätigt */
  proposal?: boolean;
  /** Erst ab dieser Blockwoche freigeschaltet */
  gate_week?: number;
}

export type Block =
  | { type: "single"; slot: Slot; rotation?: "A" | "B" }
  | { type: "superset"; label?: string; slots: Slot[]; rest?: number; rotation?: "A" | "B" }
  | { type: "contrast"; heavy: Slot; explosive: Slot; transfer?: number; rest?: number; rotation?: "A" | "B" }
  | {
      type: "beast"; id: string; classes?: BeastClass[]; pool?: string[];
      draw?: "rotate" | "random"; benchmark_every?: number; note?: string; rotation?: "A" | "B";
      /** "easy": ruhiges Grundlagentempo, zählt nicht für die Bestzeit */
      pace?: "easy";
    }
  | { type: "module"; module: "sword" | "flow"; variant: string; fallback?: Slot; rotation?: "A" | "B" }
  | { type: "menu"; id: string; label: string; options: Record<string, Slot>; rotation?: "A" | "B" };

export interface Role {
  name: string;
  location: Tier;
  minutes: number;
  /** Listen aus data/modules/correctives.json */
  warmup?: string[];
  cooldown?: string[];
  blocks: Block[];
  optional?: boolean;
  note?: string;
}

export interface Focus {
  schema: 1;
  id: string;
  name: string;
  tagline: string;
  description: string;
  goals: { primary: Goal; secondary: Goal[] };
  nutrition: "deficit" | "maintenance" | "surplus" | "any";
  load_fit: Load;
  level: string;
  session_min: number;
  weeks: { min: number; max: number };
  /** Letzte Blockwoche ist Testwoche */
  test_week?: boolean;
  /** Explizite Testwochen (Blockwoche, 1-basiert) */
  test_weeks?: number[];
  /** Wochen mit −1 Satz */
  deload_weeks?: number[];
  /** Nach harten Tagen Feeling Scale abfragen und nächste Bestie anpassen */
  affect_rule?: boolean;
  /** Hat der Orden eine brauchbare Reise-Variante? */
  travel: boolean;
  modules?: string[];
  successors?: string[];
  sources?: string[];
  week_4: string[];
  week_3: string[];
  roles: Record<string, Role>;
}

export type Equip =
  | "barbell" | "dumbbell" | "kettlebell" | "cable" | "machine" | "plate" | "vest"
  | "band" | "bodyweight" | "cardio" | "skill" | "sandbag" | "other" | "none";

export interface Exercise {
  equip: Equip;
  /** Laufen: kann für einen Tag gegen eine Bestie getauscht werden */
  run?: boolean;
  /** Zusätzlich nötig, z. B. "bar" (Klimmzugstange), "rings", "bench", "rower", "box" */
  needs?: string[];
  desc?: string;
}

export interface Beast {
  id: string;
  name: string;
  orig: string;
  rounds: number;
  minutes: number;
  equipment: string[];
  work: string;
  /** hexed: Skills, deren Übungen durch leichtere ersetzt sind */
  hexed?: string[];
  /** Doppel oder Triple: dieselbe Bestie k-mal am Stück, ohne Pause, mit eigener Bestzeit */
  repeat?: number;
  /** Serie: zwei Bestien hintereinander, jede Zeit zählt für ihre Bestie */
  parts?: { id: string; name: string; rounds: number; work: string; times: number }[];
}

/** Warm-up-, Cool-down- und Modul-Übung */
export interface Drill {
  id: string;
  name: string;
  mode: "hold" | "reps" | "activity";
  value: number;
  sets?: number;
  /** Beidseitig: Links/Rechts. Oder eigene Beschriftungen, z. B. ["vorwärts","rückwärts"] */
  sides?: boolean | string[];
  /** Seite mit Defizit bekommt mehr: hip, neck, shoulder_ir, shoulder_er */
  asym?: "hip" | "neck" | "shoulder_ir" | "shoulder_er";
  rotation?: "A" | "B";
  /** Steigerung pro Blockwoche (z. B. +5 s) bis max */
  weekly_step?: number;
  max?: number;
  /** Sekunden pro Wiederholung, nur für die Zeitschätzung (Flows) */
  rep_s?: number;
  note?: string;
  desc?: string;
}

/* ---------------- Nutzerdaten ---------------- */

export interface EquipmentProfile {
  id: string;
  name: string;
  tier: Tier;
  dumbbells: number[];
  kettlebells: number[];
  barbell: { bar: number; smallestPlate: number } | null;
  cableStep: number;
  machineStep: number;
  vest: number[];
  bands: string[];
  has: { bar: boolean; rings: boolean; bench: boolean; rower: boolean; bike: boolean; box: boolean; sandbag: boolean; cable: boolean; machines: boolean; medball: boolean; sword: boolean };
}

export interface PlanBlock {
  id: string;
  focusId: string;
  start: string; // ISO-Datum, Montag
  end: string;
  label: string;
  load: Load;
  travel: boolean;
  /** Abweichender Wochenplan für diesen Block (z. B. Semesterferien). Fehlt: globaler Wochenplan. */
  schedule?: Partial<Record<Weekday, string | null>>;
}

export type Weekday = "Mo" | "Di" | "Mi" | "Do" | "Fr" | "Sa" | "So";
export const WEEKDAYS: Weekday[] = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export interface UserProfile {
  name: string;
  asym: { hip: "L" | "R" | null; neck: "L" | "R" | null; shoulder_ir: "L" | "R" | null; shoulder_er: "L" | "R" | null };
  /** Für die Einordnung der Testwoche. Optional, bleibt auf dem Gerät. */
  birthYear?: number | null;
  sex?: "m" | "w" | null;
  /** Skillcheck: Skills aus data/modules/skills.json, die sauber sitzen. null = noch nicht angegeben (kein Filter). */
  skills?: string[] | null;
  /** Skills trainieren: Bestien mit fehlenden Skills kommen als hexed-Variante */
  skillTraining?: boolean;
  /** Veraltet (0.1): wird beim Laden in has.sword der Heim-Profile übernommen */
  doppelmesser?: boolean;
}

/** Feedback nach einer Übung */
export type Feedback = "schwer" | "ok" | "leicht" | "sehrleicht";

export interface SlotState {
  weight: number | null;
  target: number | null;
  stage: number;
  fb: Feedback[];
  topHits: number;
  updated: string;
}

export interface SetEntry { done: boolean; reps?: number; weight?: number | null; seconds?: number }

export interface SessionEntry {
  key: string; // Slot-Schlüssel slotId|Übungsname
  slotId: string;
  name: string;
  prog: Prog;
  sets: SetEntry[];
  feedback?: Feedback;
  /** Tatsächlich gezeigte Stufe (Leiter) oder Sekunden/Minuten-Ziel */
  stage?: number;
}

export interface Session {
  id: string;
  date: string;
  blockId: string;
  focusId: string;
  week: number;
  role: string;
  profileId: string;
  entries: Record<string, SessionEntry>;
  drills: Record<string, boolean[]>;
  beast?: { id: string; seconds: number | null; easy?: boolean };
  /** Serie: Zeit je Teil, jede zählt für die Bestzeit ihrer Bestie */
  beastParts?: { id: string; seconds: number | null; easy?: boolean }[];
  menu: Record<string, string>;
  note?: string;
  done: boolean;
}

export interface AppState {
  version: 1;
  onboarded: boolean;
  user: UserProfile;
  equipment: EquipmentProfile[];
  schedule: Partial<Record<Weekday, string | null>>; // Wochentag → Equipment-Profil-ID
  roleOrder: Record<string, string[]>; // blockId → Rollen in Reihenfolge der Trainingstage
  plan: PlanBlock[];
  slots: Record<string, SlotState>;
  sessions: Session[];
  beastTimes: Record<string, { date: string; seconds: number }[]>;
  reduced: Record<string, boolean>; // "blockId:week" → −1 Satz
  menuChoice: Record<string, string>; // blockId:menuId → Option
  tests: Record<string, TestResult[]>;
  who5: { date: string; blockId: string; score: number }[];
  feeling: { date: string; sessionId: string; value: number }[];
  /** Eigene Übungswahl: "slotId:Stufe" → Übungsname. Überlebt Updates der Orden-Dateien. */
  swaps: Record<string, string>;
  /** Einheiten, in denen heute nicht gelaufen werden kann (Session-Id → true): Lauf wird zur Bestie */
  noRun?: Record<string, boolean>;
}

export interface TestResult { date: string; blockId: string; value: number; raw: string; /** gewählte Variante, z. B. "squat" oder "legpress" */ variant?: string }

export interface TestDef {
  id: string; name: string; unit: string; attempts: number; better: "higher" | "lower"; desc?: string;
  /** Varianten, zwischen denen man beim Test wählt (z. B. Kniebeuge oder Beinpresse) */
  variants?: { id: string; name: string }[];
}

/** Norm für einen Test, gültig für ein Geschlecht und eine Altersspanne.
    tier A: Bevölkerungs- oder Altersnorm. tier B: Orientierung (ausgewählte Stichprobe, z. B. Wettkampfsportler). */
export interface Norm {
  test: string;
  variant?: string;
  sex: "m" | "w";
  age: [number, number];
  tier: "A" | "B";
  src: string;
  type: "pct" | "bands" | "cat" | "ms";
  /** Umrechnung des Messwerts: cm2m (cm → m), sr26 (Sit and Reach mit 26 cm Versatz), rel1rm (5RM → 1RM ÷ Körpergewicht) */
  conv?: "cm2m" | "sr26" | "rel1rm";
  better?: "higher" | "lower";
  /** Nur zur Orientierung anzeigen, nicht in die Wertung */
  noScore?: boolean;
  anchors?: [number, number][];
  bands?: [number, number, number];
  cats?: [number | null, string, number][];
  mean?: number;
  sd?: number;
}
export interface Cup {
  id: string; name: string; place: string; focus: string; warmup: string[];
  tests: TestDef[]; who5?: boolean; benchmark?: { label: string; pool: string[] };
}
