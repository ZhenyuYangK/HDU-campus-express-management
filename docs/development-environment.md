# Docker开发环境

## 环境组成与当前状态

技术栈由负责人选定为Spring Boot+Vue3+MySQL。统一开发环境使用Linux容器，后端工具链为Java21/Maven3.9，前端工具链为Node22/npm，数据库为MySQL8.4；接口文档由Swagger UI展示。

当前前后端只有目录，没有`pom.xml`、`package.json`及业务代码。两个开发容器以`sleep infinity`保持待命，支持直接执行工具命令；健康检查只检查工具链。MySQL健康检查验证应用账号连接及`SELECT 1`；Swagger UI健康检查仅验证静态文档站点可访问。上述检查均不能替代业务测试。

初始化机器未安装Docker引擎，本次验证范围见[验证报告](testing/bootstrap-verification.md)。

镜像已通过Docker Registry只读核验并固定清单摘要，避免同一标签更新后成员拉取到不同内容。摘要写入`compose.yaml`及两个Dockerfile，升级时一起评审更新：

| 镜像标签 | 固定摘要 |
| --- | --- |
| `maven:3.9-eclipse-temurin-21` | `sha256:99e61abcff91a9b1333463bd8451fb18495d6eba9250ac66a338b518f8278320` |
| `node:22-bookworm-slim` | `sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d` |
| `mysql:8.4` | `sha256:76f0358884cb92d9a086d24e5671c38048d3fef40f2588703d73eb55392d6b69` |
| `swaggerapi/swagger-ui:v5.34.0` | `sha256:58c1fbf5f5cf6d2ae857e4d1296cb02192fa5de472c1cd76f58b2be99523e1d0` |

## 前置条件

- Windows安装Docker Desktop，启用WSL2后端和Linux容器；其他平台安装Docker Engine及Compose。
- 使用支持Compose Specification的Compose2.20或更高版本。
- 首次拉取镜像需要访问Docker Hub，后续Maven/npm下载依赖也需要对应网络。

## 首次启动

在仓库根目录执行：

```powershell
Copy-Item .env.example .env
docker version
docker compose version
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 240
docker compose ps
```

已有`.env`时保留自己的配置，不再次覆盖。示例密码仅用于本机开发，实际`.env`被Git忽略。不要将`docker compose config`展开后的密码内容提交到仓库或粘贴到公开记录。

## 服务地址与连接

| 服务 | 本机入口 | 容器内地址 | 当前用途 |
| --- | --- | --- | --- |
| MySQL | `127.0.0.1:3306` | `mysql:3306` | 创建空数据库及开发用户，保留数据卷 |
| 后端 | `127.0.0.1:8080` | `backend-dev:8080` | 预留端口，应用尚未启动 |
| 前端 | `127.0.0.1:5173` | `frontend-dev:5173` | 预留端口，应用尚未启动 |
| 接口文档 | `http://localhost:8081` | `api-docs:8080` | 展示公共Schema，尚无业务端点 |

端口均由`.env`调整。所有宿主机端口仅绑定`127.0.0.1`。数据库名、用户名和密码以自己的`.env`为准，后端通过`SPRING_DATASOURCE_*`读取容器连接配置。

当前浏览器开发地址通过`VITE_API_BASE_URL`传给后续前端实现；前端HTTP封装必须显式读取该变量。浏览器请求会跨5173和8080端口，初始化后端时须按实际前端地址配置CORS，或经评审改用Vite代理；这项联调验证尚未执行。

## 工具链与数据库验证

```powershell
docker compose exec backend-dev java -version
docker compose exec backend-dev mvn --version
docker compose exec frontend-dev node --version
docker compose exec frontend-dev npm --version
docker compose exec mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql --protocol=TCP -h 127.0.0.1 -u "$MYSQL_USER" -D "$MYSQL_DATABASE" -e "SELECT DATABASE(), VERSION(), @@character_set_server, @@global.time_zone;"'
Invoke-WebRequest http://localhost:8081 -UseBasicParsing
Invoke-WebRequest http://localhost:8081/openapi.yaml -UseBasicParsing
```

进入容器：

```powershell
docker compose exec backend-dev bash
docker compose exec frontend-dev sh
```

源码绑定到`/workspace/backend`和`/workspace/frontend`，容器内修改将写回本机。Maven、npm和`node_modules`使用独立数据卷，不复制成员本机依赖。

## 后续初始化应用后

本次不运行应用生成器，不写业务代码。后续任务需先固定Spring Boot、Vue、TypeScript、Vite及依赖版本，创建`pom.xml`、`package.json`及`package-lock.json`后，再运行：

```powershell
docker compose exec backend-dev mvn spring-boot:run
docker compose exec frontend-dev npm ci
docker compose exec frontend-dev npm run dev -- --host 0.0.0.0 --port 5173
```

两个开发服务器分别在终端前台运行。前端需有`dev`脚本；后端需配置Spring Boot插件、驱动及必要应用设置。上述命令是后续操作说明，不表示当前空目录能启动应用。

后续测试可在对应应用存在时执行`mvn test`、前端约定的测试脚本以及跨模块测试，不应在空项目上制造“测试通过”。

## 数据、停止与故障处理

```powershell
docker compose logs --tail 100 mysql
docker compose logs --tail 100 api-docs
docker compose stop
docker compose start
docker compose down
```

`docker compose down`移除容器及网络，保留命名卷。删除卷会丢失数据，重置数据库前先确认需要保留的数据并备份。

首次启动时MySQL镜像按环境变量创建数据库和用户；已有数据卷时修改`.env`中的口令或库名不会自动修改数据库内容，需要通过数据库管理操作同步。

端口冲突时修改`.env`对应端口并重新创建容器。依赖连接失败先检查`docker compose ps`和服务日志，后端数据库地址必须使用`mysql`服务名。处理过程中按[问题记录规范](../agent.md)记录原因、方案及最后测试结果。

## 配置依据

健康依赖和待命容器按[Compose服务规范](https://docs.docker.com/reference/compose-file/services/)配置；具体服务健康状态与依赖顺序说明见[Docker官方启动顺序文档](https://docs.docker.com/compose/how-tos/startup-order/)。
