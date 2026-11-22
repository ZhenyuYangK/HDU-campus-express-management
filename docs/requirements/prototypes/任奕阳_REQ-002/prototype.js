"use strict";

const VERSION = "2026-11-22";
const exportMode = new URLSearchParams(window.location.search).get("export") === "1";
const brandLogo = document.querySelector('link[rel="icon"]').href;
document.body.classList.toggle("export", exportMode);

const pages = {
  intake: { ui: "UI-002-01", func: "FUNC-002-01", title: "收件入库登记", role: "驿站工作人员", file: "UI-002-01_收件入库登记.png" },
  "intake-duplicate": { ui: "UI-002-02", func: "FUNC-002-01", title: "入库查重命中未办结记录", role: "驿站工作人员", file: "UI-002-02_入库查重命中.png" },
  "intake-success": { ui: "UI-002-03", func: "FUNC-002-01", title: "入库成功与取件码标签预览", role: "驿站工作人员", file: "UI-002-03_入库成功标签预览.png" },
  linking: { ui: "UI-002-04", func: "FUNC-002-02", title: "待关联包裹补关联", role: "驿站工作人员", file: "UI-002-04_待关联包裹补关联.png" },
  "linking-mismatch": { ui: "UI-002-05", func: "FUNC-002-02", title: "补关联手机号不一致", role: "驿站工作人员", file: "UI-002-05_补关联手机号不一致.png" },
  returns: { ui: "UI-002-06", func: "FUNC-002-03", title: "退件办理与完成登记", role: "驿站工作人员", file: "UI-002-06_退件办理与完成登记.png" },
  "return-start": { ui: "UI-002-07", func: "FUNC-002-03", title: "开始退件办理", role: "驿站工作人员", file: "UI-002-07_开始退件办理.png" },
  "return-manual": { ui: "UI-002-06", func: "FUNC-002-03", title: "人工异常退件", role: "驿站工作人员", file: "", hidden: true },
  correction: { ui: "UI-002-08", func: "FUNC-002-04", title: "记录更正｜未完成记录", role: "驿站工作人员", file: "UI-002-08_记录更正_未完成.png" },
  "correction-closed": { ui: "UI-002-09", func: "FUNC-002-04", title: "记录更正｜已完成仅追加说明", role: "驿站工作人员", file: "UI-002-09_记录更正_已完成.png" },
  records: { ui: "UI-002-10", func: "FUNC-002-05", title: "收件退件记录查询", role: "驿站工作人员", file: "UI-002-10_收件退件记录查询.png" },
  "record-detail": { ui: "UI-002-10", func: "FUNC-002-05", title: "记录详情与办理入口", role: "驿站工作人员", file: "", hidden: true },
  "records-admin": { ui: "UI-002-11", func: "FUNC-002-05", title: "记录查询与详情｜管理员只读", role: "管理员", file: "UI-002-11_记录查询_管理员只读.png" }
};

const exportRoutes = Object.keys(pages).filter(key => !pages[key].hidden);
const companies = ["顺丰速运", "京东快递", "韵达快递", "中通快递", "圆通速递", "申通快递", "极兔速递", "德邦快递", "中国邮政", "邮政EMS", "菜鸟速递", "跨越速运"];
const locations = ["A-1", "A-2", "A-3", "B-1", "B-2", "B-3", "C-1", "C-2", "C-3"];
const student = { account: "00120001", name: "示例学生", phone: "13800000001" };
const otherStudent = { account: "00120002", name: "示例学生乙", phone: "13900000009" };
const records = [
  {
    id: "RK20261122001", company: "顺丰速运", tracking: "SF000123456789", receiver: student.name,
    phone: student.phone, location: "A-3", status: "待取件", account: null, arrivedAt: "2026-11-22 09:05",
    correction: { field: "存放位置名称", operator: "示例工作人员", at: "2026-11-22 09:30" }
  },
  {
    id: "RK20261121006", company: "京东快递", tracking: "JD000444555666", receiver: student.name,
    phone: student.phone, location: "B-1", status: "退件中", account: student.account, arrivedAt: "2026-11-21 16:02",
    returnInfo: { id: "TJ20261122002", source: "学生拒收", reason: "学生拒收", destination: "退回原快递公司", startedAt: "2026-11-22 09:40" }
  },
  {
    id: "RK20261122002", company: "京东快递", tracking: "JD000987654321", receiver: student.name,
    phone: student.phone, location: "A-1", status: "已取件", account: student.account, arrivedAt: "2026-11-21 16:40"
  }
];
let demoState = "normal";
let toastTimer;

function icon(name) {
  return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

function brand() {
  return `<a class="brand" href="#intake" aria-label="CampusDelivery Station原型首页">
    <img class="brand-mark" src="${brandLogo}" width="34" height="34" alt="">
    <span class="brand-name">CampusDelivery Station</span>
  </a>`;
}

function currentRoute() {
  const route = window.location.hash.slice(1).split("/")[0];
  return Object.hasOwn(pages, route) ? route : "intake";
}

function isRecordClosed(record) {
  return record.status === "已取件" || record.status === "已退件";
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
  const isAdmin = page.role === "管理员";
  const nav = isAdmin ? `
    <div class="nav-group"><p class="sidebar-caption">收件与退件</p>
      ${navButton("records-admin", true, "记录查询（只读）", "search")}
    </div>` : `
    <div class="nav-group"><p class="sidebar-caption">收件与退件</p>
      ${navButton("intake", route.startsWith("intake"), "收件入库", "box")}
      ${navButton("linking", route.startsWith("linking"), "待关联补关联", "users")}
      ${navButton("returns", route.startsWith("return"), "退件办理", "return")}
      ${navButton("correction", route.startsWith("correction"), "记录更正", "edit")}
      ${navButton("records", route === "records" || route === "record-detail", "记录查询", "search")}
    </div>`;
  const displayName = isAdmin ? "示例管理员" : "示例工作人员";
  const account = isAdmin ? "admin001" : "staff001";
  return `<div class="app-shell">
    <aside class="sidebar" aria-label="功能导航">${brand()}<nav>${nav}</nav>
      <div class="sidebar-note"><strong>${page.ui}</strong>${page.func}<br>接口与operationId待TASK-003设计</div>
    </aside>
    <section class="workspace">
      <header class="app-topbar"><div class="breadcrumb"><span>工作台</span>${icon("chevron")}<span>收件与退件</span></div>
        <div class="user-chip"><span class="user-avatar" aria-hidden="true">${isAdmin ? "管" : "员"}</span><div class="user-meta"><strong>${displayName}</strong><span>${account} · ${page.role}</span></div></div>
      </header>
      <main class="main-content" id="main" tabindex="-1">${content}</main>
      ${metaFooter(page)}
    </section>
  </div>`;
}

function companyOptions(selected = "顺丰速运") {
  return companies.map(name => `<option ${name === selected ? "selected" : ""}>${name}</option>`).join("");
}

function locationOptions(selected = "A-1") {
  return `<optgroup label="A～C区示例，完整清单为A-1～L-6共72层位（DATA-001-12）">${locations.map(name => `<option ${name === selected ? "selected" : ""}>${name}</option>`).join("")}</optgroup>`;
}

function field(label, ref, control, full = false) {
  return `<div class="field${full ? " field-full" : ""}"><label>${label}<span class="required" aria-hidden="true">*</span></label>${control}<span class="data-ref">${ref}</span></div>`;
}

function listStateBlock(message) {
  if (demoState === "loading") {
    return `<div class="skeleton-wrap" role="status" aria-label="清单加载中"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>`;
  }
  if (demoState === "empty") {
    return `<div class="empty-state"><div class="empty-state__inner"><div class="empty-state__icon">${icon("box")}</div><h2>没有符合条件的记录</h2><p>${message}</p></div></div>`;
  }
  return `<div class="state-error" role="alert"><p>清单加载失败，请重试。</p><button class="button button-secondary" type="button" data-action="retry">${icon("refresh")}重新加载</button></div>`;
}

function pagination(total) {
  return `<div class="list-footer"><span>共${total}条 · 每页20条 · page从1开始</span><div class="pagination"><span class="page-number">1</span></div></div>`;
}

/* FUNC-002-01 收件入库 */
function intakeForm() {
  return `<form class="form-card" id="intake-form" novalidate>
    <div class="form-grid">
      ${field("快递公司", "DATA-001-11 · 引用REQ-001有效清单，不手工新增", `<select name="company" id="intake-company">${companyOptions()}</select>`)}
      ${field("运单号", "DATA-003-01 · 去首尾空白，与公司组合查重", `<input name="tracking" id="intake-tracking" value="SF000123456789" autocomplete="off">`)}
      ${field("收件人姓名", "DATA-003-02 · 仅辅助核对，不参与账号匹配", `<input name="receiver" id="intake-receiver" value="示例学生" autocomplete="off">`)}
      ${field("收件手机号", "DATA-003-03 · 11位，用于匹配账号", `<input name="phone" id="intake-phone" value="13800000001" inputmode="numeric" autocomplete="off">`)}
      ${field("存放位置", "DATA-001-12 · 固定72层位", `<select name="location" id="intake-location">${locationOptions("A-3")}</select>`)}
      <div class="field"><span class="field-label">系统生成项</span><p class="inline-note">取件码（DATA-003-04）、到站时间（DATA-003-06）、包裹状态（DATA-003-05）、入库操作人（DATA-002-20）不接受填写。</p></div>
    </div>
    <p class="inline-note">查重命中已取件或已退件记录时，允许按新包裹重新入库并关联原入库记录编号（DATA-002-05）；命中未办结记录见UI-002-02。</p>
    <div class="form-footer">
      <button class="button button-secondary" type="button" data-action="check-duplicate">${icon("search")}查重</button>
      <button class="button button-primary" type="submit">${icon("check")}保存入库</button>
    </div>
  </form>`;
}

function recentIntakeList() {
  return `<section class="list-card" aria-label="最近入库记录">
    <div class="list-toolbar"><strong>最近入库记录</strong><span class="list-count">按到站时间降序 · 合成示例</span></div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>入库记录编号</th><th>运单号</th><th>位置</th><th>包裹状态</th><th>关联状态</th><th>到站时间</th></tr></thead>
      <tbody>
        <tr><td class="mono">RK20261122003</td><td class="mono">YT000555666777</td><td>B-2</td><td><span class="status-badge">待取件</span></td><td>已关联</td><td class="mono">2026-11-22 10:12</td></tr>
        <tr><td class="mono">RK20261122002</td><td class="mono">JD000987654321</td><td>A-1</td><td><span class="status-badge neutral">已取件</span></td><td>已关联</td><td class="mono">2026-11-21 16:40</td></tr>
        <tr><td class="mono">RK20261122001</td><td class="mono">SF000123456789</td><td>A-3</td><td><span class="status-badge">待取件</span></td><td>待关联</td><td class="mono">2026-11-22 09:05</td></tr>
      </tbody>
    </table></div>
    ${pagination(3)}
  </section>`;
}

function intakePage() {
  return pageHeading(pages.intake, "录入面单信息，先按快递公司＋运单号查重，再由系统匹配账号并生成取件码。") + intakeForm() + `<div style="height:22px"></div>` + recentIntakeList();
}

function duplicateDialog() {
  return `<div class="overlay"></div><div class="dialog-wrap"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="duplicate-title">
    <div class="dialog-icon">${icon("alert")}</div>
    <h2 id="duplicate-title">已存在未办结记录</h2>
    <p>该快递公司下已存在运单号SF000123456789的包裹（状态：待取件，到站时间：2026-11-22 09:05），请核对是否为同一包裹。</p>
    <dl class="detail-grid">
      <div><dt>入库记录编号（DATA-002-06）</dt><dd class="mono">RK20261122001</dd></div>
      <div><dt>归属账号</dt><dd>待关联，暂不向学生展示</dd></div>
    </dl>
    <div class="info-card warning"><p>同公司同号最多一条未办结记录。核对为同一包裹则结束登记；即使核对为不同包裹也不新增，须先核对或更正已有记录。</p></div>
    <div class="actions-row">
      <button class="button button-secondary" type="button" data-route="correction">转记录更正</button>
      <button class="button button-primary" type="button" data-action="confirm-duplicate">确认为同一包裹</button>
    </div>
    <p class="dialog-meta">UI-002-02 · FUNC-002-01 · 查重处置不绕过保存前复核</p>
  </section></div>`;
}

function intakeSuccessPage() {
  return pageHeading(pages["intake-success"], "保存成功后展示取件码标签预览；本项目不设置物理打印设备，仅提供浏览器打印入口。") +
    `<div class="info-card"><div class="info-card__title">${icon("check")}入库保存成功</div><p>运单号：YT000555666777已入库，取件码：001234，存放位置：B-2。未匹配到唯一学生账号时另提示“已入库并标记待关联，暂不向学生展示”。</p></div>
    <div class="form-layout" style="margin-top:22px">
      <section class="form-card">
        <h2>取件码标签预览</h2>
        <div class="label-preview" aria-label="取件码标签合成示例">
          <span class="eyebrow">CampusDelivery Station</span>
          <div class="label-preview__code">001234</div>
          <dl>
            <dt>快递公司</dt><dd>圆通速递</dd>
            <dt>运单号</dt><dd class="mono">YT000555666777</dd>
            <dt>存放位置</dt><dd>B-2</dd>
            <dt>收件人</dt><dd>示例学生</dd>
            <dt>到站时间</dt><dd class="mono">2026-11-22 10:12</dd>
          </dl>
        </div>
        <p class="inline-note">取件码为合成示例；长度、字符范围及生成方式待P002-01评审。不定义专用纸张版式。</p>
        <div class="actions-row" style="margin-top:18px">
          <button class="button button-secondary" type="button" data-action="print-label">${icon("print")}浏览器打印</button>
          <button class="button button-primary" type="button" data-route="intake">继续入库</button>
        </div>
      </section>
      <aside class="side-panel"><h3>连续入库</h3><p>继续入库保留快递公司与存放位置，清空运单号、收件人和收件手机号。</p><ul class="rule-list"><li>${icon("check")}一次提交只生成一条记录与一个取件码</li><li>${icon("check")}重新入库引用原入库记录编号并另生成新码</li><li>${icon("check")}补关联不改变到站时间与取件码</li></ul></aside>
    </div>`;
}

/* FUNC-002-02 补关联 */
function pendingRows() {
  return `<tr><td class="mono">RK20261122001</td><td>顺丰速运</td><td class="mono">SF000123456789</td><td>示例学生</td><td class="mono">13800000001</td><td>A-3</td><td class="mono">2026-11-22 09:05</td><td><div class="row-actions"><button class="button-text" type="button" data-action="open-link">补关联</button></div></td></tr>
  <tr><td class="mono">RK20261121008</td><td>中通快递</td><td class="mono">ZT000111222333</td><td>示例收件人</td><td class="mono">13700000007</td><td>C-1</td><td class="mono">2026-11-21 15:26</td><td><div class="row-actions"><button class="button-text" type="button" data-action="open-link">补关联</button></div></td></tr>`;
}

function linkingPage(mismatch) {
  const page = pages[mismatch ? "linking-mismatch" : "linking"];
  const list = demoState === "normal" ? `<div class="table-scroll"><table class="data-table">
      <thead><tr><th>入库记录编号</th><th>公司</th><th>运单号</th><th>收件人</th><th>收件手机号</th><th>位置</th><th>到站时间</th><th>操作</th></tr></thead>
      <tbody>${pendingRows()}</tbody></table></div>${pagination(2)}` : listStateBlock("没有符合条件的待关联包裹。");
  const drawer = `<div class="overlay"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="link-title">
    <div class="drawer-header"><div><h2 id="link-title">补关联核对</h2><span class="function-tag">目标入库记录RK20261122001（DATA-002-01）</span></div><button class="icon-button" type="button" data-route="linking" aria-label="关闭">${icon("close")}</button></div>
    <div class="drawer-body">
      <dl class="detail-grid"><div><dt>包裹状态</dt><dd>待取件</dd></div><div><dt>账号关联状态（DATA-002-14）</dt><dd>待关联</dd></div><div><dt>收件手机号（DATA-003-03）</dt><dd class="mono">13800000001</dd></div><div><dt>取件码</dt><dd class="mono">009876</dd></div></dl>
      <form id="link-form" novalidate>
        ${field("目标学生账号（学号）", "DATA-001-01 · 归属只保存账号ID", `<input name="account" id="link-account" value="${mismatch ? "00120002" : "00120001"}" autocomplete="off">`)}
        <div class="identity-card"><div class="identity-card__title"><strong>账号核对结果</strong><span class="status-badge ${mismatch ? "warning" : ""}">${mismatch ? "手机号不一致" : "可建立归属"}</span></div>
          <dl class="identity-grid"><div><dt>账号姓名</dt><dd>${mismatch ? otherStudent.name : student.name}</dd></div><div><dt>绑定手机号</dt><dd class="mono">${mismatch ? otherStudent.phone : student.phone}</dd></div><div><dt>关联方式（DATA-002-15）</dt><dd>人工补关联</dd></div></dl>
        </div>
        ${mismatch ? `<div class="form-alert" role="alert">${icon("alert")}<div><strong>不能确认补关联</strong><p>收件手机号与账号绑定手机号不一致，请核对后再办理；如包裹信息有误请先更正记录。</p></div></div>` : `<p class="inline-note">确认后写入归属账号、关联方式、补关联操作人（DATA-002-17）与关联建立时间（DATA-002-16），该包裹立即在FUNC-003-01对学生可见。</p>`}
        <div class="drawer-footer"><button class="button button-secondary" type="button" data-route="correction">先更正记录</button><button class="button button-primary" type="submit" ${mismatch ? "disabled" : ""}>确认补关联</button></div>
      </form>
      <section class="detail-section"><h3>关联历史</h3><ul class="history-list"><li>入库自动匹配：未命中唯一账号，标记待关联<small class="mono">2026-11-22 09:05 · 系统</small></li></ul></section>
    </div>
  </aside>`;
  return pageHeading(page, "默认只列待关联且待取件包裹，按到站时间升序；已关联或其他状态不提供补关联入口。") +
    `<section class="filter-card"><div class="filter-grid">
      <div class="field"><label for="link-keyword">关键词</label><input id="link-keyword" value="SF000123456789"><span class="data-ref">DATA-002-48 · 运单号/手机号/收件人</span></div>
      <div class="field"><label for="link-from">到站时间起</label><input id="link-from" type="date" value="2026-11-21"><span class="data-ref">DATA-002-47 · 端点待P002-08</span></div>
      <div class="field"><label for="link-to">到站时间止</label><input id="link-to" type="date" value="2026-11-22"><span class="data-ref">与起始成对填写</span></div>
      <div class="field"><span class="field-label">关联状态</span><p class="inline-note">固定为“待关联”（DATA-002-49）</p></div>
    </div><div class="filter-footer"><button class="button button-secondary" type="button" data-action="search">${icon("search")}查询</button></div></section>
    <section class="list-card"><div class="list-toolbar"><strong>待关联包裹</strong><span class="list-count">到站时间升序</span></div>${list}</section>${drawer}`;
}

/* FUNC-002-03 退件 */
function returnList() {
  return `<div class="table-scroll"><table class="data-table">
    <thead><tr><th>入库记录编号</th><th>拒收申请编号</th><th>运单号</th><th>拒收原因</th><th>拒收时间</th><th>状态</th><th>操作</th></tr></thead>
    <tbody><tr><td class="mono">RK20261121006</td><td class="mono">JS20261121002</td><td class="mono">JD000444555666</td><td>学生拒收</td><td class="mono">2026-11-21 18:20</td><td><span class="status-badge warning">拒收待退件</span></td><td><div class="row-actions"><button class="button-text" type="button" data-route="return-start">开始退件</button></div></td></tr></tbody>
  </table></div>${pagination(1)}`;
}

function inReturnList(record) {
  const returnInfo = record?.returnInfo ?? {
    id: "TJ20261122001", source: "人工异常", destination: "退回原快递公司", startedAt: "2026-11-22 09:50"
  };
  const recordAttribute = record ? ` data-record-id="${record.id}"` : "";
  return `<div class="table-scroll"><table class="data-table">
    <thead><tr><th>退件记录编号</th><th>来源</th><th>运单号</th><th>退回去向</th><th>开始退件时间</th><th>状态</th><th>操作</th></tr></thead>
    <tbody><tr><td class="mono">${returnInfo.id}</td><td>${returnInfo.source}</td><td class="mono">${record?.tracking ?? "ZT000111222333"}</td>
      <td>${returnInfo.destination}</td><td class="mono">${returnInfo.startedAt}</td><td><span class="status-badge warning">退件中</span></td>
      <td><div class="row-actions"><button class="button-text" type="button" data-action="finish-return"${recordAttribute}>完成登记</button></div></td></tr></tbody>
  </table></div>`;
}

function returnsPage(record, requestedRecordId) {
  if (requestedRecordId) {
    const canContinue = record?.status === "退件中" && record.returnInfo;
    const back = `<button class="button button-secondary" type="button" data-route="${record ? `record-detail/${record.id}` : "records"}">${record ? "返回记录详情" : "返回记录查询"}</button>`;
    return pageHeading(pages.returns, canContinue ? `继续办理入库记录${record.id}的退件。` : "该记录当前没有可继续办理的退件。", back) +
      (canContinue ? `<section class="list-card"><div class="list-toolbar"><strong>退件中</strong></div>${inReturnList(record)}</section>` : "");
  }
  return pageHeading(pages.returns, "来源由入口确定：学生拒收须拒收待退件且当前申请有效；人工异常仅适用于待取件包裹，可无拒收申请。") +
    `<div class="tabs" role="tablist" aria-label="退件发起入口"><button class="tab" role="tab" aria-selected="true" type="button">学生拒收</button><button class="tab" role="tab" aria-selected="false" type="button" data-route="return-manual">人工发起</button></div>
    <section class="list-card"><div class="list-toolbar"><strong>待退件｜学生拒收</strong><span class="list-count">拒收申请由REQ-003维护，本页只读</span></div>${demoState === "normal" ? returnList() : listStateBlock("没有符合条件的待退件包裹。")}</section>
    <div style="height:22px"></div>
    <section class="list-card"><div class="list-toolbar"><strong>退件中</strong><span class="list-count">沿用同一退件记录，可多次返回继续办理</span></div>${inReturnList()}</section>`;
}

function returnStartPage() {
  const drawer = `<div class="overlay"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="return-title">
    <div class="drawer-header"><div><h2 id="return-title">开始退件</h2><span class="function-tag">入库记录RK20261121006（DATA-002-01）</span></div><button class="icon-button" type="button" data-route="returns" aria-label="关闭">${icon("close")}</button></div>
    <div class="drawer-body">
      <dl class="detail-grid"><div><dt>退件来源（DATA-002-29）</dt><dd>学生拒收 · 系统按入口确定</dd></div><div><dt>当前拒收申请（DATA-003-10）</dt><dd class="mono">JS20261121002</dd></div><div><dt>包裹状态（DATA-003-05）</dt><dd>拒收待退件</dd></div><div><dt>运单号</dt><dd class="mono">JD000444555666</dd></div></dl>
      <div class="info-card warning"><p>办理前核对包裹实物、收件信息与退件原因；不一致时先按记录更正办理。开始退件后学生不可撤回。</p></div>
      <form id="return-form" data-tracking="JD000444555666" novalidate>
        ${field("退件原因", "DATA-002-30 · 学生拒收来源默认学生拒收，可按实际改选", `<select name="reason" id="return-reason"><option>学生拒收</option><option>包装破损</option><option>面单信息不全或污损</option><option>错分错投</option><option>违禁品或无法投递</option><option>其他</option></select>`)}
        ${field("退回去向", "DATA-002-32 · 取值待P002-02评审", `<select name="destination"><option>退回原快递公司</option><option>退回寄件人</option></select>`)}
        <div class="field"><label for="return-note">退件原因说明</label><textarea id="return-note" placeholder="原因为“其他”时必填（DATA-002-31）"></textarea><span class="data-ref">原因为其他时必填</span></div>
        <div class="drawer-footer"><button class="button button-secondary" type="button" data-route="returns">取消</button><button class="button button-primary" type="submit">确认开始退件</button></div>
      </form>
    </div>
  </aside>`;
  return returnsPage() + drawer;
}

function returnManualPage() {
  const drawer = `<div class="overlay"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="manual-return-title">
    <div class="drawer-header"><div><h2 id="manual-return-title">人工异常退件</h2><span class="function-tag">入库记录RK20261122001（DATA-002-01）</span></div><button class="icon-button" type="button" data-route="returns" aria-label="关闭">${icon("close")}</button></div>
    <div class="drawer-body">
      <div class="filter-card"><div class="field"><label for="manual-keyword">运单号或收件手机号</label><input id="manual-keyword" value="SF000123456789" readonly><span class="data-ref">检索待取件包裹后选择，含待关联</span></div></div>
      <dl class="detail-grid"><div><dt>退件来源（DATA-002-29）</dt><dd>人工异常 · 系统按入口确定</dd></div><div><dt>拒收申请</dt><dd>无，允许缺失</dd></div><div><dt>包裹状态（DATA-003-05）</dt><dd>待取件</dd></div><div><dt>账号关联状态</dt><dd>待关联，无须先补关联</dd></div></dl>
      <form id="return-form" data-tracking="SF000123456789" novalidate>
        ${field("退件原因", "DATA-002-30 · 人工异常不得选择学生拒收", `<select name="reason" id="return-reason"><option>错分错投</option><option>包装破损</option><option>面单信息不全或污损</option><option>违禁品或无法投递</option><option>其他</option></select>`)}
        ${field("退回去向", "DATA-002-32 · 取值待P002-02评审", `<select name="destination"><option>退回原快递公司</option><option>退回寄件人</option></select>`)}
        <div class="field"><label for="return-note">退件原因说明</label><textarea id="return-note" placeholder="原因为“其他”时必填（DATA-002-31）"></textarea><span class="data-ref">原因为其他时必填</span></div>
        <div class="drawer-footer"><button class="button button-secondary" type="button" data-route="returns">取消</button><button class="button button-primary" type="submit">确认开始退件</button></div>
      </form>
    </div>
  </aside>`;
  return returnsPage() + drawer;
}

/* FUNC-002-04 更正 */
function recordCorrectionHistory(record) {
  const correction = record.correction;
  return correction ? `<li>更正字段：${correction.field}；更正人：${correction.operator}<small class="mono">${correction.at} · DATA-002-44/45</small></li>` : "<li>无更正记录</li>";
}

function correctionPage(closed, selectedRecord, requestedRecordId) {
  const page = pages[closed ? "correction-closed" : "correction"];
  if (requestedRecordId && !selectedRecord) return pageHeading(page, "未找到该记录。", `<button class="button button-secondary" type="button" data-route="records">返回记录查询</button>`);
  const record = selectedRecord ?? records[closed ? 2 : 0];
  const formAttributes = selectedRecord ? ` data-record-id="${record.id}"` : "";
  const back = selectedRecord ? `<button class="button button-secondary" type="button" data-route="record-detail/${record.id}">返回记录详情</button>` : "";
  const form = closed ? `<form class="form-card" id="correction-form"${formAttributes} novalidate>
      <div class="info-card warning"><div class="info-card__title">${icon("info")}该记录已完成</div><p>已取件、已退件记录保留原内容，只能追加更正说明；不提供字段修改入口，不转移归属。</p></div>
      <dl class="detail-grid" style="margin-top:20px"><div><dt>入库记录编号</dt><dd class="mono">${record.id}</dd></div><div><dt>运单号</dt><dd class="mono">${record.tracking}</dd></div><div><dt>更正方式（DATA-002-39）</dt><dd>追加更正说明</dd></div><div><dt>记录是否已完成（DATA-002-38）</dt><dd>是 · ${record.status}</dd></div><div><dt>归属账号</dt><dd class="mono">${record.account}</dd></div></dl>
      ${field("更正原因", "DATA-002-42", `<input name="reason" value="${selectedRecord ? "" : "面单手机号誊写有误，补充说明"}" autocomplete="off">`)}
      <div class="field field-full"><label for="correction-note">更正说明<span class="required" aria-hidden="true">*</span></label><textarea id="correction-note" name="note">${selectedRecord ? "" : "实际面单收件手机号与记录一致，学生已完成自助取件；本次仅补充核对说明。"}</textarea><span class="data-ref">DATA-002-43 · 只追加，不改原业务结果</span></div>
      <div class="form-footer"><button class="button button-primary" type="submit">保存更正说明</button></div>
    </form>` : `<form class="form-card" id="correction-form"${formAttributes} novalidate>
      <div class="form-grid">
        ${field("更正对象类型", "DATA-002-37", `<select name="objectType" ${selectedRecord ? "disabled" : ""}><option>入库记录</option><option>退件记录</option></select>`)}
        ${field("更正对象编号", "DATA-002-07 · 定位待更正记录", `<input name="objectId" value="${record.id}" autocomplete="off" ${selectedRecord ? "readonly" : ""}>`)}
        ${field("更正字段", "DATA-002-40 · 不允许直接修改包裹状态", `<select name="fieldName" id="correction-field"><option value="phone">收件手机号</option><option value="tracking">运单号</option><option value="location">存放位置名称</option></select>`)}
        ${field("更正后内容", "按更正字段引用DATA-003-03等原定义", `<input name="newValue" id="correction-value" value="${selectedRecord ? "" : otherStudent.phone}" autocomplete="off">`)}
        ${field("更正原因", "DATA-002-42", `<input name="reason" value="${selectedRecord ? "" : "入库时收件手机号录错"}" autocomplete="off">`, true)}
      </div>
      <div class="snapshot-compare">
        <section class="snapshot-box"><h4>更正前内容快照（DATA-002-41）</h4><dl><dt>归属账号</dt><dd class="mono">${record.account ?? "待关联（允许缺失）"}</dd><dt>运单号</dt><dd class="mono">${record.tracking}</dd><dt>收件手机号</dt><dd class="mono">${record.phone}</dd><dt>存放位置</dt><dd>${record.location}</dd></dl></section>
        ${selectedRecord ? "" : `<section class="snapshot-box new"><h4>按新号码重新匹配</h4><dl><dt>匹配结果</dt><dd class="mono">${otherStudent.account} · ${otherStudent.name}</dd><dt>归属变化</dt><dd>待关联 → ${otherStudent.account}</dd><dt>学生可见性</dt><dd>入库后对${otherStudent.name}可见</dd></dl></section>`}
      </div>
      <p class="inline-note">快照字段为P002-09建议最小范围，具体结构待数据库设计确认；更正运单号时须重新查重，命中其他未办结记录则阻止保存。</p>
      <div class="form-footer"><button class="button button-primary" type="submit">保存更正</button></div>
    </form>`;
  return `<div class="correction-page">` + pageHeading(page, closed ? "已完成记录仅追加说明，原状态、归属及完成时间保持。" : "先定位记录并核对是否已完成，再选择更正字段；保存时留痕操作人与时间。", back) + form +
    `<div style="height:16px"></div><section class="list-card"><div class="list-toolbar"><strong>更正留痕</strong><span class="list-count">按更正时间倒序 · 不可删除</span></div><ul class="history-list" style="padding:0 20px 12px">${recordCorrectionHistory(record)}</ul></section></div>`;
}

/* FUNC-002-05 查询 */
function recordRows() {
  return records.map(record => {
    const statusStyle = isRecordClosed(record) ? " neutral" : record.status === "退件中" ? " warning" : "";
    return `<tr><td class="mono">${record.id}</td><td>${record.company}</td><td class="mono">${record.tracking}</td><td>${record.receiver}</td>
      <td class="mono">${record.phone}</td><td>${record.location}</td><td><span class="status-badge${statusStyle}">${record.status}</span></td>
      <td>${record.account ? "已关联" : "待关联"}</td><td class="mono">${record.arrivedAt}</td>
      <td><div class="row-actions"><button class="button-text" type="button" data-action="record-detail" data-record-id="${record.id}">详情</button></div></td></tr>`;
  }).join("");
}

function recordDetail(record, admin) {
  const closed = isRecordClosed(record);
  const returnInfo = record.returnInfo;
  const canContinue = record.status === "退件中" && returnInfo;
  const actions = admin ? "" : `<div class="drawer-footer">
      <button class="button ${canContinue ? "button-secondary" : "button-primary"}" type="button" data-route="${closed ? "correction-closed" : "correction"}/${record.id}">${closed ? "追加说明" : "记录更正"}</button>
      ${canContinue ? `<button class="button button-primary" type="button" data-route="returns/${record.id}">继续退件办理</button>` : ""}
    </div>`;
  return `<div class="overlay"></div><aside class="drawer record-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="record-title">
    <div class="drawer-header"><div><h2 id="record-title">记录详情</h2><span class="function-tag">${record.id} · ${admin ? "只读" : record.status}</span></div><button class="icon-button" type="button" data-route="${admin ? "records-admin" : "records"}" aria-label="关闭">${icon("close")}</button></div>
    <div class="drawer-body">
      <dl class="detail-grid">
        <div><dt>快递公司</dt><dd>${record.company}</dd></div><div><dt>运单号</dt><dd class="mono">${record.tracking}</dd></div>
        <div><dt>归属账号</dt><dd class="mono">${record.account ?? "待关联"}</dd></div><div><dt>包裹状态</dt><dd>${record.status}</dd></div>
        <div><dt>存放位置</dt><dd>${record.location}</dd></div><div><dt>到站时间</dt><dd class="mono">${record.arrivedAt}</dd></div>
      </dl>
      <section class="detail-section"><h3>退件办理情况</h3>
        ${returnInfo ? `<dl class="detail-grid">
          <div><dt>退件记录编号</dt><dd class="mono">${returnInfo.id}</dd></div><div><dt>退件来源</dt><dd>${returnInfo.source}</dd></div>
          <div><dt>退件原因</dt><dd>${returnInfo.reason}</dd></div><div><dt>退回去向</dt><dd>${returnInfo.destination}</dd></div>
          <div><dt>开始退件时间</dt><dd class="mono">${returnInfo.startedAt}</dd></div><div><dt>退件完成时间</dt><dd>${returnInfo.finishedAt ?? "未完成"}</dd></div>
        </dl>` : "<p>暂无退件记录。</p>"}
      </section>
      <section class="detail-section"><h3>更正留痕</h3><ul class="history-list">${recordCorrectionHistory(record)}</ul></section>
      ${actions}
    </div>
  </aside>`;
}

function recordsPage(route, record, unavailable) {
  const admin = route === "records-admin";
  const page = pages[route];
  const table = demoState === "normal" ? `<div class="table-scroll"><table class="data-table records-table">
      <thead><tr><th>入库记录编号</th><th>公司</th><th>运单号</th><th>收件人</th><th>收件手机号</th><th>位置</th><th>包裹状态</th><th>关联状态</th><th>到站时间</th><th>操作</th></tr></thead>
      <tbody>${recordRows()}</tbody></table></div>${pagination(records.length)}` : listStateBlock("没有符合条件的记录，请调整查询条件。");
  const detail = record && demoState === "normal" ? recordDetail(record, admin) : "";
  return pageHeading(page, admin ? "管理员只读查看全部获准记录，不显示任何办理入口。" : "查询为只读操作；办理入口仍按记录当前状态进入对应功能。", admin ? `<span class="role-badge">管理员 · 只读</span>` : "") +
    (unavailable ? `<p class="form-alert" role="alert">未找到该记录，请从清单重新选择。</p>` : "") +
    `<form class="filter-card" id="record-filter" novalidate><div class="filter-grid">
      <div class="field"><label for="record-status">包裹状态</label><select id="record-status"><option value="">不限</option><option>待取件</option><option>已取件</option><option>拒收待退件</option><option>退件中</option><option>已退件</option></select><span class="data-ref">DATA-002-46</span></div>
      <div class="field"><label for="record-link">账号关联状态</label><select id="record-link"><option value="">不限</option><option>已关联</option><option>待关联</option></select><span class="data-ref">DATA-002-49</span></div>
      <div class="field"><label for="record-from">时间范围起</label><input id="record-from" name="from" type="date" value="2026-11-21"><span class="data-ref">DATA-002-47 · 端点待P002-08</span></div>
      <div class="field"><label for="record-to">时间范围止</label><input id="record-to" name="to" type="date" value="2026-11-22"><span class="data-ref">起止成对，起不晚于止</span></div>
      <div class="field field-full"><label for="record-keyword">关键词</label><input id="record-keyword" name="keyword" value="SF000123456789" maxlength="120" autocomplete="off"><span class="data-ref">DATA-002-48 · 运单号/收件人/手机号，最长50字符，超长报错不截断查询</span></div>
    </div><div class="filter-footer"><button class="button button-primary" type="submit">${icon("search")}查询</button></div></form>
    <section class="list-card"><div class="list-toolbar"><strong>收件退件记录</strong><span class="list-count">默认按到站时间降序，可切换退件完成时间</span></div>${table}</section>${detail}`;
}

function render() {
  let route = currentRoute();
  const [, recordId] = window.location.hash.split("/");
  const record = records.find(item => item.id === recordId);
  if (route.startsWith("correction") && record) route = isRecordClosed(record) ? "correction-closed" : "correction";
  const listRoute = ["linking", "linking-mismatch", "returns", "records", "record-detail", "records-admin"].includes(route);
  if (!listRoute) demoState = "normal";
  let html;
  if (route === "intake") html = intakePage();
  else if (route === "intake-duplicate") html = intakePage() + duplicateDialog();
  else if (route === "intake-success") html = intakeSuccessPage();
  else if (route === "linking") html = linkingPage(false);
  else if (route === "linking-mismatch") html = linkingPage(true);
  else if (route === "returns") html = returnsPage(record, recordId);
  else if (route === "return-start") html = returnStartPage();
  else if (route === "return-manual") html = returnManualPage();
  else if (route.startsWith("correction")) html = correctionPage(route === "correction-closed", record, recordId);
  else if (route === "records") html = recordsPage(route);
  else html = recordsPage(route, route === "record-detail" && !recordId ? records[1] : record, Boolean(recordId && !record));
  document.getElementById("app").innerHTML = shell(route, html);
  document.title = `${pages[route].ui} ${pages[route].title}｜REQ-002原型`;
  const picker = document.getElementById("page-picker");
  picker.value = route;
  const statePicker = document.getElementById("state-picker");
  statePicker.disabled = !listRoute;
  statePicker.value = demoState;
  statePicker.title = listRoute ? "切换清单的加载、无数据和请求失败状态" : "公共清单状态请在补关联、退件或查询页查看";
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
  const container = input.closest(".field");
  container?.querySelectorAll(".field-error.dynamic-error").forEach(error => error.remove());
  input.removeAttribute("aria-invalid");
  if (!message) return;
  input.setAttribute("aria-invalid", "true");
  const error = document.createElement("p");
  error.className = "field-error dynamic-error";
  error.id = `${input.id}-dynamic-error`;
  error.setAttribute("role", "alert");
  error.innerHTML = `${icon("alert")}<span></span>`;
  error.querySelector("span").textContent = message;
  input.setAttribute("aria-describedby", error.id);
  container?.appendChild(error);
}

function submitWithFeedback(form, callback) {
  const button = form.querySelector('[type="submit"]');
  if (button) { button.disabled = true; button.dataset.originalText = button.textContent; button.textContent = "正在提交…"; }
  setTimeout(() => {
    if (!form.isConnected) return;
    if (button) { button.disabled = false; button.textContent = button.dataset.originalText; }
    callback();
  }, 450);
}

function handleIntake(form) {
  const company = form.elements.company;
  const tracking = form.elements.tracking;
  const receiver = form.elements.receiver;
  const phone = form.elements.phone;
  let valid = true;
  [[tracking, "请填写运单号。"], [receiver, "请填写收件人姓名。"], [phone, "请填写收件手机号。"]].forEach(([input, message]) => {
    if (!input.value) { setFieldError(input, message); valid = false; } else setFieldError(input, "");
  });
  if (tracking.value !== tracking.value.trim()) { setFieldError(tracking, "运单号已去首尾空白，不得只含空白字符。"); valid = false; }
  if (phone.value && !/^1\d{10}$/.test(phone.value)) { setFieldError(phone, "收件手机号应为11位中国大陆手机号。"); valid = false; }
  if (!valid) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
  const key = `${company.value}|${tracking.value.trim()}`;
  if (key === "顺丰速运|SF000123456789") { window.location.hash = "intake-duplicate"; showToast("命中未办结记录，请先核对，不新增入库。"); return; }
  submitWithFeedback(form, () => { window.location.hash = "intake-success"; });
}

function handleLink(form) {
  const account = form.elements.account;
  if (!account.value) { setFieldError(account, "请填写目标学生账号。"); account.focus(); return; }
  if (account.value !== student.account) { window.location.hash = "linking-mismatch"; return; }
  submitWithFeedback(form, () => showToast("运单号SF000123456789已关联至账号00120001（姓名：示例学生），该包裹现可被学生查询。"));
}

function handleReturn(form) {
  const reason = form.elements.reason;
  const note = form.querySelector("#return-note");
  if (reason.value === "其他" && !note.value.trim()) { setFieldError(note, "退件原因为其他时须填写说明。"); note.focus(); return; }
  setFieldError(note, "");
  submitWithFeedback(form, () => { window.location.hash = "returns"; showToast(`运单号${form.dataset.tracking}已开始退件，包裹状态：退件中，学生端已暂停取件。`); });
}

function handleCorrection(form) {
  const reason = form.elements.reason;
  if (!reason.value.trim()) { setFieldError(reason, "请填写更正原因。"); reason.focus(); return; }
  const fieldInput = form.elements.fieldName;
  const value = form.elements.newValue;
  const record = records.find(item => item.id === form.dataset.recordId);
  if (fieldInput && value) {
    if (!value.value.trim()) { setFieldError(value, "请填写更正后内容。"); value.focus(); return; }
    if (fieldInput.value === "phone" && !/^1\d{10}$/.test(value.value)) { setFieldError(value, "收件手机号应为11位中国大陆手机号。"); value.focus(); return; }
    if (fieldInput.value === "tracking") {
      const tracking = value.value.trim();
      const duplicate = record
        ? records.find(item => item.id !== record.id && item.company === record.company && item.tracking === tracking && !isRecordClosed(item))
        : tracking === records[0].tracking ? records[0] : null;
      if (duplicate) { setFieldError(value, `更正后运单号与该快递公司已有记录重复（入库记录编号：${duplicate.id}），请先核对。`); value.focus(); return; }
    }
  }
  const note = form.elements.note;
  if (record && note) {
    const missingNote = !note.value.trim();
    setFieldError(note, missingNote ? "请填写更正说明。" : "");
    if (missingNote) { note.focus(); return; }
  }
  const fieldLabel = fieldInput?.selectedOptions[0].textContent;
  const result = fieldInput
    ? `入库记录${record?.id ?? records[0].id}已更正，更正字段：${fieldLabel}，更正人：示例工作人员。`
    : `入库记录${record?.id ?? records[2].id}已追加更正说明，原业务结果未改变。`;
  submitWithFeedback(form, () => showToast(result));
}

function handleRecordFilter(form) {
  const from = form.elements.from.value;
  const to = form.elements.to.value;
  const keyword = form.elements.keyword;
  if ((from && !to) || (!from && to)) { showToast("时间范围起止须成对填写。"); return; }
  if (from && to && from > to) { showToast("起始时间不能晚于结束时间。"); return; }
  if (keyword.value.length > 50) { setFieldError(keyword, "关键词最长50个字符，请缩短后再查询。"); keyword.focus(); return; }
  setFieldError(keyword, "");
  showToast("已按当前条件刷新列表；查询不修改业务数据，条件不持久保存。");
}

document.addEventListener("click", event => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) { window.location.hash = routeButton.dataset.route; return; }
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.action;
  if (action === "check-duplicate") {
    const form = document.getElementById("intake-form");
    if (form.elements.tracking.value.trim() === "SF000123456789" && form.elements.company.value === "顺丰速运") window.location.hash = "intake-duplicate";
    else showToast("未命中未办结记录，可继续登记；保存前仍会复核。");
  }
  if (action === "confirm-duplicate") { window.location.hash = "intake"; showToast("已确认为重复包裹，未新增入库记录。"); }
  if (action === "print-label") showToast("标签仅作页面预览与浏览器打印，不设置物理打印设备或专用纸张版式。");
  if (action === "open-link") window.location.hash = "linking";
  if (action === "finish-return") {
    const selected = records.find(record => record.id === actionButton.dataset.recordId);
    const prefix = selected ? `退件记录${selected.returnInfo.id}（运单号${selected.tracking}）` : "退件";
    showToast(`${prefix}已完成登记，完成时间：2026-11-22 10:30，办理人：示例工作人员；重复提交不改写完成事实。`);
  }
  if (action === "record-detail") {
    const detailRoute = currentRoute() === "records-admin" ? "records-admin" : "record-detail";
    window.location.hash = `${detailRoute}/${actionButton.dataset.recordId}`;
  }
  if (action === "search") showToast("已按当前条件刷新待关联清单。");
  if (action === "retry") { demoState = "normal"; render(); }
});

document.addEventListener("submit", event => {
  event.preventDefault();
  const form = event.target;
  if (form.id === "intake-form") handleIntake(form);
  if (form.id === "link-form") handleLink(form);
  if (form.id === "return-form") handleReturn(form);
  if (form.id === "correction-form") handleCorrection(form);
  if (form.id === "record-filter") handleRecordFilter(form);
});

const picker = document.getElementById("page-picker");
exportRoutes.forEach(route => {
  const option = document.createElement("option");
  option.value = route;
  option.textContent = `${pages[route].ui} ${pages[route].title}`;
  picker.appendChild(option);
});
picker.addEventListener("change", () => { window.location.hash = picker.value; });
document.getElementById("state-picker").addEventListener("change", event => { demoState = event.target.value; render(); });
document.getElementById("reset-prototype").addEventListener("click", () => { demoState = "normal"; window.location.hash = "intake"; render(); });
window.addEventListener("hashchange", render);
render();
