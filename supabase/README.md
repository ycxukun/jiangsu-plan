# 数据库设计说明

这套 SQL 是为当前静态版 `jiangsu-plan` 设计的 Supabase/PostgreSQL 后台。

当前前端已经配置到旧 Supabase 项目：

```text
https://qnspmqsrbjcgrgpqkzgl.supabase.co
```

数据库以 `schema.sql` 为基础，并通过学生档案、采集表、开放注册、CRM 和综合评价增量脚本补齐。`emergency_security_patch.sql` 负责收口原有模块权限，`comprehensive_integration.sql` 必须在它之后执行，以加入学生本人账号权限。

## 为什么选 Supabase

当前网站部署在 GitHub Pages，是纯静态站。账号密码登录、新增学生、保存志愿表这些能力需要后端。Supabase 正好提供：

- Auth：邮箱 + 密码登录，不需要自己保存明文密码。
- PostgreSQL：保存学生、志愿表、导出记录。
- Row Level Security：每个登录用户只能看到自己的学生和志愿表。
- REST API：前端可以继续用 `fetch` 调接口，不需要马上重构成完整后端项目。

## 表结构

- `auth.users`：Supabase 内置登录账号表，密码由 Supabase Auth 负责哈希保存。
- `profiles`：业务用户资料，记录角色和状态。
- `students`：学生档案。
- `volunteer_forms`：学生的志愿表主表。
- `volunteer_form_groups`：志愿表里的院校专业组，对应当前前端的 `volunteerKeys`。
- `volunteer_form_majors`：每个专业组里选的 1-6 个专业，对应当前前端的 `volunteerMajorKeys[groupKey]`。
- `volunteer_exports`：导出 Excel/PDF/CSV 的操作记录。
- `notes`：兼容当前 `app.js` 里已经写好的批注功能。
- `audit_logs`：后续记录新增学生、保存志愿表、导出等关键操作。

## 当前前端字段映射

当前浏览器本地存储：

```js
js-plan-volunteer-groups-v1       -> volunteer_form_groups.group_key + position
js-plan-volunteer-major-keys-v2   -> volunteer_form_majors.major_key + position
js-plan-volunteer-meta-v1         -> volunteer_form_groups.strategy / note / obey_adjustment
js-plan-medical-restriction-codes-v1 -> students.medical_codes
```

当前前端的专业组唯一键：

```js
`${s.subject}|${s.batch}|${s.name}|${g.groupName}`
```

保存到：

```sql
volunteer_form_groups.group_key
```

当前前端的专业唯一键：

```js
m.key
```

保存到：

```sql
volunteer_form_majors.major_key
```

## 使用方法

1. 打开 Supabase 项目 `qnspmqsrbjcgrgpqkzgl`。
2. 打开 SQL Editor。
3. 按下面顺序执行 SQL；最后一项不能省略，也不能提前：

```text
supabase/schema.sql
supabase/student_archive_schema.sql
supabase/student_intake_schema.sql
supabase/open_signup_patch.sql
supabase/crm_schema.sql
supabase/emergency_security_patch.sql
supabase/comprehensive_integration.sql
```

`comprehensive_integration.sql` 会建立综合评价云端资料表和保存接口，并把核心字段回写 `students` 主档。综合评价不单独登录：它复用主系统登录状态与主系统当前选中的学生，因此邮箱、手机号只作为学生资料字段，不用于二次认证或自动绑定。

4. 在 Supabase Auth 里创建你的管理员账号。
5. 找到这个账号的 user id，然后执行：

```sql
insert into public.profiles (id, email, display_name, role)
values (
  '替换成 auth.users.id',
  '你的邮箱',
  '管理员',
  'admin'
)
on conflict (id) do update
set role = 'admin', status = 'active';
```

6. `app.js` 里已经填写了：

```js
const SUPABASE_URL='https://qnspmqsrbjcgrgpqkzgl.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_pVjv5t2S338SsCW98VvwpA_PcpXBL7V';
```

## CRM 工作台迁移

CRM 工作台对应入口是 `crm.html`。首次启用前，除了基础 `schema.sql`，还需要在同一个 Supabase 项目的 SQL Editor 执行：

```text
supabase/crm_schema.sql
```

这个迁移会增加客户、订单、服务案例、分配、任务、沟通记录、方案版本、风险项、附件和 CRM 操作日志等表，并创建 `crm-files` 私有存储桶。执行后，管理员、咨询师、规划师、复核、财务等角色才能在 CRM 工作台里完成收单、建档、分配、跟进、交付和归档。

执行或重跑 `crm_schema.sql` 后，要立即再次执行 `emergency_security_patch.sql`，避免旧的宽松策略重新生效。

## 新增学生接口示例

```js
await fetch(`${SUPABASE_URL}/rest/v1/students`, {
  method: 'POST',
  headers: {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  },
  body: JSON.stringify({
    owner_id: auth.user.id,
    name: '张三',
    phone: '13800000000',
    province: '江苏',
    stage: 'undergraduate',
    subject_type: 'physics',
    score: 586,
    rank: 39000,
    target_cities: ['南京', '苏州'],
    medical_codes: ['21']
  })
});
```

## 保存志愿表

前端通过 `save_volunteer_form_atomic(p_form, p_groups)` 一次保存主表、专业组和专业。数据库会在同一事务中完成全部写入，任一步失败都会完整回滚，不会先删掉旧志愿再留下空表。导出仍使用前端 Excel 逻辑，并插入 `volunteer_exports` 留痕。

## 注意

- 不要在业务表保存明文密码。
- `anon key` 可以放前端，但必须启用 RLS。
- 新注册账号固定为 `viewer/active`，只管理自己名下数据；内部岗位只能由管理员授权。
- 如果以后重跑任何旧 schema 或增量 SQL，必须再次把 `emergency_security_patch.sql` 放在最后执行。
- 学生手机号、分数、位次属于敏感信息，后期如果用户规模上来，建议加脱敏展示和操作审计。
