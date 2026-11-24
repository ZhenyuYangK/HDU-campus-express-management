"use strict";

const VERSION = "2026-11-23";
const exportMode = new URLSearchParams(window.location.search).get("export") === "1";
const brandLogo = document.querySelector('link[rel="icon"]').href;
const loginPrototype = "../杨振煜_REQ-001/REQ-001_界面原型.html";
document.body.classList.toggle("export", exportMode);

const pages = {
  overview: { ui: "UI-005-01", func: "FUNC-005-01", title: "统计访问与权限校验", role: "管理员", file: "UI-005-01_统计访问与权限校验.png" },
  period: { ui: "UI-005-02", func: "FUNC-005-02", title: "统计期间选择与校验", role: "管理员", file: "UI-005-02_统计期间选择与校验.png" },
  "period-error": { ui: "UI-005-03", func: "FUNC-005-02", title: "统计期间错误", role: "管理员", file: "UI-005-03_统计期间错误.png" },
  inbound: { ui: "UI-005-04", func: "FUNC-005-03", title: "期间入库量统计", role: "管理员", file: "UI-005-04_期间入库量统计.png" },
  pickup: { ui: "UI-005-05", func: "FUNC-005-04", title: "期间取件量统计", role: "管理员", file: "UI-005-05_期间取件量统计.png" },
  shipped: { ui: "UI-005-06", func: "FUNC-005-05", title: "期间寄出量统计", role: "管理员", file: "UI-005-06_期间寄出量统计.png" },
  cancelled: { ui: "UI-005-07", func: "FUNC-005-06", title: "期间寄件取消量统计", role: "管理员", file: "UI-005-07_期间寄件取消量统计.png" },
  pending: { ui: "UI-005-08", func: "FUNC-005-07", title: "当前待取量统计", role: "管理员", file: "UI-005-08_当前待取量统计.png" },
  rejected: { ui: "UI-005-09", func: "FUNC-005-08", title: "期间有效拒收量统计", role: "管理员", file: "UI-005-09_期间有效拒收量统计.png" },
  returned: { ui: "UI-005-10", func: "FUNC-005-09", title: "期间退件完成量统计", role: "管理员", file: "UI-005-10_期间退件完成量统计.png" },
  summary: { ui: "UI-005-11", func: "FUNC-005-10", title: "统计结果展示与指标汇总", role: "管理员", file: "UI-005-11_统计结果展示与指标汇总.png" },
  verification: { ui: "UI-005-12", func: "FUNC-005-11", title: "统计结果核对与差异记录", role: "管理员", file: "UI-005-12_统计结果核对与差异记录.png" }
};

const indicatorOrder = ["inbound", "pickup", "pending", "shipped", "rejected", "returned", "cancelled"];
const exportRoutes = Object.keys(pages);

const initialPeriod = {
  start: "2026-11-01",
  end: "2026-11-30",
  queryTime: "2026-11-30 12:00:00",
  generatedAt: "2026-11-30 12:00:01"
};
let period = { ...initialPeriod };
let demoState = "normal";
let toastTimer;

const indicators = {
  inbound: {
    name: "期间入库量",
    dataId: "DATA-005-06",
    type: "期间指标",
    unit: "件",
    timeField: "到站时间DATA-003-06",
    source: "REQ-002入库记录DATA-002-01",
    sourceShort: "入库记录",
    countObject: "统计期间内完成入库的记录，包含已入库待关联包裹。",
    dedupe: "同一入库事件只计一次；重复入库事件不重复计数。",
    excluded: "期间外、未完成入库、重复入库事件不计。",
    impact: "追加说明不新增事件；不用入库量减取件量计算当前待取。",
    note: "包含待关联；不按当前状态排除已取走包裹。",
    pending: ["P005-01 统计期间端点", "P002-08 到站时间端点", "P002-05 重新入库追溯"],
    columns: ["入库记录编号", "快递公司", "运单号", "到站时间", "包裹状态", "计入"],
    trendTitle: "每日入库事件",
  },
  pickup: {
    name: "期间取件量",
    dataId: "DATA-005-07",
    type: "期间指标",
    unit: "件",
    timeField: "取件时间DATA-003-09",
    source: "REQ-003成功出库事件",
    sourceShort: "取件成功事件",
    countObject: "统计期间内核验通过并确认出库的包裹。",
    dedupe: "同一成功事件只计一次；重复核验不重复计数。",
    excluded: "失败核验、未完成出库、重复核验不计。",
    impact: "更正说明不改变成功出库事件；不凭重复核验增加数量。",
    note: "只统计成功出库；失败核验保留在来源模块。",
    pending: ["P005-01 统计期间端点", "P003-08 核验失败与重试策略"],
    columns: ["入库记录编号", "快递公司", "运单号", "取件时间", "取件结果", "计入"],
    trendTitle: "取件事件",
  },
  shipped: {
    name: "期间寄出量",
    dataId: "DATA-005-09",
    type: "期间指标",
    unit: "件",
    timeField: "寄出完成时间DATA-004-20",
    source: "REQ-004寄件完成事件",
    sourceShort: "寄件完成事件",
    countObject: "统计期间内实际完成寄出的申请。",
    dedupe: "按寄件申请编号识别完成事件；同一申请只计一次。",
    excluded: "仅提交或受理未寄出、期间外完成、重复事件不计。",
    impact: "更正说明不改变原完成事件；已寄出不执行普通取消。",
    note: "不以提交或受理时间替代寄出完成时间。",
    pending: ["P004-10 寄出统计端点", "P005-01 统计期间端点"],
    columns: ["寄件申请编号", "寄件状态", "寄出完成时间", "快递公司", "运单号", "计入"],
    trendTitle: "寄出事件",
  },
  cancelled: {
    name: "期间寄件取消量",
    dataId: "DATA-005-12",
    type: "期间指标",
    unit: "件",
    timeField: "取消时间DATA-004-23",
    source: "REQ-004取消完成事件",
    sourceShort: "寄件取消事件",
    countObject: "统计期间内完成的寄件取消，包含学生自主取消和工作人员取消。",
    dedupe: "按寄件申请编号去重；同一申请只计一次。",
    excluded: "取消失败、期间外完成、重复取消不计。",
    impact: "更正说明不增加取消量；原取消申请不继续寄出。",
    note: "两种取消方式均计入；取消原因必填性待P004-03。",
    pending: ["P004-03 取消原因必填性", "P004-05 状态与取消方式映射", "P004-10 取消统计端点"],
    columns: ["寄件申请编号", "取消方式", "取消时间", "原状态", "操作人", "计入"],
    trendTitle: "取消事件",
  },
  pending: {
    name: "当前待取量",
    dataId: "DATA-005-08",
    type: "当前时点",
    unit: "件",
    timeField: "查询时刻DATA-005-05",
    source: "REQ-002在库与REQ-003拒收/撤回状态",
    sourceShort: "在库、拒收与退件状态",
    countObject: "查询时刻正常在库且未取件的包裹。",
    dedupe: "每个包裹只计一次。",
    excluded: "已取件、已提交拒收、退件中及已退件不计。",
    impact: "拒收撤回并恢复待取后重新计入；查询时刻变化结果可变化。",
    note: "包含待关联；不按统计期间筛选。",
    pending: ["P003-07 包裹状态", "P003-09 当前有效拒收判定", "P005-03 无记录显示"],
    columns: ["入库记录编号", "快递公司", "运单号", "包裹状态", "关联状态", "计入"],
    trendTitle: "查询时刻状态分布",
  },
  rejected: {
    name: "期间有效拒收量",
    dataId: "DATA-005-10",
    type: "期间指标",
    unit: "件",
    timeField: "拒收时间DATA-003-12",
    source: "REQ-003拒收事实与REQ-002退件交接",
    sourceShort: "拒收与退件事件",
    countObject: "统计期间内当前有效拒收请求关联的包裹。",
    dedupe: "同一包裹按当前有效请求计一次。",
    excluded: "已撤回请求、期间外提交、系统校验失败不计。",
    impact: "撤回可使历史期间结果减少；再次提交按新有效请求时间归属。",
    note: "已完成退件且未撤回的仍计入；拒收提交成功即暂停取件。",
    pending: ["P003-09 当前有效请求判定", "P005-01 统计期间端点"],
    columns: ["拒收申请编号", "入库记录", "拒收时间", "拒收处理状态", "撤回结果", "计入"],
    trendTitle: "拒收提交事件",
  },
  returned: {
    name: "期间退件完成量",
    dataId: "DATA-005-11",
    type: "期间指标",
    unit: "件",
    timeField: "退件完成时间DATA-002-35",
    source: "REQ-002退件完成事件",
    sourceShort: "退件完成事件",
    countObject: "统计期间内实际完成退回交接的包裹。",
    dedupe: "同一完成事件只计一次。",
    excluded: "未完成交接、期间外完成、重复完成不计。",
    impact: "追加说明不新增完成事件；不以拒收时间替代退件完成时间。",
    note: "包含学生拒收和人工异常退件；不要求等于有效拒收量。",
    pending: ["P002-08 退件完成时间端点", "P005-01 统计期间端点"],
    columns: ["退件记录编号", "入库记录", "退件来源", "开始时间", "退件完成时间", "计入"],
    trendTitle: "退件完成事件",
  }
};

const sourceEvents = {
  inbound: [
    ["RK20261102001", "顺丰速运", "SF000123456789", "2026-11-02 09:00:00", "已关联"],
    ["RK20261103002", "京东快递", "JD000987654321", "2026-11-03 09:00:00", "已关联"],
    ["RK20261104003", "中通快递", "ZT000111222333", "2026-11-04 09:00:00", "已关联"],
    ["RK20261105004", "韵达快递", "YD000555666777", "2026-11-05 09:00:00", "已关联"],
    ["RK20261106005", "圆通速递", "YT000555666778", "2026-11-06 09:00:00", "待关联"],
    ["RK20261107006", "申通快递", "ST000444555666", "2026-11-07 09:00:00", "已关联"],
    ["RK20261108007", "极兔速递", "JT000777888999", "2026-11-08 09:00:00", "已关联"],
    ["RK20261109008", "德邦快递", "DB000123123123", "2026-11-09 09:00:00", "已关联"],
    ["IN-OUT", "顺丰速运", "SF000999888777", "2026-10-31 09:00:00", "已关联"]
  ],
  pickup: [
    ["RK20261103002", "京东快递", "JD000987654321", "2026-11-03 10:00:00", "成功出库"],
    ["RK20261104003", "中通快递", "ZT000111222333", "2026-11-04 10:00:00", "成功出库"],
    ["RK20261105004", "韵达快递", "YD000555666777", "2026-11-05 10:00:00", "核验失败"],
    ["IN-OUT", "顺丰速运", "SF000999888777", "2026-10-31 10:00:00", "成功出库"]
  ],
  shipped: [
    ["SJ20261113001", "已寄出", "2026-11-13 10:00:00", "顺丰速运", "SF000321654987"],
    ["SJ20261114002", "已寄出", "2026-11-14 10:00:00", "京东快递", "JD000654987321"],
    ["SJ20261115003", "待受理", "—", "中通快递", "ZT000321987654"],
    ["S-OUT", "已寄出", "2026-10-31 10:00:00", "韵达快递", "YD000987321654"]
  ],
  cancelled: [
    ["SJ20261115003", "学生自主取消", "2026-11-15 10:00:00", "待受理", "示例学生"],
    ["SJ20261116004", "工作人员取消", "2026-11-16 10:00:00", "已受理", "示例工作人员"],
    ["SJ20261117005", "学生自主取消", "—", "待受理", "示例学生"],
    ["C-OUT", "工作人员取消", "2026-10-31 10:00:00", "已受理", "示例工作人员"]
  ],
  rejected: [
    ["JS20261106001", "RK20261105004", "2026-11-06 10:00:00", "退件中", "未撤回"],
    ["JS20261109002", "RK20261107006", "2026-11-09 10:00:00", "已退件", "未撤回"],
    ["JS20261108003", "RK20261106005", "2026-11-08 10:00:00", "待退件", "撤回成功"],
    ["JS20261031004", "RK20261031001", "2026-10-31 10:00:00", "待退件", "未撤回"]
  ],
  returned: [
    ["TJ20261110001", "RK20261107006", "学生拒收", "2026-11-10 10:00:00", "2026-11-11 10:00:00"],
    ["TJ20261110002", "RK20261108007", "人工异常退件", "2026-11-10 10:00:00", "2026-11-12 10:00:00"],
    ["TJ20261113003", "RK20261105004", "学生拒收", "2026-11-13 10:00:00", "—"],
    ["RT-OUT", "RK20261030001", "人工异常退件", "2026-10-31 10:00:00", "2026-10-31 11:00:00"]
  ],
};

function packageState(id) {
  const handoff = sourceEvents.returned.find(row => row[1] === id);
  if (handoff) return handoff[4] === "—" ? "退件中" : "已退件";
  if (sourceEvents.rejected.some(row => row[1] === id && row[4] === "未撤回")) return "拒收待退件";
  if (sourceEvents.pickup.some(row => row[0] === id && row[4] === "成功出库")) return "已取件";
  return "待取件";
}

const eventDateColumn = { inbound: 3, pickup: 3, shipped: 2, cancelled: 2, rejected: 2, returned: 4 };

function metricResult(key) {
  const definition = indicators[key];
  let rows;
  let trend;
  if (key === "pending") {
    rows = sourceEvents.inbound.map(([id, company, waybill, , association]) => {
      const state = packageState(id);
      return [id, company, waybill, state, association, state === "待取件" ? "计入" : "不计"];
    });
    trend = ["待取件", "已取件", "拒收待退件", "退件中", "已退件"].map(label => ({
      label, value: rows.filter(row => row[3] === label).length, current: label === "待取件"
    }));
  } else {
    rows = sourceEvents[key].filter(row => {
      const date = row[eventDateColumn[key]].slice(0, 10);
      return date >= period.start && date <= period.end;
    }).map(source => {
      const row = [...source];
      if (key === "inbound") row[4] = packageState(row[0]);
      const excluded = (key === "pickup" && row[4] !== "成功出库") || (key === "rejected" && row[4] !== "未撤回");
      return [...row, excluded ? "不计" : "计入"];
    });
  }
  return { ...definition, rows, trend, value: rows.filter(row => row.at(-1) === "计入").length };
}

function comparisonBasis(indicator) {
  return indicator === indicators.pending.name ? period.queryTime : `${period.start} 至 ${period.end}`;
}

function escapeText(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

let differences = [
  {
    indicator: "期间取件量",
    basis: "2026-11-01 至 2026-11-30",
    actual: "3",
    note: "核对发现1条取件记录未纳入。",
    handling: "保留原结果，待张海睿核对后重算。",
    time: "2026-11-30 12:05:00"
  }
];

function icon(name) {
  return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

function brand() {
  return `<a class="brand" href="#overview" aria-label="CampusDelivery Station统计概览">
    <img class="brand-mark" src="${brandLogo}" width="34" height="34" alt="">
    <span class="brand-name">CampusDelivery Station</span>
  </a>`;
}

function currentRoute() {
  const route = window.location.hash.replace(/^#/, "") || "overview";
  return Object.hasOwn(pages, route) ? route : "overview";
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

function sectionFor(route) {
  if (route === "overview") return "统计概览";
  if (route === "period" || route === "period-error") return "统计期间";
  if (route === "summary") return "七项指标";
  if (route === "verification") return "结果核对";
  return "指标明细";
}

function shell(route, content) {
  const page = pages[route];
  const nav = `
    <div class="nav-group"><p class="sidebar-caption">统计</p>
      ${navButton("period", route === "period" || route === "period-error", "统计期间", "calendar")}
      ${navButton("summary", route === "summary", "七项指标", "grid")}
      ${navButton("verification", route === "verification", "结果核对", "check-circle")}
    </div>
    <div class="sidebar-note"><strong>只读统计</strong>数据来自收件、取件、拒收、退件和寄件记录；统计不写回业务。</div>`;
  return `<div class="app-shell">
    <aside class="sidebar" aria-label="功能导航">${roleBrand("admin", brandLogo)}${roleNavigation("admin", route, icon)}<nav aria-label="统计功能">${nav}</nav></aside>
    <section class="workspace">
      <header class="app-topbar">
        <div class="breadcrumb"><span>统计</span>${icon("chevron")}<span>${sectionFor(route)}</span></div>
        <div class="user-chip"><span class="user-avatar" aria-hidden="true">管</span><div class="user-meta"><strong>示例管理员</strong><span>admin001 · 管理员</span></div></div>
      </header>
      <main class="main-content" id="main" tabindex="-1">${content}</main>
      ${metaFooter(page)}
    </section>
  </div>`;
}

function metricCard(key, valueOverride) {
  const item = metricResult(key);
  const value = valueOverride === undefined ? item.value : valueOverride;
  const width = Math.max(4, Math.round((Number(value) / 8) * 100));
  return `<a class="metric-card ${item.type === "当前时点" ? "current" : ""}" href="#${key}">
    <div class="metric-card__top"><span class="metric-card__type ${item.type === "当前时点" ? "current" : ""}">${item.type}</span><span class="metric-card__id">${item.dataId}</span></div>
    <div class="metric-card__value">${value}<span class="metric-card__unit">${item.unit}</span></div>
    <span class="metric-card__name">${item.name}</span>
    <span class="metric-card__bar"><span style="width:${width}%"></span></span>
  </a>`;
}

function metricGrid(values = {}) {
  return `<div class="stat-grid">${indicatorOrder.map(key => metricCard(key, values[key])).join("")}</div>`;
}

function periodMeta() {
  return `<section class="summary-meta">
    <div><dt>统计期间 · DATA-005-03/04</dt><dd>${period.start} 至 ${period.end}</dd></div>
    <div><dt>查询时刻 · DATA-005-05</dt><dd>${period.queryTime}</dd></div>
    <div><dt>结果生成时刻 · DATA-005-17</dt><dd>${period.generatedAt}</dd></div>
    <div><dt>统计口径</dt><dd>六项期间指标 + 当前待取量</dd></div>
  </section>`;
}

function cellBadge(value) {
  if (value === "计入") return `<span class="status-badge success">计入</span>`;
  if (String(value).startsWith("不计")) return `<span class="status-badge neutral">${value}</span>`;
  return value;
}

function sampleTable(item) {
  const head = item.columns.map(column => `<th>${column}</th>`).join("");
  const rows = item.rows.map(row => `<tr>${row.map((cell, index) => {
    const content = index === row.length - 1 ? cellBadge(cell) : cell;
    const cls = index === 0 ? ' class="mono"' : "";
    return `<td${cls}>${content}</td>`;
  }).join("")}</tr>`).join("");
  return `<section class="list-card">
    <div class="list-toolbar"><div><strong>来源记录</strong><span class="list-count">　合成示例 · 共${item.rows.length}条</span></div><span class="function-tag">${item.dataId}</span></div>
    <table class="data-table detail-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>
    <div class="list-footer"><span>统计结果只读；"不计"行用于说明排除条件。</span></div>
  </section>`;
}

function trendBlock(item) {
  if (!item.trend) return "";
  const max = Math.max(...item.trend.map(point => point.value), 1);
  const bars = item.trend.map(point => `<div class="trend-bar ${point.current ? "current" : ""}">
    <em>${point.value}</em>
    <span style="height:${Math.max(4, Math.round((point.value / max) * 64))}px"></span>
    <small>${point.label}</small>
  </div>`).join("");
  return `<section class="card"><div class="card-head"><h3>${item.trendTitle || "事件分布"}</h3><span class="mono">合成示例 · 非运行结果</span></div><div class="trend-bars">${bars}</div></section>`;
}

function definitionCard(item) {
  return `<section class="card">
    <h3>口径说明</h3>
    <dl class="definition-list">
      <div><dt>计数对象</dt><dd>${item.countObject}</dd></div>
      <div><dt>时间字段</dt><dd>${item.timeField}</dd></div>
      <div><dt>去重</dt><dd>${item.dedupe}</dd></div>
      <div><dt>排除</dt><dd>${item.excluded}</dd></div>
      <div><dt>撤回、取消或更正</dt><dd>${item.impact}</dd></div>
      <div><dt>来源</dt><dd>${item.source}</dd></div>
    </dl>
  </section>`;
}

function pendingCard(item) {
  return `<section class="card">
    <h3>待评审</h3>
    <ul class="rule-list">${item.pending.map(text => `<li>${icon("info")}<span>${text}</span></li>`).join("")}</ul>
  </section>`;
}

function loadingBlock() {
  return `<section class="list-card" aria-busy="true" aria-label="统计结果加载中">
    <div class="list-toolbar"><strong>统计结果加载中</strong></div>
    <div class="skeleton-wrap">${'<div class="skeleton"></div>'.repeat(8)}</div>
  </section>`;
}

function errorBlock() {
  return `<section class="list-card"><div class="empty-state"><div class="empty-state__inner">
    <div class="empty-state__icon">${icon("alert")}</div>
    <h2>统计结果生成失败</h2>
    <p>未展示部分指标；来源记录和已有有效结果保持不变。</p>
    <button class="button button-secondary" type="button" data-state="normal">${icon("refresh")}重试</button>
  </div></div></section>`;
}

function emptyBlock(message = "暂无符合记录") {
  return `<section class="list-card"><div class="empty-state"><div class="empty-state__inner">
    <div class="empty-state__icon">${icon("database")}</div>
    <h2>${message}</h2>
    <p>按P005-03待评审：无符合记录时显示0、空值或未计算。</p>
    <button class="button button-secondary" type="button" data-state="normal">${icon("refresh")}返回正常状态</button>
  </div></div></section>`;
}

function noPermissionPage(route) {
  const page = pages.overview;
  return `<div class="denied-page">
    <header class="denied-header">${brand()}</header>
    <main class="denied-main">
      <section class="denied-card" role="alert">
        <div class="denied-icon">${icon("shield")}</div>
        <h1>无统计查看权限</h1>
        <p>当前账号角色不在DATA-005-19允许集合内。学生、工作人员无统计权限；统计页面不返回指标或业务明细。</p>
        <div class="actions-row"><a class="button button-primary" href="${loginPrototype}#login">返回登录${icon("arrow")}</a></div>
      </section>
    </main>
    <footer class="denied-footer"><span>UI-005-01 · FUNC-005-01 · 无权限状态</span><span>版本${VERSION} · 接口待设计 · 合成数据</span></footer>
  </div>`;
}

function overviewPage() {
  const page = pages.overview;
  if (demoState === "forbidden") return noPermissionPage("overview");
  const heading = pageHeading(page, "统计结果只读；按已确认口径从业务记录生成，不写回来源模块。", '<span class="status-badge success">已通过权限校验</span>');
  if (demoState === "loading") return shell("overview", heading + loadingBlock());
  if (demoState === "error") return shell("overview", heading + errorBlock());
  const content = `${heading}
    <div class="overview-grid">
      <section class="card">
        <div class="card-head"><h3>统计访问</h3><span class="mono">DATA-005-19</span></div>
        <dl class="access-list">
          <div><dt>当前账号 · DATA-001-01</dt><dd>admin001</dd></div>
          <div><dt>角色 · DATA-001-05</dt><dd>管理员</dd></div>
          <div><dt>允许范围</dt><dd>全部业务统计（只读）</dd></div>
          <div><dt>数据范围</dt><dd>入库、取件、拒收、退件、寄件记录</dd></div>
        </dl>
        <div class="access-ok">${icon("check-circle")}<span>管理员可查看全部统计；不执行工作人员收寄件、取件、退件或取消办理。</span></div>
      </section>
      <section class="card">
        <div class="card-head"><h3>当前统计期间</h3><span class="mono">DATA-005-03～05</span></div>
        <dl class="period-summary">
          <div><dt>统计开始</dt><dd>${period.start}</dd></div>
          <div><dt>统计结束</dt><dd>${period.end}</dd></div>
          <div><dt>查询时刻</dt><dd>${period.queryTime}</dd></div>
          <div><dt>结果生成</dt><dd>${period.generatedAt}</dd></div>
          <div class="span-2"><dt>说明</dt><dd>六项期间指标按期间筛选；当前待取量按查询时刻，不按期间筛选。</dd></div>
        </dl>
        <div class="actions-row" style="margin-top:18px"><a class="button button-secondary" href="#period">选择统计期间</a><a class="button button-primary" href="#summary">查看七项指标${icon("arrow")}</a></div>
      </section>
    </div>
    <div class="section-head"><h2>七项指标</h2><a class="button button-secondary" href="#summary">查看汇总${icon("arrow")}</a></div>
    ${metricGrid()}
    <div class="info-card warning" style="margin-top:18px">统计口径与端点待评审：P005-01、P005-03、P005-04、P005-06。原型图不代表业务运行结果。</div>`;
  return shell("overview", content);
}

function periodPage(forceError) {
  const route = forceError ? "period-error" : "period";
  const page = pages[route];
  if (demoState === "forbidden") return noPermissionPage(route);
  const heading = pageHeading(page, "选择统计期间并校验；当前待取量不按期间筛选。", forceError ? '<span class="status-badge danger">期间无效</span>' : '<span class="status-badge">期间指标</span>');
  if (demoState === "loading") return shell(route, heading + loadingBlock());
  const startValue = forceError ? "2026-11-30" : period.start;
  const endValue = forceError ? "2026-11-01" : period.end;
  const alert = forceError ? `<div class="form-alert" role="alert">${icon("alert")}<span>统计期间无效，未执行统计；上一次有效结果保持不变。</span></div>` : "";
  const startError = forceError ? `<p class="field-error" id="period-start-error">${icon("alert")}开始日期不能晚于结束日期。</p>` : "";
  const endError = forceError ? `<p class="field-error" id="period-end-error">${icon("alert")}结束日期不能早于开始日期。</p>` : "";
  const form = `<form class="form-card" id="period-form" novalidate>
    ${alert}
    <div class="form-grid">
      <div class="field"><label for="period-start">统计开始日期<span class="required" aria-hidden="true">*</span></label><input id="period-start" name="start" type="date" value="${startValue}" ${forceError ? 'aria-invalid="true" aria-describedby="period-start-error"' : ""}><p class="field-hint">DATA-005-03 · YYYY-MM-DD</p>${startError}</div>
      <div class="field"><label for="period-end">统计结束日期<span class="required" aria-hidden="true">*</span></label><input id="period-end" name="end" type="date" value="${endValue}" ${forceError ? 'aria-invalid="true" aria-describedby="period-end-error"' : ""}><p class="field-hint">DATA-005-04 · YYYY-MM-DD</p>${endError}</div>
      <div class="field field-full"><label for="period-query-time">查询时刻</label><input id="period-query-time" value="${period.queryTime}" readonly><p class="field-hint">DATA-005-05 · 系统取得；当前待取量按此计算</p></div>
    </div>
    <div class="period-rules"><h3>统计范围</h3><ul class="rule-list">
      <li>${icon("check")}<span>六项期间指标：入库、取件、寄出、寄件取消、有效拒收、退件完成。</span></li>
      <li>${icon("check")}<span>当前待取量按查询时刻计算，不使用统计期间。</span></li>
      <li>${icon("check")}<span>起止日期均必填，开始日期不晚于结束日期。</span></li>
      <li>${icon("info")}<span>起止端点、日期精度及时区按P005-01待评审。</span></li>
    </ul></div>
    <div class="form-footer"><button class="button button-secondary" type="reset">重置</button><button class="button button-primary" type="submit">开始统计${icon("arrow")}</button></div>
  </form>`;
  const side = `<aside class="side-panel">
    <h3>口径边界</h3>
    <p>统计期间只筛选六项期间指标；当前待取量按查询时刻的业务状态计算。</p>
    <ul class="rule-list">
      <li>${icon("check")}<span>期间外事件不计入。</span></li>
      <li>${icon("check")}<span>查询条件不持久保存，不作为业务记录。</span></li>
      <li>${icon("info")}<span>端点未确认前不擅自实现包含或排除规则。</span></li>
    </ul>
  </aside>`;
  return shell(route, `${heading}<div class="form-layout">${form}${side}</div>`);
}

function indicatorPage(route) {
  const page = pages[route];
  const item = metricResult(route);
  if (demoState === "forbidden") return noPermissionPage(route);
  const heading = pageHeading(page, item.note, `<span class="status-badge ${item.type === "当前时点" ? "info" : ""}">${item.type}</span>`);
  if (demoState === "loading") return shell(route, heading + loadingBlock());
  if (demoState === "error") return shell(route, heading + errorBlock());
  const empty = demoState === "empty";
  const value = empty ? 0 : item.value;
  const hero = `<section class="stat-hero">
    <div><span class="eyebrow">${item.dataId} · ${item.type}</span><div class="stat-hero__value">${value}<span class="stat-hero__unit">${item.unit}</span></div><h2>${item.name}</h2><p>${item.type === "当前时点" ? `查询时刻 ${period.queryTime}；不按统计期间筛选。` : `统计期间 ${period.start} 至 ${period.end}；按${item.timeField}筛选。`}</p></div>
    <dl class="stat-hero__meta">
      <div><dt>来源</dt><dd>${item.source}</dd></div>
      <div><dt>时间字段</dt><dd>${item.timeField}</dd></div>
      <div><dt>结果生成</dt><dd>${period.generatedAt}</dd></div>
    </dl>
  </section>`;
  const body = empty ? `${emptyBlock()}<div class="info-card warning" style="margin-top:18px">按P005-03待评审：无符合记录时可能显示0、空值或未计算；本原型暂显示0。</div>` : `${sampleTable(item)}${route === "pending" ? trendBlock(item) : ""}`;
  return shell(route, `${heading}${hero}<div class="detail-layout"><div class="detail-main">${body}</div><div class="detail-side">${definitionCard(item)}${pendingCard(item)}</div></div>`);
}

function summaryPage() {
  const page = pages.summary;
  if (demoState === "forbidden") return noPermissionPage("summary");
  const heading = pageHeading(page, "七项指标、统计期间和查询时刻在同一结果页展示；同源同基准重复查询一致。", '<span class="status-badge">七项指标</span>');
  if (demoState === "loading") return shell("summary", heading + loadingBlock());
  if (demoState === "error") return shell("summary", heading + errorBlock());
  const empty = demoState === "empty";
  const values = {};
  indicatorOrder.forEach(key => { values[key] = empty ? 0 : metricResult(key).value; });
  const rows = indicatorOrder.map(key => {
    const item = metricResult(key);
    return `<tr><td><strong>${item.name}</strong> <span class="mono">${item.dataId}</span></td><td>${item.type}</td><td><strong>${values[key]}</strong> ${item.unit}</td><td>${item.timeField}</td><td>${item.sourceShort}</td><td>${item.note}</td></tr>`;
  }).join("");
  const content = `${heading}${periodMeta()}${metricGrid(values)}
    <section class="card" style="margin-top:18px"><div class="card-head"><h3>指标汇总</h3><span class="mono">DATA-005-06～DATA-005-12</span></div>
      <table class="data-table summary-table"><thead><tr><th>指标</th><th>类型</th><th>数值</th><th>时间字段</th><th>来源</th><th>说明</th></tr></thead><tbody>${rows}</tbody></table>
    </section>
    <div class="actions-row" style="margin-top:16px"><a class="button button-secondary" href="#period">重新选择期间</a><a class="button button-primary" href="#verification">核对结果${icon("arrow")}</a></div>${empty ? '<div class="info-card warning" style="margin-top:16px">当前为无符合记录演示，按P005-03待评审。</div>' : ""}`;
  return shell("summary", content);
}

function verificationPage() {
  const page = pages.verification;
  if (demoState === "forbidden") return noPermissionPage("verification");
  const heading = pageHeading(page, "同一期间、同一批业务记录核对；差异保留原记录与处理说明，按所属模块权限处理。", '<span class="status-badge warning">差异核对</span>');
  if (demoState === "loading") return shell("verification", heading + loadingBlock());
  if (demoState === "error") return shell("verification", heading + errorBlock());
  const empty = demoState === "empty";
  const compareRows = indicatorOrder.map(key => {
    const item = metricResult(key);
    const system = item.value;
    const latest = differences.find(record => record.indicator === item.name && record.basis === comparisonBasis(item.name));
    const actual = latest ? Number(latest.actual) : system;
    const diff = actual - system;
    const hasDiff = diff !== 0;
    return `<tr><td>${item.name} <span class="mono">${item.dataId}</span></td><td>${system} ${item.unit}</td><td>${actual} ${item.unit}</td><td>${diff > 0 ? "+" + diff : diff} ${item.unit}</td><td>${hasDiff ? '<span class="status-badge danger">差异</span>' : '<span class="status-badge success">一致</span>'}</td><td>${hasDiff ? "待来源模块核对" : "—"}</td></tr>`;
  }).join("");
  const options = indicatorOrder.map(key => `<option value="${indicators[key].name}" ${key === "pickup" ? "selected" : ""}>${indicators[key].name}</option>`).join("");
  const form = `<form class="form-card" id="difference-form" novalidate>
    <div class="card-head"><h3>记录差异</h3><button class="button button-primary" type="submit">记录差异</button></div>
    <div class="form-grid">
      <div class="field"><label for="diff-indicator">指标<span class="required" aria-hidden="true">*</span></label><select id="diff-indicator" name="indicator">${options}</select></div>
      <div class="field"><label for="diff-actual">实际值<span class="required" aria-hidden="true">*</span></label><input id="diff-actual" name="actual" type="number" min="0" step="1" value="3"><p class="field-hint">同一统计期间或查询时刻的实际记录数。</p></div>
    </div>
    <div class="field"><label for="diff-note">差异说明<span class="required" aria-hidden="true">*</span></label><textarea id="diff-note" name="note" rows="2" maxlength="200">核对发现1条取件记录未纳入。</textarea><p class="field-hint">记录指标、期间或查询时刻、实际值；不超过200字符。</p></div>
  </form>`;
  const currentRecords = differences.filter(record => record.basis === comparisonBasis(record.indicator));
  const records = empty || !currentRecords.length ? `<div class="empty-inline">暂无差异记录；核对一致时保留原统计结果。</div>` : `<table class="data-table"><thead><tr><th>指标</th><th>实际值</th><th>差异说明</th><th>处理说明</th><th>记录时间</th></tr></thead><tbody>${currentRecords.map(item => `<tr><td>${item.indicator}</td><td>${item.actual}</td><td>${escapeText(item.note)}</td><td>${item.handling}</td><td class="mono">${item.time}</td></tr>`).join("")}</tbody></table>`;
  const content = `${heading}${periodMeta()}
    <section class="card"><div class="card-head"><h3>指标核对</h3><span class="mono">同一统计期间</span></div>
      <table class="data-table compare-table"><thead><tr><th>指标</th><th>系统值</th><th>实际值</th><th>差异</th><th>状态</th><th>处理说明</th></tr></thead><tbody>${compareRows}</tbody></table>
    </section>
    <div class="verification-layout">${form}<section class="card"><div class="card-head"><h3>差异记录</h3><span class="mono">保留原记录与处理说明</span></div>${records}</section></div>`;
  return shell("verification", content);
}

function render() {
  const route = currentRoute();
  let html;
  if (route === "overview") html = overviewPage();
  else if (route === "period") html = periodPage(false);
  else if (route === "period-error") html = periodPage(true);
  else if (route === "summary") html = summaryPage();
  else if (route === "verification") html = verificationPage();
  else html = indicatorPage(route);
  document.getElementById("app").innerHTML = html;
  document.title = `${pages[route].ui} ${pages[route].title}｜REQ-005原型`;
  const picker = document.getElementById("page-picker");
  picker.value = route;
  const statePicker = document.getElementById("state-picker");
  statePicker.value = demoState;
}

function showToast(title, detail = "") {
  clearTimeout(toastTimer);
  const toast = document.getElementById("toast");
  toast.innerHTML = `<strong>${title}</strong>${detail ? `<small>${detail}</small>` : ""}`;
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

function handlePeriodSubmit(form) {
  const startInput = form.elements.start;
  const endInput = form.elements.end;
  const start = startInput.value;
  const end = endInput.value;
  setFieldError(startInput, "");
  setFieldError(endInput, "");
  let valid = true;
  if (!start) { setFieldError(startInput, "请选择统计开始日期。"); valid = false; }
  if (!end) { setFieldError(endInput, "请选择统计结束日期。"); valid = false; }
  if (start && end && start > end) {
    setFieldError(startInput, "开始日期不能晚于结束日期。");
    setFieldError(endInput, "结束日期不能早于开始日期。");
    valid = false;
  }
  if (!valid) return;
  period = { ...period, start, end, queryTime: "2026-11-30 12:00:00", generatedAt: "2026-11-30 12:00:01" };
  showToast("统计期间已更新", "六项期间指标按新期间重新计算；当前待取量按查询时刻。");
  window.location.hash = "summary";
}

function handleDifferenceSubmit(form) {
  const indicator = form.elements.indicator.value;
  const actualInput = form.elements.actual;
  const noteInput = form.elements.note;
  const actual = actualInput.value.trim();
  const note = noteInput.value.trim();
  setFieldError(actualInput, "");
  setFieldError(noteInput, "");
  let valid = true;
  if (!actual || !Number.isSafeInteger(Number(actual)) || Number(actual) < 0) { setFieldError(actualInput, "请输入不小于0的实际值。"); valid = false; }
  if (!note) { setFieldError(noteInput, "请填写差异说明。"); valid = false; }
  if (!valid) return;
  differences.unshift({
    indicator,
    basis: comparisonBasis(indicator),
    actual,
    note,
    handling: "待模块负责人核对；保留原记录与说明，按同一期间重新统计。",
    time: "2026-11-30 12:05:00"
  });
  showToast("差异已记录", "保留原统计结果；待模块负责人核对后按同一期间重新统计。");
  render();
}

function populatePicker() {
  const picker = document.getElementById("page-picker");
  picker.innerHTML = exportRoutes.map(route => `<option value="${route}">${pages[route].ui} ${pages[route].title}</option>`).join("");
}

document.getElementById("page-picker").addEventListener("change", event => { window.location.hash = event.target.value; });
document.getElementById("state-picker").addEventListener("change", event => { demoState = event.target.value; render(); });
document.getElementById("reset-prototype").addEventListener("click", () => {
  period = { ...initialPeriod };
  demoState = "normal";
  differences = [{
    indicator: "期间取件量",
    basis: "2026-11-01 至 2026-11-30",
    actual: "3",
    note: "核对发现1条取件记录未纳入。",
    handling: "保留原结果，待张海睿核对后重算。",
    time: "2026-11-30 12:05:00"
  }];
  window.location.hash = "overview";
  render();
  showToast("原型演示已重置", "统计期间、差异记录和场景已恢复为合成示例。");
});

window.addEventListener("hashchange", render);
document.addEventListener("click", event => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) { window.location.hash = routeButton.dataset.route; return; }
  const stateButton = event.target.closest("[data-state]");
  if (stateButton) { demoState = stateButton.dataset.state; render(); return; }
});

document.addEventListener("input", event => {
  if (event.target.matches("input, textarea, select")) setFieldError(event.target, "");
});

document.addEventListener("submit", event => {
  event.preventDefault();
  if (event.target.id === "period-form") handlePeriodSubmit(event.target);
  if (event.target.id === "difference-form") handleDifferenceSubmit(event.target);
});

document.addEventListener("reset", event => {
  if (event.target.id !== "period-form") return;
  setTimeout(() => {
    event.target.elements.start.value = period.start;
    event.target.elements.end.value = period.end;
  }, 0);
});

populatePicker();
if (!window.location.hash) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#overview`);
render();
window.__REQ005__ = { pages, exportRoutes, version: VERSION };
