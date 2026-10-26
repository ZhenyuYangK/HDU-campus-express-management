# 校园快递收发系统

杭州电子科技大学软件工程课程设计项目。

当前处于项目初始化阶段：建立代码目录、团队规范、接口公共契约和Docker开发环境。前后端目录仅含Git占位文件，尚未编写业务代码、创建数据库表或初始化应用依赖。

## 依据与选型

- 技术栈由项目负责人确认：Spring Boot+Vue3+MySQL。技术版本与工程约定见[开发环境](docs/development-environment.md)。
- 项目负责人已确认单驿站双端服务，包含学生、工作人员、管理员三类角色，以及核心收发、拒收与退件、取消寄件和简单统计。范围与第6～17周实施排期见[项目计划书](docs/management/plans/project-plan.md)。成员模块主责统一见[团队分工表](docs/management/team.md)，已确认的业务规则见[调研分析报告](docs/requirements/research/校园快递收发系统调研分析报告.docx)。取件采用学生自助核验、系统确认出库。具体字段、状态和业务接口在需求与设计阶段确认。

## 项目目录

```text
backend/             Spring Boot后端目录
frontend/            Vue3前端目录
database/            数据库设计、迁移与种子数据目录
tests/               跨模块集成与端到端测试目录
infra/docker/        前后端开发工具镜像配置
docs/                需求、设计、测试、项目管理与协作记录
.github/             Issue和PR模板
compose.yaml         统一开发环境
agent.md             开发代理及开发者执行规范
AGENTS.md            自动读取入口，指向agent.md
```

完整分层与目录用途见[项目结构](docs/architecture.md)。Git不跟踪空目录，因此叶子目录使用空的`.gitkeep`保留结构。

## 开始协作

1. 阅读[团队协作规范](docs/collaboration.md)、[接口规范](docs/api/README.md)和[agent.md](agent.md)。
2. 查看[课程交付要求](docs/course-requirements.md)、[项目任务流程与计划](docs/management/plans/project-plan.md)和[项目验收清单](docs/acceptance/README.md)，在[团队分工表](docs/management/team.md)登记负责人及排期。
3. 安装Docker Desktop并启用Linux容器及Compose，然后在项目根目录执行：

```powershell
Copy-Item .env.example .env
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

接口文档入口为<http://localhost:8081>。MySQL使用本机3306端口。前后端容器提供JDK/Maven和Node/npm工具环境，当前保持待命；8080和5173端口需在后续初始化应用并启动开发服务器后才提供服务。详细命令、校验与故障处理见[开发环境](docs/development-environment.md)。

## 关键文档

| 内容 | 文件 |
| --- | --- |
| 课程各阶段提交物、格式与最低要求 | [课程交付要求](docs/course-requirements.md) |
| 全过程任务分解、依赖与阶段完成条件 | [项目任务流程与计划](docs/management/plans/project-plan.md) |
| 已确认范围、人员分工与第6～17周排期的正式计划书 | [项目计划书DOCX](docs/management/plans/校园快递收发系统项目计划书.docx) |
| 真实成员、任务负责人、进度与排期 | [团队分工与任务登记](docs/management/team.md) |
| 最终材料、系统演示及11周周报核对 | [项目验收清单](docs/acceptance/README.md) |
| 团队分工、分支和评审流程 | [团队协作规范](docs/collaboration.md) |
| 接口命名、请求响应、分页、错误码 | [接口规范](docs/api/README.md) |
| 可供工具读取的公共接口契约 | [OpenAPI](docs/api/openapi.yaml) |
| 开发问题总结参考 | [可选问题记录模板](docs/templates/issue-template.md)，本地记录不纳入Git跟踪，由组员手动总结 |
| 本次初始化验证结果 | [验证报告](docs/testing/bootstrap-verification.md) |
| 工程选型及变更记录 | [决策记录](docs/management/decisions.md) |


