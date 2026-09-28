# Einmaliges Hilfsskript: erzeugt data/exercises.json aus allen Übungsnamen der Orden.
# Danach wird die Datei von Hand gepflegt; das Skript ergänzt nur fehlende Namen.
import json, glob, re, os
names = set()
def add(s):
    names.add(s['name'])
    for t in ('home', 'reise'):
        v = s.get(t)
        if isinstance(v, str): names.add(v)
        elif isinstance(v, dict): names.add(v['name'])
    for l in s.get('ladder', []): names.add(l)
for f in glob.glob('data/orders/*.json'):
    d = json.load(open(f))
    for r in d['roles'].values():
        for b in r['blocks']:
            t = b['type']
            if t == 'single': add(b['slot'])
            elif t == 'superset': [add(s) for s in b['slots']]
            elif t == 'contrast': add(b['heavy']); add(b['explosive'])
            elif t == 'menu': [add(s) for s in b['options'].values()]
            elif t == 'module' and b.get('fallback'): add(b['fallback'])

def equip(n):
    l = n.lower()
    if '+ weste' in l: return 'vest', []
    if l.startswith('band') or l.startswith('band-'): return 'band', []
    if l.startswith('weighted') : return 'plate', []
    if 'db ' in l or l.startswith('db') or 'dumbbell' in l or 'incline db' in l or l.startswith('1-arm db') or 'hammer curl' in l: return 'dumbbell', ['bench'] if ('bench' in l or 'incline' in l or 'press' in l and 'shoulder' not in l) else []
    if l.startswith('kb ') or 'goblet' in l or 'turkish get-up' == l or "farmer" in l or l == 'jefferson curl' or l == 'suitcase carry': return 'kettlebell', []
    if 'cable' in l or 'rope' in l or 'face pull' == l or 'pulldown' in l or 'seated row' in l or 'pull-through' in l and 'band' not in l: return 'cable', []
    if 'machine' in l or l in ('leg press','leg extension','lying leg curl','seated leg curl','reverse pec deck','seated calf raise','standing calf raise','chest-supported row'): return 'machine', []
    if any(k in l for k in ('back squat','bench press','deadlift','barbell','overhead press','front squat','hip thrust','upright row','landmine','bent-over row','trap bar')) : return 'barbell', ['bench'] if 'bench' in l else []
    if 'sandbag' in l: return 'sandbag', []
    if any(k in l for k in ('medicine ball','medizinball')): return 'other', ['medball']
    if any(k in l for k in ('pull-up','chin-up','hanging','front lever','dead hang','skin the cat','muscle-up')): return 'bodyweight', ['bar']
    if 'ring' in l: return 'bodyweight', ['rings']
    if 'box jump' in l: return 'bodyweight', ['box']
    if any(k in l for k in ('rudern','intervalle','lauf','cardio','grundlage','ausfahren','auslaufen','spaziergang','sprint','bike','shuttle','beschleunigung','fliegende','seilspringen')): return 'cardio', []
    if any(k in l for k in ('meditation','atem','body scan','yoga','yin','flow','mobility','landungen','vault','quadrupedal','linie','schatten','shadow','beinarbeit','intensivrunden','bestie','leiter','precision')): return 'skill', []
    return 'bodyweight', []

path = 'data/exercises.json'
old = json.load(open(path)) if os.path.exists(path) else {}
out = dict(old)
for n in sorted(names):
    if n in out: continue
    e, needs = equip(n)
    entry = {'equip': e}
    if needs: entry['needs'] = needs
    out[n] = entry
lines = ['{'] + [f'  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)},' for k, v in sorted(out.items(), key=lambda kv: kv[0].lower())]
lines[-1] = lines[-1].rstrip(',')
open(path, 'w').write('\n'.join(lines) + '\n}\n')
print(len(out))
