# DEV-0004：配置校验工具下载受到网络限制

- 日期：2026-10-22
- 负责人：初始化执行代理
- 状态：已关闭，静态校验已采用替代方案完成
- 影响范围：Compose和OpenAPI静态配置校验

## 问题场景

本机没有现成YAML解析包和Compose程序。准备将PyYAML安装至本地`.local/validation/python`，并下载独立Compose程序，用于解析和检查配置。

PyYAML安装发生代理连接重置；访问OpenAPI规范网站出现DNS解析失败；下载Compose独立程序时发生读取超时。

## 原因分析

错误日志表明不同来源存在代理、DNS及超时问题。不能把pip在连接失败后输出的“找不到版本”认定为PyYAML版本不存在，也不能由下载失败推断项目配置错误。

## 实际解决方案

1. 从js-yaml官方GitHub仓库下载4.1.0版单文件解析器，仅存放在被Git忽略的`.local/validation/`。
2. 从Compose Specification和OpenAPI Specification官方GitHub仓库取得JSON Schema。
3. 通过Node解析YAML，再用本机已有的Python/jsonschema按官方Schema进行校验；同时检查本地引用和资源路径。
4. Docker Registry部分查询曾超时，重试后取得四个镜像的实际清单摘要，将摘要固定到配置中。

没有向系统环境安装Python包，没有将下载的校验工具作为应用代码加入仓库。

## 最后的测试结果

| 时间 | 操作 | 实际结果 | 状态 |
| --- | --- | --- | --- |
| 2026-10-22 | 安装PyYAML到`.local` | 代理连接失败，未安装成功 | 失败 |
| 2026-10-22 | 下载独立Compose程序 | 读取超时，未得到可执行程序 | 失败 |
| 2026-10-22 | js-yaml解析`compose.yaml`和`openapi.yaml` | 两个文件均成功解析 | 通过 |
| 2026-10-22 | jsonschema按官方Schema校验 | Compose和OpenAPI结构均通过 | 通过 |
| 2026-10-22 | Docker Registry清单请求 | Maven、Node、MySQL、Swagger UI四个镜像引用均解析出摘要 | 通过 |

最终完整检查见[初始化验证报告](../testing/bootstrap-verification.md)。

## 遗留事项

本问题中的静态校验目标已完成。未执行`docker compose config`和容器运行测试，需在有Docker的环境补做，追踪在[DEV-0002](DEV-0002-docker-runtime.md)中；静态Schema校验不能替代它们。
