"""专业组底表：2026 构成 + 2025 对应 + 2023-2025 组线 + 2026 投档线 + 方向归类"""
import pandas as pd, numpy as np, json, re, sys
sys.path.insert(0,'/home/claude')
exec(open('/home/claude/mapping.py').read())
S='/tmp/claude-0/-home-claude/bf05c1e4-9d41-5f35-8743-720179e09867/scratchpad/'
d=pd.read_pickle('/home/claude/d.pkl')
d=d[(d['批次']=='本科批')]
kb=json.load(open(S+'kb-raw.json'))
G={}
for e in kb['entries']:
    if e['bat']!='本科批':continue
    for g in e['groups']:
        G[(e['sub'],g['code'])]=dict(s25=g['s25'],r25=g['r25'],s24=g['s24'],r24=g['r24'],s23=g['s23'],r23=g['r23'],p25=g['p25'],
             change=g['change'],cut26=g['cut26'],q=g['q'],guide=(g['guide'] or {}).get('id') if (g['guide'] or {}).get('ok') else None,
             spec=g['spec'],ws=e['ws'],facets=e['facets'])
hx=json.load(open('/home/claude/jiangsu-plan/huaxian/data.json'))
L26={(g['kl'],g['id']):(g.get('l26'),g.get('r26')) for g in hx['groups']}
OV={m[0]:m[1] for m in MAJOR}
def mdir(name,cls):
    return OV.get(name, CLASS.get(cls,'D99'))
def fee(x):
    m=re.findall(r'\d+',str(x));return max(map(int,m)) if m else np.nan
FLAGS=[('中外合作',r'中外合作'),('学分互认',r'学分互认|联合培养项目'),('地方专项',r'地方专项'),('民族',r'民族|少数民族'),('定向',r'定向'),('预科',r'预科'),
 ('拔尖',r'拔尖|实验班|英才|卓越班|强基|菁英|精英|荣誉|书院|少年班|试验班|创新班|特色班|钱学森|吴健雄|茅以升'),('校区',r'校区'),('外语限',r'只招英语|限英语'),('师范',r'师范'),('医学类',r'临床医学|口腔医学'),('高收费',r'$^')]
rows=[]
for (kl,gc),g in d.groupby(['科类','院校专业组代码']):
    r0=g.iloc[0];name=str(r0['专业组名称']);notes=' '.join(g['专业备注'].fillna('').astype(str))
    dirs=[mdir(n,c) for n,c in zip(g['专业名称'],g['专业类'])]
    plan=g['计划人数'].fillna(0).values
    dp={}
    for dd,p in zip(dirs,plan):dp[dd]=dp.get(dd,0)+p
    tot=plan.sum() or 1
    main=max(dp,key=dp.get)
    fees=g['学费'].map(fee)
    s25=g['最低分1']
    h=G.get((kl,gc),{})
    l26=h.get('cut26') or L26.get((kl,gc)) or (None,None)
    ch=h.get('change') or {}
    flags=[k for k,p in FLAGS[:-1] if re.search(p,name+notes)]
    if fees.max()>=15000:flags.append('高收费')
    rows.append(dict(kl=kl,school=r0['院校名称'],scode=r0['院校代码'],gc=gc,gname=name,req=r0['选科要求'],prov=r0['所在省'],city=r0['城市'],
        tags=r0['院校标签'],level=r0['院校水平'],stype=r0['类型'],pub=r0['公私性质'],
        p26=int(g['专业组计划人数'].iloc[0] or plan.sum()),nm=len(g),majors=list(g['专业名称']),mplan=list(map(int,plan)),mdir=dirs,ms25=[None if pd.isna(x) else float(x) for x in s25],
        mcls=list(g['专业类'].fillna('')),mnote=list(g['专业备注'].fillna('')),
        fee_max=fees.max(),fee_min=fees.min(),main=main,main_share=dp[main]/tot,ndir=len(dp),dirplan=dp,
        fams=sorted({ {**{k:'理工' for k in ['D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11','D12','D13','D25']},**{k:'医学' for k in ['D14','D15','D16']},**{k:'经管法社' for k in ['D17','D18','D19','D20','D26','D27']},**{k:'人文教育' for k in ['D21','D22','D23','D28']},'D24':'艺术','D99':'待拆'}[x] for x in dp}),
        s25m_max=s25.max(),s25m_min=s25.min(),flags=flags,
        g_s25=h.get('s25'),g_r25=h.get('r25'),g_s24=h.get('s24'),g_r24=h.get('r24'),g_s23=h.get('s23'),g_r23=h.get('r23'),p25=h.get('p25'),
        l26=l26[0],r26=l26[1],ch_status=ch.get('status'),ch_g25=ch.get('group25'),ch_sim=ch.get('similarity'),ch_summary=ch.get('summary'),ch_advice=ch.get('advice'),
        ch_mc25=ch.get('majorCount25'),ch_plan25=ch.get('plan25'),ch_details=ch.get('details'),q=h.get('q'),ws=h.get('ws'),facets=h.get('facets')))
B=pd.DataFrame(rows)
B.to_pickle('base.pkl')
print(B.shape, B['kl'].value_counts().to_dict())
print(B['ch_status'].value_counts().head(15))
print(pd.Series([f for x in B['flags'] for f in x]).value_counts())
