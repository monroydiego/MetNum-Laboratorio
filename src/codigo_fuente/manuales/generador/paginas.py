import json, re, subprocess, sys
m = sys.argv[1]
meta = json.load(open(f'meta-{m}.json'))
txt = subprocess.run(['pdftotext', '-layout', f'{m}.pdf', '-'], capture_output=True, text=True).stdout
pags = txt.split('\f')
lineas = [[l.strip() for l in p.split('\n')] for p in pags]
def es_indice(l): return '....' in l or re.search(r'\.\s{2,}\d+$', l)
# primera página del cuerpo: la del primer encabezado nivel 1
h1 = next(h for h in meta['heads'] if h['nivel'] == 1)
ini = next(i for i, ls in enumerate(lineas) if i > 0 and any(l == h1['texto'] for l in ls))
res = {}
cur = ini
for h in meta['heads']:
    hallada = None
    for i in range(cur, len(lineas)):
        if any(l == h['texto'] or (len(h['texto']) > 55 and l.startswith(h['texto'][:50])) for l in lineas[i] if not es_indice(l)):
            hallada = i; break
    if hallada is None: print('SIN PÁGINA', h['texto']); continue
    cur = hallada; res['h:' + h['id']] = hallada + 1
cf = ini
for f in meta['figs']:
    for i in range(cf, len(lineas)):
        if any(l.startswith(f"Figura {f['n']}.") for l in lineas[i]): cf = i; res['f:' + str(f['n'])] = i + 1; break
    else: print('SIN PÁGINA fig', f['n'])
ct = ini
for t in meta['tabs']:
    for i in range(ct, len(lineas)):
        if any(l.startswith(f"Tabla {t['n']}.") for l in lineas[i]): ct = i; res['t:' + str(t['n'])] = i + 1; break
    else: print('SIN PÁGINA tabla', t['n'])
old = json.load(open(f'pages-{m}.json')) if __import__('os').path.exists(f'pages-{m}.json') else {}
json.dump(res, open(f'pages-{m}.json', 'w'))
print('páginas totales', len([p for p in pags if p.strip()]), '| cambios respecto a la pasada anterior:', sum(1 for k in res if old.get(k) != res[k]))
