#!/usr/bin/env python3
"""把 extract-kb.js 的结果拆成新版用的数据：
   v2/data/<kind>/index.json   列表和筛选用（小）
   v2/data/<kind>/s/<n>.json   每个校名一份（点开学校时才下载）
另外把划线看组里的 2026 投档线（l26/r26）按院校专业组代码并进来。
用法：python3 scripts/v2/pack-kb.py kb-raw.json v2/data/bk [huaxian/data.json]
"""
import json, sys, os, hashlib, shutil

src, outdir = sys.argv[1], sys.argv[2]
hx = sys.argv[3] if len(sys.argv) > 3 else None
d = json.load(open(src))
line26 = {}
hxids = set()
if hx and os.path.exists(hx):
    for g in json.load(open(hx))['groups']:
        hxids.add((g['kl'], g['id']))
        if g.get('l26') is not None:
            line26[(g['kl'], g['id'])] = [g['l26'], g.get('r26')]

# 与旧版 mergeFilteredSchoolDuplicates 一致：同科类、批次、省、市、校名（去括号）的条目合并成一所学校
import re
def _mk(e):
    return (e['sub'], e['bat'], e['prov'], e['city'], re.sub(r'[\s()（）]', '', e['name']))
def _gk(g):
    return (g['code'] or '', g['dc'] or '', g['name'] or '', g['req'] or '')
def _uniq(xs):
    out = []
    for x in xs:
        if x not in out: out.append(x)
    return out
merged, order = {}, []
for e in d['entries']:
    k = _mk(e)
    if k not in merged:
        merged[k] = dict(e, groups=list(e['groups']), _n=1); order.append(k); continue
    m = merged[k]; m['_n'] += 1
    m['groups'] = m['groups'] + e['groups']
    m['lv'] = m['lv'] or e['lv']
for k in order:
    e = merged[k]
    gm, go = {}, []
    for g in e['groups']:
        gk = _gk(g)
        if gk not in gm:
            gm[gk] = dict(g); go.append(gk); continue
        prev = gm[gk]
        ids = {x.get('id') or x['key'] for x in prev['majors']}
        majors = prev['majors'] + [x for x in g['majors'] if (x.get('id') or x['key']) not in ids]
        nx = dict(prev); nx.update(g); nx.update(majors=majors, tags=_uniq(prev['tags'] + g['tags']), cls=_uniq(prev['cls'] + g['cls'])); gm[gk] = nx
    e['groups'] = [gm[k2] for k2 in go]
    if e['_n'] > 1:
        st = sw = rt = rw = 0
        for g in e['groups']:
            w = g['p26'] if g['p26'] is not None else (g['p25'] if g['p25'] is not None else (len(g['majors']) or 1))
            sc = g['wm'] if g['wm'] is not None else g['s25']
            if sc is not None: st += sc * w; sw += w
            if g['r25'] is not None: rt += g['r25'] * w; rw += w
        if sw: e['ws'] = round(st / sw, 1)
        if rw: e['wr'] = round(rt / rw)
d['entries'] = [merged[k] for k in order]

if os.path.exists(outdir):
    shutil.rmtree(outdir)
os.makedirs(outdir + '/s')

def dict_index():
    vals, idx = [], {}
    def get(v):
        if v not in idx:
            idx[v] = len(vals); vals.append(v)
        return idx[v]
    return vals, get

facets, F = dict_index()
specs, P = dict_index()
classes, C = dict_index()
plans, PL = dict_index()
guides = {}
class_disc = {}
names = sorted({e['name'] for e in d['entries']})
shard_of = {n: i for i, n in enumerate(names)}

S_rows, G_rows = [], []
shards = {n: {'name': n, 'life': d.get('life', {}).get(n), 'entries': []} for n in names}
for ei, e in enumerate(d['entries']):
    S_rows.append([e['name'], e['prov'], e['city'], e['sub'], e['bat'], e['lv'] or '', e['ws'], e['wr'],
                   e['region'], [F(x) for x in e['facets']], (e['priority'] or {}).get('sev', ''),
                   shard_of[e['name']], e['levelText'], len(shards[e['name']]['entries'])])
    sh = {k: e[k] for k in ('k', 'sub', 'bat', 'lv', 'ws', 'wr', 'region', 'levelText', 'priority', 'info', 'infoAddr', 'infoLevel', 'infoPublic', 'prov', 'city')}
    sh['groups'] = []
    for g in e['groups']:
        if g['guide']:
            guides[g['guide']['id']] = {k: g['guide'][k] for k in ('channel', 'scope', 'title', 'summary')}
        med = {}
        words = []
        for m in g['majors']:
            if m.get('cls') and m.get('disc'):
                class_disc.setdefault(m['cls'], {}).setdefault(m['disc'], 0)
                class_disc[m['cls']][m['disc']] += 1
            for c in m['med']:
                med[c] = med.get(c, 0) + 1
            words.append(m['name'])
            if m.get('cls'): words.append(m['cls'])
            if m.get('disc'): words.append(m['disc'])
            if m.get('code'): words.append(m['code'])
        seen = []
        for w in words:
            if w not in seen: seen.append(w)
        l26 = g['cut26'] or line26.get((e['sub'], g['code']))
        G_rows.append([
            ei, g['code'], g['dc'], g['title'], g['req'] or '', g['p26'], g['p25'],
            g['s25'], g['r25'], g['s24'], g['s23'], g['r26e'],
            (g['pred'] or {}).get('s'), (g['pred'] or {}).get('r'), g['anchor'],
            g['q'][0], g['q'][1], [P(x) for x in g['spec']], (g['guide'] or {}).get('id', '') if (g['guide'] or {}).get('ok') else '',
            [C(x) for x in g['cls']], med, len(g['majors']), g['coopN'],
            l26[0] if l26 else None, l26[1] if l26 else None,
            ' '.join(seen), [PL(x) for x in g['plan']], g['name'], g['summary'] or '', ' '.join(g['tags']), g.get('zkKind', ''), [P(x) for x in g.get('train', [])], g.get('wm'), 1 if (e['sub'], g['code']) in hxids else 0
        ])
        sg = {k: g[k] for k in ('k', 'code', 'dc', 'name', 'title', 'req', 'p26', 'p25', 's26e', 'r26e', 's25', 'r25', 's24', 'r24', 's23', 'r23', 'summary', 'cls', 'tags', 'remark', 'q', 'naming', 'spec', 'plan', 'guide', 'pred', 'anchor', 'wm', 'coopN', 'change', 'deleted') if k in g}
        sg['train'] = g.get('train', [])
        sg['l26'] = l26
        sg['majors'] = g['majors']
        sh['groups'].append(sg)
    shards[e['name']]['entries'].append(sh)

GCOLS = ['e', 'code', 'dc', 'title', 'req', 'p26', 'p25', 's25', 'r25', 's24', 's23', 'r26e', 'ps', 'pr', 'anchor',
         'qt', 'ql', 'spec', 'guide', 'cls', 'med', 'nm', 'coop', 'l26', 'r26', 'words', 'plan', 'gname', 'summary', 'tags', 'zk', 'train', 'wm', 'hx']
SCOLS = ['name', 'prov', 'city', 'sub', 'bat', 'lv', 'ws', 'wr', 'region', 'facets', 'prio', 'shard', 'levelText', 'se']
meta = d['meta']
index = {'v': 1, 'meta': {'version': meta.get('version'), 'medCodes': meta.get('medCodes'), 'labelsVersion': meta.get('labelsVersion'),
                         'regions': meta.get('provinceRegionGroups'), 'jsCities': meta.get('jsCityGroups'),
                         'specialGroups': meta.get('specialGroups'), 'batches': meta.get('batches'), 'guides': guides,
                         'disciplineOrder': meta.get('disciplineOrder'),
                         'classDisc': {c: max(v, key=v.get) for c, v in class_disc.items()}},
         'facets': facets, 'specs': specs, 'classes': classes, 'plans': plans,
         'scols': SCOLS, 'gcols': GCOLS, 'S': S_rows, 'G': G_rows}
words = [g[25] for g in G_rows]
for g in G_rows:
    g[25] = ''
json.dump(words, open(outdir + '/search.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(index, open(outdir + '/index.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for n, sh in shards.items():
    json.dump(sh, open(f"{outdir}/s/{shard_of[n]}.json", 'w'), ensure_ascii=False, separators=(',', ':'))

def size(p):
    return os.path.getsize(p)
tot = sum(size(f"{outdir}/s/{f}") for f in os.listdir(outdir + '/s'))
print('index', round(size(outdir + '/index.json') / 1e6, 2), 'MB; shards', len(shards), round(tot / 1e6, 1), 'MB; l26 joined',
      sum(1 for g in G_rows if g[23] is not None), '/', len(G_rows))
