import pandas as pd,numpy as np,json
B=pd.read_pickle('base.pkl');B=B[B.kl=='物理'].copy()
SPECIAL={'中外合作','学分互认','高收费','预科','定向','民族','地方专项'}
B['special']=B['flags'].map(lambda f:bool(SPECIAL&set(f)))
B['campus']=B['gname'].str.extract(r'\(([^()]*校区)\)')[0]
sch=B.groupby('school')
S=pd.DataFrame({'n':sch.size(),'n_norm':sch['special'].apply(lambda s:(~s).sum()),'plan':sch['p26'].sum(),
  'tags':sch['tags'].first(),'prov':sch['prov'].first(),'pub':sch['pub'].first()})
print('物理本科批学校数',len(S));print('专业组数分布（全部）');print(S['n'].value_counts().sort_index().to_string())
print('普通组数分布');print(S['n_norm'].value_counts().sort_index().head(20).to_string())
# by school level
def lvl(t):
    t=str(t)
    return '985' if '985' in t else '211' if '211' in t else '双一流' if '双一流' in t else '公办双非' if True else ''
S['lvl']=S['tags'].map(lvl);S.loc[S.pub!='公办','lvl']='民办/独立'
S['js']=np.where(S.prov=='江苏','江苏','外省')
print(S.groupby(['lvl','js'])[['n','n_norm','plan']].median().round(1).to_string())
print(S.groupby(['lvl','js']).size().to_string())
S.to_pickle('school.pkl');B.to_pickle('phys.pkl')
