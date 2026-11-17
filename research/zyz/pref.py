import pandas as pd,numpy as np
X=pd.read_pickle('chg4.pkl');B=pd.read_pickle('base.pkl');B=B[B.kl=='物理']
X=X.drop(columns=['pub','prov'],errors='ignore').merge(B[['school','gname','tags','pub','city','prov','stype']],on=['school','gname'],how='left')
X=X[(X.p26>=10)&X.dr.notna()].copy()
t=X.tags.fillna('')
F=pd.DataFrame(index=X.index)
F['要求化学']=X.req.fillna('').str.contains('化学').astype(float)
F['电计自动化']=(X.cat=='工-电计自动化').astype(float)
F['机械土建化工等']=(X.cat=='工-机械土建化工等').astype(float)
F['医学']=(X.cat=='医学').astype(float)
F['师范教育']=(X.cat=='师范/教育').astype(float)
F['理农']=(X.cat=='理/农').astype(float)
F['中外/学分互认']=X.gname.str.contains('中外|学分').astype(float)
F['有头衔(双一流+)']=t.str.contains('985|211|双一流').astype(float)
F['省外']=(X.prov!='江苏').astype(float)
F['苏南(宁苏锡常)']=X.city.isin(['南京','苏州','无锡','常州']).astype(float)*(X.prov=='江苏')
F['民办/独立']=(X.pub=='民办').astype(float)
F['由大组拆出']=X.st.str.contains('拆出').astype(float)
X['band']=pd.cut(X.pe,[440,520,570,620,720],labels=['520以下','520-570','570-620','620以上'])
rows={}
for b,idx in X.groupby('band',observed=True).groups.items():
    f=F.loc[idx]; y=X.loc[idx,'dr'].values; w=np.sqrt(X.loc[idx,'p26'].values)
    keep=[c for c in f.columns if f[c].sum()>=8 and f[c].sum()<=len(f)-8]
    A=np.column_stack([np.ones(len(f)),f[keep].values]); W=w/w.mean()
    Aw=A*W[:,None]; yw=y*W
    beta,_,_,_=np.linalg.lstsq(Aw,yw,rcond=None)
    res=yw-Aw@beta; s2=(res**2).sum()/(len(y)-A.shape[1])
    cov=s2*np.linalg.pinv(Aw.T@Aw); se=np.sqrt(np.diag(cov))
    col={}
    for k,bb,ss in zip(['基准']+keep,beta,se):
        col[k]=f'{bb:+.1f}'+('*' if abs(bb)>2*ss else '')
    col['组数']=len(f)
    rows[b]=col
R=pd.DataFrame(rows).fillna('')
print(R.to_string())
