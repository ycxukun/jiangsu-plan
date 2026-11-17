"""同校固定效应回归：各属性在同一所学校里值多少分。按学校档次分段，24/25/26 三年。
用法：python3 price_reg.py [口径名]
口径：main（默认）| unw（不加权）| p20（只用计划≥20 的组）| noJS（去掉江苏院校）| onlyJS
输出 price_<口径>.pkl：段×年×属性 的系数、自助法 95% 区间。
"""
import pandas as pd, numpy as np, sys
S = '/home/claude/zyz/'
MODE = sys.argv[1] if len(sys.argv) > 1 else 'main'
G = pd.read_pickle(S + 'price_groups.pkl')
G = G[G.line.notna() & (G.plan >= (20 if MODE == 'p20' else 5))].copy()
if MODE == 'noJS': G = G[G.prov != '江苏']
if MODE == 'onlyJS': G = G[G.prov == '江苏']
# 学校档次：25 年非中外普通组的计划加权中位线（25 没有就用 26）
def wmed(x):
    x = x.sort_values('line'); cw = x.plan.cumsum(); return x.line[cw >= cw.iloc[-1] / 2].iloc[0]
lv = {}
for yr in (25, 26):
    t = G[(G.year == yr) & (G['中外'] == 0) & (G['学分互认'] == 0)]
    for s, x in t.groupby('school'):
        lv.setdefault(s, wmed(x))
G['lv'] = G.school.map(lv)
BANDS = [(0, 520, '520以下'), (520, 570, '520-570'), (570, 620, '570-620'), (620, 999, '620以上')]
G['band'] = None
for lo, hi, nm in BANDS: G.loc[(G.lv >= lo) & (G.lv < hi), 'band'] = nm
VARS = ['chem', '中外', '学分互认', '双学位', '异地', '拼盘', 'sh_拔尖', 'sh_电计', 'sh_机械土建化工', 'sh_理农生', 'sh_临床口腔', 'sh_医学其他', 'sh_师范', 'sh_教育', 'sh_文法外']
def fe_fit(df, vars_):
    w = np.ones(len(df)) if MODE == 'unw' else np.sqrt(df.plan.values.astype(float))
    y = df.line.values.astype(float); X = df[vars_].values.astype(float)
    sid = pd.factorize(df.school)[0]
    # 按学校加权去均值
    sw = np.bincount(sid, w)
    ym = np.bincount(sid, w * y) / sw; y_ = y - ym[sid]
    X_ = X.copy()
    for j in range(X.shape[1]):
        X_[:, j] = X[:, j] - (np.bincount(sid, w * X[:, j]) / sw)[sid]
    keep = [j for j in range(X.shape[1]) if np.abs(X_[:, j]).sum() > 1e-6]
    rw = np.sqrt(w)
    beta = np.full(X.shape[1], np.nan)
    b, *_ = np.linalg.lstsq(X_[:, keep] * rw[:, None], y_ * rw, rcond=None)
    beta[keep] = b
    return beta
rng = np.random.default_rng(7)
out = []
for nm in [b[2] for b in BANDS]:
    for yr in (24, 25, 26):
        df = G[(G.band == nm) & (G.year == yr)]
        df = df[df.school.map(df.school.value_counts()) >= 2]      # 只有一个组的学校不提供校内比较
        if len(df) < 30: continue
        # 每个变量要有足够的校内变化：至少 8 所学校里这个属性在组间有差异
        vs = [v for v in VARS if (df.groupby('school')[v].nunique() > 1).sum() >= 8]
        if yr != 26 and '异地' in vs: vs.remove('异地')              # 25/24 年专刊里校区信息不全，异地只在 26 年估
        beta = fe_fit(df, vs)
        schools = df.school.unique(); idx = {s: np.where(df.school.values == s)[0] for s in schools}
        bs = []
        for _ in range(300):
            pick = rng.choice(schools, len(schools))
            ii = np.concatenate([idx[s] for s in pick])
            dd = df.iloc[ii].copy(); dd['school'] = np.repeat(np.arange(len(pick)), [len(idx[s]) for s in pick])
            bs.append(fe_fit(dd, vs))
        bs = np.array(bs)
        nsch = {v: int((df.groupby('school')[v].nunique() > 1).sum()) for v in vs}
        for j, v in enumerate(vs):
            lo, hi = np.nanpercentile(bs[:, j], [2.5, 97.5])
            out.append(dict(band=nm, year=yr, var=v, b=beta[j], lo=lo, hi=hi, nsch=nsch[v], ngrp=len(df), nschool=len(schools)))
R = pd.DataFrame(out); R.to_pickle(S + f'price_{MODE}.pkl')
fmt = lambda r: f"{r.b:+.0f}{'*' if (r.lo > 0 or r.hi < 0) else ''}"
T = R.assign(s=R.apply(fmt, axis=1)).pivot_table(index='var', columns=['band', 'year'], values='s', aggfunc='first')
T = T.reindex([v for v in VARS if v in T.index])
pd.set_option('display.width', 250)
print(MODE); print(T.fillna('').to_string())
print(R.groupby(['band', 'year'])[['ngrp', 'nschool']].first().T.to_string())
