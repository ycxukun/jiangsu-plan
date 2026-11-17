import pandas as pd,numpy as np,json
h=json.load(open('/home/claude/jiangsu-plan/huaxian/data.json'))
rows=[]
for g in h['groups']:
    if g['kl']!='物理':continue
    pr=g.get('pre') or {}
    rows.append(dict(id=g['id'],s=g['s'],st=g.get('st'),chg=g.get('chg'),plan=g.get('plan'),p25=g.get('p25'),l26=g.get('l26'),r26=g.get('r26'),
      pe=pr.get('e'),pr=pr.get('r'),pp=pr.get('p'),pn=pr.get('n'),n=len(g['majors']),v=g.get('v'),share=g.get('share')))
H=pd.DataFrame(rows)
H['dl']=H['l26']-H['pe']            # 26线 - 25线折算到26
H['dr']=(H['r26']-H['pr'])/H['pr']   # 位次相对变化，正=位次数变大=变冷
H['dp']=(H['plan']-H['pp'])/H['pp']
print(H['st'].value_counts().to_string())
x=H.dropna(subset=['dl'])
print('有前身且有26线的组',len(x))
print(x.groupby('st')['dl'].describe()[['count','mean','25%','50%','75%']].round(1).to_string())
# 计划变化分档 vs 线变化（只看高度延续/延续调整，n前后接近）
y=x[x.st.isin(['高度延续','延续调整'])&(x.pp>=10)].copy()
y['dpb']=pd.cut(y['dp'],[-1,-0.3,-0.1,0.1,0.3,1,99],labels=['缩30%+','缩10-30%','基本不变','扩10-30%','扩30-100%','扩一倍+'])
print(y.groupby('dpb',observed=True)['dl'].describe()[['count','mean','25%','50%','75%']].round(1).to_string())
H.to_pickle('hx_phys.pkl')
