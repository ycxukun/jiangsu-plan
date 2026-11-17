import pandas as pd,numpy as np,json,collections
h=json.load(open('/home/claude/jiangsu-plan/huaxian/data.json'))
H=pd.read_pickle('hx_phys.pkl');base=H['dl'].median()
print('全体有前身组 26线-25折算线 中位',base)
G={(g['s'],int(g['id'][-2:])):g for g in h['groups'] if g['kl']=='物理'}
sp=[];mg=[]
for key,v in h['lin'].items():
    s,kl=key.split('|')
    if kl!='物理':continue
    g25={x['c']:x for x in v['g25']};g26={x['c']:x for x in v['g26']}
    ch=collections.defaultdict(list);pa=collections.defaultdict(list)
    for a,b,p,ms in v['e']:ch[a].append((b,p));pa[b].append((a,p))
    for a,kids in ch.items():
        if len(kids)<2 or a not in g25 or g25[a].get('l') is None:continue
        P=g25[a];ls=[]
        for b,p in kids:
            gg=G.get((s,b))
            if gg and gg.get('l26') is not None:ls.append((gg['l26'],b,p,gg.get('plan')))
        if len(ls)<2:continue
        ls.sort(reverse=True)
        pe=P['l']  # 25线原始
        # 折算：用该校任一子组 pre.e/pre.l 的差
        sp.append(dict(s=s,parent=a,pl=pe,pp=P['p'],top=ls[0][0],bot=ls[-1][0],k=len(ls),gap=ls[0][0]-ls[-1][0]))
SP=pd.DataFrame(sp)
print('拆分母组数',len(SP),'子组数中位',SP.k.median())
print('子组最高线-最低线（分）分位',SP.gap.quantile([.25,.5,.75,.9]).to_dict())
conv=h['conv26'] if isinstance(h['conv26'],dict) else None
print(type(h['conv26']), str(h['conv26'])[:200])
SP.to_pickle('split.pkl')
c=h['conv26']['物理'];lo,hi,rk=c['lo'],c['hi'],c['rank']
def r2s(r):
    # rank 列表从 lo 分开始升序分数、降序位次
    for i,x in enumerate(rk):
        if x<=r:return lo+i
    return hi
sp2=[]
for key,v in h['lin'].items():
    s,kl=key.split('|')
    if kl!='物理':continue
    g25={x['c']:x for x in v['g25']}
for i,r in SP.iterrows():
    pass
P=[]
for key,v in h['lin'].items():
    s,kl=key.split('|')
    if kl!='物理':continue
    for x in v['g25']:P.append((s,x['c'],x.get('r')))
PR={(s,c):r for s,c,r in P}
SP['pe']=[r2s(PR.get((s,a))) if PR.get((s,a)) else np.nan for s,a in zip(SP.s,SP.parent)]
SP['top_d']=SP.top-SP.pe-base;SP['bot_d']=SP.bot-SP.pe-base
print('拆分后（扣除全体-5的整体下移）：最高子组相对母组',SP.top_d.quantile([.25,.5,.75]).to_dict())
print('最低子组相对母组',SP.bot_d.quantile([.25,.5,.75]).to_dict())
print('最高子组高于母组的比例',(SP.top_d>0).mean().round(2),'最低子组低于母组的比例',(SP.bot_d<0).mean().round(2))
SP.to_pickle('split.pkl')
