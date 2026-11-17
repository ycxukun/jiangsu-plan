"""最后一轮：回测。用 24→25 年学到的规律预测 25→26，看哪类信息真的能提前帮上忙。
目标：组的线变化（按位次折算到 26 分数，每年减去全体中位数 = 只比相对位置）。"""
import pandas as pd, numpy as np, json
S='/home/claude/zyz/'
h=json.load(open('/home/claude/jiangsu-plan/huaxian/data.json'));c=h['conv26']['物理'];RK=np.array(c['rank'])
def r2s(r):
    if r!=r: return np.nan
    i=np.searchsorted(-RK,-r,side='left');return c['lo']+i if i<len(RK) else c['hi']
G=pd.read_pickle(S+'supply_groups.pkl')   # 含 L 类别、band（按学校档次）
F='/mnt/user-data/attachments/bf05c1e4-9d41-5f35-8743-720179e09867/6fb1674b-2025________.xlsx'
LX=pd.read_excel(F,sheet_name='理科投档线');LX.columns=[str(x).replace('\n','') for x in LX.columns]
LX['school']=LX['院校专业组'].astype(str).str.replace(r'\d+$','',regex=True);LX['g']=LX['院校专业组'].astype(str).str.extract(r'(\d+)$')[0].astype(float)
LX['l23']=[r2s(x) for x in pd.to_numeric(LX['最低位次.2'],errors='coerce')]
L23=LX.set_index(['school','g']).l23.to_dict()
k=lambda y:G[G.year==y].drop_duplicates(['school','g']).set_index(['school','g'])
g24,g25,g26=k(24),k(25),k(26)
BANDS=[0,490,520,550,580,610,640,999]
def bandof(x): return pd.cut(pd.Series(x),BANDS,labels=False).values
# ---------- 训练：24→25（同代码，构成借 25）----------
tr=[]
for key,r in g25.iterrows():
    if key not in g24.index: continue
    z=g24.loc[key]; l23=L23.get(key,np.nan)
    tr.append(dict(school=key[0],L=r.L,chem=r.chem,pos=z.line,dl=r.line-z.line,mom=z.line-l23 if l23==l23 else np.nan,
                   own=np.log((r.plan+5)/(z.plan+5)),plan=r.plan,st='延续'))
TR=pd.DataFrame(tr)
# ---------- 测试：25→26（按专业+班型对出的前身）----------
C=pd.read_pickle(S+'card_all2.pkl')
C['g']=C['26组'].astype(int)
te=[]
for r in C.itertuples():
    if r.pos!=r.pos or r._18 if False else False: pass
for _,r in C.iterrows():
    key=(r['学校'],r.g)
    if r.pos!=r.pos or key not in g26.index: continue
    a=g26.loc[key]
    pre=r['A前身(带来计划)'].split('；')[0] if r['A前身(带来计划)']!='无' else None
    if not pre: continue
    pg=int(pre[3:5]); pk=(r['学校'],pg)
    if pk not in g25.index: continue
    b=g25.loc[pk]; mom=(b.line-g24.line[pk]) if pk in g24.index else np.nan
    te.append(dict(school=r['学校'],L=r['类别'],chem=a.chem,pos=b.line,dl=a.line-b.line,mom=mom,
                   own=np.log((r['26计划']+5)/(r['B带过来的专业25计划']+5)),plan=r['26计划'],st=r['A结构'],
                   sup=(r['C同档同类变化%'] if r['C同档同类变化%']==r['C同档同类变化%'] else 0)))
TE=pd.DataFrame(te)
for D in (TR,TE):
    D.drop(D[(D.plan<10)|(D.dl.abs()>=80)|D.dl.isna()].index,inplace=True)
    D['y']=D.dl-np.median(D.dl)          # 只比相对位置
    D['band']=bandof(D.pos.values)
    D['tb']=D.L+'|'+D.band.astype(str)
    D['mom_d']=(D.mom-np.nanmedian(D.mom)).fillna(0); D['has_mom']=D.mom.notna().astype(float)
print('训练组',len(TR),'测试组',len(TE))
def wls(X,y,w):
    rw=np.sqrt(w);b,*_=np.linalg.lstsq(X*rw[:,None],y*rw,rcond=None);return b
w_te=np.sqrt(TE.plan.values)
def score(pred,name):
    e=TE.y.values-pred;mae=np.average(np.abs(e),weights=w_te);r2=1-np.average(e**2,weights=w_te)/np.average((TE.y.values-np.average(TE.y.values,weights=w_te))**2,weights=w_te)
    print(f'{name:34s} 平均误差 {mae:5.2f} 分   解释 {r2*100:5.1f}%');return mae
m0=score(np.zeros(len(TE)),'M0 照搬去年位次')
# 潮水：24→25 各「类别×分数段」的平均相对变化，原样搬到 25→26
tide=TR.groupby('tb').apply(lambda d:np.average(d.y,weights=np.sqrt(d.plan)),include_groups=False)
TE['tide']=TE.tb.map(tide).fillna(0); score(TE.tide.values,'M1 去年的潮水原样延续')
# 惯性：24→25 学到的系数（23→24 变化 → 24→25 变化）
b=wls(np.column_stack([np.ones(len(TR)),TR.mom_d,TR.has_mom]),TR.y.values,np.sqrt(TR.plan.values))
score(b[0]+b[1]*TE.mom_d+b[2]*TE.has_mom,f'M2 惯性（系数{b[1]:.2f}）')
# 本组计划：24→25 学到的系数
b=wls(np.column_stack([np.ones(len(TR)),TR.own]),TR.y.values,np.sqrt(TR.plan.values))
score(b[0]+b[1]*TE.own.clip(-1,1),f'M3 本组计划（翻倍≈{b[1]*np.log(2):.1f}分）')
# 合在一起（全部用 24→25 学）
Xtr=np.column_stack([np.ones(len(TR)),TR.mom_d,TR.has_mom,TR.own.clip(-1,1)]);b=wls(Xtr,TR.y.values-TR.tb.map(tide).fillna(0).values,np.sqrt(TR.plan.values))
base=TE.tide.values+b[0]+b[1]*TE.mom_d+b[2]*TE.has_mom+b[3]*TE.own.clip(-1,1)
m4=score(base,'M4 潮水+惯性+计划（只用去年学的）')
# 结构 + 同档同类供给：24→25 学不到（那两年没有拆合对应），用 25→26 按学校分组交叉验证估
TE['split']=TE.st.str.contains('拆出').astype(float);TE['mg']=(TE.st=='合并').astype(float);TE['supc']=(TE.sup.clip(-50,100)/100)
sch=TE.school.unique();rng=np.random.default_rng(0);fold={s:i%5 for i,s in enumerate(rng.permutation(sch))};TE['fold']=TE.school.map(fold)
pred=np.zeros(len(TE));res=TE.y.values-base
for f in range(5):
    trm=TE.fold.values!=f;X=np.column_stack([np.ones(len(TE)),TE['split'],TE['mg'],TE['supc']])
    bb=wls(X[trm],res[trm],w_te[trm]);pred[~trm]=X[~trm]@bb
m5=score(base+pred,'M5 再加 结构+同档供给（交叉验证）')
# 上限参照：今年的潮水（事后才知道）
tide26=TE.groupby('tb').apply(lambda d:np.average(d.y,weights=np.sqrt(d.plan)),include_groups=False)
score(TE.tb.map(tide26).values,'参照：今年真实的潮水（事后）')
# 潮水能不能延续：类别×分数段 两年的相关
both=pd.concat({'24→25':tide,'25→26':tide26},axis=1).dropna()
n_tr=TR.groupby('tb').size();n_te=TE.groupby('tb').size();both=both[(n_tr.reindex(both.index)>=8)&(n_te.reindex(both.index)>=8)]
print('潮水延续：类别×分数段格子',len(both),'两年相关',round(both.corr().iloc[0,1],2))
print(both.round(1).sort_values('25→26').to_string())
TE.to_pickle(S+'bt_TE.pkl');TR.to_pickle(S+'bt_TR.pkl')
