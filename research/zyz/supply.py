"""供给：各档次 × 各类组的计划数 24/25/26，以及计划变化和线变化的关系"""
import pandas as pd, numpy as np, sys
S='/home/claude/zyz/'
src=open(S+'price_reg.py').read().split('rng = np.random')[0]; sys.argv=['x','main']; ns={}; exec(src,ns); lv=ns['lv']
G=pd.read_pickle(S+'price_groups.pkl')
d=pd.read_pickle('/home/claude/d.pkl'); sc=d[d['科类']=='物理'].groupby('院校名称').agg(prov=('所在省','first'),pub=('公私性质','first'))
def lab(r):
    if r['学分互认']: return '学分互认'
    if r['中外']: return '中外合作'
    if r.sh_临床口腔+r.sh_医学其他>=0.5: return '医学'
    if r.sh_师范>=0.5: return '师范'
    if r.sh_电计+r.sh_机械土建化工>=0.5: return '工科(化)' if r.chem else '工科(不限)'
    return '其他(化)' if r.chem else '其他(不限)'
G['L']=G.apply(lab,axis=1)
G['lv']=G.school.map(lv)
G['band']=pd.cut(G.lv,[0,520,570,620,999],labels=['520以下','520-570','570-620','620以上'])
G['js']=G.school.map(sc.prov).eq('江苏'); G['priv']=G.school.map(sc.pub).eq('民办')
G.to_pickle(S+'supply_groups.pkl')
P=G.groupby(['band','L','year'],observed=True).plan.sum().unstack()
P['24→25']=(P[25]/P[24]-1)*100; P['25→26']=(P[26]/P[25]-1)*100
pd.set_option('display.width',220); print(P.round(0).to_string())
T=G.groupby(['band','year'],observed=True).plan.sum().unstack(); print(T)
N=G[G.L.isin(['中外合作','学分互认'])].groupby(['band','L','year'],observed=True).size().unstack(); print(N)
