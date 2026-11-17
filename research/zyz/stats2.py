import pandas as pd,numpy as np,collections
B=pd.read_pickle('phys.pkl');S=pd.read_pickle('school.pkl')
def sptype(r):
    f=set(r['flags'])
    for k in ['中外合作','学分互认','预科','定向','地方专项','民族']:
        if k in f:return k
    if '高收费' in f and r.pub=='公办':return '高收费'
    return ''
B['sp']=B.apply(sptype,axis=1)
B['campus']=B['campus'].fillna('')
B['line']=B['l26']
out=[]
for s,g in B.groupby('school'):
    if len(g)<2:continue
    modes=collections.Counter()
    if (g.sp!='').any() and (g.sp=='').any():modes['特殊办学单列']+=1
    cams=g.loc[g.sp=='','campus'].unique()
    if len(set(cams))>1:modes['按校区切']+=1
    norm=g[g.sp=='']
    for (cam,req),b in norm.groupby(['campus','req']):
        pass
    if norm.req.nunique()>1:modes['按选科切']+=1
    for (cam,req),b in norm.groupby(['campus','req']):
        if len(b)<2:continue
        mains=b['main'].tolist()
        pure=(b['main_share']>=0.7).mean()
        if len(set(mains))==len(mains) and pure>=0.5:modes['按学科切']+=1
        else:modes['按热度梯度切']+=1
        if b['flags'].map(lambda f:'拔尖' in f).any():modes['拔尖/实验班单列']+=1
    out.append(dict(school=s,**{k:1 for k in modes}))
M=pd.DataFrame(out).fillna(0).set_index('school')
M=M.join(S[['lvl','js','n','n_norm']])
print('多组学校',len(M))
print((M.drop(columns=['lvl','js','n','n_norm']).mean()*100).round(1).sort_values(ascending=False).to_string())
print(M.groupby(['lvl']).agg({c:'mean' for c in ['按学科切','按热度梯度切','按选科切','按校区切','特殊办学单列']}).round(2).to_string())
B.to_pickle('phys.pkl');M.to_pickle('modes.pkl')
