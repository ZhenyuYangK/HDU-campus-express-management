# 项目初始化验证报告

- 日期：2026-10-22
- 工作目录：`D:\work`
- 验证对象：目录骨架、协作文档、公共接口契约、Docker配置和Git远程地址
- 当前阶段：未编写业务代码，不具备应用功能测试条件

## 验证方式

使用Node/js-yaml解析YAML，通过Python/jsonschema按官方Schema校验；补充本地路径、引用、环境变量、镜像摘要、文档链接、目录内容及Git配置检查。辅助脚本和下载的校验文件保存在被Git忽略的`.local/validation/`，不作为项目业务代码提交。

```powershell
node .local/validation/validate.cjs
python .local/validation/validate.py
git remote -v
git branch --show-current
git status --short --branch
git ls-remote --symref origin
```

校验依据来自[Compose官方Schema](https://github.com/compose-spec/compose-spec/blob/main/schema/compose-spec.json)和[OpenAPI3.0.3官方Schema](https://github.com/OAI/OpenAPI-Specification/blob/3.0.3/schemas/v3.0/schema.json)。YAML解析器来自[js-yaml官方4.1.0发行文件](https://github.com/nodeca/js-yaml/blob/4.1.0/dist/js-yaml.js)。

## 静态验证结果

| 检查项 | 实际结果 | 状态 |
| --- | --- | --- |
| Compose及OpenAPI的YAML解析 | 两个文件成功解析 | 通过 |
| Compose官方Schema | 无结构错误 | 通过 |
| OpenAPI官方Schema | 无结构错误 | 通过 |
| OpenAPI本地引用 | 17个引用均能解析 | 通过 |
| 业务接口边界 | `paths`为空，没有虚构业务端点 | 通过 |
| 环境变量 | Compose引用的9个变量均在`.env.example`中定义 | 通过 |
| Docker路径与依赖 | 构建上下文、Dockerfile、绑定路径、数据卷及服务依赖均存在 | 通过 |
| 端口绑定 | 4个服务均只发布到本机回环地址 | 通过 |
| 数据库启动依赖 | 后端工具容器等待MySQL健康检查 | 通过 |
| 镜像引用 | 4个镜像均通过Registry核验并固定清单摘要 | 通过 |
| 代码骨架内容 | `backend/`、`frontend/`、`database/`、`tests/`仅含32个空`.gitkeep` | 通过 |
| 文档链接 | 项目内文件链接存在 | 通过 |
| 文本格式 | UTF-8、LF和末尾换行检查通过 | 通过 |
| 中文文档排版 | 正文中英文与中文之间未加空格；命令及代码排版保留语法 | 通过 |
| Git本地分支 | 当前为`main`，尚无提交 | 通过 |
| Git远程地址 | fetch和push的origin均为指定GitHub地址 | 通过 |
| Git远程连接 | `git ls-remote --symref origin`退出码0，未返回远程引用 | 通过 |
| Git排除规则 | `.env`、`.local/`和原始课程资料被忽略；`.env.example`可共享 | 通过 |

最终静态检查原始结果保存在本机`.local/validation/results.json`。本报告记录初始化时的检查结果，后续修改后应重新验证。

## 未执行的验证

| 检查项 | 原因 | 后续验证 |
| --- | --- | --- |
| `docker compose config --quiet` | 本机无Docker；独立Compose程序下载超时 | 在有Docker的机器执行 |
| Dockerfile镜像构建与容器启动 | 本机没有Docker引擎 | `docker compose up -d --build --wait --wait-timeout 240` |
| MySQL实际连接及SQL | 容器未运行 | 执行开发环境文档中的SQL检查 |
| Swagger UI与契约文件HTTP访问 | 容器未运行 | 请求8081端口站点及`/openapi.yaml` |
| JDK/Maven、Node/npm容器内版本 | 容器未运行 | 执行开发环境文档中的版本检查 |
| Spring Boot和Vue应用启动 | 本次只创建目录，没有构建清单和代码 | 后续初始化应用后启动 |
| 业务接口联调与功能测试 | 详细业务需求、接口和实现尚未完成 | 需求评审、实现后按用例验证 |

静态校验通过不能替代上述运行验证。Docker运行问题保持[DEV-0002](../development-issues/DEV-0002-docker-runtime.md)为待验证，业务接口问题保持[DEV-0003](../development-issues/DEV-0003-business-contract.md)为未解决。

## 初始化时的Git交付快照

`origin`配置为`https://github.com/ZhenyuYangK/HDU-campus-express-management.git`，远程只读查询成功。当前本地没有提交，也没有执行推送，生成文件留在工作区供负责人检查。`task_source/`资料和`.local/`校验工具没有加入待提交文件列表。

以上是首次提交前的初始化快照。负责人随后授权按模块分批提交并推送；本段保留历史检查结果，最新交付状态以实际Git提交历史、远端引用及工作区核验为准。

2026-10-22分批提交前重新执行`node .local/validation/validate.cjs`与`python .local/validation/validate.py`，两个命令均退出码0，YAML解析及全部静态检查通过，结果更新至本机`.local/validation/results.json`。本次未执行容器运行和业务功能测试，上述未执行项继续保留。
