import pandas as pd,numpy as np,json
h=json.load(open('/home/claude/jiangsu-plan/huaxian/data.json'));c=h['conv26']['物理']
def r2s(r):
    for i,x in enumerate(c['rank']):
        if x<=r: return c['lo']+i
    return c['hi']
X=pd.read_pickle('chg2.pkl');M=pd.read_pickle('map26.pkl');M=M[M.kl=='物理'];J=pd.read_pickle('i25.pkl');J=J[J.kl=='物理']
I26=pd.read_pickle('i26.pkl');I26=I26[I26.kl=='物理']
B=pd.read_pickle('base.pkl');B=B[B.kl=='物理']
meta=B.groupby('school').agg(prov=('prov','first'),tags=('tags','first'),pub=('pub','first'))
sp=X.gname.str.contains('中外|学分互认|预科|高收费|定向|专项|民族')
X['sp']=sp
# d_major: 26线 vs 本组实际带过去的专业 25 最低位次
dm=[]
for r in X.itertuples():
    if r.sp or r.l26!=r.l26: dm.append(np.nan); continue
    m=M[(M.school==r.school)&(M.g26==r.g26)].dropna(subset=['g25'])
    keys=set(zip(m.g25.astype(int),m.major))
    js=J[J.school==r.school]; j=js[np.array([(g,mj) in keys for g,mj in zip(js.g,js.major)],dtype=bool)]
    rr=pd.to_numeric(j.r25,errors='coerce').dropna()
    dm.append(r.l26-r2s(rr.max())+6 if len(rr) else np.nan)
X['dm']=dm
X.to_pickle('chg3.pkl')
rows=[]
for s,x in X.groupby('school'):
    tot=x.p26.sum()
    if tot<150: continue
    a=I26[I26.school==s]; b=J[J.school==s]
    if b.empty: continue
    restr=x.loc[~x.st.isin(['延续','延续(并入少量)']),'p26'].sum()/tot
    o=x[(~x.sp)&(x.p26>=10)].dropna(subset=['dr'])
    if len(o)<1: continue
    w=o.p26
    ret=np.average(o.dr,weights=w); retm=np.average(o.dm.fillna(o.dr),weights=w)
    floor26=o.l26.min(); floor25=np.nan
    # 门槛：最低普通组线 vs 25 最低普通组线折算
    pe0=x[(~x.sp)].pe.dropna()
    rows.append(dict(school=s,prov=meta.prov.get(s),tags=meta.tags.get(s),g25=b.g.nunique(),g26=a.g.nunique(),p26=int(tot),
        restr=round(restr,2),elite=(int(b[b.bt=='拔尖'].plan.sum()),int(a[a.bt=='拔尖'].plan.sum())),
        coop=(int(b[b.bt.isin(['中外合作','学分互认'])].plan.sum()),int(a[a.bt.isin(['中外合作','学分互认'])].plan.sum())),
        new=round(M[(M.school==s)&(M.how=='新专业/新班型')].plan.sum()/max(M[M.school==s].plan.sum(),1),2),
        ret=round(ret,1),retm=round(retm,1),lv=np.average(o.pe.fillna(o.l26),weights=w),
        floor=round(o.dr[o.l26.idxmin()],1)))
S=pd.DataFrame(rows)
# 同档位比较：25 线折算 ±12 分以内学校的中位回报
S['peer']=[S[(S.lv-l).abs()<=12].retm.median() for l in S.lv]
S['rel']=(S.retm-S.peer).round(1)
S['act']=S.restr+ S.new
S.to_pickle('school_act.pkl')
print(len(S)); print(S[['restr','new','retm','rel']].describe().round(2))
