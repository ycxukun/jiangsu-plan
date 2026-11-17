"""第三轮补充：按「省内/省外 × 要不要化学」分类，看附近谁多放了计划会压低谁"""
import pandas as pd, numpy as np, sys
S='/home/claude/zyz/'; W=int(sys.argv[1]) if len(sys.argv)>1 else 8; MODE=sys.argv[2] if len(sys.argv)>2 else 'main'
exec(open(S+'compete.py').read().split('# 26 组的位置')[0].split('def cat_of')[0])
G=pd.read_pickle(S+'price_groups.pkl'); d=pd.read_pickle('/home/claude/d.pkl'); prov=d.groupby('院校名称')['所在省'].first()
def kk(t): 
    js=t.school.map(prov).eq('江苏'); sp=(t['中外']==1)|(t['学分互认']==1)
    return np.where(sp,'中外/学分互认',np.where(js,'省内','省外')+np.where(t.chem==1,'(化)','(不限)'))
g25=G[G.year==25].copy(); g26=G[G.year==26].copy(); g25['k']=kk(g25); g26['k']=kk(g26)
L=pd.read_pickle(S+'lin2.pkl'); L=L[L.kl=='物理']
pre={(r.school,r.g26):r.main_pre for r in L.itertuples() if r.main_pre==r.main_pre and r.main_pre is not None}
line25=g25.set_index(['school','g']).line.to_dict(); smed=g25[g25['中外']==0].groupby('school').line.median().to_dict()
g26['pos']=[line25.get((s,int(pre[(s,g)])),np.nan) if (s,g) in pre else smed.get(s,np.nan) for s,g in zip(g26.school,g26.g)]
g25['pos']=g25.line; g26=g26.dropna(subset=['pos']); g25=g25.dropna(subset=['pos'])
K=sorted(set(g25.k)|set(g26.k))
Y=X[(X.p26>=10)&X.dr.notna()&X.pe.notna()].copy(); Y['g']=Y.gname.str.extract(r'^(\d+)')[0].astype(float)
Y=Y.merge(g26[['school','g','k']],on=['school','g'],how='inner')
P25,K25,S25,PL25=g25.pos.values,g25.k.values,g25.school.values,g25.plan.values.astype(float)
P26,K26,S26,PL26=g26.pos.values,g26.k.values,g26.school.values,g26.plan.values.astype(float)
F=[]
for r in Y.itertuples():
    m25=(np.abs(P25-r.pe)<=W)&(S25!=r.school); m26=(np.abs(P26-r.pe)<=W)&(S26!=r.school); tot=PL25[m25].sum()
    f={'_tot25':tot}
    for k in K: f['d_'+k]=(PL26[m26&(K26==k)].sum()-PL25[m25&(K25==k)].sum())/max(tot,1)*100
    F.append(f)
Y=pd.concat([Y,pd.DataFrame(F,index=Y.index)],axis=1); Y=Y[Y._tot25>=300]; Y['bin']=(Y.pe//20).astype(int)
xs=['d_'+k for k in K]
def fit(df):
    w=np.sqrt(df.p26.values.astype(float)) if MODE=='main' else np.ones(len(df))
    B=pd.get_dummies(df.bin).values.astype(float); Xm=np.column_stack([df[x].values for x in xs]+[B])
    rw=np.sqrt(w); b,*_=np.linalg.lstsq(Xm*rw[:,None],df.dr.values*rw,rcond=None); return b[:len(xs)]
rng=np.random.default_rng(5); out=[]
for own in K:
    df=Y[Y.k==own]
    if len(df)<60: continue
    beta=fit(df); sch=df.school.unique(); idx={s:np.where(df.school.values==s)[0] for s in sch}
    bs=np.array([fit(df.iloc[np.concatenate([idx[s] for s in rng.choice(sch,len(sch))])]) for _ in range(300)])
    for j,x in enumerate(xs):
        lo,hi=np.percentile(bs[:,j],[2.5,97.5]); out.append(dict(own=own,nb=x[2:],eff=beta[j]*Y[x].std(),sig=(lo>0)|(hi<0),n=len(df)))
R=pd.DataFrame(out); R.to_pickle(S+f'compete_loc_{W}_{MODE}.pkl')
print(f'W={W} {MODE}'); print(R.assign(s=[f'{e:+.1f}'+('*' if s else '') for e,s in zip(R.eff,R.sig)]).pivot(index='own',columns='nb',values='s').to_string())
print(Y.groupby('k').size().to_string())
