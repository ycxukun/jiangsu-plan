import pandas as pd,numpy as np,json,re,collections
F='/mnt/user-data/attachments/bf05c1e4-9d41-5f35-8743-720179e09867/6fb1674b-2025________.xlsx'
t=pd.read_excel(F,sheet_name='理科投档线');t.columns=[c.replace('\n','') for c in t.columns]
t['school']=t['院校专业组'].str.replace(r'\d+$','',regex=True);t['g']=t['院校专业组'].str.extract(r'(\d+)$')[0].astype(int)
G25={(r.school,r.g):(r['最低分数'],r['最低位次'],r['25招生计划']) for _,r in t.iterrows()}
h=json.load(open('/home/claude/jiangsu-plan/huaxian/data.json'));c=h['conv26']['物理']
def r2s(r):
    for i,x in enumerate(c['rank']):
        if x<=r:return c['lo']+i
    return c['hi']
B=pd.read_pickle('base.pkl');B=B[B.kl=='物理'];B['g']=B.gc.str[-2:]
B['g']=pd.to_numeric(B['g'],errors='coerce')
L=pd.read_pickle('lin2.pkl');L=L[L.kl=='物理']
M=pd.read_pickle('map26.pkl');M=M[M.kl=='物理']
X=L.merge(B[['school','g','l26','r26','p26','gname']],left_on=['school','g26'],right_on=['school','g'],how='left')
def pre_e(r):
    if pd.isna(r.main_pre):return np.nan
    v=G25.get((r.school,int(r.main_pre)));return r2s(v[1]) if v and v[1]==v[1] else np.nan
X['pe']=X.apply(pre_e,axis=1)
X['p25']=[G25.get((s,int(g)),(None,None,np.nan))[2] if g==g else np.nan for s,g in zip(X.school,X.main_pre)]
X['d']=X.l26-X.pe
base=X.loc[X.st=='延续','d'].median();print('延续组 26线-25折算 中位',base, '组数',X.loc[X.st=='延续','d'].notna().sum())
X['dr']=X.d-base
print(X.groupby('st')['dr'].describe()[['count','50%','25%','75%']].round(1).to_string())
# 拆分：同一 25 组的成规模子组
sp=[]
for (s,g25),b in X[X.st.isin(['由大组拆出','拆出(并入少量)'])].dropna(subset=['l26','pe']).groupby(['school','main_pre']):
    if len(b)>=2:sp.append((b.dr.max(),b.dr.min(),len(b)))
SP=pd.DataFrame(sp,columns=['top','bot','k']);print('拆分母组',len(SP),'最热子组中位',SP.top.median(),'高于母组比例',(SP.top>0).mean().round(2),'最冷子组中位',SP.bot.median(),'低于母组比例',(SP.bot<0).mean().round(2))
y=X[(X.st=='延续')&(X.p25>=10)].dropna(subset=['dr']).copy();y['dp']=(y.p26-y.p25)/y.p25
y['b']=pd.cut(y.dp,[-1,-0.3,-0.1,0.1,0.3,1,99],labels=['缩30%+','缩10-30%','基本不变','扩10-30%','扩30-100%','扩一倍+'])
print(y.groupby('b',observed=True)['dr'].agg(['count','median','mean']).round(1).to_string())
X.to_pickle('chg2.pkl')
