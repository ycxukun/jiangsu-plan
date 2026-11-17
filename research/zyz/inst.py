"""专业 + 班型 对照：不依赖自动谱系，自己从 25、26 两年招生专刊里把每个专业拆成「专业 + 班型」，
再看每一项 25 年在哪个组、26 年在哪个组，由此推出组的延续 / 拆分 / 合并 / 新增。
输出 inst.pkl（每行一个 学校×科类×专业×班型×年份）和 lin2.pkl（每个 26 组的前身判断）。"""
import pandas as pd, numpy as np, re, collections
S = '/home/claude/zyz/'
# ---------- 班型 ----------
ELITE = r'英才|拔尖|实验班|创新班|卓越|登峰|未来技术|书院|荣誉|菁英|精英|鲲鹏|试点班|强基|少年班|特色班|领军|钱学森|吴健雄|茅以升|基地班|培养基地|英才学院|拔尖计划'
OPEN, CLOSE = '（([［', '）)]］'
def _parse(t):
    """把文本切成 (深度0文字, [顶层括号组 (内容原文, 是否清单)])；清单 = 去掉内层括号后含顿号"""
    t = str(t or ''); out, groups, depth, buf, start = [], [], 0, '', 0
    for i, ch in enumerate(t):
        if ch in OPEN:
            if depth == 0: start = i
            depth += 1
        elif ch in CLOSE and depth:
            depth -= 1
            if depth == 0: groups.append(t[start + 1:i])
        elif depth == 0: out.append(ch)
    return ''.join(out), groups
def _flat(x):
    o, d = [], 0
    for ch in x:
        if ch in OPEN: d += 1
        elif ch in CLOSE and d: d -= 1
        elif d == 0: o.append(ch)
    return ''.join(o)
def _strip_lists(t):
    # 去掉「专业清单」括号（顶层括号里去掉内层后含顿号的），避免把清单里的某个实验班当成整条的班型
    top, groups = _parse(t)
    return top + ''.join(f'({g})' for g in groups if '、' not in _flat(g))
def btype(text):
    t = _strip_lists(text)
    if re.search(r'中外合作|合作办学', t): return '中外合作'
    if re.search(r'学分互认|联合培养项目', t): return '学分互认'
    if re.search(r'双学士|双学位', t): return '双学位'
    if re.search(ELITE, t): return '拔尖'
    if re.search(r'预科', t): return '预科'
    return '普通'
def comps(text):
    """大类 / 试验班括号里列出的组成专业（顶层清单括号，按深度 1 的顿号切）"""
    out = []
    for g in _parse(text)[1]:
        if '、' not in _flat(g): continue
        d, cur, items = 0, '', []
        for ch in g:
            if ch in OPEN: d += 1
            elif ch in CLOSE and d: d -= 1
            if ch in '、，,' and d == 0: items.append(cur); cur = ''
            else: cur += ch
        items.append(cur)
        out += [re.split(r'[（(]', x)[0].strip() for x in items if x.strip()]
    return out
GEN = r'英才|领军|学院|班|拔尖|创新|计划|培养|学生|基地|省|实验|试点|荣誉|卓越|菁英|精英|特色'
def ekey(text):
    for p in _parse(_strip_lists(text))[1]:
        if re.search(ELITE, p) and not re.search(r'双学士|双学位', p):
            k = re.sub(GEN, '', p)
            return k if k else '通用'
    return ''
def campus(text):
    m = re.findall(r'([^\s（()）,，、在于和及与]{2,6}校区)', str(text or ''))
    m = [x for x in m if not re.match(r'以下|相应|各', x)]
    return m[-1] if m else ''
def base(name):
    return re.split(r'[（(\[［]', str(name))[0].strip()
# ---------- 26 ----------
d = pd.read_pickle('/home/claude/d.pkl'); d = d[d['批次'] == '本科批']
r26 = []
for _, r in d.iterrows():
    txt = f"{r['专业名称']} {r['专业备注'] or ''}"
    r26.append(dict(kl=r['科类'], school=r['院校名称'], g=int(r['专业组代码']), gc=r['院校专业组代码'],
                    major=base(r['专业名称']), comps=comps(txt), bt=btype(txt), ek=ekey(txt), cam=campus(txt), plan=int(r['计划人数'] or 0),
                    raw=f"{r['专业名称']}{r['专业备注'] if isinstance(r['专业备注'], str) else ''}"))
I26 = pd.DataFrame(r26)
# ---------- 25 ----------
F = '/mnt/user-data/attachments/bf05c1e4-9d41-5f35-8743-720179e09867/6fb1674b-2025________.xlsx'
r25 = []
for kl, sh, col in [('物理', '理科专业分', '专业名称'), ('历史', '文科专业分', '专业')]:
    m = pd.read_excel(F, sheet_name=sh); m.columns = [c.replace('\n', '') for c in m.columns]
    for _, r in m.iterrows():
        txt = str(r[col])
        r25.append(dict(kl=kl, school=r['院校'], g=int(r['专业组']), major=base(txt), comps=comps(txt), bt=btype(txt), ek=ekey(txt), cam=campus(txt),
                        plan=int(r['25招生计划'] or 0), s25=r['最低分数'], r25=r['最低位次'], raw=txt))
I25 = pd.DataFrame(r25)
I26.to_pickle(S + 'i26.pkl'); I25.to_pickle(S + 'i25.pkl')
# ---------- 对照：先按 专业+班型(+校区)，再按 专业+班型，再按 班型（同校同班型总量）----------
rows = []
for (kl, s), a in I26.groupby(['kl', 'school']):
    b = I25[(I25.kl == kl) & (I25.school == s)]
    if b.empty:
        for _, x in a.iterrows(): rows.append(dict(kl=kl, school=s, g26=x.g, g25=None, plan=x.plan, how='25无此校'))
        continue
    def cands(x):
        bb = b[b.ek == x.ek] if x.bt == '拔尖' else b
        c = bb[(bb.major == x.major) & (bb.bt == x.bt) & (bb.cam == x.cam)]
        if len(c): return c, '专业+班型+校区'
        c = bb[(bb.major == x.major) & (bb.bt == x.bt)]
        if len(c): return c, '专业+班型'
        return None, None
    # 第一遍：同名同班型，先记下每个 26 组的主要来源（上下文）
    first = {}
    usedm = set()
    ctx = collections.Counter()
    for i, x in a.iterrows():
        c, how = cands(x)
        if c is not None and c.g.nunique() == 1:
            first[i] = (int(c.g.iloc[0]), how); ctx[(x.g, int(c.g.iloc[0]))] += x.plan
            usedm.add((int(c.g.iloc[0]), x.major))
    dom = {}
    for (g26, g25), p in ctx.items():
        if p > dom.get(g26, (None, -1))[1]: dom[g26] = (g25, p)
    for i, x in a.iterrows():
        if i in first:
            g25, how = first[i]
        else:
            c, how = cands(x); g25 = None
            if c is not None:   # 同名多处：优先本组的主要来源，其次计划最多的那处
                d0 = dom.get(x.g, (None,))[0]
                g25 = d0 if d0 in set(c.g) else int(c.groupby('g')['plan'].sum().idxmax())
            elif x.bt == '拔尖':   # 拔尖班常改名：同校同为拔尖、且是本组主要来源的那个 25 组
                c = b[(b.bt == '拔尖') & (b.ek == x.ek)]
                c = c[[(int(g), m) not in usedm for g, m in zip(c.g, c.major)]]
                if len(c):
                    d0 = dom.get(x.g, (None,))[0]
                    g25 = d0 if d0 in set(c.g) else int(c.groupby('g')['plan'].sum().idxmax()); how = '拔尖班改名'
            if g25 is None:   # 大类 ↔ 具体专业：名字或组成专业有重合、班型相同
                names = {x.major} | set(x.comps)
                c = b[(b.bt == x.bt).values & np.array([bool(names & ({m} | set(cs))) for m, cs in zip(b.major, b.comps)], dtype=bool)]
                if len(c):
                    d0 = dom.get(x.g, (None,))[0]
                    g25 = d0 if d0 in set(c.g) else int(c.groupby('g')['plan'].sum().idxmax()); how = '大类与专业互换'
            if g25 is None:   # 同名专业、班型标注变了（如 25 表里没写班名、26 写了）：只取未被用掉的
                c = b[(b.major == x.major)]
                c = c[[(int(g), m) not in usedm for g, m in zip(c.g, c.major)]]
                if len(c):
                    d0 = dom.get(x.g, (None,))[0]
                    g25 = d0 if d0 in set(c.g) else int(c.groupby('g')['plan'].sum().idxmax()); how = '班型标注变化'
            if g25 is None: how = '新专业/新班型'
        rows.append(dict(kl=kl, school=s, g26=x.g, g25=g25, plan=x.plan, how=how, major=x.major, bt=x.bt))
M = pd.DataFrame(rows)
M.to_pickle(S + 'map26.pkl')
# ---------- 每个 26 组的前身判断 ----------
out = []
for (kl, s), a in M.groupby(['kl', 'school']):
    car = a.dropna(subset=['g25']).groupby(['g25', 'g26'])['plan'].sum()
    fwd = {}
    for g25, sub in car.groupby(level=0):
        sub = sub.droplevel(0); tot25 = sub.sum()
        fwd[g25] = {g for g, p in sub.items() if p >= max(5, 0.2 * tot25)}   # 只算成规模的去向
    for g26, b in a.groupby('g26'):
        tot = b.plan.sum() or 1
        src = b.dropna(subset=['g25']).groupby('g25')['plan'].sum().sort_values(ascending=False)
        new_share = b.loc[b.g25.isna(), 'plan'].sum() / tot
        if src.empty: st = '新增'
        elif len(src) == 1:
            g25 = src.index[0]
            sh = car.get((g25, g26), 0) / max(car.loc[g25].sum(), 1)   # 这个 25 组带过去的计划里，本组拿了多少
            st = '延续' if (len(fwd.get(g25, ())) <= 1 and sh >= 0.6) else '由大组拆出'
        else:
            main = src.iloc[0] / src.sum()
            st = '合并' if main < 0.8 else ('延续(并入少量)' if len(fwd.get(src.index[0], ())) <= 1 else '拆出(并入少量)')
        out.append(dict(kl=kl, school=s, g26=g26, st=st, pre=','.join(f'{int(k):02d}:{int(v)}' for k, v in src.items()),
                        main_pre=int(src.index[0]) if len(src) else None, new_share=round(new_share, 2),
                        hows='/'.join(sorted(set(b.how)))))
L = pd.DataFrame(out); L.to_pickle(S + 'lin2.pkl')
print(L.st.value_counts().to_string())
print(M.how.value_counts().to_string())
