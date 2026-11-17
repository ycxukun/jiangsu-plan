"""第 ② 块：用多少分换什么 —— 同校内的「价格」
在同一所学校里，比较不同专业组的投档线（都按位次折算成 26 年分数），
用学校固定效应回归估计每种属性值多少分：中外合作、学分互认、异地校区、拼盘、各方向占比、要求化学……
按学校档次分段，24 / 25 / 26 三年各估一次，看「汇率」有没有变。
24 年只有组线，组的构成借用 25 年同代码组（近似，见口径说明）。
"""
import pandas as pd, numpy as np, json, re, sys
exec(open('/home/claude/mapping.py').read())
S = '/home/claude/zyz/'
h = json.load(open('/home/claude/jiangsu-plan/huaxian/data.json')); c = h['conv26']['物理']
RK = np.array(c['rank'])
def r2s(r):
    if r is None or r != r: return np.nan
    i = np.searchsorted(-RK, -r, side='left')   # 第一个 rank<=r 的位置（rank 随分数降而升）
    return c['lo'] + i if i < len(RK) else c['hi']
# rank 数组：分数 lo..hi 对应的累计位次，分数越高位次越小 → RK 递减
d = pd.read_pickle('/home/claude/d.pkl'); d = d[(d['批次'] == '本科批') & (d['科类'] == '物理')]
OV = {m[0]: m[1] for m in MAJOR}
NAME2CLS = d.groupby('专业名称')['专业类'].agg(lambda s: s.mode().iloc[0] if len(s.mode()) else '').to_dict()
def base(n): return re.split(r'[（(\[［]', str(n))[0].strip()
B2C = {}
for n, cl in NAME2CLS.items(): B2C.setdefault(base(n), cl)
def mdir(name):
    if name in OV: return OV[name]
    if name in CLASS: return CLASS[name]          # 大类名本身
    cl = B2C.get(name, '')
    return CLASS.get(cl, 'D99')
SCH = d.groupby('院校名称').agg(city=('城市', 'first'), prov=('所在省', 'first'), tags=('院校标签', 'first'), pub=('公私性质', 'first')).reset_index()
CITY = SCH.set_index('院校名称').city.to_dict(); PROV = SCH.set_index('院校名称').prov.to_dict()
ALLC = set(SCH.city.dropna()) | {'雄安', '江阴', '宜兴', '溧阳', '金坛', '张家港', '昆山', '太仓', '常熟', '吴江', '泰兴', '靖江', '兴化', '海门', '启东', '如皋',
       '句容', '丹阳', '扬中', '东台', '大丰', '盱眙', '沭阳', '邳州', '新沂', '仪征', '高邮', '宝应', '天目湖', '威海', '深圳', '珠海', '青岛', '秦皇岛', '荣成',
       '唐山', '舟山', '三亚', '漳州', '泉州', '宁波', '温州', '嘉兴', '绍兴', '湖州', '台州', '佛山', '东莞', '烟台', '日照', '德州', '吉安'}
CITYOF = {'江阴': '无锡', '宜兴': '无锡', '溧阳': '常州', '金坛': '常州', '天目湖': '常州', '张家港': '苏州', '昆山': '苏州', '太仓': '苏州', '常熟': '苏州', '吴江': '苏州',
          '泰兴': '泰州', '靖江': '泰州', '兴化': '泰州', '海门': '南通', '启东': '南通', '如皋': '南通', '句容': '镇江', '丹阳': '镇江', '扬中': '镇江',
          '东台': '盐城', '大丰': '盐城', '盱眙': '淮安', '沭阳': '宿迁', '邳州': '徐州', '新沂': '徐州', '仪征': '扬州', '高邮': '扬州', '宝应': '扬州',
          '雄安': '保定', '荣成': '威海'}
def offsite(school, cam):
    if not cam: return 0
    sc = str(CITY.get(school, ''))
    for p in sorted(ALLC, key=len, reverse=True):
        if p and p in cam:
            pc = CITYOF.get(p, p)
            return int(pc not in sc and sc not in pc)
    return 0
I26 = pd.read_pickle(S + 'i26.pkl'); I26 = I26[I26.kl == '物理']
I25 = pd.read_pickle(S + 'i25.pkl'); I25 = I25[I25.kl == '物理']
SHIFT = {'D01': '电计', 'D02': '电计', 'D14': '临床口腔', 'D15': '医学其他', 'D16': '医学其他',
         'D17': '经管', 'D18': '经管', 'D26': '经管', 'D19': '文法外', 'D21': '文法外', 'D22': '文法外', 'D27': '文法外', 'D28': '文法外', 'D23': '教育',
         'D03': '机械土建化工', 'D04': '机械土建化工', 'D05': '机械土建化工', 'D06': '机械土建化工', 'D07': '机械土建化工', 'D08': '机械土建化工', 'D13': '机械土建化工',
         'D09': '理农生', 'D10': '理农生', 'D11': '理农生', 'D12': '理农生', 'D25': '理农生', 'D24': '其他', 'D20': '其他', 'D99': '其他'}
FAM = ['电计', '机械土建化工', '理农生', '临床口腔', '医学其他', '经管', '文法外', '教育', '其他']
def gattr(rows, school):
    p = rows.plan.clip(lower=0).values.astype(float); tot = p.sum() or 1
    fam = rows.major.map(lambda m: SHIFT.get(mdir(m), '其他'))
    raw = ' '.join(rows.raw.astype(str))
    out = {f'sh_{f}': p[(fam == f).values].sum() / tot for f in FAM}
    out['sh_师范'] = p[rows.raw.astype(str).str.contains('师范').values].sum() / tot
    out['sh_拔尖'] = p[(rows.bt == '拔尖').values].sum() / tot
    bt = pd.Series(p, index=rows.bt.values).groupby(level=0).sum()
    out['中外'] = int(bt.get('中外合作', 0) / tot >= 0.5); out['学分互认'] = int(bt.get('学分互认', 0) / tot >= 0.5)
    out['双学位'] = int(bt.get('双学位', 0) / tot >= 0.5)
    out['异地'] = int(np.average([offsite(school, x) for x in rows.cam], weights=p + 1e-9) >= 0.5)
    shares = np.array([out[f'sh_{f}'] for f in FAM]); out['拼盘'] = int(shares.max() < 0.6)
    out['nm'] = len(rows); out['plan'] = int(p.sum())
    return out
# ---------- 26 ----------
Bz = pd.read_pickle(S + 'base.pkl'); Bz = Bz[Bz.kl == '物理']
Bz['g'] = Bz.gname.str.extract(r'^(\d+)')[0].astype(float)
rows = []
for (s, g), a in I26.groupby(['school', 'g']):
    b = Bz[(Bz.school == s) & (Bz.g == g)]
    if b.empty: continue
    b = b.iloc[0]
    if b.r26 is None or b.r26 != b.r26: continue
    x = gattr(a, s); x.update(year=26, school=s, g=int(g), line=r2s(b.r26), chem=int('化学' in str(b.req)), gname=b.gname)
    rows.append(x)
# ---------- 25、24 ----------
F = '/mnt/user-data/attachments/bf05c1e4-9d41-5f35-8743-720179e09867/6fb1674b-2025________.xlsx'
L = pd.read_excel(F, sheet_name='理科投档线'); L.columns = [str(x).replace('\n', '') for x in L.columns]
L['school'] = L['院校专业组'].astype(str).str.replace(r'\d+$', '', regex=True)
L['g'] = L['院校专业组'].astype(str).str.extract(r'(\d+)$')[0].astype(float)
for _, r in L.iterrows():
    a = I25[(I25.school == r.school) & (I25.g == r.g)]
    if a.empty: continue
    x = gattr(a, r.school)
    chem = int('化' in str(r['再选科目']))
    for yr, rc, pc in [(25, '最低位次', '25招生计划'), (24, '最低位次.1', '24招生计划')]:
        rk = pd.to_numeric(r[rc], errors='coerce')
        if rk != rk: continue
        y = dict(x); y.update(year=yr, school=r.school, g=int(r.g), line=r2s(rk), chem=chem, gname=r['院校专业组'])
        if yr == 24: y['plan'] = int(pd.to_numeric(r[pc], errors='coerce') or 0)
        rows.append(y)
G = pd.DataFrame(rows)
G['prov'] = G.school.map(PROV)
G.to_pickle(S + 'price_groups.pkl')
print(G.groupby('year').size().to_dict(), '异地组', G.groupby('year')['异地'].sum().to_dict(), '中外', G.groupby('year')['中外'].sum().to_dict())
