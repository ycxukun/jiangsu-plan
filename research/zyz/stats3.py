import pandas as pd,numpy as np
B=pd.read_pickle('phys.pkl');N=B[B.sp==''].copy()
NEAR={frozenset(p) for p in [('D01','D02'),('D02','D03'),('D01','D03'),('D06','D25'),('D14','D16'),('D17','D18'),('D17','D26'),('D18','D26')]}
def comp(r):
    if r['nm']==1:return '单专业'
    if '拔尖' in r['flags']:return '拔尖/实验班'
    dp=r['dirplan'];ks=[k for k in dp if k!='D99']
    if r['main_share']>=0.9:return '纯方向'
    top=sorted(dp,key=dp.get,reverse=True)
    if len(ks)==2 and frozenset(ks) in NEAR:return '近亲组合'
    if r['main_share']>=0.6:return '主体+搭配'
    return '拼盘/打散'
N['comp']=N.apply(comp,axis=1)
N['spread']=N['s25m_max']-N['s25m_min']
print(N['comp'].value_counts(normalize=True).round(3).to_string())
print(N.groupby('comp').agg(组数=('gc','size'),中位专业数=('nm','median'),中位计划=('p26','median'),组内分差中位=('spread','median'),组内分差P75=('spread',lambda s:s.quantile(.75))).round(1).to_string())
# 大小
print('组计划分位',N['p26'].quantile([.25,.5,.75,.9,.99]).to_dict())
print('专业数分位',N['nm'].quantile([.25,.5,.75,.9,.99]).to_dict())
# 组内分差 vs 组线：组线=最低专业，热门专业高出多少
N.to_pickle('norm.pkl')
