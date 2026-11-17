"""逐一去掉一所学校重算 25→26 的价格变化，看结论会不会被单所学校撑起来"""
import pandas as pd, numpy as np, sys, types
src = open('/home/claude/zyz/price_reg.py').read().split('rng = np.random')[0]
sys.argv = ['x', 'main']; ns = {}; exec(src, ns)
G, fe_fit, VARS = ns['G'], ns['fe_fit'], ns['VARS']
KEY = ['chem', '中外', 'sh_临床口腔', 'sh_师范', 'sh_电计']
out = []
for band in ['520以下', '520-570', '570-620', '620以上']:
    D = {}
    for yr in (25, 26):
        df = G[(G.band == band) & (G.year == yr)]; df = df[df.school.map(df.school.value_counts()) >= 2]
        vs = [v for v in VARS if (df.groupby('school')[v].nunique() > 1).sum() >= 8 and v != '异地']
        D[yr] = (df, vs)
    common = [v for v in KEY if v in D[25][1] and v in D[26][1]]
    def diff(drop=None):
        r = {}
        for yr in (25, 26):
            df, vs = D[yr]
            if drop: df = df[df.school != drop]
            b = fe_fit(df, vs); r[yr] = dict(zip(vs, b))
        return {v: r[26][v] - r[25][v] for v in common}
    full = diff()
    schools = sorted(set(D[25][0].school) | set(D[26][0].school))
    ds = pd.DataFrame([diff(s) for s in schools], index=schools)
    for v in common:
        out.append(dict(band=band, var=v, full=round(full[v], 1), min=round(ds[v].min(), 1), max=round(ds[v].max(), 1),
                        who_min=ds[v].idxmin(), who_max=ds[v].idxmax()))
R = pd.DataFrame(out); R.to_pickle('/home/claude/zyz/price_loso.pkl'); pd.set_option('display.width', 200); print(R.to_string())
