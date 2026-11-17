"""一所学校的专业组画像：从上往下（整体投放）、从内到外（组内构成）、从前到后（25→26 变化）。
用法：python3 profile.py 学校名 [物理|历史]   → 打印 markdown
数据：base.pkl（build: base.py）、huaxian/data.json（谱系 lin、26 投档线）、groups.pkl（专业组标签结论）
"""
import pandas as pd, numpy as np, json, sys, collections
school = sys.argv[1]; KL = sys.argv[2] if len(sys.argv) > 2 else '物理'
B = pd.read_pickle('/home/claude/zyz/base.pkl'); B = B[(B.kl == KL) & (B.school == school)].copy().reset_index(drop=True)
h = json.load(open('/home/claude/jiangsu-plan/huaxian/data.json'))
LAB = pd.read_pickle('/home/claude/groups.pkl')
LAB = LAB[(LAB['院校名称'] == school) & (LAB['科类'] == KL)].set_index('院校专业组代码')
exec(open('/home/claude/mapping.py').read()); DN = {k: v for k, v, _, _ in DIRECTIONS}
BASE_SHIFT = -5  # 全体延续组：26 线比 25 线折算值中位低 5 分（整体下移，比较时要扣掉）
c = h['conv26'][KL]
def r2s(r):
    for i, x in enumerate(c['rank']):
        if x <= r: return c['lo'] + i
    return c['hi']
NEAR = {frozenset(p) for p in [('D01','D02'),('D02','D03'),('D01','D03'),('D06','D25'),('D14','D16'),('D17','D18'),('D17','D26'),('D18','D26')]}
def sptype(f, pub):
    for k in ['中外合作', '学分互认', '预科', '定向', '地方专项', '民族']:
        if k in f: return k
    return '高收费' if ('高收费' in f and pub == '公办') else ''
def comp(r):
    if r.nm == 1: return '单专业'
    dp = r.dirplan; ks = [k for k in dp if k != 'D99']
    if r.main_share >= 0.9: return '纯方向'
    if len(ks) == 2 and frozenset(ks) in NEAR: return '近亲组合'
    if r.main_share >= 0.6: return '主体+搭配'
    return '拼盘/打散'
B['sp'] = [sptype(f, p) for f, p in zip(B['flags'], B['pub'])]
B['comp'] = B.apply(comp, axis=1)
B['campus'] = B['gname'].str.extract(r'\(([^()]*校区)\)')[0].fillna('')
B = B.sort_values('l26', ascending=False, na_position='last')
f = lambda v: '—' if v is None or (isinstance(v, float) and np.isnan(v)) else (f'{int(v):,}' if isinstance(v, (int, float, np.integer, np.floating)) else str(v))
out = []
P = out.append
r0 = B.iloc[0]
P(f'# {school}（{KL}类·本科批）专业组画像\n')
P(f'{r0.prov} {r0.city}｜{r0.tags or ""}｜{r0.pub}\n')
# ---------- 一、整体投放 ----------
P('## 一、整体投放（从上往下）\n')
tot = B.p26.sum()
P(f'- 专业组 {len(B)} 个，2026 计划 {tot:,} 人；其中特殊办学（中外合作/学分互认/高收费/预科等）{(B.sp!="").sum()} 个、{B.loc[B.sp!="","p26"].sum():,} 人。')
reqs = B[B.sp == ''].groupby('req')['p26'].agg(['size', 'sum'])
P('- 按选科：' + '；'.join(f'{k} {v["size"]}组/{v["sum"]:,}人' for k, v in reqs.iterrows()))
cams = B[B.campus != ''].groupby('campus')['p26'].agg(['size', 'sum'])
if len(cams): P('- 按校区：' + '；'.join(f'{k} {v["size"]}组/{v["sum"]:,}人' for k, v in cams.iterrows()))
nl = B[(B.sp == '')].dropna(subset=['l26'])
if len(nl) >= 2: P(f'- 普通组 26 投档线从 {int(nl.l26.max())} 到 {int(nl.l26.min())}，跨度 {int(nl.l26.max()-nl.l26.min())} 分；最大组占全校计划 {B.p26.max()/tot:.0%}。')
P('\n| 组 | 类型 | 选科 | 26计划(占比) | 专业数 | 构成 | 主体方向(占比) | 26投档线/位次 | 25组线/位次 | 标签结论 |')
P('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for _, r in B.iterrows():
    lab = LAB.loc[r.gc] if r.gc in LAB.index else None
    concl = '' if lab is None else f"{lab['结论']}{'·'+lab['坑等级'] if isinstance(lab['坑等级'], str) and lab['坑等级'] else ''}"
    P(f"| {r.gname} | {r.sp or ('校区:'+r.campus if r.campus else '普通')} | {r.req} | {r.p26:,}({r.p26/tot:.0%}) | {r.nm} | {r.comp} | {DN.get(r.main, r.main)}({r.main_share:.0%}) | {f(r.l26)}/{f(r.r26)} | {f(r.g_s25)}/{f(r.g_r25)} | {concl} |")
# ---------- 二、组内构成 ----------
P('\n## 二、组内构成（从内到外）\n')
for _, r in B.iterrows():
    ms = sorted(zip(r.majors, r.mplan, r.mdir, r.ms25, r.mnote), key=lambda x: -(x[3] or 0))
    sc = [x[3] for x in ms if x[3]]
    spread = (max(sc) - min(sc)) if len(sc) >= 2 else None
    lab = LAB.loc[r.gc] if r.gc in LAB.index else None
    P(f"### {r.gname}｜{r.comp}｜{r.p26}人｜26线 {f(r.l26)}" + (f"｜组内25专业分差 {int(spread)} 分" if spread is not None else ''))
    if lab is not None and isinstance(lab['一句话标签'], str): P(f"标签：{lab['一句话标签']}" + (f"；坑专业：{lab['坑专业']}" if isinstance(lab['坑专业'], str) and lab['坑专业'] else ''))
    P('')
    P('| 专业 | 计划 | 方向 | 25最低分 | 备注 |'); P('| --- | --- | --- | --- | --- |')
    for n, p, dd, s, note in ms:
        note = str(note).replace('|', '/')
        P(f"| {n} | {p} | {DN.get(dd, dd)} | {f(s)} | {note[:60]} |")
    P('')
# ---------- 三、前后变化 ----------
P('## 三、25→26 变化（从前到后）\n')
lin = h['lin'].get(f'{school}|{KL}')
if not lin:
    P('没有找到 25→26 谱系数据。')
else:
    g25 = sorted(lin['g25'], key=lambda x: -(x.get('l') or 0))
    P(f"- 2025 年 {len(g25)} 个组、{sum(x['p'] or 0 for x in g25):,} 人 → 2026 年 {len(lin['g26'])} 个组、{sum(x['p'] or 0 for x in lin['g26']):,} 人（谱系只含本科批）。")
    P('\n| 25组 | 25选科 | 25计划 | 25线/位次 | 25专业 |'); P('| --- | --- | --- | --- | --- |')
    for x in g25: P(f"| {x['c']:02d} | {x.get('sel','')} | {x['p']} | {f(x.get('l'))}/{f(x.get('r'))} | {'、'.join(x['ms'][:12])}{'…' if len(x['ms'])>12 else ''} |")
    ch = collections.defaultdict(list)
    for a, b, p, ms in lin['e']: ch[a].append((b, p, ms))
    P('\n去向（25组 → 26组：带过去的计划与专业）\n')
    for a in sorted(ch):
        P(f"- 25-{a:02d} → " + '；'.join(f"26-{b:02d}（{p}人：{'、'.join(ms[:6])}{'…' if len(ms)>6 else ''}）" for b, p, ms in ch[a]))
    P('\n| 26组 | 状态 | 26计划 | 25前身计划 | 26线 | 25线折算到26 | 扣除整体下移后 | 判读 |'); P('| --- | --- | --- | --- | --- | --- | --- | --- |')
    for _, r in B.iterrows():
        g = next((g for g in h['groups'] if g['kl'] == KL and g['id'] == r.gc), None)
        pre = (g or {}).get('pre') or {}
        pe = pre.get('e'); d = (r.l26 - pe - BASE_SHIFT) if (pe is not None and r.l26 == r.l26 and r.l26 is not None) else None
        note = ''
        if d is not None: note = '明显变热' if d >= 8 else '略热' if d >= 3 else '明显变冷' if d <= -8 else '略冷' if d <= -3 else '基本持平'
        P(f"| {r.gname} | {r.ch_status or (g or {}).get('st','')} | {r.p26} | {f(pre.get('p'))} | {f(r.l26)} | {f(pe)} | {'' if d is None else ('+' if d>0 else '')+str(int(d))} | {note} |")
print('\n'.join(out))
