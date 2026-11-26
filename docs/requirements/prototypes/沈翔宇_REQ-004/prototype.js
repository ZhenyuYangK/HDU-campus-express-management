"use strict";

const version = "2026-11-23";
const roles = {
  student: { label: "学生", account: "00120001", avatar: "学" },
  staff: { label: "工作人员", account: "staff001", avatar: "员" },
  admin: { label: "管理员", account: "admin001", avatar: "管" },
};
const statuses = { "待受理": "warning", "已受理": "", "已寄出": "", "已取消": "neutral" };
const sample = {
  sender: "示例寄件人", senderPhone: "13800000002", receiver: "示例收件人",
  receiverPhone: "13900000003", address: "示例校区示例楼101室", item: "示例书籍",
};
const fields = {
  sender: "寄件人姓名", senderPhone: "寄件人手机号", receiver: "收件人姓名",
  receiverPhone: "收件人手机号", address: "收件详细地址", item: "物品说明",
};
const id = number => `APP-DEMO-${String(number).padStart(3, "0")}`;
const acceptedEvent = { by: "staff001", at: "2026-11-23 09:20:00" };
const shippedEvent = demoShippedEvent;
const initialRecords = [
  { number: 1, status: "待受理", submitted: "2026-11-23 09:00:00" },
  { number: 2, status: "已受理", submitted: "2026-11-23 08:50:00", accepted: acceptedEvent, item: "示例文具" },
  { number: 3, status: "已寄出", submitted: "2026-11-22 17:30:00", accepted: acceptedEvent, shipped: shippedEvent, item: "示例衣物" },
  { number: 4, status: "已取消", submitted: "2026-11-22 13:00:00", item: "示例画册",
    cancelled: { by: roles.student.account, at: "2026-11-22 13:10:00", method: "学生自主取消" } },
  { number: 5, status: "待受理", submitted: "2026-11-23 08:30:00", owner: "00120002", item: "示例练习册" },
].map(entry => ({ ...sample, owner: roles.student.account, history: [], ...entry, id: id(entry.number) }));

// [名称, 对应功能, 角色, 页面, 申请样例, 对话框操作]
const previews = {
  "01": ["学生提交寄件申请", "01", "student", "apply"],
  "02": ["我的寄件", "02", "student", "list"],
  "03": ["本人寄件进展", "02", "student", "detail", 3],
  "04": ["工作人员寄件办理清单", "02", "staff", "list"],
  "05": ["核对与受理", "03", "staff", "detail", 1, "accept"],
  "06": ["寄出登记", "04", "staff", "detail", 2, "ship"],
  "07": ["受理前学生自主取消", "05", "student", "detail", 1, "cancel"],
  "08": ["受理后工作人员取消", "05", "staff", "detail", 2, "cancel"],
  "09": ["已寄出后的取消限制", "05", "staff", "detail", 3],
  "10": ["未完成记录更正", "06", "staff", "detail", 1, "edit"],
  "11": ["完成记录追加说明", "06", "staff", "detail", 3, "edit"],
  "12": ["管理员寄件记录只读查询", "02", "admin", "list"],
};
const exportMode = new URLSearchParams(location.search).get("export") === "1";
const logo = document.querySelector('link[rel="icon"]').href;
const app = document.querySelector("#app");
const pagePicker = document.querySelector("#page-picker");
const rolePicker = document.querySelector("#role-picker");
const scenePicker = document.querySelector("#state-picker");
const emptyFilters = { status: "", from: "", to: "", keyword: "" };
const pageSize = 20;
let records, role, page, view, scene, selected, filters, filterError, feedback, dialogTrigger;
let applicationDraft, eventMinute, submittedCount, listNumber;

function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, char => entities[char]);
}

function icon(name) {
  return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

function button(label, action, style = "secondary", attributes = "") {
  return `<button class="button button-${style}" type="button" data-action="${action}" ${attributes}>${label}</button>`;
}

function badge(status) {
  return `<span class="status-badge ${statuses[status]}">${status}</span>`;
}

function notice(title, detail = "", style = "", alert = false) {
  return `<div class="info-card notice ${style}" role="${alert ? "alert" : "status"}">
    <div class="info-card__title">${icon(style ? "info" : "check")}${escapeHtml(title)}</div>
    ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
  </div>`;
}

function fact(label, value, style = "") {
  return `<div class="${style}"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function facts(items) {
  return `<dl class="shipping-facts">${items.map(item => fact(...item)).join("")}</dl>`;
}

function field(name, label, value = "", options = {}) {
  const { required = false, wide = false, type = "text", choices, placeholder = "" } = options;
  const safe = escapeHtml(value);
  const described = `id="field-${name}" name="${name}" aria-describedby="error-${name}"${required ? " required" : ""}`;
  let control = `<input ${described} type="${type}" value="${safe}" placeholder="${placeholder}"
    ${type === "tel" ? 'inputmode="numeric"' : ""}>`;
  if (type === "textarea") control = `<textarea ${described} placeholder="${placeholder}" rows="2">${safe}</textarea>`;
  if (choices) {
    control = `<select ${described}>${choices.map(([key, title]) =>
      `<option value="${escapeHtml(key)}" ${key === value ? "selected" : ""}>${escapeHtml(title)}</option>`).join("")}</select>`;
  }
  return `<div class="field${wide ? " field-full" : ""}">
    <label for="field-${name}">${label}${required ? '<span class="required" aria-hidden="true">*</span>' : ""}</label>
    ${control}<p class="field-error" id="error-${name}" hidden></p>
  </div>`;
}

function heading(title, action = "", back = false) {
  return `${back ? button(`${icon("back")}返回清单`, "back", "text") : ""}
    <div class="page-heading shipping-heading"><h1>${title}</h1>${action}</div>`;
}

function listName() {
  return { student: "我的寄件", staff: "寄件办理", admin: "寄件记录查询" }[role];
}

function shell(content) {
  const allowed = scene !== "forbidden";
  const identity = roles[role];
  const account = demoAccountId(identity.label);
  const displayName = escapeHtml(demoData.accounts[account].name);
  const current = view === "apply" ? "01" : listPreview();
  const nav = allowed ? roleNavigation(role, current, icon) : "";
  const brand = allowed ? roleBrand(role, logo) : '<span class="brand">CampusDelivery Station</span>';
  return `<div class="app-shell"><aside class="sidebar" aria-label="功能导航">${brand}${nav}</aside>
    <section class="workspace">
      <header class="app-topbar"><div class="breadcrumb"><span>${role === "student" ? "学生端" : "工作台"}</span>
        ${icon("chevron")}<span>${view === "apply" ? "寄件申请" : listName()}</span></div>
        ${allowed ? `<div class="user-chip"><span class="user-avatar" aria-hidden="true">${identity.avatar}</span>
          <div class="user-meta"><strong>${displayName}</strong><span>${account} · ${identity.label}</span></div></div>` : ""}
      </header>
      <main class="main-content" id="main" tabindex="-1">${content}</main>
      <footer class="prototype-meta"><span>UI-004-${page} · FUNC-004-${previews[page][1]} · ${identity.label}</span>
        <span>版本${version} · 接口待设计 · 合成数据</span></footer>
    </section></div>`;
}

function applicationPage() {
  const input = (name, options = {}) => field(name, fields[name], applicationDraft[name], { required: true, ...options });
  return `${heading("寄件申请", button("我的寄件", "list", "text"))}
    <form class="form-card shipping-form" id="application" novalidate>
      <fieldset class="form-section"><legend>寄件人信息</legend><div class="form-grid">
        ${input("sender", { placeholder: "填写寄件人姓名" })}
        ${input("senderPhone", { type: "tel", placeholder: "填写11位联系手机号" })}
      </div></fieldset>
      <fieldset class="form-section"><legend>收件人信息</legend><div class="form-grid">
        ${input("receiver", { placeholder: "填写收件人姓名" })}
        ${input("receiverPhone", { type: "tel", placeholder: "填写11位联系手机号" })}
        ${input("address", { wide: true, placeholder: "填写收件详细地址" })}
      </div></fieldset>
      <fieldset class="form-section"><legend>寄件物品</legend><div class="form-grid">
        ${input("item", { type: "textarea", wide: true, placeholder: "简要填写物品内容" })}
      </div></fieldset>
      <div class="form-alert" role="alert" hidden></div>
      <div class="form-footer"><button class="button button-primary" type="submit">提交寄件申请${icon("send")}</button></div>
    </form>`;
}

function canView(record) {
  return role !== "student" || record.owner === demoAccountId("学生");
}

function accessible(idValue) {
  return records.find(record => record.id === idValue && canView(record));
}

function emptyState(title, text, action = "") {
  return `<div class="empty-state"><div class="empty-state__inner"><span class="empty-state__icon">${icon("box")}</span>
    <h2>${title}</h2><p>${text}</p>${action}</div></div>`;
}

function listRows(items) {
  const cell = (label, content) => `<td><span class="cell-label">${label}</span>${content}</td>`;
  return items.map(record => `<tr>
    ${cell("申请编号", `<span class="row-title"><span class="company-glyph">${icon("box")}</span><span class="mono">${record.id}</span></span>`)}
    ${role === "student" ? "" : cell("申请人账号", `<span class="mono">${record.owner}</span>`)}
    ${cell("寄件状态", badge(record.status))}
    ${cell("快递公司", demoCompanyName(record.shipped?.company))}
    ${cell("提交时间", `<time class="mono">${record.submitted}</time>`)}
    <td><div class="row-actions">${button("查看详情", "detail", "text",
      `data-id="${record.id}" aria-label="查看${record.id}详情"`)}</div></td>
  </tr>`).join("");
}

function listPage() {
  const rows = records.filter(canView)
    .filter(record => (!filters.status || record.status === filters.status)
      && (!filters.from || record.submitted.slice(0, 10) >= filters.from)
      && (!filters.to || record.submitted.slice(0, 10) <= filters.to)
      && (!filters.keyword || [record.id, record.shipped?.tracking].some(value =>
        value?.toLowerCase().includes(filters.keyword.toLowerCase()))))
    .sort((first, second) => second.submitted.localeCompare(first.submitted) || first.id.localeCompare(second.id));
  const ready = scene !== "error" && scene !== "loading";
  const items = scene === "empty" ? [] : rows;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  listNumber = Math.min(listNumber, pageCount);
  const visibleItems = items.slice((listNumber - 1) * pageSize, listNumber * pageSize);
  const table = items.length
    ? `<table class="data-table shipping-table"><caption class="sr-only">寄件申请列表</caption><thead><tr>
        <th scope="col">申请编号</th>${role === "student" ? "" : '<th scope="col">申请人账号</th>'}
        <th scope="col">寄件状态</th><th scope="col">快递公司</th><th scope="col">提交时间</th>
        <th scope="col">操作</th></tr></thead><tbody>${listRows(visibleItems)}</tbody></table>`
    : emptyState("暂无寄件记录", "当前查询条件下没有匹配的申请。", button("重置筛选", "clear-filters"));
  const states = [["", "全部状态"], ...Object.keys(statuses).map(status => [status, status])];
  return `${heading(listName(), role === "student" ? button(`${icon("send")}寄件申请`, "apply", "primary") :
    role === "admin" ? '<span class="role-badge">只读查询</span>' : "")}
    <form class="form-card shipping-filters" id="filters" novalidate>
      ${field("status", "寄件状态", filters.status, { choices: states })}
      ${field("from", "提交起始日期", filters.from, { type: "date" })}
      ${field("to", "提交结束日期", filters.to, { type: "date" })}
      ${field("keyword", "关键词", filters.keyword, { placeholder: "申请编号或运单号" })}
      <div class="actions-row"><button type="submit" class="button button-primary">查询</button>
        ${button("重置", "clear-filters", "text")}</div>
      <div class="form-alert" role="alert" ${filterError ? "" : "hidden"}>${escapeHtml(filterError)}</div>
    </form>
    <section class="list-card" aria-label="寄件申请清单" aria-busy="${scene === "loading"}">
      <div class="list-toolbar"><strong>寄件申请</strong>${ready ? `<span class="list-count">共${items.length}条</span>` : ""}</div>
      ${scene === "loading" ? '<div class="skeleton-wrap" role="status"><span class="sr-only">正在查询寄件申请</span><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>'
        : scene === "error" ? emptyState("查询失败", "暂时无法加载寄件申请。", button("重新查询", "retry")) : table}
      ${ready && items.length ? pagination(pageCount) : ""}
    </section>`;
}

function pagination(pageCount) {
  return `<div class="list-footer"><span>每页${pageSize}条</span>
    <nav class="pagination" aria-label="列表分页">
      ${pageCount > 1 ? button("上一页", "previous-page", "text", listNumber === 1 ? "disabled" : "") : ""}
      <span class="page-number" aria-label="第${listNumber}页">${listNumber}</span>
      ${pageCount > 1 ? button("下一页", "next-page", "text", listNumber === pageCount ? "disabled" : "") : ""}
    </nav></div>`;
}

function closed(record) {
  return record.status === "已寄出" || record.status === "已取消";
}

function canOperate(action, record) {
  if (!record || scene === "forbidden") return false;
  if (role === "student") return action === "cancel" && record.status === "待受理";
  if (role !== "staff") return false;
  if (action === "accept") return record.status === "待受理";
  if (action === "ship" || action === "cancel") return record.status === "已受理";
  return action === "edit";
}

function eventFacts(record) {
  const events = [];
  if (record.accepted) {
    events.push(["受理时间", record.accepted.at]);
    if (role !== "student") events.push(["受理人", record.accepted.by]);
  }
  if (record.shipped) {
    events.push(["快递公司", demoCompanyName(record.shipped.company)], ["运单号", record.shipped.tracking], ["寄出完成时间", record.shipped.at]);
    if (role !== "student") events.push(["寄出办理人", record.shipped.by]);
  }
  if (record.cancelled) {
    events.push(["取消方式", record.cancelled.method], ["取消时间", record.cancelled.at]);
    if (role !== "student") events.push(["取消操作人", record.cancelled.by]);
    if (role === "staff" && record.cancelled.reason) events.push(["取消原因", record.cancelled.reason, "wide"]);
  }
  return events;
}

function contactFacts(record) {
  return Object.entries(fields).map(([name, label]) => [
    label, record[name], ["address", "item"].includes(name) ? "wide" : "",
  ]);
}

function summary(record) {
  return facts([
    ["申请编号", record.id], ["提交时间", record.submitted],
    ...(role === "student" ? [] : [["申请人账号", record.owner]]),
  ]);
}

function card(title, content, className = "") {
  return `<section class="form-card ${className}"><h2>${title}</h2>${content}</section>`;
}

function historyCard(record) {
  if (!record.history.length || role !== "staff") return "";
  const entries = record.history.toReversed().map(event => {
    const content = event.originalAddress === undefined
      ? facts([["更正说明", event.note, "wide"]])
      : facts([["更正前地址", event.originalAddress, "wide"], ["更正后地址", event.updatedAddress, "wide"]]);
    return `<li><p class="muted small mono">${event.at} · ${event.by}</p>
      <p>更正原因：${escapeHtml(event.reason)}</p>${content}</li>`;
  });
  return card("更正记录", `<ol class="shipping-history">${entries.join("")}</ol>`);
}

function detailPage(record) {
  const events = eventFacts(record);
  const actions = [
    ["accept", "核对与受理", "primary"], ["ship", "寄出登记", "primary"],
    ["cancel", "取消寄件", "secondary"], ["edit", closed(record) ? "追加说明" : "更正信息", "secondary"],
  ].filter(([action]) => canOperate(action, record)).map(([action, label, style]) => button(label, action, style));
  const rule = record.status === "已寄出" ? notice("已寄出，无法取消寄件", "", "warning") :
    role === "student" && record.status === "已受理" ? notice("已受理，如需取消请联系驿站工作人员。", "", "warning") : "";
  const overview = `${summary(record)}${actions.length ? `<div class="form-footer">${actions.join("")}</div>` : ""}`;
  const result = feedback ? notice(...feedback) : "";
  return `${heading("寄件详情", badge(record.status), true)}
    <div class="shipping-detail">${result}${rule}
      ${card("申请信息", overview)}
      ${events.length ? card("寄件进展", facts(events)) : ""}
      ${role === "admin" ? "" : card("联系人与物品", facts(contactFacts(record)), "shipping-contacts")}
      ${historyCard(record)}
    </div>`;
}

function checkField(label) {
  return `<label class="check-field"><input type="checkbox" name="checked" aria-describedby="error-checked">
    <strong>${label}</strong></label><p class="field-error" id="error-checked" hidden></p>`;
}

function operationContent(action, record) {
  const isClosed = closed(record);
  if (action === "accept") return {
    title: "核对与受理", submit: "确认受理",
    body: `${notice("请核对寄件信息和到站包裹", "信息与实物一致后确认受理。", "warning")}
      ${facts(contactFacts(record))}${checkField("已核对申请信息与实际包裹")}`,
  };
  if (action === "ship") return {
    title: "寄出登记", submit: "确认寄出",
    body: `${notice("包裹交给快递公司后登记寄出", "", "warning")}
      <div class="form-grid">
      ${field("company", "快递公司", "", { choices: [["", "请选择快递公司"], ...demoData.companies.map(({ id, name }) => [id, name])], required: true, wide: true })}
      ${field("tracking", "运单号", "", { required: true, wide: true, placeholder: "填写快递公司出具的运单号" })}
      </div>${checkField("已确认包裹实际寄出")}`,
  };
  if (action === "cancel") return {
    title: "取消寄件？", submit: "确认取消寄件",
    body: role === "student"
      ? "<p>取消后，这条申请将结束办理。</p>"
      : `${notice("请核对实际包裹尚未寄出", "确认后，这条申请将结束办理。", "warning")}
        ${field("reason", "取消原因", "", { type: "textarea", placeholder: "填写现场核对情况（选填）" })}
        ${checkField("已核对包裹尚未寄出")}`,
  };
  return {
    title: isClosed ? "为完成记录追加说明" : "更正寄件信息",
    submit: isClosed ? "保存说明" : "保存更正",
    body: `${isClosed ? notice("保留原寄件记录", "追加说明会显示在更正记录中。", "warning") : ""}
      ${isClosed ? card("原办理结果", facts([["寄件状态", record.status], ...eventFacts(record)]), "original-result") : ""}
      <div class="form-grid">
      ${isClosed ? "" : field("address", "收件详细地址", record.address, { required: true, wide: true })}
      ${field("reason", "更正原因", "", { required: true, wide: true, placeholder: "填写更正原因" })}
      ${isClosed ? field("note", "更正说明", "", { required: true, wide: true, type: "textarea", placeholder: "填写需要追加的说明" }) : ""}
      </div>`,
  };
}

function openOperation(action, trigger) {
  const record = accessible(selected);
  if (!canOperate(action, record) || app.querySelector("dialog")) return;
  const { title, submit, body } = operationContent(action, record);
  const staff = role === "staff";
  const context = `<div class="identity-card">${facts([["申请编号", record.id], ["当前状态", record.status]])}</div>`;
  const close = button("返回", "dismiss", "secondary");
  const confirm = `<button class="button button-${action === "cancel" ? "danger" : "primary"}" type="submit">${submit}</button>`;
  const form = `<form class="${staff ? "drawer-body" : ""}" id="operation" data-operation="${action}"
    novalidate>${context}${body}<div class="form-alert" role="alert" hidden></div>
    ${staff ? "" : `<div class="actions-row">${close}${confirm}</div>`}</form>`;
  app.insertAdjacentHTML("beforeend", staff
    ? `<dialog class="drawer shipping-drawer" aria-labelledby="operation-title">
      <header class="drawer-header"><h2 id="operation-title" tabindex="-1" autofocus>${title}</h2>
        <button type="button" class="icon-button" data-action="dismiss" aria-label="关闭">${icon("close")}</button></header>
      ${form}<footer class="drawer-footer">${close}${confirm.replace('type="submit"', 'type="submit" form="operation"')}</footer>
      </dialog>`
    : `<dialog class="dialog shipping-dialog" aria-labelledby="operation-title">
      <div class="dialog-icon">${icon("alert")}</div><h2 id="operation-title">${title}</h2>${form}</dialog>`);
  const dialog = app.querySelector("dialog");
  dialogTrigger = trigger;
  dialog.addEventListener("close", () => {
    dialog.remove();
    if (dialogTrigger?.isConnected) dialogTrigger.focus();
  });
  dialog.addEventListener("cancel", event => {
    if (dialog.dataset.pending) event.preventDefault();
  });
  dialog.addEventListener("click", event => {
    if (event.target !== dialog || dialog.dataset.pending) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.showModal();
}

function render(focus = false) {
  const record = accessible(selected);
  let content;
  if (scene === "forbidden") {
    content = emptyState("无权访问寄件服务", "请使用有权访问的校园驿站账号。");
  } else if (view === "list") {
    content = listPage();
  } else if (view === "apply" && role === "student") {
    content = applicationPage();
  } else if (view === "detail" && record) {
    content = detailPage(record);
  } else {
    content = emptyState("无法查看寄件详情", "申请不存在或当前账号无权查看。", button("返回清单", "back"));
  }
  app.innerHTML = shell(content);
  if (focus) app.querySelector("#main").focus();
}

function show(pageNumber, nextView, recordId = null) {
  page = pageNumber;
  view = nextView;
  selected = recordId;
  feedback = null;
  pagePicker.value = page;
  render(true);
}

function listPreview() {
  return { student: "02", staff: "04", admin: "12" }[role];
}

function loadPreview(key, nextScene = "normal") {
  page = previews[key] ? key : "01";
  const [, , nextRole, nextView, number, action] = previews[page];
  const byId = new Map(initialRecords.map(record => [record.id, record]));
  for (const record of Object.values(demoData.shipments)) byId.set(record.id, record);
  records = structuredClone([...byId.values()]);
  filters = { ...emptyFilters };
  filterError = "";
  feedback = null;
  role = nextRole;
  view = nextView;
  selected = number ? id(number) : null;
  scene = nextScene;
  eventMinute = 0;
  submittedCount = Math.max(5, ...records.map(record => Number(record.id.split("-").at(-1)))) - 5;
  listNumber = 1;
  applicationDraft = exportMode ? { ...sample } : {};
  pagePicker.value = page;
  rolePicker.value = role;
  scenePicker.value = scene;
  render();
  if (action) openOperation(action, app.querySelector(`[data-action="${action}"]`));
}

function eventTime() {
  const time = new Date(Date.UTC(2026, 10, 23, 11, eventMinute++));
  return time.toISOString().slice(0, 19).replace("T", " ");
}

function read(form) {
  return Object.fromEntries([...new FormData(form)].map(([name, value]) => [name, value.trim()]));
}

function fieldErrors(form, errors) {
  for (const input of form.querySelectorAll("[aria-describedby]")) {
    const error = errors[input.name];
    const hint = form.querySelector(`#error-${input.name}`);
    hint.textContent = error ?? "";
    hint.hidden = !error;
    input.toggleAttribute("aria-invalid", Boolean(error));
    if (error) input.setAttribute("aria-invalid", "true");
  }
  const firstInvalid = Object.keys(errors)[0];
  if (firstInvalid) form.elements[firstInvalid].focus();
  return Boolean(firstInvalid);
}

function formAlert(form, message) {
  const alert = form.querySelector(".form-alert");
  alert.textContent = message;
  alert.hidden = !message;
}

async function pending(form) {
  const submit = form.querySelector('[type="submit"]') ?? app.querySelector('[form="operation"]');
  if (submit.disabled) return false;
  const dialog = form.closest("dialog");
  if (dialog) dialog.dataset.pending = "true";
  const controls = [...form.elements, ...document.querySelectorAll(".prototype-toolbar select, #reset-prototype"),
    ...(dialog ? dialog.querySelectorAll('[data-action="dismiss"]') : [])].filter(control => !control.disabled);
  controls.forEach(control => { control.disabled = true; });
  const label = submit.innerHTML;
  submit.textContent = "处理中…";
  form.setAttribute("aria-busy", "true");
  await new Promise(resolve => setTimeout(resolve, 260));
  controls.forEach(control => { control.disabled = false; });
  form.removeAttribute("aria-busy");
  submit.innerHTML = label;
  if (dialog) delete dialog.dataset.pending;
  return true;
}

async function submitApplication(form) {
  if (role !== "student" || scene === "forbidden" || form.getAttribute("aria-busy")) return;
  const data = read(form);
  const errors = {};
  for (const [name, label] of Object.entries(fields)) {
    if (!data[name]) errors[name] = `请填写${label}`;
    else if (name.endsWith("Phone") && !/^1[3-9]\d{9}$/.test(data[name])) errors[name] = "请输入11位中国大陆手机号";
  }
  formAlert(form, "");
  if (fieldErrors(form, errors) || !await pending(form)) return;
  if (scene === "save-error") {
    scene = "normal";
    scenePicker.value = scene;
    formAlert(form, "申请保存失败。已保留填写内容，请重试。");
    return;
  }
  const record = { ...data, id: id(6 + submittedCount++), submitted: eventTime(),
    status: "待受理", owner: demoAccountId("学生"), history: [] };
  records.push(record);
  applicationDraft = {};
  page = "01";
  selected = record.id;
  view = "detail";
  feedback = ["寄件申请已提交", "请携带包裹到驿站，由工作人员核对受理。"];
  render(true);
}

function filterRecords(form) {
  const input = read(form);
  filterError = "";
  if (Boolean(input.from) !== Boolean(input.to)) filterError = "请同时填写提交起始日期和结束日期。";
  else if (input.from > input.to) filterError = "起始日期不能晚于结束日期。";
  if (filterError) {
    formAlert(form, filterError);
    return;
  }
  filters = input;
  listNumber = 1;
  if (scene === "loading" || scene === "error") {
    scene = "normal";
    scenePicker.value = scene;
  }
  render(true);
}

function operationErrors(action, record, data) {
  const errors = {};
  if ((action === "accept" || action === "ship" || (action === "cancel" && role === "staff")) && !data.checked) {
    errors.checked = "请先完成现场核对。";
  }
  if (action === "ship") {
    if (!demoHasCompany(data.company)) errors.company = "请选择快递公司。";
    if (!data.tracking) errors.tracking = "请填写运单号。";
  }
  if (action === "edit") {
    if (!data.reason) errors.reason = "请填写更正原因。";
    if (closed(record)) {
      if (!data.note) errors.note = "请填写更正说明。";
    } else if (!data.address || data.address === record.address) {
      errors.address = "请填写更正后的收件详细地址。";
    }
  }
  return errors;
}

function simulateConcurrentChange(action, record) {
  if (closed(record)) return;
  if (record.status === "已受理") {
    if (action === "ship") {
      record.status = "已取消";
      record.cancelled = { by: "staff002", at: eventTime(), method: "工作人员取消", reason: "现场核对后取消" };
    } else {
      record.status = "已寄出";
      record.shipped = { ...shippedEvent, at: eventTime(), tracking: "009876543210" };
    }
  } else if (action === "accept") {
    record.status = "已取消";
    record.cancelled = { by: record.owner, at: eventTime(), method: "学生自主取消" };
  } else {
    record.status = "已受理";
    record.accepted = { by: "staff002", at: eventTime() };
    if (action === "edit") {
      record.status = "已寄出";
      record.shipped = { ...shippedEvent, at: eventTime(), tracking: "009876543210" };
    }
  }
}

function completeOperation(action, record, data) {
  const event = { by: demoAccountId(roles[role].label), at: eventTime() };
  if (action === "accept") {
    record.status = "已受理";
    record.accepted = event;
    return "寄件申请已受理";
  }
  if (action === "ship") {
    record.status = "已寄出";
    record.shipped = { ...event, company: data.company, tracking: data.tracking };
    return "寄出登记已完成";
  }
  if (action === "cancel") {
    record.status = "已取消";
    record.cancelled = { ...event, method: role === "student" ? "学生自主取消" : "工作人员取消",
      ...(data.reason ? { reason: data.reason } : {}) };
    return "寄件申请已取消";
  }
  event.reason = data.reason;
  if (closed(record)) {
    event.note = data.note;
  } else {
    event.originalAddress = record.address;
    event.updatedAddress = data.address;
    record.address = data.address;
  }
  record.history.push(event);
  return event.note ? "已追加更正说明" : "寄件信息已更正";
}

async function submitOperation(form) {
  if (form.getAttribute("aria-busy")) return;
  const action = form.dataset.operation;
  const before = accessible(selected);
  if (!canOperate(action, before)) return;
  const data = read(form);
  formAlert(form, "");
  if (fieldErrors(form, operationErrors(action, before, data)) || !await pending(form)) return;
  if (scene === "save-error") {
    scene = "normal";
    scenePicker.value = scene;
    formAlert(form, "保存失败。已保留填写内容，请重试。");
    return;
  }
  const current = accessible(selected);
  if (scene === "race") {
    simulateConcurrentChange(action, current);
    scene = "normal";
    scenePicker.value = scene;
  }
  if (!canOperate(action, current) || (action === "edit" && closed(current) && !data.note)) {
    const next = action === "edit" && closed(current) ? "请在详情选择「追加说明」。" : "请查看最新办理结果。";
    feedback = ["申请状态已更新", `当前状态为「${current.status}」。${next}`, "warning", true];
  } else {
    const title = completeOperation(action, current, data);
    feedback = [title];
  }
  if (current.shipped) {
    demoData.shipments[current.id] = structuredClone(current);
    saveDemoData();
  }
  render(true);
}

app.addEventListener("submit", event => {
  event.preventDefault();
  const form = event.target;
  if (form.id === "filters") filterRecords(form);
  if (form.id === "application") void submitApplication(form);
  if (form.id === "operation") void submitOperation(form);
});

app.addEventListener("input", event => {
  const field = event.target;
  if (field.form?.id === "application") applicationDraft[field.name] = field.value;
  if (field.getAttribute("aria-invalid")) {
    field.removeAttribute("aria-invalid");
    app.querySelector(`#error-${field.name}`).hidden = true;
  }
});

app.addEventListener("click", event => {
  const shippingLink = event.target.closest('.sidebar .nav-item[href^="#"]');
  if (shippingLink) {
    event.preventDefault();
    if (scene !== "forbidden") {
      if (shippingLink.hash === "#01") show("01", "apply");
      else show(listPreview(), "list");
    }
    return;
  }
  const trigger = event.target.closest("[data-action]");
  if (!trigger || scene === "forbidden" || app.querySelector('[aria-busy="true"]:is(#operation, #application)')) return;
  event.preventDefault();
  const action = trigger.dataset.action;
  if (action === "apply" && role === "student") show("01", "apply");
  if (action === "list" || action === "back") {
    filterError = "";
    const previous = selected;
    show(listPreview(), "list");
    if (action === "back" && accessible(previous)) app.querySelector(`[data-id="${previous}"]`)?.focus();
  }
  if (action === "detail") show(role === "student" ? "03" : listPreview(), "detail", trigger.dataset.id);
  if (["accept", "ship", "cancel", "edit"].includes(action)) {
    const record = accessible(selected);
    if (!canOperate(action, record)) return;
    const pages = { accept: "05", ship: "06", cancel: role === "student" ? "07" : "08",
      edit: closed(record) ? "11" : "10" };
    page = pages[action];
    pagePicker.value = page;
    app.querySelector(".prototype-meta span").textContent = `UI-004-${page} · FUNC-004-${previews[page][1]} · ${roles[role].label}`;
    openOperation(action, trigger);
  }
  if (action === "dismiss") trigger.closest("dialog")?.close();
  if (action === "previous-page" || action === "next-page") {
    listNumber += action === "next-page" ? 1 : -1;
    render(true);
  }
  if (action === "clear-filters" || action === "retry") {
    if (action === "clear-filters") {
      filters = { ...emptyFilters };
      listNumber = 1;
    }
    filterError = "";
    scene = "normal";
    scenePicker.value = scene;
    show(listPreview(), "list");
  }
});

for (const [key, [title]] of Object.entries(previews)) pagePicker.add(new Option(`UI-004-${key} · ${title}`, key));
pagePicker.addEventListener("change", () => loadPreview(pagePicker.value, scenePicker.value));
rolePicker.addEventListener("change", () => {
  role = rolePicker.value;
  filters = { ...emptyFilters };
  filterError = "";
  listNumber = 1;
  show(listPreview(), "list");
});
scenePicker.addEventListener("change", () => {
  scene = scenePicker.value;
  if (["loading", "empty", "error", "forbidden"].includes(scene)) show(listPreview(), "list");
  else render();
});
document.querySelector("#reset-prototype").addEventListener("click", () => {
  demoData.shipments = {};
  saveDemoData();
  loadPreview("01");
});
document.body.classList.toggle("export", exportMode);
loadPreview(location.hash.slice(1));

window.addEventListener("pageshow", event => { if (event.persisted) loadPreview(page, scene); });
