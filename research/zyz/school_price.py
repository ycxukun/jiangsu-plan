"""第二轮：学校本身的属性，在各档次是在涨价还是跌价。
单位 = 专业组的「跨年变化」：同一个组（或它的主要前身）今年线 − 去年线（都按位次折算到 26 年分数）。
因为比的是同一个组自己的前后，学校固有的好坏抵消掉了；剩下的差别，看它和学校属性有没有关系。
两段：24→25（组代码相同、构成借用 25 年）和 25→26（按「专业+班型」对出来的主要前身）。
回归里同时控制：组的属性（要求化学、中外、方向占比）、组的计划变化、学校总计划变化、组的状态（拆出/合并）。
用法：python3 school_price.py [main|unw|p20|noNJ]
"""
import pandas as pd, numpy as np, re, sys
S = '/home/claude/zyz/'
MODE = sys.argv[1] if len(sys.argv) > 1 else 'main'
G = pd.read_pickle(S + 'price_groups.pkl')
L = pd.read_pickle(S + 'lin2.pkl'); L = L[L.kl == '物理']
d = pd.read_pickle('/home/claude/d.pkl'); d = d[d['科类'] == '物理']
sc = d.groupby('院校名称').first()
# ---------- 学校属性 ----------
tags = sc['院校标签'].fillna('')
A = pd.DataFrame(index=sc.index)
A['985'] = tags.str.contains('985').astype(int)
A['211非985'] = (tags.str.contains('211') & ~tags.str.contains('985')).astype(int)
A['双一流非211'] = (tags.str.contains('双一流') & ~tags.str.contains('211')).astype(int)
A['仅保研资格'] = (tags.str.contains('保研') & ~tags.str.contains('双一流|211|985')).astype(int)
ct = sc['城市水平标签'].fillna('')
A['一线城市'] = ct.str.startswith('一线').astype(int)
A['新一线'] = ct.str.startswith('新一线').astype(int)
A['三线及以下'] = ct.str.contains('三线|四线|五线').astype(int)
prov = sc['所在省']; city = sc['城市']
A['省外'] = (prov != '江苏').astype(int)
A['南京'] = ((prov == '江苏') & (city == '南京')).astype(int)
A['苏锡常'] = ((prov == '江苏') & city.isin(['苏州', '无锡', '常州'])).astype(int)
A['省外_长三角'] = prov.isin(['上海', '浙江', '安徽']).astype(int)
A['民办独立'] = (sc['公私性质'] == '民办').astype(int)
A['中外合作大学'] = sc['公私性质'].isin(['中外合作办学', '内地与港澳台合作办学', '境外高校独立办学']).astype(int)
A['职业本科'] = sc.index.str.contains('职业技术大学|职业大学').astype(int)
ty = sc['类型'].fillna('')
for t in ['师范', '医药', '财经', '农林']: A['类型_' + t] = ty.str.contains(t).astype(int)
A['部委直属'] = sc['隶属单位'].fillna('').str.contains('教育部|工信部|交通运输部|国家民委|应急|海关|卫健|公安|司法|外交|国资委|中国科学院|民航|铁路').astype(int)
gm = sc['更名合并转设'].fillna('')
A['近年更名升格'] = (gm.str.contains('202[2-6]') & gm.str.contains('更名|升格|转设')).astype(int) | sc.index.isin(['淮安大学'])
SV = list(A.columns)
# ---------- 组的跨年变化 ----------
def lv_of(df):
    out = {}
    for s, x in df.groupby('school'):
        x = x.sort_values('line'); cw = x.plan.cumsum(); out[s] = x.line[cw >= cw.iloc[-1] / 2].iloc[0]
    return out
base = G[(G['中外'] == 0) & (G['学分互认'] == 0)]
lv = lv_of(base[base.year == 25]); lv.update({k: v for k, v in lv_of(base[base.year == 26]).items() if k not in lv})
GV = ['chem', '中外', '学分互认', 'sh_拔尖', 'sh_电计', 'sh_机械土建化工', 'sh_理农生', 'sh_临床口腔', 'sh_医学其他', 'sh_师范', 'sh_文法外']
key = lambda df: df.set_index(['school', 'g'])
g24, g25, g26 = key(G[G.year == 24]), key(G[G.year == 25]), key(G[G.year == 26])
tot = G.groupby(['school', 'year']).plan.sum().unstack()
rows = []
# 24→25：同代码
for (s, g), r in g25.iterrows():
    if (s, g) not in g24.index: continue
    p = g24.loc[(s, g)]
    if isinstance(p, pd.DataFrame): p = p.iloc[0]
    x = {v: r[v] for v in GV}; x.update(seg='24→25', school=s, dl=r.line - p.line, plan=r.plan,
        gplan=np.log((r.plan + 5) / (p.plan + 5)), splan=np.log(tot.loc[s, 25] / tot.loc[s, 24]) if tot.loc[s, 24] > 0 else 0, split=0, merge=0)
    rows.append(x)
# 25→26：按专业+班型对出来的主要前身
for r in L.itertuples():
    if r.main_pre is None or r.main_pre != r.main_pre or r.st == '新增': continue
    if (r.school, r.g26) not in g26.index or (r.school, int(r.main_pre)) not in g25.index: continue
    a = g26.loc[(r.school, r.g26)]; b = g25.loc[(r.school, int(r.main_pre))]
    if isinstance(a, pd.DataFrame): a = a.iloc[0]
    if isinstance(b, pd.DataFrame): b = b.iloc[0]
    x = {v: a[v] for v in GV}; x.update(seg='25→26', school=r.school, dl=a.line - b.line, plan=a.plan,
        gplan=np.log((a.plan + 5) / (b.plan + 5)), splan=np.log(tot.loc[r.school, 26] / tot.loc[r.school, 25]) if tot.loc[r.school, 25] > 0 else 0,
        split=int('拆出' in r.st), merge=int(r.st == '合并'))
    rows.append(x)
D = pd.DataFrame(rows).merge(A, left_on='school', right_index=True, how='left')
D['lv'] = D.school.map(lv)
D[SV] = D[SV].fillna(0)
D[['splan', 'gplan']] = D[['splan', 'gplan']].replace([np.inf, -np.inf], np.nan).fillna(0)
D[GV] = D[GV].fillna(0)
D = D[D.dl.notna() & D.lv.notna() & (D.plan >= (20 if MODE == 'p20' else 5))]
D = D[D.dl.abs() < 80]          # 极端值（多为征集/未满额）先剔除，单独看
if MODE == 'noNJ': D = D[D['南京'] == 0]
BANDS = [(0, 520, '520以下'), (520, 570, '520-570'), (570, 620, '570-620'), (620, 999, '620以上')]
D['band'] = None
for lo, hi, nm in BANDS: D.loc[(D.lv >= lo) & (D.lv < hi), 'band'] = nm
CTRL = GV + ['gplan', 'splan', 'split', 'merge']
def fit(df, vs):
    w = np.ones(len(df)) if MODE == 'unw' else np.sqrt(df.plan.values.astype(float))
    X = np.column_stack([np.ones(len(df))] + [df[v].values.astype(float) for v in vs]); y = df.dl.values
    rw = np.sqrt(w); b, *_ = np.linalg.lstsq(X * rw[:, None], y * rw, rcond=None); return b[1:]
rng = np.random.default_rng(11); out = []
for nm in [b[2] for b in BANDS]:
    for seg in ['24→25', '25→26']:
        df = D[(D.band == nm) & (D.seg == seg)]
        sv = [v for v in SV if df.groupby('school')[v].first().sum() >= 4 and df.groupby('school')[v].first().sum() <= df.school.nunique() - 4]
        cv = [v for v in CTRL if df[v].std() > 0]
        vs = sv + cv; beta = fit(df, vs)
        schools = df.school.unique(); idx = {s: np.where(df.school.values == s)[0] for s in schools}; bs = []
        for _ in range(300):
            pick = rng.choice(schools, len(schools)); dd = df.iloc[np.concatenate([idx[s] for s in pick])]
            try: bs.append(fit(dd, vs))
            except Exception: pass
        bs = np.array(bs)
        for j, v in enumerate(vs):
            if v not in sv: continue
            lo, hi = np.nanpercentile(bs[:, j], [2.5, 97.5])
            out.append(dict(band=nm, seg=seg, var=v, b=beta[j], lo=lo, hi=hi, nsch=int(df.groupby('school')[v].first().sum()), ngrp=len(df), nschool=len(schools)))
R = pd.DataFrame(out); R.to_pickle(S + f'school_price_{MODE}.pkl')
fmt = lambda r: f"{r.b:+.0f}{'*' if (r.lo > 0 or r.hi < 0) else ''}({r.nsch})"
T = R.assign(s=R.apply(fmt, axis=1)).pivot_table(index='var', columns=['band', 'seg'], values='s', aggfunc='first').reindex([v for v in SV if v in set(R['var'])])
pd.set_option('display.width', 250); print(MODE); print(T.fillna('').to_string())
print(R.groupby(['band', 'seg'])[['ngrp', 'nschool']].first().T.to_string())
