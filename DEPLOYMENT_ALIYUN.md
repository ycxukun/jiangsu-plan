# 阿里云生产环境部署说明

## 当前生产结构

- 正式域名：`ycxukun.cn`、`www.ycxukun.cn`
- ECS 公网 IP：`121.41.53.61`
- Web 根目录：`/var/www/jiangsu-plan/current`
- Nginx：静态文件服务 + SPA fallback
- 数据与登录：继续使用 Supabase
- 代码源头：GitHub 仓库

## 本地手动部署

本地已有 SSH key 时可执行：

```bash
scripts/deploy-aliyun.sh
```

脚本会：

1. 生成 `_site/` 静态发布目录；
2. 备份服务器当前版本到 `/var/www/jiangsu-plan/backups/current-时间戳`；
3. rsync 上传 `_site/` 到 `/var/www/jiangsu-plan/current`；
4. 执行 `nginx -t` 并 reload Nginx；
5. 只保留最近 8 份服务器备份。

可覆盖的环境变量：

```bash
ECS_HOST=121.41.53.61
ECS_USER=root
ECS_PATH=/var/www/jiangsu-plan/current
SSH_KEY=.deploy/keys/aliyun_jiangsu_plan_ed25519
scripts/deploy-aliyun.sh
```

## GitHub Actions 自动部署

`main` 分支推送后，工作流会打包静态文件并通过 SSH 发布到 ECS。

需要在 GitHub 仓库 Settings -> Secrets and variables -> Actions 中配置：

- `ECS_HOST`：`121.41.53.61`
- `ECS_USER`：通常为 `root`
- `ECS_SSH_PRIVATE_KEY`：部署用 SSH 私钥内容
- `ECS_PATH`：可选，默认 `/var/www/jiangsu-plan/current`

私钥不能提交到仓库。

## HTTPS 与安全组

服务器已经签发 Let’s Encrypt 证书：

- 证书域名：`ycxukun.cn`、`www.ycxukun.cn`
- 证书路径：`/etc/letsencrypt/live/ycxukun.cn/`
- 到期时间可用 `certbot certificates` 查看

如果公网访问 `https://ycxukun.cn` 超时，而服务器上 `ss -ltnp | grep :443` 正常，说明阿里云 ECS 安全组没有放行 TCP 443。需要在阿里云控制台安全组入方向添加：

| 协议 | 端口 | 授权对象 |
| --- | --- | --- |
| TCP | 443 | `0.0.0.0/0` |
| TCP | 443 | `::/0`，如启用 IPv6 |

443 放行后，可把 HTTP 80 改为强制跳转 HTTPS。

## 回滚

服务器备份位于：

```text
/var/www/jiangsu-plan/backups/
```

回滚示例：

```bash
ssh root@121.41.53.61
rm -rf /var/www/jiangsu-plan/current
cp -a /var/www/jiangsu-plan/backups/current-YYYYMMDD-HHMMSS /var/www/jiangsu-plan/current
nginx -t && systemctl reload nginx
```

## Supabase 必查项

域名切换后，Supabase Authentication -> URL Configuration 需要包含：

- Site URL：`https://ycxukun.cn`，443 未放行前可临时用 `http://ycxukun.cn`
- Redirect URLs：
  - `https://ycxukun.cn/**`
  - `https://www.ycxukun.cn/**`
  - `http://ycxukun.cn/**`
  - `http://www.ycxukun.cn/**`
  - `http://localhost:3000/**`
  - `http://localhost:5173/**`

## 日常规则

- 不直接在服务器上手改业务代码；
- 本地修改，提交 GitHub；
- `main` 作为正式生产分支；
- 生产发布前先本地验证；
- 大改前保留服务器备份和 Git commit。
