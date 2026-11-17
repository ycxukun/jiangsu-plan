import pandas as pd,numpy as np
C=pd.read_pickle('card_all.pkl')
d=pd.read_pickle('/home/claude/d.pkl');sc=d[d['科类']=='物理'].groupby('院校名称').agg(prov=('所在省','first'),city=('城市','first'),tags=('院校标签','first'),pub=('公私性质','first'))
C=C.join(sc,on='学校')
t=C.tags.fillna('')
C['tier']=np.select([C.pub.isin(['中外合作办学','内地与港澳台合作办学','境外高校独立办学']),C.pub=='民办',t.str.contains('985'),t.str.contains('211'),t.str.contains('双一流'),t.str.contains('保研')],['中外合作大学','民办/独立','985','211','双一流','保研资格'],'公办普通')
SN={'南京','苏州','无锡','常州','镇江'};SZ={'扬州','泰州','南通'}
REG={'上海':'长三角','浙江':'长三角','安徽':'长三角','北京':'东部其他','天津':'东部其他','河北':'东部其他','山东':'东部其他','福建':'东部其他','广东':'东部其他','海南':'东部其他',
 '山西':'中部','河南':'中部','湖北':'中部','湖南':'中部','江西':'中部','辽宁':'东北','吉林':'东北','黑龙江':'东北'}
C['region']=np.where(C.prov=='江苏',np.where(C.city.isin(SN),'江苏·苏南',np.where(C.city.isin(SZ),'江苏·苏中','江苏·苏北')),C.prov.map(REG).fillna('西部'))
C['pos']=C['前身25线(折26)']
C['band']=pd.cut(C.pos,[0,490,520,550,580,610,640,999],labels=['490以下','490-520','520-550','550-580','580-610','610-640','640以上'])
C['restr']=~C.A结构.isin(['延续','延续(并入少量)'])
C['carried']=C['B带过来的专业25计划']
C.to_pickle('card_all2.pkl')
Y=C[(C['26计划']>=10)&C['结果:相对涨跌'].notna()&(C['结果:相对涨跌'].abs()<80)].copy()
Y['dr']=Y['结果:相对涨跌'].astype(float)
Y['own']=np.log((Y['26计划']+5)/(Y.carried+5))
Y['own_cut']=Y.own.clip(-1,1)
Y['sup']=(Y['C同档同类变化%'].fillna(0).clip(-50,100))/100
Y['new_m']=Y.A新进专业.fillna('').apply(lambda s:len([x for x in s.split('、') if x]))
Y['lost_m']=Y.A前身里没跟过来的专业.fillna('').apply(lambda s:len([x for x in s.split('、') if x]))
for s in ['由大组拆出','合并','拆出(并入少量)','延续(并入少量)']: Y['st_'+s]=(Y.A结构==s).astype(float)
Y['chem']=Y.E选科26.fillna('').str.contains('化学').astype(float)
def r2(cols,df=None):
    df = Y if df is None else df
    w=np.sqrt(df['26计划'].values.astype(float));X=np.column_stack([np.ones(len(df))]+[df[c].values.astype(float) for c in cols]);y=df.dr.values
    rw=np.sqrt(w);b,*_=np.linalg.lstsq(X*rw[:,None],y*rw,rcond=None);res=(y-X@b);ybar=np.average(y,weights=w)
    return 1-np.average(res**2,weights=w)/np.average((y-ybar)**2,weights=w)
dum=lambda col,pre:[c for c in pd.get_dummies(Y[col],prefix=pre).columns]
for col,pre in [('L','L'),('tier','T'),('region','R'),('band','B')]:
    Y=pd.concat([Y,pd.get_dummies(Y[col if col!='L' else '类别'],prefix=pre).astype(float)],axis=1)
cat=[c for c in Y.columns if c.startswith('L_')][1:];tier=[c for c in Y.columns if c.startswith('T_')][1:];reg=[c for c in Y.columns if c.startswith('R_')][1:];band=[c for c in Y.columns if c.startswith('B_')][1:]
S1=['st_由大组拆出','st_合并','st_拆出(并入少量)','st_延续(并入少量)','new_m','lost_m'];P1=['own_cut','sup']
print('n',len(Y))
for name,cols in [('结构',S1),('计划',P1),('结构+计划',S1+P1),('类别+化学',cat+['chem']),('学校层次+地区',tier+reg),('分数段',band),
                  ('结构+计划+分数段',S1+P1+band),('全部',S1+P1+cat+['chem']+tier+reg+band)]:
    print(f'{name:16s} R2={r2(cols):.3f}')
Y.to_pickle('mc_Y.pkl')
