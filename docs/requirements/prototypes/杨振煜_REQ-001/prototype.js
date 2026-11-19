"use strict";

const VERSION = "2026-11-19";
const exportMode = new URLSearchParams(window.location.search).get("export") === "1";
const brandLogo = document.querySelector('link[rel="icon"]').href;
document.body.classList.toggle("export", exportMode);

const pages = {
  login: { ui: "UI-001-01", func: "FUNC-001-01", title: "登录与身份识别", role: "三类角色", file: "UI-001-01_登录与身份识别.png" },
  "login-error": { ui: "UI-001-02", func: "FUNC-001-01", title: "登录输入错误", role: "三类角色", file: "UI-001-02_登录输入错误.png" },
  "account-create": { ui: "UI-001-03", func: "FUNC-001-02", title: "账号创建与角色分配", role: "管理员", file: "UI-001-03_账号创建与角色分配.png" },
  password: { ui: "UI-001-04", func: "FUNC-001-03", title: "用户修改密码｜普通修改", role: "学生", file: "UI-001-04_用户修改密码_普通.png" },
  "password-forced": { ui: "UI-001-05", func: "FUNC-001-03", title: "学生首次登录｜强制改密弹窗", role: "学生", file: "UI-001-05_用户修改密码_强制.png" },
  student: { ui: "UI-001-01", func: "FUNC-001-01", title: "学生首页", role: "学生", hidden: true },
  "password-reset": { ui: "UI-001-06", func: "FUNC-001-04", title: "忘记密码与管理员重置", role: "管理员", file: "UI-001-06_忘记密码与管理员重置.png" },
  "phone-change": { ui: "UI-001-07", func: "FUNC-001-05", title: "绑定手机号变更", role: "管理员", file: "UI-001-07_绑定手机号变更.png" },
  "company-list": { ui: "UI-001-08", func: "FUNC-001-06～08", title: "快递公司清单", role: "管理员", file: "", hidden: true },
  "company-add": { ui: "UI-001-08", func: "FUNC-001-06", title: "快递公司新增", role: "管理员", file: "UI-001-08_快递公司新增.png" },
  "company-edit": { ui: "UI-001-09", func: "FUNC-001-07", title: "快递公司修改", role: "管理员", file: "UI-001-09_快递公司修改.png" },
  "company-delete-blocked": { ui: "UI-001-10", func: "FUNC-001-08", title: "快递公司删除｜引用阻止", role: "管理员", file: "UI-001-10_快递公司删除_引用阻止.png" },
  "company-delete": { ui: "UI-001-11", func: "FUNC-001-08", title: "快递公司删除｜确认", role: "管理员", file: "UI-001-11_快递公司删除_确认.png" },
  locations: { ui: "UI-001-12", func: "FUNC-001-12", title: "固定存放位置查看", role: "管理员", file: "UI-001-12_固定存放位置查看.png" }
};

const exportRoutes = Object.keys(pages).filter(key => !pages[key].hidden);
const initialCompanies = [
  ["顺丰速运", true], ["京东快递", true], ["韵达快递", true], ["中通快递", true],
  ["圆通速递", true], ["申通快递", false], ["极兔速递", false], ["德邦快递", true],
  ["中国邮政", true], ["邮政EMS", true], ["菜鸟速递", false], ["跨越速运", false]
];
let companies = initialCompanies.map(([name, referenced]) => ({ name, referenced }));
let selectedCompany = "京东快递";
let demoState = "normal";
let toastTimer;
let studentNeedsPasswordChange = true;
const studentAccount = "00120001";
const accountExamples = {
  [studentAccount]: { name: "示例学生", phone: "13800000001", role: "学生" },
  staff001: { name: "示例工作人员", phone: "13800000002", role: "工作人员" },
  admin001: { name: "示例管理员", phone: "13800000003", role: "管理员" }
};

function icon(name) {
  return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

function brand() {
  return `<a class="brand" href="#login" aria-label="CampusDelivery Station登录页">
    <img class="brand-mark" src="${brandLogo}" width="34" height="34" alt="">
    <span class="brand-name">CampusDelivery Station</span>
  </a>`;
}

function currentRoute() {
  const route = window.location.hash.replace(/^#/, "") || "login";
  return Object.hasOwn(pages, route) ? route : "login";
}

function metaFooter(page) {
  return `<footer class="prototype-meta"><span>${page.ui} · ${page.func} · ${page.role}</span><span>版本${VERSION} · 接口待设计 · 合成数据</span></footer>`;
}

function pageHeading(page, description, action = "") {
  return `<div class="page-heading">
    <div><h1>${page.title}</h1>${description ? `<p>${description}</p>` : ""}</div>
    ${action ? `<div class="page-heading__meta">${action}</div>` : ""}
  </div>`;
}

function navButton(route, active, label, iconName) {
  return `<button type="button" class="nav-item" data-route="${route}" ${active ? 'aria-current="page"' : ""}>${icon(iconName)}<span>${label}</span></button>`;
}

function shell(route, content) {
  const page = pages[route];
  const role = page.role;
  const isAdmin = role === "管理员";
  const nav = isAdmin ? `
    <div class="nav-group"><p class="sidebar-caption">账号与权限</p>
      ${navButton("account-create", route === "account-create", "创建账号", "users")}
      ${navButton("password-reset", route === "password-reset", "重置密码", "lock")}
      ${navButton("phone-change", route === "phone-change", "变更手机号", "phone")}
    </div>
    <div class="nav-group"><p class="sidebar-caption">基础信息</p>
      ${navButton("company-list", route.startsWith("company-"), "快递公司", "truck")}
      ${navButton("locations", route === "locations", "存放位置", "grid")}
    </div>` : `
    <div class="nav-group"><p class="sidebar-caption">账号安全</p>
      ${navButton("password", route === "password", "修改密码", "lock")}
    </div>`;
  const displayName = isAdmin ? "示例管理员" : "示例学生";
  const account = isAdmin ? "admin001" : studentAccount;
  const section = isAdmin ? (route.startsWith("company-") || route === "locations" ? "基础信息" : "账号与权限") : "学生端";
  return `<div class="app-shell">
    <aside class="sidebar" aria-label="功能导航">${brand()}<nav>${nav}</nav></aside>
    <section class="workspace">
      <header class="app-topbar"><div class="breadcrumb"><span>${route === "password" ? "账号安全" : section}</span></div>
        <div class="user-chip"><span class="user-avatar" aria-hidden="true">${isAdmin ? "管" : "学"}</span><div class="user-meta"><strong>${displayName}</strong><span>${account} · ${role}</span></div></div>
      </header>
      <main class="main-content" id="main" tabindex="-1">${content}</main>
      ${metaFooter(page)}
    </section>
  </div>`;
}

function loginPage(hasError) {
  const page = pages[hasError ? "login-error" : "login"];
  return `<div class="login-page">
    <header class="login-header">${brand()}</header>
    <main class="login-layout" id="main" tabindex="-1">
      <section class="login-story">
        <h1>让每一件校园包裹<br><em>都有清晰去向。</em></h1>
        <img class="login-art" src="插画/校园快递.svg" alt="两名工作人员分拣包裹，一名学生在自助取件区查看手机">
      </section>
      <section class="login-panel" aria-labelledby="login-title">
        <h2 id="login-title">登录驿站</h2>
        ${hasError ? `<div class="form-alert" role="alert">${icon("alert")}<span>登录信息有误，请检查后重试。</span></div>` : ""}
        <form id="login-form" novalidate>
          <div class="field"><label for="login-id">账号或绑定手机号<span class="required" aria-hidden="true">*</span></label>
            <input id="login-id" name="loginId" autocomplete="username" inputmode="text" value="${hasError ? "Staff001" : ""}" placeholder="8位账号或11位手机号" ${hasError ? 'aria-invalid="true" aria-describedby="login-id-error"' : ""}>
            ${hasError ? `<p class="field-error" id="login-id-error">${icon("alert")}账号前缀仅接受小写staff或admin，且不能含首尾空白。</p>` : `<p class="field-hint">DATA-001-07 · 保留前导零</p>`}
          </div>
          <div class="field"><label for="login-password">密码<span class="required" aria-hidden="true">*</span></label>
            <div class="input-with-action"><input id="login-password" name="password" type="password" autocomplete="current-password" value="${hasError ? "Demo2026" : ""}" placeholder="输入密码"><button class="input-action" type="button" data-toggle-password="login-password" aria-label="显示密码">显示</button></div>
            <p class="field-hint">DATA-001-04 · 8～20位，含字母和数字</p>
          </div>
          <button class="button button-primary login-submit" type="submit">登录${icon("arrow")}</button>
        </form>
        <div class="login-assist"><span>忘记密码请联系管理员</span></div>
        <div class="role-explain">${icon("shield")}<span>角色由账号自动识别</span></div>
      </section>
    </main>
    <footer class="login-footer"><span>${page.ui} · ${page.func} · ${page.role}</span><span>版本${VERSION} · 接口待设计 · 合成数据</span></footer>
  </div>`;
}

function rolePicker() {
  return `<fieldset class="field-full" style="border:0;padding:0;margin:0 0 22px"><legend class="field-label">固定角色<span class="required" aria-hidden="true">*</span></legend><div class="role-picker">
    <div class="role-option"><input type="radio" name="role" id="role-student" value="学生" checked><label for="role-student">${icon("users")}<span><strong>学生</strong><small>8位数字学号</small></span></label></div>
    <div class="role-option"><input type="radio" name="role" id="role-staff" value="工作人员"><label for="role-staff">${icon("box")}<span><strong>工作人员</strong><small>staff＋3位数字</small></span></label></div>
    <div class="role-option"><input type="radio" name="role" id="role-admin" value="管理员"><label for="role-admin">${icon("shield")}<span><strong>管理员</strong><small>admin＋3位数字</small></span></label></div>
  </div></fieldset>`;
}

function accountCreatePage() {
  const page = pages["account-create"];
  const content = `${pageHeading(page, "首次登录须修改密码。")}
    <div class="form-layout single"><form class="form-card" id="account-create-form" novalidate>
      ${rolePicker()}<div class="form-grid">
        <div class="field"><label for="create-account">账号<span class="required" aria-hidden="true">*</span></label><input id="create-account" name="account" value="00120001" maxlength="8" placeholder="00120001" aria-describedby="create-account-hint"><p class="field-hint" id="create-account-hint">DATA-001-01 · 8位数字，保留前导零</p></div>
        <div class="field"><label for="create-name">账号姓名<span class="required" aria-hidden="true">*</span></label><input id="create-name" name="name" value="示例学生" maxlength="50"><p class="field-hint">DATA-001-02 · 最多50个字符</p></div>
        <div class="field"><label for="create-phone">绑定手机号<span class="required" aria-hidden="true">*</span></label><input id="create-phone" name="phone" value="13800000001" inputmode="numeric" maxlength="11"><p class="field-hint">DATA-001-03 · 11位数字，不可重复</p></div>
        <div class="field"><label for="create-password">初始密码<span class="required" aria-hidden="true">*</span></label><div class="input-with-action"><input id="create-password" name="password" type="password" value="Demo2026" minlength="8" maxlength="20" autocomplete="new-password"><button class="input-action" type="button" data-toggle-password="create-password" aria-label="显示初始密码">显示</button></div><p class="field-hint">DATA-001-04 · 8～20位，含字母和数字</p></div>
      </div>
      <div class="form-footer"><button class="button button-primary" type="submit">创建账号${icon("arrow")}</button></div>
    </form></div>`;
  return shell("account-create", content);
}

function passwordRules() {
  return `<div class="password-rules" aria-label="新密码格式要求"><span class="password-rule" data-rule="length">${icon("check")}8～20个字符</span><span class="password-rule" data-rule="letter-number">${icon("check")}含字母和数字</span><span class="password-rule" data-rule="space">${icon("check")}不含空白字符</span></div>`;
}

function normalPasswordPage() {
  const page = pages.password;
  const content = `${pageHeading(page, "")}
    <div class="form-layout single"><form class="form-card" id="normal-password-form" novalidate>
      <div class="form-grid">
        <div class="field field-full"><label for="password-account">当前账号</label><input id="password-account" value="00120001 · 示例学生 · 学生" readonly><p class="field-hint">DATA-001-01 · 当前身份</p></div>
        <div class="field field-full"><label for="old-password">原密码<span class="required" aria-hidden="true">*</span></label><div class="input-with-action"><input id="old-password" name="oldPassword" type="password" autocomplete="current-password" placeholder="输入原密码"><button class="input-action" type="button" data-toggle-password="old-password" aria-label="显示原密码">显示</button></div><p class="field-hint">DATA-001-08</p></div>
        <div class="field field-full"><label for="new-password">新密码<span class="required" aria-hidden="true">*</span></label><div class="input-with-action"><input id="new-password" name="newPassword" type="password" autocomplete="new-password" placeholder="设置新密码" data-password-rules><button class="input-action" type="button" data-toggle-password="new-password" aria-label="显示新密码">显示</button></div><p class="field-hint">DATA-001-09</p>${passwordRules()}</div>
      </div>
      <div class="form-footer"><button class="button button-primary" type="submit">确认修改${icon("arrow")}</button></div>
    </form></div>`;
  return shell("password", content);
}

function forcedPasswordDialog() {
  return `<dialog class="dialog password-dialog" id="forced-password-dialog" aria-labelledby="forced-title" aria-describedby="forced-description">
    <h2 id="forced-title">首次登录，请修改密码</h2>
    <p id="forced-description">学生账号${studentAccount}。设置新密码后即可继续使用。</p>
    <form id="forced-password-form" novalidate>
      <div class="field"><label for="forced-new-password">新密码<span class="required" aria-hidden="true">*</span></label>
        <div class="input-with-action"><input id="forced-new-password" name="newPassword" type="password" autocomplete="new-password" placeholder="设置新密码" autofocus data-password-rules><button class="input-action" type="button" data-toggle-password="forced-new-password" aria-label="显示新密码">显示</button></div>
        ${passwordRules()}
      </div>
      <div class="actions-row"><button class="button button-primary" type="submit">修改密码${icon("arrow")}</button></div>
    </form>
  </dialog>`;
}

function studentPage(route, showPasswordDialog) {
  const content = pageHeading(pages.student, "");
  return shell(route, content) + (showPasswordDialog ? forcedPasswordDialog() : "");
}

function accountOptions(selected = "00120001") {
  return Object.entries(accountExamples).map(([account, item]) => `<option value="${account}" ${account === selected ? "selected" : ""}>${account} · ${item.name} · ${item.role}</option>`).join("");
}

function identityCard(prefix, account = "00120001") {
  const item = accountExamples[account];
  return `<section class="identity-card" aria-label="选定账号资料"><dl class="identity-grid">
    <div><dt>账号 · DATA-001-01</dt><dd id="${prefix}-detail-account">${account}</dd></div><div><dt>账号姓名 · DATA-001-02</dt><dd id="${prefix}-detail-name">${item.name}</dd></div><div><dt>绑定手机号 · DATA-001-03</dt><dd id="${prefix}-detail-phone">${item.phone}</dd></div>
  </dl></section>`;
}

function passwordResetPage() {
  const page = pages["password-reset"];
  const content = `${pageHeading(page, "身份核对通过后办理。")}
    <div class="form-layout single"><form class="form-card" id="password-reset-form" novalidate>
      <div class="field"><label for="reset-account">目标账号<span class="required" aria-hidden="true">*</span></label><select id="reset-account" data-account-select="reset">${accountOptions()}</select></div>
      ${identityCard("reset")}
      <label class="check-field"><input type="checkbox" id="reset-confirm" checked data-submit-gate="reset-submit"><span><strong>已完成线下身份核对</strong></span></label>
      <div class="field"><label for="reset-password">临时密码<span class="required" aria-hidden="true">*</span></label><div class="input-with-action"><input id="reset-password" name="password" type="password" value="Reset2026" autocomplete="new-password"><button class="input-action" type="button" data-toggle-password="reset-password" aria-label="显示临时密码">显示</button></div><p class="field-hint">DATA-001-04 · 8～20位，含字母和数字</p></div>
      <div class="info-card warning" style="margin-top:20px">下次登录须先修改密码。</div>
      <div class="form-footer"><button class="button button-primary" id="reset-submit" type="submit">确认重置密码</button></div>
    </form></div>`;
  return shell("password-reset", content);
}

function phoneChangePage() {
  const page = pages["phone-change"];
  const content = `${pageHeading(page, "")}
    <div class="form-layout single"><form class="form-card" id="phone-change-form" novalidate>
      <div class="field"><label for="phone-account">目标账号<span class="required" aria-hidden="true">*</span></label><select id="phone-account" data-account-select="phone">${accountOptions()}</select></div>
      ${identityCard("phone")}
      <label class="check-field"><input type="checkbox" id="phone-confirm" checked data-submit-gate="phone-submit"><span><strong>已完成线下身份核对</strong></span></label>
      <div class="field"><label for="new-phone">新绑定手机号<span class="required" aria-hidden="true">*</span></label><input id="new-phone" name="phone" value="13800000099" inputmode="numeric" maxlength="11"><p class="field-hint">DATA-001-10 · 11位数字，不可重复</p></div>
      <div class="info-card warning" style="margin-top:20px">不修改包裹联系信息或历史业务归属。</div>
      <div class="form-footer"><button class="button button-primary" id="phone-submit" type="submit">确认变更手机号</button></div>
    </form></div>`;
  return shell("phone-change", content);
}

function companyRows(selected = "") {
  return companies.map(company => `<tr class="${company.name === selected ? "selected" : ""}"><td><div class="row-title"><span class="company-glyph" aria-hidden="true">${company.name.slice(0, 1)}</span><span>${company.name}</span></div></td>
    <td>${company.referenced ? '<span class="status-badge warning">已引用</span>' : '<span class="status-badge neutral">未引用</span>'}</td>
    <td><div class="row-actions"><button class="button button-text" type="button" data-edit-company="${company.name}">${icon("edit")}修改</button><button class="button button-text ${company.referenced ? "text-danger" : ""}" type="button" data-delete-company="${company.name}" data-referenced="${company.referenced}">${icon("trash")}删除</button></div></td></tr>`).join("");
}

function companyListBlock(selected = "") {
  return `<section class="list-card" aria-label="快递公司清单"><div class="list-toolbar"><div><strong>公司清单</strong><span class="list-count">　共${companies.length}项</span></div><span class="function-tag">DATA-001-11</span></div>
    <table class="data-table"><thead><tr><th style="width:44%">快递公司名称</th><th style="width:26%">业务引用</th><th style="width:30%;text-align:right">操作</th></tr></thead><tbody>${companyRows(selected)}</tbody></table>
    <div class="list-footer"><div class="pagination"><span>第</span><span class="page-number">1</span><span>页 / 共1页</span></div></div></section>`;
}

function listStateBlock() {
  if (demoState === "loading") return `<section class="list-card" aria-busy="true" aria-label="清单加载中"><div class="list-toolbar"><strong>加载中</strong></div><div class="skeleton-wrap">${'<div class="skeleton"></div>'.repeat(8)}</div></section>`;
  if (demoState === "empty") return `<section class="list-card"><div class="empty-state"><div class="empty-state__inner"><div class="empty-state__icon">${icon("box")}</div><h2>暂无数据</h2><button class="button button-secondary" type="button" data-state="normal">返回清单</button></div></div></section>`;
  return `<section class="list-card"><div class="empty-state"><div class="empty-state__inner"><div class="empty-state__icon">${icon("alert")}</div><h2>加载失败</h2><p>请稍后重试。</p><button class="button button-secondary" type="button" data-state="normal">${icon("refresh")}重试</button></div></div></section>`;
}

function companyDrawer(mode) {
  if (mode === "list") return "";
  const add = mode === "add";
  const page = pages[add ? "company-add" : "company-edit"];
  const value = add ? "示例物流" : selectedCompany;
  return `<div class="overlay" aria-hidden="true"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="company-drawer-title">
    <div class="drawer-header"><h2 id="company-drawer-title">${add ? "新增快递公司" : "修改快递公司"}</h2><button class="icon-button" type="button" data-route="company-list" aria-label="关闭">${icon("close")}</button></div>
    <form id="${add ? "company-add-form" : "company-edit-form"}" class="drawer-body" novalidate>
      <div class="field"><label for="company-name">${add ? "公司名称" : "新公司名称"}<span class="required" aria-hidden="true">*</span></label><input id="company-name" name="companyName" value="${value}" maxlength="50" data-char-count="company-count" autocomplete="off"><p class="field-hint">DATA-001-11 · 1～50位，清单内唯一</p><div class="char-count" id="company-count">${value.length} / 50</div></div>
      ${add ? "" : '<div class="info-card warning" style="margin-top:22px">更名保留业务关联，历史业务显示当前名称。</div>'}
    </form>
    <div class="drawer-footer"><button class="button button-secondary" type="button" data-route="company-list">取消</button><button class="button button-primary" type="submit" form="${add ? "company-add-form" : "company-edit-form"}">${add ? "新增公司" : "保存修改"}</button></div>
    <div class="drawer-meta">${page.ui} · 版本${VERSION} · 接口待设计</div>
  </aside>`;
}

function companyDeleteDialog(blocked) {
  const name = blocked ? "顺丰速运" : "跨越速运";
  selectedCompany = name;
  const page = pages[blocked ? "company-delete-blocked" : "company-delete"];
  return `<div class="overlay" aria-hidden="true"></div><div class="dialog-wrap"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
    <div class="dialog-icon">${icon(blocked ? "alert" : "trash")}</div><h2 id="delete-title">${blocked ? `无法删除“${name}”` : `删除“${name}”？`}</h2>
    <p id="delete-description">${blocked ? "该公司已被业务引用，记录与关联保持不变。" : "删除后不再供新业务选择；提交时将再次核对业务引用。"}</p>
    <div class="actions-row"><button class="button button-secondary" type="button" data-route="company-list">${blocked ? "返回清单" : "取消"}</button>${blocked ? "" : '<button class="button button-danger" type="button" id="confirm-company-delete">确认删除</button>'}</div>
    <div class="dialog-meta">${page.ui} · ${page.func} · 版本${VERSION} · 接口待设计</div>
  </section></div>`;
}

function companyPage(mode) {
  const route = mode === "blocked" ? "company-delete-blocked" : mode === "delete" ? "company-delete" : `company-${mode}`;
  const page = pages[route];
  const action = mode === "list" ? `<button class="button button-primary" type="button" data-route="company-add">${icon("plus")}新增快递公司</button>` : "";
  const heading = pageHeading(page, "", action);
  const body = mode === "list" && demoState !== "normal" ? listStateBlock() : companyListBlock(mode === "edit" ? selectedCompany : mode === "blocked" ? "顺丰速运" : mode === "delete" ? "跨越速运" : "");
  const extra = mode === "add" || mode === "edit" ? companyDrawer(mode) : mode === "blocked" || mode === "delete" ? companyDeleteDialog(mode === "blocked") : "";
  return shell(route, `${heading}${body}${extra}`);
}

function locationsPage() {
  const page = pages.locations;
  const zones = "ABCDEFGHIJKL".split("");
  const rows = zones.map(zone => `<tr><td>${zone}区</td>${[1,2,3,4,5,6].map(level => `<td><span class="location-cell">${zone}-${level}</span></td>`).join("")}</tr>`).join("");
  const content = `${pageHeading(page, "", '<span class="status-badge neutral">只读</span>')}
    <div class="location-summary"><div class="location-stat"><strong>12</strong><span>分区 A～L</span></div><div class="location-stat"><strong>6</strong><span>每区层数</span></div><div class="location-stat"><strong>72</strong><span>固定层位 · DATA-001-12</span></div></div>
    ${demoState !== "normal" ? listStateBlock() : `<section class="location-table-wrap" aria-label="72个固定存放层位"><table class="location-table"><thead><tr><th>分区</th>${[1,2,3,4,5,6].map(n => `<th>第${n}层</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></section>`}`;
  return shell("locations", content);
}

function render() {
  const route = currentRoute();
  const listRoute = route === "company-list" || route === "locations";
  if (!listRoute) demoState = "normal";
  let html;
  if (route === "login") html = loginPage(false);
  else if (route === "login-error") html = loginPage(true);
  else if (route === "account-create") html = accountCreatePage();
  else if (route === "password") html = normalPasswordPage();
  else if (route === "student" || route === "password-forced") {
    html = studentPage(route, route === "password-forced" || studentNeedsPasswordChange);
  }
  else if (route === "password-reset") html = passwordResetPage();
  else if (route === "phone-change") html = phoneChangePage();
  else if (route === "company-list") html = companyPage("list");
  else if (route === "company-add") html = companyPage("add");
  else if (route === "company-edit") html = companyPage("edit");
  else if (route === "company-delete-blocked") html = companyPage("blocked");
  else if (route === "company-delete") html = companyPage("delete");
  else if (route === "locations") html = locationsPage();
  document.getElementById("app").innerHTML = html;
  document.title = `${pages[route].ui} ${pages[route].title}｜REQ-001原型`;
  const picker = document.getElementById("page-picker");
  picker.value = route;
  const statePicker = document.getElementById("state-picker");
  statePicker.disabled = !listRoute;
  statePicker.value = demoState;
  statePicker.title = listRoute ? "切换清单的加载、无数据和请求失败状态" : "该公共状态示例在快递公司清单或存放位置页查看";
  document.querySelectorAll("[data-password-rules]").forEach(updatePasswordRules);
  document.querySelectorAll("[data-submit-gate]").forEach(input => {
    const button = document.getElementById(input.dataset.submitGate);
    if (button) button.disabled = !input.checked;
  });
  const passwordDialog = document.getElementById("forced-password-dialog");
  if (passwordDialog) {
    passwordDialog.addEventListener("cancel", event => event.preventDefault());
    passwordDialog.showModal();
  }
  if (!exportMode && (route === "company-delete" || route === "company-delete-blocked")) {
    document.querySelector('[role="dialog"] button')?.focus({ preventScroll: true });
  }
}

function showToast(title) {
  clearTimeout(toastTimer);
  const toast = document.getElementById("toast");
  toast.innerHTML = `<strong>${title}</strong>`;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2500);
}

function setFieldError(input, message) {
  if (!input) return;
  const field = input.closest(".field");
  field?.querySelectorAll(".field-error.dynamic-error").forEach(error => error.remove());
  input.removeAttribute("aria-invalid");
  const oldId = input.getAttribute("aria-describedby");
  if (oldId?.endsWith("-dynamic-error")) input.removeAttribute("aria-describedby");
  if (!message) return;
  input.setAttribute("aria-invalid", "true");
  const error = document.createElement("p");
  error.className = "field-error dynamic-error";
  error.id = `${input.id}-dynamic-error`;
  error.setAttribute("role", "alert");
  error.innerHTML = `${icon("alert")}<span></span>`;
  error.querySelector("span").textContent = message;
  input.setAttribute("aria-describedby", error.id);
  field?.appendChild(error);
}

function validPassword(value) {
  return /^[\x21-\x7E]{8,20}$/.test(value) && /[A-Za-z]/.test(value) && /\d/.test(value);
}

function updatePasswordRules(input) {
  const value = input.value;
  const card = input.closest(".field");
  const states = { length: value.length >= 8 && value.length <= 20, "letter-number": /[A-Za-z]/.test(value) && /\d/.test(value), space: value.length > 0 && !/\s/.test(value) };
  Object.entries(states).forEach(([rule, valid]) => card?.querySelector(`[data-rule="${rule}"]`)?.classList.toggle("valid", valid));
}

function requireFields(form, names) {
  let valid = true;
  names.forEach(name => {
    const input = form.elements[name];
    if (!input || !input.value) { setFieldError(input, "此项为必填项。"); valid = false; }
    else setFieldError(input, "");
  });
  if (!valid) form.querySelector('[aria-invalid="true"]')?.focus();
  return valid;
}

function submitWithFeedback(form, callback) {
  const button = form.querySelector('[type="submit"]') || document.querySelector(`[form="${form.id}"]`);
  if (button) { button.disabled = true; button.dataset.originalText = button.textContent; button.textContent = "正在提交…"; }
  setTimeout(() => {
    if (button) { button.disabled = false; button.textContent = button.dataset.originalText; }
    callback();
  }, 450);
}

function handleLogin(form) {
  if (!requireFields(form, ["loginId", "password"])) return;
  const idInput = form.elements.loginId;
  const passwordInput = form.elements.password;
  const id = idInput.value;
  if (id !== id.trim()) { setFieldError(idInput, "账号或手机号不能含首尾空白，请更正后再登录。"); idInput.focus(); return; }
  const accountValid = /^\d{8}$/.test(id) || /^staff\d{3}$/.test(id) || /^admin\d{3}$/.test(id);
  const phoneValid = /^\d{11}$/.test(id);
  if (!accountValid && !phoneValid) { setFieldError(idInput, "请输入8位账号或11位绑定手机号；staff和admin前缀仅接受小写。"); idInput.focus(); return; }
  if (!validPassword(passwordInput.value)) { setFieldError(passwordInput, "密码为8～20个字符，至少含字母和数字，且不含空白。"); passwordInput.focus(); return; }
  submitWithFeedback(form, () => {
    if (!form.isConnected) return;
    if (id === studentAccount || id === accountExamples[studentAccount].phone) {
      window.location.hash = "student";
      return;
    }
    const role = /^admin/.test(id) ? "管理员" : /^staff/.test(id) ? "工作人员" : "学生";
    showToast(`登录核验通过 · ${role}`);
  });
}

function handleAccountCreate(form) {
  if (!requireFields(form, ["account", "name", "phone", "password"])) return;
  const account = form.elements.account;
  const name = form.elements.name;
  const phone = form.elements.phone;
  const password = form.elements.password;
  const role = form.elements.role.value;
  const patterns = { "学生": /^\d{8}$/, "工作人员": /^staff\d{3}$/, "管理员": /^admin\d{3}$/ };
  if (account.value !== account.value.trim()) { setFieldError(account, "账号不能含首尾空白。"); account.focus(); return; }
  if (!patterns[role].test(account.value)) { setFieldError(account, `账号格式须与“${role}”角色一致，前缀使用小写。`); account.focus(); return; }
  if (!name.value.trim()) { setFieldError(name, "账号姓名不能仅为空白字符。"); name.focus(); return; }
  if (phone.value !== phone.value.trim() || !/^\d{11}$/.test(phone.value)) { setFieldError(phone, "请输入11位数字手机号，且不能含首尾空白。"); phone.focus(); return; }
  if (!validPassword(password.value)) { setFieldError(password, "初始密码须为8～20位，含字母和数字，不含空白。"); password.focus(); return; }
  if (["admin001", "staff001"].includes(account.value)) { setFieldError(account, "该账号已存在，请更换账号；重复提交不得形成新账号。"); account.focus(); return; }
  if (phone.value === "13800000002") { setFieldError(phone, "该手机号已被其他账号绑定，请核对后再提交。"); phone.focus(); return; }
  submitWithFeedback(form, () => showToast("账号已建立；首次登录须修改密码", `原型反馈：固定角色为${role}，强制改密标记为“是”；未保存真实账号。`));
}

function handleNormalPassword(form) {
  if (!requireFields(form, ["oldPassword", "newPassword"])) return;
  const oldPassword = form.elements.oldPassword;
  const newPassword = form.elements.newPassword;
  if (oldPassword.value === "Wrong2026") { setFieldError(oldPassword, "原密码不正确，请重新输入；密码未修改。"); oldPassword.focus(); return; }
  if (!validPassword(newPassword.value)) { setFieldError(newPassword, "新密码须为8～20位，含字母和数字，不含空白字符。"); newPassword.focus(); return; }
  submitWithFeedback(form, () => showToast("密码修改成功", "原型反馈：仅当前账号的密码被更新；实际哈希处理与登录态策略待详细设计。"));
}

function handleForcedPassword(form) {
  if (!requireFields(form, ["newPassword"])) return;
  const input = form.elements.newPassword;
  if (!validPassword(input.value)) { setFieldError(input, "新密码须为8～20位，含字母和数字，不含空白字符。"); input.focus(); return; }
  submitWithFeedback(form, () => {
    if (!form.isConnected) return;
    studentNeedsPasswordChange = false;
    if (currentRoute() === "password-forced") {
      const studentUrl = new URL(window.location.href);
      studentUrl.hash = "student";
      window.history.replaceState(null, "", studentUrl);
      render();
    } else {
      form.closest("dialog").close();
    }
    document.getElementById("main").focus({ preventScroll: true });
    showToast("密码修改成功，强制改密已解除");
  });
}

function handlePasswordReset(form) {
  const password = form.elements.password;
  if (!document.getElementById("reset-confirm").checked) { showToast("暂不能重置密码", "请先完成线下身份核对。"); return; }
  if (!requireFields(form, ["password"])) return;
  if (!validPassword(password.value)) { setFieldError(password, "临时密码须为8～20位，含字母和数字，不含空白字符。"); password.focus(); return; }
  submitWithFeedback(form, () => showToast("已重置；下次登录先修改密码", "原型反馈：原密码立即失效，强制改密标记为“是”；请线下告知临时密码。"));
}

function handlePhoneChange(form) {
  const phone = form.elements.phone;
  if (!document.getElementById("phone-confirm").checked) { showToast("暂不能变更手机号", "请先完成线下身份核对。"); return; }
  if (!requireFields(form, ["phone"])) return;
  if (phone.value !== phone.value.trim() || !/^\d{11}$/.test(phone.value)) { setFieldError(phone, "请输入11位数字手机号，且不能含首尾空白。"); phone.focus(); return; }
  if (phone.value === "13800000002") { setFieldError(phone, "该手机号已被其他账号占用，请核对后更换。"); phone.focus(); return; }
  submitWithFeedback(form, () => showToast("绑定手机号已修改", "原型反馈：新号码可作为该账号登录标识；历史包裹与已完成业务仍归原账号。"));
}

function normalizedCompanyName(form) {
  const input = form.elements.companyName;
  const value = input.value.trim();
  if (!value) { setFieldError(input, "公司名称不能为空或仅含空白字符。"); input.focus(); return null; }
  if (value.length > 50) { setFieldError(input, "去掉首尾空白后最多50个字符。"); input.focus(); return null; }
  return value;
}

function handleCompanySave(form, editing) {
  const value = normalizedCompanyName(form);
  if (!value) return;
  const duplicate = companies.some(company => company.name === value && (!editing || company.name !== selectedCompany));
  if (duplicate) { setFieldError(form.elements.companyName, "该名称已存在于公司清单，请修改后再保存。"); form.elements.companyName.focus(); return; }
  submitWithFeedback(form, () => {
    if (editing) {
      const target = companies.find(company => company.name === selectedCompany);
      if (target) target.name = value;
    } else companies.push({ name: value, referenced: false });
    showToast(editing ? "快递公司修改成功" : "快递公司新增成功", editing ? "原型反馈：既有业务关联保留，业务界面读取当前名称。" : "原型反馈：清单已临时刷新；未保存真实业务数据。");
    window.location.hash = "company-list";
  });
}

function updateAccountDetails(select) {
  const prefix = select.dataset.accountSelect;
  const item = accountExamples[select.value];
  document.getElementById(`${prefix}-detail-account`).textContent = select.value;
  document.getElementById(`${prefix}-detail-name`).textContent = item.name;
  document.getElementById(`${prefix}-detail-phone`).textContent = item.phone;
}

function populatePicker() {
  const picker = document.getElementById("page-picker");
  picker.innerHTML = exportRoutes.map(route => `<option value="${route}">${pages[route].ui} ${pages[route].title}</option>`).join("") + '<option value="company-list">公共清单｜快递公司</option>';
}

document.getElementById("page-picker").addEventListener("change", event => { window.location.hash = event.target.value; });
document.getElementById("state-picker").addEventListener("change", event => { demoState = event.target.value; render(); });
document.getElementById("reset-prototype").addEventListener("click", () => {
  companies = initialCompanies.map(([name, referenced]) => ({ name, referenced }));
  selectedCompany = "京东快递";
  demoState = "normal";
  studentNeedsPasswordChange = true;
  window.location.hash = "login";
  render();
  showToast("原型演示已重置", "所有清单与页面已恢复到初始合成示例。");
});

window.addEventListener("hashchange", render);
document.addEventListener("click", event => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) { window.location.hash = routeButton.dataset.route; return; }
  const stateButton = event.target.closest("[data-state]");
  if (stateButton) { demoState = stateButton.dataset.state; render(); return; }
  const toggle = event.target.closest("[data-toggle-password]");
  if (toggle) {
    const input = document.getElementById(toggle.dataset.togglePassword);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.textContent = show ? "隐藏" : "显示";
    toggle.setAttribute("aria-label", `${show ? "隐藏" : "显示"}密码`);
    return;
  }
  if (event.target.closest("[data-forgot]")) { showToast("忘记密码由管理员线下办理", "用户联系管理员并核对身份；本系统不提供短信、邮件或自助找回。"); return; }
  const edit = event.target.closest("[data-edit-company]");
  if (edit) { selectedCompany = edit.dataset.editCompany; window.location.hash = "company-edit"; return; }
  const remove = event.target.closest("[data-delete-company]");
  if (remove) { selectedCompany = remove.dataset.deleteCompany; window.location.hash = remove.dataset.referenced === "true" ? "company-delete-blocked" : "company-delete"; return; }
  if (event.target.closest("#confirm-company-delete")) {
    const target = companies.find(company => company.name === selectedCompany);
    if (target?.referenced) { window.location.hash = "company-delete-blocked"; return; }
    companies = companies.filter(company => company.name !== selectedCompany);
    showToast("快递公司删除成功", "原型反馈：清单已临时刷新；真实提交仍须在处理时复核业务引用。");
    window.location.hash = "company-list";
  }
});

document.addEventListener("input", event => {
  if (event.target.matches("[data-password-rules]")) updatePasswordRules(event.target);
  if (event.target.matches("[data-char-count]")) document.getElementById(event.target.dataset.charCount).textContent = `${event.target.value.length} / 50`;
  if (event.target.matches("input")) setFieldError(event.target, "");
});

document.addEventListener("change", event => {
  if (event.target.matches('input[name="role"]')) {
    const hints = { "学生": "DATA-001-01；8位数字，保留前导零。", "工作人员": "DATA-001-01；小写staff加3位数字。", "管理员": "DATA-001-01；小写admin加3位数字。" };
    const placeholders = { "学生": "00120001", "工作人员": "staff001", "管理员": "admin001" };
    document.getElementById("create-account-hint").textContent = hints[event.target.value];
    document.getElementById("create-account").placeholder = placeholders[event.target.value];
  }
  if (event.target.matches("[data-account-select]")) updateAccountDetails(event.target);
  if (event.target.matches("[data-submit-gate]")) {
    const button = document.getElementById(event.target.dataset.submitGate);
    if (button) button.disabled = !event.target.checked;
  }
});

document.addEventListener("submit", event => {
  event.preventDefault();
  const handlers = {
    "login-form": handleLogin,
    "account-create-form": handleAccountCreate,
    "normal-password-form": handleNormalPassword,
    "forced-password-form": handleForcedPassword,
    "password-reset-form": handlePasswordReset,
    "phone-change-form": handlePhoneChange,
    "company-add-form": form => handleCompanySave(form, false),
    "company-edit-form": form => handleCompanySave(form, true)
  };
  handlers[event.target.id]?.(event.target);
});

document.addEventListener("keydown", event => {
  const route = currentRoute();
  if (event.key === "Escape" && ["company-add", "company-edit", "company-delete", "company-delete-blocked"].includes(route)) {
    window.location.hash = "company-list";
    return;
  }
  if (event.key !== "Tab") return;
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return;
  const focusable = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex="0"]')].filter(element => element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

populatePicker();
if (!window.location.hash) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#login`);
render();
window.__REQ001__ = { pages, exportRoutes, version: VERSION };
