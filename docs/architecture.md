# 项目结构与分层

当前采用一个仓库管理前端、后端、数据库和课程交付材料。这里只定义技术结构，不推断快递业务模块。

```text
backend/
  src/main/java/cn/edu/hdu/express/
    controller/                  HTTP入口
    service/                     业务规则与事务
    repository/                  数据访问
    entity/                      持久化实体
    dto/request/                 请求DTO
    dto/response/                响应DTO
    config/                      应用配置
    common/exception/            统一异常处理
    common/response/             公共响应结构
    common/validation/           公共校验
  src/main/resources/            后续应用资源
  src/test/java/cn/edu/hdu/express/
  src/test/resources/
frontend/
  public/
  src/
    api/                         统一HTTP调用
    assets/                      静态资源
    components/                  公共组件
    composables/                 组合式逻辑
    layouts/                     页面布局
    router/                      路由
    stores/                      共享状态
    styles/                      全局样式
    types/                       TypeScript类型
    utils/                       通用工具
    views/                       业务页面
  tests/unit/
database/
  design/                        数据设计工作文件
  migrations/                    数据库迁移
  seeds/                         开发与测试种子数据
tests/
  integration/                   跨模块集成测试
  e2e/                           端到端测试
  fixtures/                      合成测试数据
infra/docker/
  backend/Dockerfile.dev         JDK/Maven开发环境
  frontend/Dockerfile.dev        Node/npm开发环境
docs/
  api/                           接口协议与OpenAPI
  requirements/
    business-flows/              业务流程
    data-analysis/               数据分析
    function-analysis/           功能分析
    prototypes/                  界面原型
  design/
    architecture/                模块结构图
    database/                    ER图与表结构交付件
    detail/                      至少两个模块的详细设计
  testing/
    cases/                       课程测试用例
    bugs/                        课程BUG清单
    reports/                     测试报告与证据
  management/
    plans/                       项目计划
    weekly-reports/              周报
    meetings/                    讨论与会议记录
  acceptance/
    screenshots/                 功能截图
    personal-summaries/          个人总结
  development-issues/            可选本地问题记录，Git忽略，克隆时不包含
  templates/                     协作记录模板
.github/
  ISSUE_TEMPLATE/
  PULL_REQUEST_TEMPLATE.md
```

前端通过HTTP调用后端；后端内部按Controller→Service→Repository分层访问MySQL。接口DTO与数据库实体分开，避免数据库字段变更直接改变对外接口。

具体角色、页面、业务Service、表结构和状态转换在需求分析后确定，再放入对应目录。当前不生成`pom.xml`、`package.json`、Java/TypeScript/Vue文件或SQL脚本，避免把目录初始化扩大为应用实现。
