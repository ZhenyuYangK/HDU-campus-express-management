"use strict";

const VERSION = "2026-11-24";
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
const initialRecords = demoInitialIntakes;
const intakeExample = demoIntakeExample;
const returnDemo = demoReturn;
const recordSearches = new Map();
const emptyRecordFilters = { status: "", association: "", from: "", to: "", keyword: "" };
const pageSize = 20;
let intakeDraft;
let duplicateTrigger = '[data-action="check-duplicate"]';
let restoreIntakeFocus = false;
let demoState = "normal";
let toastTimer;

function icon(name) {
  return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

function currentRoute() {
  const route = window.location.hash.slice(1).split("/")[0];
  return Object.hasOwn(pages, route) ? route : "intake";
}

function isRecordClosed(record) {
  return record.status === "已取件" || record.status === "已退件";
}

function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, character => entities[character]);
}

function findRecord(id) {
  return demoPackageRecord(id);
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

function shell(route, content) {
  const page = pages[route];
  const isAdmin = page.role === "管理员";
  const role = isAdmin ? "admin" : "staff";
  const current = isAdmin ? route : route.startsWith("linking") ? "linking/list"
    : route.startsWith("return") ? "returns" : route.startsWith("correction") ? "correction"
    : route.startsWith("intake") ? "intake" : "records";
  const account = demoAccountId(isAdmin ? "管理员" : "工作人员");
  const displayName = escapeHtml(demoData.accounts[account].name);
  return `<div class="app-shell">
    <aside class="sidebar" aria-label="功能导航">${roleBrand(role, brandLogo)}${roleNavigation(role, current, icon)}</aside>
    <section class="workspace">
      <header class="app-topbar"><div class="breadcrumb"><span>工作台</span>${icon("chevron")}<span>收件与退件</span></div>
        <div class="user-chip"><span class="user-avatar" aria-hidden="true">${isAdmin ? "管" : "员"}</span><div class="user-meta"><strong>${displayName}</strong><span>${account} · ${page.role}</span></div></div>
      </header>
      <main class="main-content" id="main" tabindex="-1">${content}</main>
      ${metaFooter(page)}
    </section>
  </div>`;
}

function companyOptions(selected) {
  return demoData.companies.map(({ id, name }) =>
    `<option value="${id}"${id === selected ? " selected" : ""}>${escapeHtml(name)}</option>`).join("");
}

function locationOptions(selected) {
  return fixedLocationGroups.map(({ zone, locations }) => `<optgroup label="${zone}区">${locations.map(location => `<option${location === selected ? " selected" : ""}>${location}</option>`).join("")}</optgroup>`).join("");
}

function field(label, ref, control, full = false) {
  return `<div class="field${full ? " field-full" : ""}"><label>${label}<span class="required" aria-hidden="true">*</span></label>${control}<span class="data-ref">${ref}</span></div>`;
}

function listStateBlock(message, state = demoState) {
  if (state === "loading") {
    return `<div class="skeleton-wrap" role="status" aria-label="清单加载中"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>`;
  }
  if (state === "empty") {
    return `<div class="empty-state"><div class="empty-state__inner"><div class="empty-state__icon">${icon("box")}</div><h2>没有符合条件的记录</h2><p>${message}</p></div></div>`;
  }
  return `<div class="state-error" role="alert"><p>清单加载失败，请重试。</p><button class="button button-secondary" type="button" data-action="retry">${icon("refresh")}重新加载</button></div>`;
}

function pagination(total, page = 1) {
  const pageCount = Math.ceil(total / pageSize);
  const previous = pageCount > 1 ? `<button class="button button-secondary" type="button" data-action="record-page" data-page="${page - 1}" ${page === 1 ? "disabled" : ""}>上一页</button>` : "";
  const next = pageCount > 1 ? `<button class="button button-secondary" type="button" data-action="record-page" data-page="${page + 1}" ${page === pageCount ? "disabled" : ""}>下一页</button>` : "";
  return `<div class="list-footer"><span>共${total}条 · 每页${pageSize}条 · page从1开始</span><div class="pagination">${previous}<span class="page-number" aria-current="page">${page}</span>${next}</div></div>`;
}

/* FUNC-002-01 收件入库 */
function intakeForm() {
  const draft = intakeDraft ?? initialRecords[0];
  return `<form class="form-card" id="intake-form" novalidate>
    <div class="form-grid">
      ${field("快递公司", "DATA-001-11 · 引用REQ-001有效清单，不手工新增", `<select name="company" id="intake-company">${companyOptions(draft.company)}</select>`)}
      ${field("运单号", "DATA-003-01 · 去首尾空白，与公司组合查重", `<input name="tracking" id="intake-tracking" value="${escapeHtml(draft.tracking)}" autocomplete="off">`)}
      ${field("收件人姓名", "DATA-003-02 · 仅辅助核对，不参与账号匹配", `<input name="receiver" id="intake-receiver" value="${escapeHtml(draft.receiver)}" autocomplete="off">`)}
      ${field("收件手机号", "DATA-003-03 · 11位，用于匹配账号", `<input name="phone" id="intake-phone" value="${escapeHtml(draft.phone)}" inputmode="numeric" autocomplete="off">`)}
      ${field("存放位置", `DATA-001-12 · 固定${fixedLocations.length}层位`, `<select name="location" id="intake-location">${locationOptions(draft.location)}</select>`)}
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
  const recent = demoRecords()
    .sort((a, b) => b.arrivedAt.localeCompare(a.arrivedAt))
    .slice(0, 3);
  const rows = recent.map(record => `<tr><td class="mono">${record.id}</td><td class="mono">${escapeHtml(record.tracking)}</td><td>${record.location}</td>
    <td><span class="status-badge${isRecordClosed(record) ? " neutral" : ""}">${record.status}</span></td>
    <td>${record.account ? "已关联" : "待关联"}</td><td class="mono time-cell">${record.arrivedAt}</td></tr>`).join("");
  return `<section class="list-card" aria-label="最近入库记录">
    <div class="list-toolbar"><strong>最近入库记录</strong><span class="list-count">按到站时间降序 · 合成示例</span></div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>入库记录编号</th><th>运单号</th><th>位置</th><th>包裹状态</th><th>关联状态</th><th>到站时间</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    ${pagination(recent.length)}
  </section>`;
}

function intakePage() {
  return pageHeading(pages.intake, "录入面单信息，先按快递公司＋运单号查重，再由系统匹配账号并生成取件码。") + intakeForm() + `<div style="height:22px"></div>` + recentIntakeList();
}

function duplicateDialog(record) {
  if (!record) return `<p class="form-alert" role="alert">未找到查重命中的记录，请重新查重。</p>`;
  return `<dialog class="dialog duplicate-dialog" aria-labelledby="duplicate-title">
    <div class="dialog-icon">${icon("alert")}</div>
    <h2 id="duplicate-title">已存在未办结记录</h2>
    <p>该快递公司下已存在运单号${escapeHtml(record.tracking)}的包裹（状态：${record.status}，到站时间：${record.arrivedAt}），请核对是否为同一包裹。</p>
    <dl class="detail-grid">
      <div><dt>入库记录编号（DATA-002-06）</dt><dd class="mono">${record.id}</dd></div>
      <div><dt>归属账号</dt><dd>${record.account ?? "待关联，暂不向学生展示"}</dd></div>
    </dl>
    <div class="info-card warning"><p>同公司同号最多一条未办结记录。核对为同一包裹则结束登记；即使核对为不同包裹也不新增，须先核对或更正已有记录。</p></div>
    <div class="actions-row">
      <button class="button button-text" type="button" data-action="cancel-duplicate" autofocus>返回入库</button>
      <button class="button button-secondary" type="button" data-route="correction/${record.id}">转记录更正</button>
      <button class="button button-primary" type="button" data-action="confirm-duplicate">确认为同一包裹</button>
    </div>
    <p class="dialog-meta">UI-002-02 · FUNC-002-01 · 查重处置不绕过保存前复核</p>
  </dialog>`;
}

function intakeSuccessPage(record) {
  if (!record?.pickupCode) {
    return pageHeading(pages["intake-success"], "当前演示中未找到该入库记录。", `<button class="button button-secondary" type="button" data-route="intake">返回收件入库</button>`);
  }
  const tracking = escapeHtml(record.tracking);
  const associationMessage = record.account ? "已关联学生账号。" : "已入库，待关联。暂不向学生展示。";
  const previousRecord = record.previousIntakeId ? `<p>原入库记录编号：${record.previousIntakeId}</p>` : "";
  return pageHeading(pages["intake-success"], "保存成功后展示取件码标签预览；本项目不设置物理打印设备，仅提供浏览器打印入口。") +
    `<div class="info-card intake-result"><div class="info-card__title">${icon("check")}入库保存成功</div><p>运单号：${tracking}，取件码：${record.pickupCode}，存放位置：${record.location}。${associationMessage}</p>${previousRecord}</div>
    <div class="form-layout" style="margin-top:22px">
      <section class="form-card">
        <h2>取件码标签预览</h2>
        <div class="label-preview" aria-label="取件码标签合成示例">
          <span class="eyebrow">CampusDelivery Station</span>
          <div class="label-preview__code">${record.pickupCode}</div>
          <dl>
            <dt>快递公司</dt><dd>${escapeHtml(demoCompanyName(record.company))}</dd>
            <dt>运单号</dt><dd class="mono">${tracking}</dd>
            <dt>存放位置</dt><dd>${record.location}</dd>
            <dt>收件人</dt><dd>${escapeHtml(record.receiver)}</dd>
            <dt>到站时间</dt><dd class="mono">${record.arrivedAt}</dd>
          </dl>
        </div>
        <p class="inline-note">取件码为合成示例；长度、字符范围及生成方式待P002-01评审。不定义专用纸张版式。</p>
        <div class="actions-row" style="margin-top:18px">
          <button class="button button-secondary" type="button" data-action="print-label">${icon("print")}浏览器打印</button>
          <button class="button button-primary" type="button" data-action="continue-intake" data-record-id="${record.id}">继续入库</button>
        </div>
      </section>
      <aside class="side-panel"><h3>连续入库</h3><p>继续入库保留快递公司与存放位置，清空运单号、收件人和收件手机号。</p><ul class="rule-list"><li>${icon("check")}一次提交只生成一条记录与一个取件码</li><li>${icon("check")}重新入库引用原入库记录编号并另生成新码</li><li>${icon("check")}补关联不改变到站时间与取件码</li></ul></aside>
    </div>`;
}

/* FUNC-002-02 补关联 */
function linkReview(account, matching) {
  const feedback = matching ? `<p class="inline-note">确认后建立账号归属，该包裹可在学生查询中显示。</p>` :
    `<div class="form-alert" role="alert">${icon("alert")}<div><strong>不能确认补关联</strong><p>收件手机号与账号的绑定手机号不一致。请核对账号，包裹信息有误时先更正记录。</p></div></div>`;
  return `<div class="identity-card"><div class="identity-card__title"><strong>账号核对结果</strong><span class="status-badge${matching ? "" : " warning"}">${matching ? "手机号一致" : "手机号不一致"}</span></div>
    <dl class="identity-grid"><div><dt>账号姓名</dt><dd>${escapeHtml(account.name)}</dd></div><div><dt>绑定手机号</dt><dd class="mono">${account.phone}</dd></div><div><dt>关联方式（DATA-002-15）</dt><dd>人工补关联</dd></div></dl>
  </div>${feedback}`;
}

function canLinkRecord(record) {
  return record?.status === "待取件" && !record.account;
}

function linkDrawer(record, account) {
  const matching = account.phone === record.phone;
  const accounts = demoStudentAccounts().map(option => `<option value="${option.account}"${option.account === account.account ? " selected" : ""}>${option.account} · ${escapeHtml(option.name)}</option>`).join("");
  return `<div class="overlay"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="link-title">
    <div class="drawer-header"><div><h2 id="link-title">补关联核对</h2><span class="function-tag">目标入库记录${record.id}（DATA-002-01）</span></div><button class="icon-button" type="button" data-drawer-close data-route="linking/list" aria-label="关闭">${icon("close")}</button></div>
    <div class="drawer-body">
      <dl class="detail-grid">
        <div><dt>包裹状态</dt><dd>${record.status}</dd></div><div><dt>账号关联状态（DATA-002-14）</dt><dd>待关联</dd></div>
        <div><dt>收件手机号（DATA-003-03）</dt><dd class="mono">${record.phone}</dd></div><div><dt>取件码</dt><dd class="mono">${record.pickupCode ?? "—"}</dd></div>
        <div><dt>存放位置</dt><dd>${record.location}</dd></div><div><dt>到站时间</dt><dd class="mono">${record.arrivedAt}</dd></div>
      </dl>
      <form id="link-form" data-record-id="${record.id}" novalidate>
        <div class="field"><label for="link-account">目标学生账号（学号）<span class="required" aria-hidden="true">*</span></label><select name="account" id="link-account">${accounts}</select><span class="data-ref">DATA-001-01 · 归属只保存账号ID</span></div>
        <div id="link-review" aria-live="polite">${linkReview(account, matching)}</div>
        <div class="drawer-footer"><button class="button button-secondary" type="button" data-route="correction/${record.id}/linking">先更正记录</button><button class="button button-primary" type="submit" ${matching ? "" : "disabled"}>确认补关联</button></div>
      </form>
    </div>
  </aside>`;
}

function linkingPage(record, account) {
  const search = recordSearches.get("linking");
  const filters = search?.filters ?? emptyRecordFilters;
  const candidates = filteredRecords({ ...filters, status: "待取件", association: "待关联" }).reverse();
  const resultPage = Math.min(search?.page ?? 1, Math.max(1, Math.ceil(candidates.length / pageSize)));
  const offset = (resultPage - 1) * pageSize;
  const rows = candidates.slice(offset, offset + pageSize).map(item => `<tr>
    <td class="mono">${item.id}</td><td>${escapeHtml(demoCompanyName(item.company))}</td><td class="mono">${escapeHtml(item.tracking)}</td>
    <td>${escapeHtml(item.receiver)}</td><td class="mono">${item.phone}</td><td>${item.location}</td><td class="mono time-cell">${item.arrivedAt}</td>
    <td><div class="row-actions"><button class="button-text" type="button" data-route="linking/${item.id}">补关联</button></div></td>
  </tr>`).join("");
  const list = demoState === "normal" && rows ? `<div class="table-scroll"><table class="data-table">
    <thead><tr><th>入库记录编号</th><th>公司</th><th>运单号</th><th>收件人</th><th>收件手机号</th><th>位置</th><th>到站时间</th><th>操作</th></tr></thead>
    <tbody>${rows}</tbody></table></div>${pagination(candidates.length, resultPage)}` :
    listStateBlock("没有符合条件的待关联包裹。", demoState === "normal" ? "empty" : demoState);
  const drawer = demoState === "normal" && canLinkRecord(record) ? linkDrawer(record, account) : "";
  return pageHeading(pages.linking, "工作人员核对待关联包裹的收件手机号与目标账号的绑定手机号。") +
    `<form class="filter-card" id="link-filter" novalidate><div class="filter-grid">
      <div class="field"><label for="link-keyword">关键词</label><input id="link-keyword" name="keyword" value="${escapeHtml(filters.keyword)}"><span class="data-ref">DATA-002-48 · 运单号/收件人/手机号，最多50个字符</span></div>
      <div class="field"><label for="link-from">到站日期起</label><input id="link-from" name="from" type="date" value="${filters.from}"><span class="data-ref">DATA-002-47 · 含起止日期</span></div>
      <div class="field"><label for="link-to">到站日期止</label><input id="link-to" name="to" type="date" value="${filters.to}"><span class="data-ref">起止成对，起不晚于止</span></div>
      <div class="field"><span class="field-label">关联状态</span><p class="inline-note">固定为“待关联”（DATA-002-49）</p></div>
    </div><div class="filter-footer"><button class="button button-primary" type="submit">${icon("search")}查询</button></div></form>
    <section class="list-card"><div class="list-toolbar"><strong>待关联包裹</strong><span class="list-count">到站时间升序</span></div>${list}</section>${drawer}`;
}

/* FUNC-002-03 退件 */
function returnList(records) {
  return `<div class="table-scroll"><table class="data-table return-table">
    <thead><tr><th>入库记录编号</th><th>拒收申请编号</th><th>运单号</th><th>拒收原因</th><th>拒收时间</th><th>状态</th><th>操作</th></tr></thead>
    <tbody>${records.map(record => {
      const request = demoPendingRefusal(record);
      return `<tr><td class="mono return-id">${record.id}</td><td class="mono return-id">${request.id}</td><td class="mono">${escapeHtml(record.tracking)}</td><td>${escapeHtml(request.reason || "—")}</td><td class="mono time-cell">${request.time}</td><td><span class="status-badge warning">${record.status}</span></td><td><div class="row-actions"><button class="button-text" type="button" data-route="return-start/${record.id}/${request.id}">开始退件</button></div></td></tr>`;
    }).join("")}</tbody>
  </table></div>`;
}

function returnProgressList(records, finished) {
  return `<div class="table-scroll"><table class="data-table return-table">
    <thead><tr><th>入库记录编号</th><th>退件记录编号</th><th>拒收申请编号</th><th>运单号</th><th>退件来源</th><th>退回去向</th><th>开始退件时间</th><th>状态</th><th>${finished ? "完成时间" : "操作"}</th></tr></thead>
    <tbody>${records.map(record => {
      const { returnInfo } = record;
      const lastCell = finished ? `<td class="mono time-cell">${returnInfo.finishedAt}</td>` :
        `<td><div class="row-actions"><button class="button-text" type="button" data-action="finish-return" data-record-id="${record.id}" data-return-id="${returnInfo.id}">完成登记</button></div></td>`;
      return `<tr><td class="mono return-id">${record.id}</td><td class="mono return-id">${returnInfo.id}</td><td class="mono return-id">${returnInfo.refusalId ?? "—"}</td><td class="mono">${escapeHtml(record.tracking)}</td><td>${returnInfo.source}</td>
        <td>${returnInfo.destination}</td><td class="mono time-cell">${returnInfo.startedAt}</td><td><span class="status-badge ${finished ? "neutral" : "warning"}">${record.status}</span></td>${lastCell}</tr>`;
    }).join("")}</tbody>
  </table></div>`;
}

function returnSection(title, hint, list) {
  return `<section class="list-card"><div class="list-toolbar"><strong>${title}</strong>${hint ? `<span class="list-count">${hint}</span>` : ""}</div>${list}</section>`;
}

function returnsPage(record, requestedRecordId) {
  if (requestedRecordId) {
    const returnInfo = record?.returnInfo?.id && (record.status === "退件中" || record.status === "已退件");
    const back = `<button class="button button-secondary" type="button" data-route="${record ? `record-detail/${record.id}` : "records"}">${record ? "返回记录详情" : "返回记录查询"}</button>`;
    return pageHeading(pages.returns, returnInfo ? `入库记录${record.id}的退件办理。` : "该记录当前没有可继续办理的退件。", back) +
      (returnInfo ? returnSection(record.status, record.status === "退件中" ? "实际交接后登记完成" : "", returnProgressList([record], record.status === "已退件")) : "");
  }
  const records = demoRecords();
  const pending = records.filter(record => demoPendingRefusal(record));
  const inProgress = records.filter(record => record.status === "退件中" && record.returnInfo?.id);
  const finished = records.filter(record => record.status === "已退件" && record.returnInfo?.id);
  let sections = "";
  if (demoState !== "normal" || !pending.length && !inProgress.length && !finished.length) {
    sections = returnSection("拒收待退件", "", listStateBlock("没有符合条件的退件记录。", demoState === "normal" ? "empty" : demoState));
  } else {
    if (pending.length) sections += returnSection("拒收待退件", "核对包裹实物和退件原因后开始办理", returnList(pending));
    if (inProgress.length) sections += returnSection("退件中", "实际交接后登记完成", returnProgressList(inProgress, false));
    if (finished.length) sections += returnSection("已退件", "已记录退件完成时间", returnProgressList(finished, true));
  }
  return pageHeading(pages.returns, "工作人员办理学生拒收退件，按实际交接情况登记完成。") +
    `<div class="tabs" role="tablist" aria-label="退件发起入口"><button class="tab" role="tab" aria-selected="true" type="button">学生拒收</button><button class="tab" role="tab" aria-selected="false" type="button" data-route="return-manual">人工发起</button></div>${sections}`;
}

function returnStartPage(record, requestedRefusalId, backRoute) {
  const request = demoPendingRefusal(record);
  if (!request || request.id !== requestedRefusalId) return returnsPage() + `<p class="form-alert" role="alert">该申请已更新，请从退件清单重新选择。</p>`;
  const drawer = `<div class="overlay"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="return-title">
    <div class="drawer-header"><div><h2 id="return-title">开始退件</h2><span class="function-tag">入库记录${record.id}（DATA-002-01）</span></div><button class="icon-button" type="button" data-drawer-close data-route="${backRoute}" aria-label="关闭">${icon("close")}</button></div>
    <div class="drawer-body">
      <dl class="detail-grid"><div><dt>退件来源（DATA-002-29）</dt><dd>学生拒收 · 系统按入口确定</dd></div><div><dt>当前拒收申请（DATA-003-10）</dt><dd class="mono">${request.id}</dd></div><div><dt>包裹状态（DATA-003-05）</dt><dd>${record.status}</dd></div><div><dt>运单号</dt><dd class="mono">${escapeHtml(record.tracking)}</dd></div><div><dt>拒收原因</dt><dd>${escapeHtml(request.reason || "—")}</dd></div><div><dt>拒收时间</dt><dd class="mono">${request.time}</dd></div></dl>
      <div class="info-card warning"><p>办理前核对包裹实物、收件信息与退件原因；不一致时先按记录更正办理。开始退件后学生不可撤回。</p></div>
      <form id="return-form" data-record-id="${record.id}" data-refusal-id="${request.id}" novalidate>
        ${field("退件原因", "DATA-002-30 · 学生拒收来源默认学生拒收，可按实际改选", `<select name="reason" id="return-reason"><option>学生拒收</option><option>包装破损</option><option>面单信息不全或污损</option><option>错分错投</option><option>违禁品或无法投递</option><option>其他</option></select>`)}
        ${field("退回去向", "DATA-002-32 · 取值待P002-02评审", `<select name="destination"><option>退回原快递公司</option><option>退回寄件人</option></select>`)}
        <div class="field"><label for="return-note">退件原因说明</label><textarea id="return-note" placeholder="原因为“其他”时必填（DATA-002-31）"></textarea><span class="data-ref">原因为其他时必填</span></div>
        <div class="drawer-footer"><button class="button button-secondary" type="button" data-route="${backRoute}">取消</button><button class="button button-primary" type="submit">确认开始退件</button></div>
      </form>
    </div>
  </aside>`;
  return returnsPage() + drawer;
}

function returnManualPage() {
  const drawer = `<div class="overlay"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="manual-return-title">
    <div class="drawer-header"><div><h2 id="manual-return-title">人工异常退件</h2><span class="function-tag">入库记录RK20261122001（DATA-002-01）</span></div><button class="icon-button" type="button" data-drawer-close data-route="returns" aria-label="关闭">${icon("close")}</button></div>
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
  const notes = (record.correctionNotes ?? []).map(note => `<li class="correction-note-entry"><strong>追加说明</strong> · ${escapeHtml(note.reason)}<div>${escapeHtml(note.text)}</div><small class="mono">${note.at} · 示例工作人员</small></li>`).join("");
  const entries = (record.correctionEntries ?? []).map(entry => `<li><strong>更正字段：${escapeHtml(entry.field)}</strong><div>${escapeHtml(entry.previous)} → ${escapeHtml(entry.value)}</div><div>原因：${escapeHtml(entry.reason)}</div><small class="mono">${entry.at} · ${entry.operator} · DATA-002-44/45</small></li>`).join("");
  const earlier = correction ? `<li>更正字段：${correction.field}；更正人：${correction.operator}<small class="mono">${correction.at} · DATA-002-44/45</small></li>` : "";
  return notes + entries + earlier || "<li>无更正记录</li>";
}

function correctionPhone(record) {
  if (record.phone) return record.phone;
  return record.phoneLast ? `仅有尾号${record.phoneLast}` : "—";
}

function correctionPage(closed, selectedRecord, requestedRecordId, source) {
  const page = pages[closed ? "correction-closed" : "correction"];
  if (requestedRecordId && !selectedRecord) return pageHeading(page, "未找到该记录。", `<button class="button button-secondary" type="button" data-route="records">返回记录查询</button>`);
  const record = selectedRecord ?? demoData.intakes[closed ? 2 : 0];
  const formAttributes = closed || selectedRecord ? ` data-record-id="${record.id}"` : "";
  const backTarget = source === "linking" ? (canLinkRecord(record) ? `linking/${record.id}` : "linking/list") : `record-detail/${record.id}`;
  const back = selectedRecord ? `<button class="button button-secondary" type="button" data-route="${backTarget}">${source === "linking" ? "返回补关联" : "返回记录详情"}</button>` : "";
  const showExampleText = !selectedRecord && !record.correctionNotes?.length;
  const completionTime = record.status === "已退件" ? record.returnInfo?.finishedAt : record.pickedAt;
  const otherStudent = demoStudentAccounts().find(account => account.account === "00120002");
  const form = closed ? `<form class="form-card" id="correction-form"${formAttributes} novalidate>
      <div class="info-card warning"><div class="info-card__title">${icon("info")}该记录已完成</div><p>已取件、已退件记录保留原内容，只能追加更正说明；不提供字段修改入口，不转移归属。</p></div>
      <dl class="detail-grid" style="margin-top:20px"><div><dt>入库记录编号</dt><dd class="mono">${record.id}</dd></div><div><dt>运单号</dt><dd class="mono">${escapeHtml(record.tracking)}</dd></div><div><dt>更正方式（DATA-002-39）</dt><dd>追加更正说明</dd></div><div><dt>记录是否已完成（DATA-002-38）</dt><dd>是 · ${record.status}</dd></div><div><dt>归属账号</dt><dd class="mono">${record.account ?? "待关联"}</dd></div><div><dt>${record.status === "已退件" ? "退件完成时间（DATA-002-35）" : "取件时间（DATA-003-09）"}</dt><dd class="mono">${completionTime ?? "—"}</dd></div></dl>
      <div class="field"><label for="correction-reason">更正原因<span class="required" aria-hidden="true">*</span></label><input id="correction-reason" name="reason" value="${showExampleText ? "补充面单核对情况" : ""}" autocomplete="off"><span class="data-ref">DATA-002-42</span></div>
      <div class="field field-full"><label for="correction-note">更正说明<span class="required" aria-hidden="true">*</span></label><textarea id="correction-note" name="note">${showExampleText ? "已核对面单手机号与取件记录。" : ""}</textarea><span class="data-ref">DATA-002-43 · 只追加，不改原业务结果</span></div>
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
        <section class="snapshot-box"><h4>更正前内容快照（DATA-002-41）</h4><dl><dt>归属账号</dt><dd class="mono">${record.account ?? "待关联（允许缺失）"}</dd><dt>运单号</dt><dd class="mono">${escapeHtml(record.tracking)}</dd><dt>收件手机号</dt><dd class="mono">${escapeHtml(correctionPhone(record))}</dd><dt>存放位置</dt><dd>${record.location}</dd></dl></section>
        ${selectedRecord ? "" : `<section class="snapshot-box new"><h4>按新号码重新匹配</h4><dl><dt>匹配结果</dt><dd class="mono">${otherStudent.account} · ${escapeHtml(otherStudent.name)}</dd><dt>归属变化</dt><dd>待关联 → ${otherStudent.account}</dd><dt>学生可见性</dt><dd>入库后对${escapeHtml(otherStudent.name)}可见</dd></dl></section>`}
      </div>
      <p class="inline-note">快照字段为P002-09建议最小范围，具体结构待数据库设计确认；更正运单号时须重新查重，命中其他未办结记录则阻止保存。</p>
      <div class="form-footer"><button class="button button-primary" type="submit">保存更正</button></div>
    </form>`;
  return `<div class="correction-page">` + pageHeading(page, closed ? "已完成记录仅追加说明，原状态、归属及完成时间保持。" : "先定位记录并核对是否已完成，再选择更正字段；保存时留痕操作人与时间。", back) + form +
    `<div style="height:16px"></div><section class="list-card"><div class="list-toolbar"><strong>更正留痕</strong><span class="list-count">按更正时间倒序 · 不可删除</span></div><ul class="history-list" style="padding:0 20px 12px">${recordCorrectionHistory(record)}</ul></section></div>`;
}

/* FUNC-002-05 查询 */
function recordSearchScope(route) {
  if (route.startsWith("linking")) return "linking";
  return route === "records-admin" ? "records-admin" : "records";
}

function filterOptions(values, selected) {
  return `<option value="">不限</option>${values.map(value => `<option${value === selected ? " selected" : ""}>${value}</option>`).join("")}`;
}

function filteredRecords(filters) {
  const keyword = filters.keyword.toLowerCase();
  return demoRecords().filter(record => {
    const association = record.account ? "已关联" : "待关联";
    const date = record.arrivedAt.slice(0, 10);
    return (!filters.status || record.status === filters.status) &&
      (!filters.association || association === filters.association) &&
      (!filters.from || date >= filters.from) && (!filters.to || date <= filters.to) &&
      (!keyword || [record.tracking, record.receiver, record.phone].some(value => value?.toLowerCase().includes(keyword)));
  }).sort((a, b) => b.arrivedAt.localeCompare(a.arrivedAt) || b.id.localeCompare(a.id));
}

function recordRows(entries) {
  return entries.map(record => {
    const statusStyle = isRecordClosed(record) ? " neutral" : ["拒收待退件", "退件中"].includes(record.status) ? " warning" : "";
    return `<tr><td class="mono">${record.id}</td><td>${escapeHtml(demoCompanyName(record.company))}</td><td class="mono">${escapeHtml(record.tracking)}</td><td>${escapeHtml(record.receiver)}</td>
      <td class="mono">${record.phone ?? "—"}</td><td>${record.location}</td><td><span class="status-badge${statusStyle}">${record.status}</span></td>
      <td>${record.account ? "已关联" : "待关联"}</td><td class="mono time-cell">${record.arrivedAt}</td>
      <td><div class="row-actions"><button class="button-text" type="button" data-action="record-detail" data-record-id="${record.id}">详情</button></div></td></tr>`;
  }).join("");
}

function recordDetail(record, admin) {
  const closed = isRecordClosed(record);
  const returnInfo = record.returnInfo;
  const canContinue = record.status === "退件中" && returnInfo?.id;
  const pending = demoPendingRefusal(record);
  const active = demoActiveRefusal(record);
  const actions = admin ? "" : `<div class="drawer-footer">
      <button class="button ${canContinue || pending ? "button-secondary" : "button-primary"}" type="button" data-route="${closed ? "correction-closed" : "correction"}/${record.id}">${closed ? "追加说明" : "记录更正"}</button>
      ${canContinue ? `<button class="button button-primary" type="button" data-route="returns/${record.id}">继续退件办理</button>` : ""}
      ${pending ? `<button class="button button-primary" type="button" data-route="return-start/${record.id}/${pending.id}/records">开始退件</button>` : ""}
    </div>`;
  return `<div class="overlay"></div><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="record-title">
    <div class="drawer-header"><div><h2 id="record-title">记录详情</h2><span class="function-tag">${record.id} · ${admin ? "只读" : record.status}</span></div><button class="icon-button" type="button" data-drawer-close data-route="${admin ? "records-admin" : "records"}" aria-label="关闭">${icon("close")}</button></div>
    <div class="drawer-body">
      <dl class="detail-grid">
        <div><dt>快递公司</dt><dd>${escapeHtml(demoCompanyName(record.company))}</dd></div><div><dt>运单号</dt><dd class="mono">${escapeHtml(record.tracking)}</dd></div>
        <div><dt>归属账号</dt><dd class="mono">${record.account ?? "待关联"}</dd></div><div><dt>包裹状态</dt><dd>${record.status}</dd></div>
        <div><dt>存放位置</dt><dd>${record.location}</dd></div><div><dt>到站时间</dt><dd class="mono">${record.arrivedAt}</dd></div>
        ${record.pickedAt ? `<div><dt>取件时间</dt><dd class="mono">${record.pickedAt}</dd></div>` : ""}
      </dl>
      ${record.manualLinks?.length ? `<section class="detail-section"><h3>补关联留痕</h3><ul class="history-list">
        ${record.manualLinks.map(link => `<li>确认关联至 <strong class="mono">${link.account}</strong><small class="mono">${link.at} · ${link.operator}</small></li>`).join("")}
      </ul></section>` : ""}
      ${record.refusals?.length ? `<section class="detail-section"><h3>拒收申请</h3><ul class="history-list">
        ${[...record.refusals].reverse().map(request => `<li>${request.id === active?.id ? "当前有效申请" : "历史申请"} <strong class="mono">${request.id}</strong>
          <small class="mono">${request.time} · ${request.withdrawn ? "已撤回" : request.status}</small>
          ${request.reason ? `<div>${escapeHtml(request.reason)}</div>` : ""}
          ${request.withdrawal ? `<small>${request.withdrawal}${request.withdrawn ? ` · ${request.withdrawn}` : ""}</small>` : ""}</li>`).join("")}
      </ul></section>` : ""}
      <section class="detail-section"><h3>退件办理情况</h3>
        ${returnInfo ? `<dl class="detail-grid">
          <div><dt>退件记录编号</dt><dd class="mono">${returnInfo.id ?? "—"}</dd></div><div><dt>退件来源</dt><dd>${returnInfo.source ?? "—"}</dd></div>
          <div><dt>退件原因</dt><dd>${returnInfo.reason ?? "—"}</dd></div><div><dt>退回去向</dt><dd>${returnInfo.destination ?? "—"}</dd></div>
          ${returnInfo.note ? `<div><dt>退件原因说明</dt><dd>${escapeHtml(returnInfo.note)}</dd></div>` : ""}
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
  const search = recordSearches.get(recordSearchScope(route));
  const filters = search?.filters ?? emptyRecordFilters;
  const results = filteredRecords(filters);
  const resultPage = Math.min(search?.page ?? 1, Math.max(1, Math.ceil(results.length / pageSize)));
  const offset = (resultPage - 1) * pageSize;
  const table = demoState === "normal" && results.length ? `<div class="table-scroll"><table class="data-table records-table">
      <thead><tr><th>入库记录编号</th><th>公司</th><th>运单号</th><th>收件人</th><th>收件手机号</th><th>位置</th><th>包裹状态</th><th>关联状态</th><th>到站时间</th><th>操作</th></tr></thead>
      <tbody>${recordRows(results.slice(offset, offset + pageSize))}</tbody></table></div>${pagination(results.length, resultPage)}` :
    listStateBlock("请调整查询条件后重试。", demoState === "normal" ? "empty" : demoState);
  const detail = record && demoState === "normal" ? recordDetail(record, admin) : "";
  return pageHeading(page, admin ? "管理员只读查看全部获准记录，不显示任何办理入口。" : "查询为只读操作；办理入口仍按记录当前状态进入对应功能。", admin ? `<span class="role-badge">管理员 · 只读</span>` : "") +
    (unavailable ? `<p class="form-alert" role="alert">未找到该记录，请从清单重新选择。</p>` : "") +
    `<form class="filter-card" id="record-filter" novalidate><div class="filter-grid">
      <div class="field"><label for="record-status">包裹状态</label><select id="record-status" name="status">${filterOptions(["待取件", "已取件", "拒收待退件", "退件中", "已退件"], filters.status)}</select><span class="data-ref">DATA-002-46</span></div>
      <div class="field"><label for="record-link">账号关联状态</label><select id="record-link" name="association">${filterOptions(["已关联", "待关联"], filters.association)}</select><span class="data-ref">DATA-002-49</span></div>
      <div class="field"><label for="record-from">到站日期起</label><input id="record-from" name="from" type="date" value="${filters.from}"><span class="data-ref">DATA-002-47 · 含起止日期</span></div>
      <div class="field"><label for="record-to">到站日期止</label><input id="record-to" name="to" type="date" value="${filters.to}"><span class="data-ref">起止成对，起不晚于止</span></div>
      <div class="field field-full"><label for="record-keyword">关键词</label><input id="record-keyword" name="keyword" value="${escapeHtml(filters.keyword)}" autocomplete="off"><span class="data-ref">DATA-002-48 · 运单号/收件人/手机号，最多50个字符</span></div>
    </div><div class="filter-footer"><button class="button button-primary" type="submit">${icon("search")}查询</button></div></form>
    <section class="list-card"><div class="list-toolbar"><strong>收件退件记录</strong><span class="list-count">按到站时间降序</span></div>${table}</section>${detail}`;
}

function render() {
  let route = currentRoute();
  const [, recordId, source, returnFrom] = window.location.hash.split("/");
  const record = findRecord(recordId);
  if (route.startsWith("correction") && record) route = isRecordClosed(record) ? "correction-closed" : "correction";
  const listRoute = ["linking", "linking-mismatch", "returns", "records", "record-detail", "records-admin"].includes(route);
  if (!listRoute) demoState = "normal";
  let html;
  if (route === "intake") html = intakePage();
  else if (route === "intake-duplicate") html = intakePage() + duplicateDialog(recordId ? record : findRecord(initialRecords[0].id));
  else if (route === "intake-success") html = intakeSuccessPage(recordId ? record : intakeExample);
  else if (route.startsWith("linking")) html = linkingPage(recordId ? record : findRecord(initialRecords[0].id), demoStudentAccounts().find(account => account.account === (route === "linking-mismatch" ? "00120002" : "00120001")));
  else if (route === "returns") html = returnsPage(record, recordId);
  else if (route === "return-start") html = recordId
    ? returnStartPage(record, source, returnFrom === "records" && record ? `record-detail/${record.id}` : "returns")
    : returnStartPage(findRecord(returnDemo.recordId), demoActiveRefusal(findRecord(returnDemo.recordId))?.id, "returns");
  else if (route === "return-manual") html = returnManualPage();
  else if (route.startsWith("correction")) html = correctionPage(route === "correction-closed", record, recordId, source);
  else if (route === "records") html = recordsPage(route);
  else html = recordsPage(route, route === "record-detail" && !recordId ? demoData.intakes[1] : record, Boolean(recordId && !record));
  document.getElementById("app").innerHTML = shell(route, html);
  document.title = `${pages[route].ui} ${pages[route].title}｜REQ-002原型`;
  const picker = document.getElementById("page-picker");
  picker.value = route;
  const statePicker = document.getElementById("state-picker");
  statePicker.disabled = !listRoute;
  statePicker.value = demoState;
  statePicker.title = listRoute ? "切换清单的加载、无数据和请求失败状态" : "公共清单状态请在补关联、退件或查询页查看";

  const dialog = document.querySelector(".duplicate-dialog");
  if (dialog) {
    dialog.addEventListener("cancel", event => {
      event.preventDefault();
      cancelIntakeDuplicate();
    });
    dialog.addEventListener("click", event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) cancelIntakeDuplicate();
    });
    dialog.showModal();
  }
  if (route === "intake" && restoreIntakeFocus) {
    restoreIntakeFocus = false;
    document.querySelector(duplicateTrigger)?.focus({ preventScroll: true });
  }
}

function showToast(title) {
  clearTimeout(toastTimer);
  const toast = document.getElementById("toast");
  const message = document.createElement("strong");
  message.textContent = title;
  toast.replaceChildren(message);
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2500);
}

function setFieldError(input, message) {
  if (!input) return;
  const container = input.closest(".field");
  const errorId = `${input.id}-dynamic-error`;
  container?.querySelectorAll(".field-error.dynamic-error").forEach(error => error.remove());
  input.removeAttribute("aria-invalid");
  if (input.getAttribute("aria-describedby") === errorId) input.removeAttribute("aria-describedby");
  if (!message) return;
  input.setAttribute("aria-invalid", "true");
  const error = document.createElement("p");
  error.className = "field-error dynamic-error";
  error.id = errorId;
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

function readIntakeForm(form) {
  const { company, tracking, receiver, phone, location } = form.elements;
  return { company: company.value, tracking: tracking.value.trim(), receiver: receiver.value.trim(), phone: phone.value, location: location.value };
}

function matchingIntakes({ company, tracking }) {
  return demoRecords().filter(record => record.company === company && record.tracking === tracking);
}

function findOpenIntake(matches, excludedId) {
  return matches.find(record => record.id !== excludedId && !isRecordClosed(record));
}

function showIntakeDuplicate(draft, record, trigger) {
  intakeDraft = draft;
  duplicateTrigger = trigger;
  window.location.hash = `intake-duplicate/${record.id}`;
}

function closeIntakeDuplicate(message) {
  restoreIntakeFocus = true;
  window.location.hash = "intake";
  showToast(message);
}

function cancelIntakeDuplicate() {
  closeIntakeDuplicate("已返回入库登记，保留已填内容；未确认重复、未新增记录。");
}

function handleIntake(form) {
  if (form.querySelector('[type="submit"]').disabled) return;
  const draft = readIntakeForm(form);
  const errors = [
    [form.elements.company, demoHasCompany(draft.company) ? "" : "请选择有效的快递公司。"],
    [form.elements.tracking, draft.tracking ? "" : "请填写运单号。"],
    [form.elements.receiver, draft.receiver ? "" : "请填写收件人姓名。"],
    [form.elements.phone, /^1\d{10}$/.test(draft.phone) ? "" : draft.phone ? "收件手机号应为11位中国大陆手机号。" : "请填写收件手机号。"],
    [form.elements.location, fixedLocations.includes(draft.location) ? "" : "请选择有效的存放位置。"]
  ];
  errors.forEach(([input, message]) => setFieldError(input, message));
  const firstError = form.querySelector('[aria-invalid="true"]');
  if (firstError) { firstError.focus(); return; }

  const matches = matchingIntakes(draft);
  const duplicate = findOpenIntake(matches);
  if (duplicate) { showIntakeDuplicate(draft, duplicate, '#intake-form [type="submit"]'); return; }

  submitWithFeedback(form, () => {
    const sequence = demoData.intakes.length - initialRecords.length;
    const arrivedAt = demoTimestamp();
    const record = {
      ...draft,
      id: `RK${arrivedAt.slice(0, 10).replaceAll("-", "")}${String(sequence + 4).padStart(3, "0")}`,
      pickupCode: String(sequence + 1235).padStart(6, "0"),
      status: "待取件",
      account: demoStudentForPhone(draft.phone),
      arrivedAt,
      previousIntakeId: matches.at(-1)?.id
    };
    demoData.intakes.push(record);
    saveDemoData();
    window.location.hash = `intake-success/${record.id}`;
  });
}

function handleLink(form) {
  const record = findRecord(form.dataset.recordId);
  const input = form.elements.account;
  const account = demoStudentAccounts().find(option => option.account === input.value);
  if (input.disabled || !canLinkRecord(record) || account?.phone !== record.phone) return;
  input.disabled = true;
  submitWithFeedback(form, () => {
    const entry = { account: account.account, at: demoTimestamp(), operator: "示例工作人员" };
    demoSavePackage(record, {
      account: account.account,
      manualLinks: [entry, ...(record.manualLinks ?? [])]
    });
    window.location.hash = "linking/list";
    showToast(`补关联成功。运单号${record.tracking}已关联账号${account.account}，该账号可查询此包裹。`);
  });
}

function handleReturn(form) {
  if (form.querySelector('[type="submit"]').disabled) return;
  const { reason, destination } = form.elements;
  const note = form.querySelector("#return-note");
  if (reason.value === "其他" && !note.value.trim()) { setFieldError(note, "退件原因为其他时须填写说明。"); note.focus(); return; }
  setFieldError(note, "");
  const details = { reason: reason.value, destination: destination.value, note: note.value.trim() };
  submitWithFeedback(form, () => {
    if (!form.dataset.recordId) {
      window.location.hash = "returns";
      showToast("人工异常退件表单预览结束。");
      return;
    }
    const tracking = demoStartStudentReturn(form.dataset.recordId, form.dataset.refusalId, details);
    if (!tracking) {
      render();
      showToast("未开始退件。请核对当前包裹状态和拒收申请。");
      return;
    }
    window.location.hash = "returns";
    showToast(`运单号${tracking}已开始退件，包裹状态：退件中。`);
  });
}

function handleCorrection(form) {
  if (form.querySelector('[type="submit"]').disabled) return;
  const { reason, note } = form.elements;
  const reasonText = reason.value.trim();
  const noteText = note?.value.trim();
  setFieldError(reason, reasonText ? "" : "请填写更正原因。");
  if (note) setFieldError(note, noteText ? "" : "请填写更正说明。");
  if (!reasonText) { reason.focus(); return; }
  if (note && !noteText) { note.focus(); return; }

  const record = findRecord(form.dataset.recordId);
  if (note) {
    if (!record || !isRecordClosed(record)) return;
    const entry = { reason: reasonText, text: noteText, at: demoTimestamp() };
    submitWithFeedback(form, () => {
      demoSavePackage(record, { correctionNotes: [entry, ...(record.correctionNotes ?? [])] });
      render();
      showToast(`入库记录${record.id}已追加更正说明，原业务结果未改变。`);
    });
    return;
  }

  const fieldInput = form.elements.fieldName;
  const value = form.elements.newValue;
  const target = record ?? demoData.intakes[0];
  if (!target || isRecordClosed(target)) { showToast("该记录已完成，只能追加更正说明。"); return; }
  const nextValue = value.value.trim();
  if (!nextValue) { setFieldError(value, "请填写更正后内容。"); value.focus(); return; }
  if (fieldInput.value === "phone" && !/^1\d{10}$/.test(nextValue)) { setFieldError(value, "收件手机号应为11位中国大陆手机号。"); value.focus(); return; }
  if (fieldInput.value === "location" && !fixedLocations.includes(nextValue)) {
    setFieldError(value, "存放位置须为A～L区1～6层的有效层位；A-0等层位不存在。");
    value.focus();
    return;
  }
  if (fieldInput.value === "tracking") {
    const duplicate = findOpenIntake(matchingIntakes({ company: target.company, tracking: nextValue }), target.id);
    if (duplicate) { setFieldError(value, `更正后运单号与该快递公司已有记录重复（入库记录编号：${duplicate.id}），请先核对。`); value.focus(); return; }
  }
  setFieldError(value, "");
  const fieldName = fieldInput.value;
  const fieldLabel = fieldInput.selectedOptions[0].textContent;
  const nextAccount = fieldName === "phone" ? demoStudentForPhone(nextValue) : target.account;
  const entry = {
    field: fieldLabel,
    previous: fieldName === "phone" ? correctionPhone(target) : target[fieldName],
    value: nextValue,
    reason: reasonText,
    previousAccount: target.account ?? "待关联",
    account: nextAccount ?? "待关联",
    operator: "示例工作人员",
    at: demoTimestamp()
  };
  const result = `入库记录${target.id}已更正，更正字段：${fieldLabel}，更正人：示例工作人员。`;
  submitWithFeedback(form, () => {
    demoSavePackage(target, {
      [fieldName]: nextValue,
      account: nextAccount,
      correctionEntries: [entry, ...(target.correctionEntries ?? [])]
    });
    render();
    showToast(result);
  });
}

function handleRecordFilter(form) {
  const { status, association, from, to, keyword } = form.elements;
  const fromError = from.validity.badInput ? "请输入有效的起始日期。" : !from.value && to.value ? "请填写起始日期。" : "";
  let toError = to.validity.badInput ? "请输入有效的结束日期。" : from.value && !to.value ? "请填写结束日期。" : "";
  if (from.valueAsNumber > to.valueAsNumber) toError = "起始日期不能晚于结束日期。";
  setFieldError(from, fromError);
  setFieldError(to, toError);
  setFieldError(keyword, Array.from(keyword.value).length > 50 ? "关键词最长50个字符，请缩短后再查询。" : "");
  const firstError = form.querySelector('[aria-invalid="true"]');
  if (firstError) { firstError.focus(); return; }

  const filters = { status: status?.value ?? "", association: association?.value ?? "", from: from.value, to: to.value, keyword: keyword.value.trim() };
  recordSearches.set(recordSearchScope(currentRoute()), { filters, page: 1 });
  demoState = "normal";
  render();
  document.querySelector(`#${form.id} [type="submit"]`).focus({ preventScroll: true });
}

document.addEventListener("click", event => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) { window.location.hash = routeButton.dataset.route; return; }
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.action;
  if (action === "check-duplicate") {
    const form = document.getElementById("intake-form");
    const draft = readIntakeForm(form);
    if (!draft.tracking) {
      setFieldError(form.elements.tracking, "请填写运单号。");
      form.elements.tracking.focus();
      return;
    }
    setFieldError(form.elements.tracking, "");
    const duplicate = findOpenIntake(matchingIntakes(draft));
    if (duplicate) showIntakeDuplicate(draft, duplicate, '[data-action="check-duplicate"]');
    else showToast("未命中未办结记录，可继续登记；保存前仍会复核。");
  }
  if (action === "cancel-duplicate") cancelIntakeDuplicate();
  if (action === "confirm-duplicate") closeIntakeDuplicate("已确认为重复包裹，未新增入库记录。");
  if (action === "print-label") showToast("标签仅作页面预览与浏览器打印，不设置物理打印设备或专用纸张版式。");
  if (action === "continue-intake") {
    const record = findRecord(actionButton.dataset.recordId);
    intakeDraft = { company: record.company, location: record.location, tracking: "", receiver: "", phone: "" };
    window.location.hash = "intake";
  }
  if (action === "finish-return") {
    const { recordId, returnId } = actionButton.dataset;
    const finished = demoFinishReturn(recordId, returnId);
    render();
    showToast(finished ? `退件记录${returnId}已完成登记。` : "未登记完成。请核对当前退件记录。");
  }
  if (action === "record-detail") {
    const detailRoute = currentRoute() === "records-admin" ? "records-admin" : "record-detail";
    window.location.hash = `${detailRoute}/${actionButton.dataset.recordId}`;
  }
  if (action === "record-page") {
    const scope = recordSearchScope(currentRoute());
    const filters = recordSearches.get(scope)?.filters ?? emptyRecordFilters;
    recordSearches.set(scope, { filters, page: Number(actionButton.dataset.page) });
    render();
  }
  if (action === "retry") { demoState = "normal"; render(); }
});

document.getElementById("app").addEventListener("change", event => {
  const input = event.target;
  if (input.id !== "link-account") return;
  const account = demoStudentAccounts().find(option => option.account === input.value);
  const record = findRecord(input.form.dataset.recordId);
  const matching = canLinkRecord(record) && account.phone === record.phone;
  input.form.querySelector("#link-review").innerHTML = linkReview(account, matching);
  input.form.querySelector('[type="submit"]').disabled = !matching;
});

document.addEventListener("submit", event => {
  event.preventDefault();
  const form = event.target;
  if (form.id === "intake-form") handleIntake(form);
  if (form.id === "link-form") handleLink(form);
  if (form.id === "return-form") handleReturn(form);
  if (form.id === "correction-form") handleCorrection(form);
  if (form.id === "record-filter" || form.id === "link-filter") handleRecordFilter(form);
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
document.getElementById("reset-prototype").addEventListener("click", () => {
  demoState = "normal";
  demoData.intakes = structuredClone(initialRecords);
  demoData.sampleRecords = {};
  saveDemoData();
  recordSearches.clear();
  intakeDraft = undefined;
  duplicateTrigger = '[data-action="check-duplicate"]';
  restoreIntakeFocus = false;
  if (window.location.hash === "#intake") render();
  else window.location.hash = "intake";
});
window.addEventListener("hashchange", render);
window.addEventListener("pageshow", event => { if (event.persisted) render(); });
render();
