import pandas as pd,numpy as np,collections,json
B=pd.read_pickle('base.pkl');X=pd.read_pickle('chg2.pkl');M=pd.read_pickle('map26.pkl');I25=pd.read_pickle('i25.pkl');I26=pd.read_pickle('i26.pkl')
sch=B[(B.kl=='物理')&(B.prov=='江苏')&(B.tags.fillna('').str.contains('保研'))].groupby('school')['p26'].sum().sort_values(ascending=False).index.tolist()
out={}
for s in sch:
    a=I25[(I25.kl=='物理')&(I25.school==s)];b=I26[(I26.kl=='物理')&(I26.school==s)];m=M[(M.kl=='物理')&(M.school==s)]
    x=X[X.school==s]
    un=m[m.how=='新专业/新班型']
    # 25 里没被 26 用到的专业（可能被改名）
    used=set(zip(m.dropna(subset=['g25']).g25.astype(int),m.dropna(subset=['g25']).major))
    gone=a[[ (g,mj) not in used for g,mj in zip(a.g,a.major)]]
    # 班型总量闭合
    bt25=a.groupby('bt').plan.sum();bt26=b.groupby('bt').plan.sum()
    out[s]=dict(g25=a.g.nunique(),p25=int(a.plan.sum()),g26=b.g.nunique(),p26=int(b.plan.sum()),
      st=x.st.value_counts().to_dict(),unshare=round(un.plan.sum()/max(b.plan.sum(),1),3),
      new=[f'{r.major}({r.bt},{r.plan},26-{r.g26})' for r in un.itertuples()][:25],
      gone=[f'{r.raw}({r.plan},25-{r.g})' for r in gone.itertuples()][:25],
      bt={k:(int(bt25.get(k,0)),int(bt26.get(k,0))) for k in set(bt25.index)|set(bt26.index)})
json.dump(out,open('js29.json','w'),ensure_ascii=False,indent=0)
for s,v in out.items():
    print(f"== {s} 25:{v['g25']}组/{v['p25']} → 26:{v['g26']}组/{v['p26']} 状态{v['st']} 未对上{v['unshare']} 班型{v['bt']}")
    if v['new']:print('  26新:', '；'.join(v['new'])[:600])
    if v['gone']:print('  25去:', '；'.join(v['gone'])[:600])
