# DEV-0005：受限环境限制Git配置与远程查询

- 日期：2026-10-22
- 负责人：初始化执行代理
- 状态：已关闭
- 影响范围：本地仓库`origin`配置、远程只读核验及首次分批提交推送

## 问题场景

项目负责人要求本项目指向指定GitHub仓库。在`D:\work`初始化`main`后，首次执行`git remote add origin`时报告不能锁定`.git/config`、权限被拒绝；受限环境中的一次远程检查还因Git的MSYS运行组件访问被拒绝而失败。

同日负责人要求按模块分批提交到远端。在Windows/PowerShell受限环境执行`git ls-remote --heads origin`，预期读取远端分支，实际退出码128，报告`getaddrinfo() thread failed to start`。

## 原因分析

当前执行环境对`.git`写入及部分Git进程操作有限制。该错误出现在本地配置与进程启动阶段，不能据此判断GitHub仓库不存在或访问权限不足。

分批提交前，相同远程查询在授权执行方式下退出码0且无分支输出，确认远端当时没有分支。受限执行与授权执行结果不同；未进一步定位`getaddrinfo()`内部线程失败原因。

## 解决方案

使用执行环境提供的授权执行方式重试用户已明确要求的远程地址配置及只读查询。初始化配置阶段没有创建提交或推送代码；后续分批提交任务已获得负责人明确授权，Git写入及推送使用相同授权执行方式，不改动全局Git配置。

## 最后的测试结果

| 时间 | 命令或操作 | 预期 | 实际 | 状态 |
| --- | --- | --- | --- | --- |
| 2026-10-22 | 受限模式下`git remote add origin` | 写入指定地址 | `.git/config`写入被拒绝 | 失败 |
| 2026-10-22 | 授权方式重试相同命令 | 写入指定地址 | 退出码0 | 通过 |
| 2026-10-22 | `git ls-remote --symref https://github.com/ZhenyuYangK/HDU-campus-express-management.git HEAD` | 读取远程引用 | 退出码0、无HEAD输出；远程尚无初始提交 | 通过 |
| 2026-10-22 | 受限模式下`git ls-remote --heads origin` | 读取远端分支 | 退出码128，`getaddrinfo() thread failed to start` | 失败 |
| 2026-10-22 | 授权方式执行`git ls-remote --heads origin` | 读取远端分支 | 退出码0，无分支输出 | 通过 |

本次后续本地地址和分支核验见[初始化验证报告](../testing/bootstrap-verification.md)。

## 遗留事项

无本地配置或远端查询遗留问题。首次按模块提交与推送已获负责人授权；实际提交历史、远端引用及工作区状态在交付时单独核验，不以远端查询成功代替推送成功。
