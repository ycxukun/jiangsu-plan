"""专业组变化体检卡：每个 26 年专业组一行，全部字段来自 25/26 专刊和公开投档线，可复现。
字段（填报前就能知道的）：
  A 结构  —— 状态（延续/由大组拆出/合并/新增）、前身组及带来的计划、新进专业、前身里没跟过来的专业
  B 本组计划 —— 26 计划、前身组 25 计划、带过来的专业 25 年计划、变化
  C 同档同类计划 —— 以前身 25 年线为中心 ±8 分、同一类组（不含本校）的计划变化率
  D 班型 —— 26 各班型人数 vs 前身 25 各班型人数（拔尖/中外/学分互认/双学位/普通）
  E 选科 —— 26 选科 vs 前身 25 再选科目
  F 校区 —— 26 学习校区 vs 前身 25 校区（只在专刊写了才算）
  G 学校事件 —— 近年更名、升格、转设（专刊字段 + 人工补充）
  H 去年走势 —— 前身组 24→25 的线变化
事后结果（用来检验，不用于预测）：26 投档线、相对涨跌 dr。
"""
import pandas as pd, numpy as np, json, re, sys
S = '/home/claude/zyz/'
ARGS = sys.argv[1:]
exec(open(S + 'supply.py').read().split("G.to_pickle")[0])   # 得到 G（含 L 类别）、lv
I25 = pd.read_pickle(S + 'i25.pkl'); I25 = I25[I25.kl == '物理']
I26 = pd.read_pickle(S + 'i26.pkl'); I26 = I26[I26.kl == '物理']
M = pd.read_pickle(S + 'map26.pkl'); M = M[M.kl == '物理']
L2 = pd.read_pickle(S + 'lin2.pkl'); L2 = L2[L2.kl == '物理'].set_index(['school', 'g26'])
X = pd.read_pickle(S + 'chg4.pkl'); X['g'] = X.gname.str.extract(r'^(\d+)')[0].astype(float); X = X.set_index(['school', 'g'])
F = '/mnt/user-data/attachments/bf05c1e4-9d41-5f35-8743-720179e09867/6fb1674b-2025________.xlsx'
LX = pd.read_excel(F, sheet_name='理科投档线'); LX.columns = [str(c).replace('\n', '') for c in LX.columns]
LX['school'] = LX['院校专业组'].astype(str).str.replace(r'\d+$', '', regex=True); LX['g'] = LX['院校专业组'].astype(str).str.extract(r'(\d+)$')[0].astype(float)
REQ25 = LX.set_index(['school', 'g'])['再选科目'].to_dict(); NOTE25 = LX.set_index(['school', 'g'])['备注'].to_dict()
B = pd.read_pickle(S + 'base.pkl'); B = B[B.kl == '物理']; B['g'] = B.gname.str.extract(r'^(\d+)')[0].astype(float); B = B.set_index(['school', 'g'])
d = pd.read_pickle('/home/claude/d.pkl'); sc = d[d['科类'] == '物理'].groupby('院校名称').first()
EVENT = {s: v for s, v in sc['更名合并转设'].fillna('').items() if re.search('202[2-6]', v) and re.search('更名|升格|转设|合并', v)}
EVENT['淮安大学'] = '2026 年由淮阴工学院更名'
g24 = G[G.year == 24].drop_duplicates(['school', 'g']).set_index(['school', 'g'])
g25 = G[G.year == 25].drop_duplicates(['school', 'g']).set_index(['school', 'g'])
g26 = G[G.year == 26].drop_duplicates(['school', 'g']).set_index(['school', 'g'])
# C：同档同类计划（窗口 ±8 分，以 25 年位置计；26 组位置 = 主要前身 25 线，新增组 = 本校 25 普通组中位线）
pre = {k: int(v) for k, v in L2.main_pre.dropna().items()}
smed = G[(G.year == 25) & (G['中外'] == 0)].groupby('school').line.median().to_dict()
P25 = G[G.year == 25].copy(); P25['pos'] = P25.line
P26 = G[G.year == 26].copy()
P26['pos'] = [g25.line.get((s, pre[(s, g)]), np.nan) if (s, g) in pre else smed.get(s, np.nan) for s, g in zip(P26.school, P26.g)]
P25 = P25.dropna(subset=['pos']); P26 = P26.dropna(subset=['pos'])
def same_band_same_type(school, pos, L, W=8):
    a = P25[(P25.L == L) & (P25.school != school) & ((P25.pos - pos).abs() <= W)].plan.sum()
    b = P26[(P26.L == L) & (P26.school != school) & ((P26.pos - pos).abs() <= W)].plan.sum()
    return int(a), int(b)
# 每个 25 年（组, 专业, 班型）的 25 计划，按它在 26 年各去向的计划比例分摊
_d = M.dropna(subset=['g25']).copy(); _d['g25'] = _d.g25.astype(int)
_dest = _d.groupby(['school', 'g25', 'major', 'bt']).plan.sum()
_p25 = I25.groupby(['school', 'g', 'major', 'bt']).plan.sum()
_dest2 = _d.groupby(['school', 'g25', 'major']).plan.sum(); _p252 = I25.groupby(['school', 'g', 'major']).plan.sum()
SHARE = {}
for k, v in _dest.items():
    if k in _p25.index and v > 0: SHARE[k] = _p25[k] / v
for k, v in _dest2.items():
    if k in _p252.index and v > 0: SHARE[(k[0], k[1], k[2], None)] = _p252[k] / v
def camset(rows):
    out = set(); split = False
    for t in rows.raw.astype(str):
        for x in re.findall(r'([^\s（()）,，、在于和及与]{2,10}校区)', t):
            if re.match(r'(以下|相应|各)', x): continue
            y = re.sub(r'^.*[市县]', '', x); y = re.sub(r'^.{2,3}区(?=.{2,}校区$)', '', y); out.add(y)
        if re.search(r'学年.{0,12}校区.{0,20}学年', t): split = True
    return out, split
BT = ['普通', '拔尖', '中外合作', '学分互认', '双学位', '预科']
def btmix(rows):
    s = rows.groupby('bt').plan.sum(); return {k: int(s.get(k, 0)) for k in BT if s.get(k, 0)}
def fmt_mix(m): return '、'.join(f'{k}{v}' for k, v in m.items())
sch29 = ARGS if ARGS else list(json.load(open(S + 'js29.json')).keys())
out = []
for s in sch29:
    for g in sorted(I26[I26.school == s].g.unique()):
        a = I26[(I26.school == s) & (I26.g == g)]
        key = (s, g)
        lin = L2.loc[key] if key in L2.index else None
        st = lin.st if lin is not None else '新增'
        mp = M[(M.school == s) & (M.g26 == g)]
        src = mp.dropna(subset=['g25']).groupby('g25').plan.sum().sort_values(ascending=False)
        pres = [int(x) for x in src.index]
        b = I25[(I25.school == s) & (I25.g.isin(pres))]
        # 带过来的专业在 25 年的计划（按 专业名 匹配前身组里的行）
        carried = 0.0
        for _, r in mp.dropna(subset=['g25']).iterrows():
            if r.how == '新专业/新班型': continue
            k25 = (s, int(r.g25), r.major, r.bt)
            carried += SHARE.get(k25, SHARE.get((s, int(r.g25), r.major, None), 0)) * r.plan
        new_m = sorted({str(m) for m in mp.loc[mp.g25.isna(), 'major'] if m == m})
        main = pres[0] if pres else None
        lost = []
        if main is not None:
            used = set(zip(M.loc[M.school == s, 'g25'].dropna().astype(int), M.loc[M.school == s, 'major']))
            lost = sorted({m for gg, m in zip(b.g, b.major) if gg == main and (gg, m) not in used})
        L = g26.L.get(key, '')
        pos = g25.line.get((s, main), smed.get(s, np.nan)) if main is not None else smed.get(s, np.nan)
        sb25, sb26 = same_band_same_type(s, pos, L) if pos == pos and L else (0, 0)
        req26 = B.req.get(key, ''); req25 = REQ25.get((s, main), '') if main is not None else ''
        c26, sp26 = camset(a); c25, sp25 = camset(b[b.g == main]) if main is not None else (set(), False)
        cam26 = '、'.join(sorted(c26)) + ('（分段在不同校区）' if sp26 else ''); cam25 = '、'.join(sorted(c25)) + ('（分段在不同校区）' if sp25 else '')
        x = X.loc[key] if key in X.index else None
        tr = (g25.line.get((s, main)) - g24.line.get((s, main))) if (main is not None and (s, main) in g24.index and (s, main) in g25.index) else np.nan
        p26 = int(a.plan.sum()); p25main = int(g25.plan.get((s, main), 0)) if main is not None else 0
        out.append({
            '学校': s, '26组': f'{int(g):02d}', '组名': B.gname.get(key, ''), '类别': L, '26计划': p26,
            'A结构': st, 'A前身(带来计划)': '；'.join(f'25-{int(k):02d}({int(v)})' for k, v in src.items()) or '无',
            'A新进专业': '、'.join(new_m), 'A前身里没跟过来的专业': '、'.join(lost),
            'B前身组25计划': p25main, 'B带过来的专业25计划': int(round(carried)),
            'B本组计划变化%': round((p26 / p25main - 1) * 100) if (st == '延续' and p25main) else None,
            'C同档同类25计划': sb25, 'C同档同类26计划': sb26, 'C同档同类变化%': round((sb26 / sb25 - 1) * 100) if sb25 >= 300 else None,
            'D班型26': fmt_mix(btmix(a)), 'D班型25(前身)': fmt_mix(btmix(b[b.g == main])) if main is not None else '',
            'E选科26': req26, 'E选科25': req25, 'E选科变化': '是' if (req25 and req26 and (('化' in str(req25)) != ('化学' in str(req26)))) else '',
            'F校区26': cam26, 'F校区25': cam25, 'F校区变化': '是' if (c26 and c25 and c26 != c25) else '',
            'G学校事件': EVENT.get(s, ''),
            'H前身24→25线变化': None if tr != tr else int(round(tr)),
            '前身25线(折26)': None if (main is None or (s, main) not in g25.index) else int(g25.line[(s, main)]),
            '结果:26线': None if x is None or x.l26 != x.l26 else int(x.l26),
            '结果:相对涨跌': None if x is None or x.dr != x.dr else int(x.dr),
        })
C = pd.DataFrame(out)
C.to_pickle(S + 'card29.pkl'); C.to_csv(S + 'card29.csv', index=False, encoding='utf-8-sig')
print(C.shape); print(C.A结构.value_counts().to_string())
print(C[['B本组计划变化%', 'C同档同类变化%']].describe().round(0).to_string())
print('选科变化', (C.E选科变化 == '是').sum(), '校区变化', (C.F校区变化 == '是').sum())
