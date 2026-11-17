"""第三轮：谁和谁在抢同一批人。
思路：学校今年在某个分数位置多放了多少计划（供给变化），会压低附近同类组的线。
如果「A 类组附近，B 类组的计划多了」会让 A 类组的线明显下降，说明 A 和 B 在抢同一批人。
位置 = 组在 25 年的线（26 年的组用它的主要前身的 25 年线，即学生填报时参照的位置）。
对每个 26 年的组 i，取它 25 年线 ±W 分的窗口（不含本校），算窗口里各类组 26 年计划 − 25 年计划，
除以窗口 25 年总计划，得到各类的「供给变化率」，再回归 i 的相对涨跌（dr）。
"""
import pandas as pd, numpy as np, sys
S = '/home/claude/zyz/'
W = int(sys.argv[1]) if len(sys.argv) > 1 else 8
MODE = sys.argv[2] if len(sys.argv) > 2 else 'main'
X = pd.read_pickle(S + 'chg4.pkl')                  # 26 年的组：pe、p26、dr、cat、req
G = pd.read_pickle(S + 'price_groups.pkl')
g25 = G[G.year == 25].copy()
def cat_of(r_chem, coop, credit, sh):
    if coop or credit: return '中外/学分互认'
    top = max(sh, key=sh.get)
    if sh['sh_临床口腔'] + sh['sh_医学其他'] >= 0.5: return '医学'
    if sh['sh_师范'] >= 0.5: return '师范'
    if top in ('sh_电计',) and sh[top] >= 0.4: return '电计' + ('(化)' if r_chem else '(不限)')
    if top in ('sh_机械土建化工', 'sh_理农生') and sh[top] >= 0.4: return '其他理工' + ('(化)' if r_chem else '(不限)')
    return '经管文法等'
SH = ['sh_电计', 'sh_机械土建化工', 'sh_理农生', 'sh_临床口腔', 'sh_医学其他', 'sh_师范', 'sh_经管', 'sh_文法外', 'sh_教育', 'sh_其他']
g25['k'] = [cat_of(r.chem, r['中外'], r['学分互认'], {c: r[c] for c in SH}) for _, r in g25.iterrows()]
g26 = G[G.year == 26].copy()
g26['k'] = [cat_of(r.chem, r['中外'], r['学分互认'], {c: r[c] for c in SH}) for _, r in g26.iterrows()]
# 26 组的位置：主要前身的 25 线；新增组用本校 25 年普通组中位线
L = pd.read_pickle(S + 'lin2.pkl'); L = L[L.kl == '物理']
pre = {(r.school, r.g26): r.main_pre for r in L.itertuples() if r.main_pre == r.main_pre and r.main_pre is not None}
line25 = g25.set_index(['school', 'g']).line.to_dict()
smed = g25[g25['中外'] == 0].groupby('school').line.median().to_dict()
g26['pos'] = [line25.get((s, int(pre[(s, g)])), np.nan) if (s, g) in pre else smed.get(s, np.nan) for s, g in zip(g26.school, g26.g)]
g25['pos'] = g25.line
g26 = g26.dropna(subset=['pos']); g25 = g25.dropna(subset=['pos'])
d = pd.read_pickle('/home/claude/d.pkl'); prov = d.groupby('院校名称')['所在省'].first()
for t in (g25, g26): t['js'] = t.school.map(prov).eq('江苏')
K = sorted(set(g25.k) | set(g26.k))
# 目标：26 年的普通组相对涨跌
Y = X[(X.p26 >= 10) & X.dr.notna() & X.pe.notna()].copy()
Y['g'] = Y.gname.str.extract(r'^(\d+)')[0].astype(float)
Y = Y.merge(g26[['school', 'g', 'k', 'js']], on=['school', 'g'], how='inner')
P25, K25, S25 = g25.pos.values, g25.k.values, g25.school.values; PL25 = g25.plan.values.astype(float)
P26, K26, S26 = g26.pos.values, g26.k.values, g26.school.values; PL26 = g26.plan.values.astype(float)
feats = []
for r in Y.itertuples():
    m25 = (np.abs(P25 - r.pe) <= W) & (S25 != r.school); m26 = (np.abs(P26 - r.pe) <= W) & (S26 != r.school)
    tot = PL25[m25].sum()
    f = {'_tot25': tot}
    for k in K:
        f['d_' + k] = (PL26[m26 & (K26 == k)].sum() - PL25[m25 & (K25 == k)].sum()) / max(tot, 1) * 100   # 每 100 个原有座位多了几个
    feats.append(f)
F = pd.DataFrame(feats, index=Y.index); Y = pd.concat([Y, F], axis=1)
Y = Y[Y._tot25 >= 300]
Y['bin'] = (Y.pe // 20).astype(int)
Y.to_pickle(S + f'compete_{W}.pkl')
# 回归：dr ~ 各类供给变化（按本组类别分开估）+ 20 分一档的固定效应
def fit(df, xs):
    w = np.sqrt(df.p26.values.astype(float)) if MODE == 'main' else np.ones(len(df))
    B = pd.get_dummies(df.bin, prefix='b').values.astype(float)
    Xm = np.column_stack([df[x].values for x in xs] + [B]); y = df.dr.values
    rw = np.sqrt(w); b, *_ = np.linalg.lstsq(Xm * rw[:, None], y * rw, rcond=None); return b[:len(xs)]
rng = np.random.default_rng(3); out = []
xs = ['d_' + k for k in K]
for own in K + ['全部']:
    df = Y if own == '全部' else Y[Y.k == own]
    if len(df) < 60: continue
    beta = fit(df, xs); sch = df.school.unique(); idx = {s: np.where(df.school.values == s)[0] for s in sch}; bs = []
    for _ in range(300):
        pick = rng.choice(sch, len(sch)); bs.append(fit(df.iloc[np.concatenate([idx[s] for s in pick])], xs))
    bs = np.array(bs)
    for j, x in enumerate(xs):
        lo, hi = np.percentile(bs[:, j], [2.5, 97.5])
        out.append(dict(own=own, nb=x[2:], b=beta[j], lo=lo, hi=hi, n=len(df), sd=df[x].std()))
R = pd.DataFrame(out); R.to_pickle(S + f'compete_res_{W}_{MODE}.pkl')
# 「效应」= 邻近该类供给增加 1 个标准差，本组线变化几分
R['eff'] = R.b * R.sd
fmt = lambda r: f"{r.eff:+.1f}{'*' if (r.lo > 0 or r.hi < 0) else ''}"
T = R.assign(s=R.apply(fmt, axis=1)).pivot(index='own', columns='nb', values='s')
pd.set_option('display.width', 250); print(f'W={W} {MODE}  行=本组类别 列=附近这一类的计划变化（+1 个标准差）'); print(T.to_string())
print(Y.groupby('k').size().to_string()); print(Y[xs].describe().round(1).to_string())
