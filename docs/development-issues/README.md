# 开发问题记录索引

出现[agent.md](../../agent.md)规定的场景时，按[模板](../templates/issue-template.md)建档，至少保留问题场景、原因、实际解决方案和最后的测试结果。编号递增，同根因问题更新原记录。

状态使用“未解决、处理中、待验证、已关闭”。只有对应修复验证通过且没有遗留影响时才能关闭；静态校验不能代替运行验证。

| 编号 | 问题 | 状态 | 记录 |
| --- | --- | --- | --- |
| DEV-0001 | MiKTeX版PDF提取工具不可用 | 已关闭 | [处理记录](DEV-0001-pdf-extraction.md) |
| DEV-0002 | 本机没有Docker引擎，无法启动容器验收 | 待验证 | [处理记录](DEV-0002-docker-runtime.md) |
| DEV-0003 | 现有资料未规定详细业务接口 | 未解决 | [处理记录](DEV-0003-business-contract.md) |
| DEV-0004 | 配置校验依赖及下载存在网络限制 | 已关闭 | [处理记录](DEV-0004-validation-tools.md) |
| DEV-0005 | 受限环境限制Git配置与远程查询 | 已关闭 | [处理记录](DEV-0005-git-configuration.md) |
