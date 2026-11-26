"use strict";

const version = "2026-11-24";
const brandLogo = document.querySelector('link[rel="icon"]').href;
const app = document.querySelector("#app");
const pagePicker = document.querySelector("#page-picker");
const statePicker = document.querySelector("#state-picker");
const exportMode = new URLSearchParams(location.search).get("export") === "1";
document.body.classList.toggle("export", exportMode);

const screenshots = {
  list: ["01", "01", "本人包裹查询"],
  detail: ["02", "01", "待取件包裹详情"],
  pickup: ["03", "02", "自助取件核验"],
  "pickup-error": ["04", "02", "自助取件核验失败"],
  "pickup-success": ["05", "02", "自助取件完成"],
  refusal: ["06", "03", "提交拒收申请"],
  refused: ["07", "03", "拒收成功暂停取件"],
  withdraw: ["08", "04", "撤回拒收确认"],
  withdrawn: ["09", "04", "撤回成功恢复待取"],
  "return-started": ["10", "04", "退件开始不可撤回"]
};

const statusStyles = {
  "待取件": "",
  "已取件": "neutral",
  "拒收待退件": "warning",
  "退件中": "warning",
  "已退件": "neutral"
};

const exampleId = demoPackageExampleId;
const refusalDemo = demoRefusal;

let packages;
let page;
let view;
let scene;
let filter;
let selected;
let pickupReturn;
let result;
let sequence;
let dialogTrigger;

function icon(name) {
  return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

function escapeHtml(value) {
  const chars = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value).replace(/[&<>"']/g, char => chars[char]);
}

function button(label, action, style = "secondary", extra = "") {
  return `<button type="button" class="button button-${style}" data-action="${action}" ${extra}>${label}</button>`;
}

function owned(id) {
  if (scene === "forbidden") return undefined;
  return packages.find(item => item.id === id && item.owner === demoAccountId("学生"));
}

function badge(status) {
  return `<span class="status-badge ${statusStyles[status] ?? "neutral"}">${status}</span>`;
}

function fieldList(items) {
  return `<dl class="package-dl">${items.map(([label, value, style = ""]) => `
    <div class="${style}"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
}

function message(title, detail = "", style = "", alert = false) {
  return `<div class="info-card ${style}" role="${alert ? "alert" : "status"}">
    <p class="info-card__title">${icon(style ? "alert" : "info")}${title}</p>
    ${detail ? `<p>${detail}</p>` : ""}
  </div>`;
}

function heading(title, back = "", action = "") {
  return `${back ? `<button type="button" class="button button-text back-link" data-action="${back.action}">${icon("back")}${back.label}</button>` : ""}
    <div class="page-heading package-heading"><h1 tabindex="-1">${title}</h1>${action}</div>`;
}

function shell(content) {
  const account = demoAccountId("学生");
  const [ui, func] = screenshots[page];
  const allowed = scene !== "forbidden";
  const onPickup = ["pickup", "pickup-success"].includes(view);
  const nav = allowed ? roleNavigation("student", onPickup ? "pickup" : "list", icon, true) : "";
  return `<div class="app-shell">
    <aside class="sidebar" aria-label="功能导航">
      ${roleBrand("student", brandLogo, true)}
      ${nav}
    </aside>
    <section class="workspace">
      <header class="app-topbar">
        <div class="breadcrumb"><span>学生端</span>${icon("chevron")}<span>${onPickup ? "自助取件" : "我的包裹"}</span></div>
        ${allowed ? `<div class="user-chip"><span class="user-avatar" aria-hidden="true">学</span>
          <div class="user-meta"><strong>${escapeHtml(demoData.accounts[account].name)}</strong><span>${account} · 学生</span></div></div>` : ""}
      </header>
      <main class="main-content" id="main" tabindex="-1">${content}</main>
      <footer class="prototype-meta"><span>UI-003-${ui} · FUNC-003-${func} · 学生</span><span>版本${version} · 接口待设计 · 合成数据</span></footer>
    </section>
  </div>`;
}

function emptyState(title, text, action = "", glyph = "box") {
  return `<div class="empty-state"><div class="empty-state__inner">
    <div class="empty-state__icon">${icon(glyph)}</div>
    <h2>${title}</h2><p>${text}</p>${action}
  </div></div>`;
}

function packageRows(items) {
  return `<table class="data-table package-table">
    <caption class="sr-only">本人包裹查询结果</caption>
    <thead><tr><th scope="col">快递公司</th><th scope="col">运单号</th><th scope="col">包裹状态</th>
      <th scope="col">包裹定位</th><th scope="col">到站时间</th><th scope="col">操作</th></tr></thead>
    <tbody>${items.map(item => `<tr>
      <td><div class="row-title"><span class="company-glyph">${icon("box")}</span>${escapeHtml(demoCompanyName(item.company))}</div></td>
      <td><span class="cell-label" aria-hidden="true">运单号</span>${escapeHtml(item.waybill)}</td>
      <td><span class="cell-label" aria-hidden="true">包裹状态</span>${badge(item.status)}</td>
      <td><span class="cell-label" aria-hidden="true">包裹定位</span>${item.status === "待取件" ? `<span class="pickup-location">${item.shelf}-${item.code}</span>` : "—"}</td>
      <td><span class="cell-label" aria-hidden="true">到站时间</span>${item.arrived}</td>
      <td><div class="row-actions">${button("查看详情", "detail", "text", `data-id="${item.id}" aria-label="查看${escapeHtml(demoCompanyName(item.company))}${escapeHtml(item.waybill)}详情"`)}</div></td>
    </tr>`).join("")}</tbody>
  </table>`;
}

function listPage() {
  const items = packages.filter(item => item.owner === demoAccountId("学生"));
  const shown = filter ? items.filter(item => item.status === filter) : items;
  const ready = !["error", "loading"].includes(scene);
  const states = Object.keys(statusStyles).map(status => `<option${filter === status ? " selected" : ""}>${status}</option>`).join("");
  let list = packageRows(shown);
  if (scene === "loading") {
    list = `<div class="skeleton-wrap" role="status" aria-busy="true">正在加载包裹${'<div class="skeleton" aria-hidden="true"></div>'.repeat(5)}</div>`;
  } else if (scene === "error") {
    list = emptyState("包裹加载失败", "请重试。", button("重新加载", "retry-list", "primary"), "alert");
  } else if (items.length === 0) {
    list = emptyState("暂无本人包裹记录", "包裹关联到当前账号后会显示在这里。");
  } else if (shown.length === 0) {
    list = emptyState("暂无符合条件的包裹", "可以清除筛选条件后查看全部包裹。", button("清除筛选", "clear-filter"));
  }
  return heading("我的包裹", "", button("自助取件", "pickup", "primary")) + `
    <section class="list-card" aria-label="包裹清单">
      <div class="list-toolbar compact-toolbar">
        <span class="list-count" role="status">${ready ? `共${shown.length}件包裹` : "包裹清单"}</span>
        <div class="field actions-row"><label for="filter">包裹状态</label>
          <select id="filter" ${ready && items.length ? "" : "disabled"}><option value="">全部状态</option>${states}</select>
        </div>
      </div>${list}
    </section>`;
}

function canWithdraw(item) {
  return item.status === "拒收待退件" && item.request?.status === "待退件" && !item.returnStarted;
}

function requestCard(item) {
  const request = item.request;
  if (!request) return "";
  const fields = [["拒收申请编号", request.id], ["拒收时间", request.time]];
  if (!request.withdrawn) fields.push(["拒收处理状态", request.status]);
  if (request.withdrawal) fields.push(["撤回结果", request.withdrawal]);
  if (request.withdrawn) fields.push(["撤回时间", request.withdrawn]);
  if (request.reason) fields.push(["拒收原因", request.reason, "wide reason"]);
  return `<section class="form-card"><h2>拒收申请</h2>${fieldList(fields)}</section>`;
}

function detailPage(item) {
  const fields = [["快递公司", demoCompanyName(item.company)], ["运单号", item.waybill], ["到站时间", item.arrived]];
  if (item.status === "待取件") {
    fields.push(["存放位置", item.shelf], ["取件码", item.code], ["包裹定位", `${item.shelf}-${item.code}`]);
  }
  if (item.pickedUp) fields.push(["取件时间", item.pickedUp]);
  if (item.returnStarted) fields.push(["开始退件时间", item.returnStarted]);
  if (item.returned) fields.push(["退件完成时间", item.returned]);
  let notice = result;
  if (!notice && canWithdraw(item)) {
    notice = ["包裹已暂停取件", "工作人员开始退件前，你可以撤回拒收。", "warning"];
  } else if (!notice && item.status === "退件中") {
    notice = item.request ? ["工作人员已开始退件", "当前不可撤回拒收，也无法取件。", "warning"] :
      ["包裹正在退件", "当前无法取件。", "warning"];
  } else if (!notice && item.status === "已退件") {
    notice = ["退件已完成", item.request ? "当前不可撤回拒收，也无法恢复取件。" : "当前无法恢复取件。"];
  }
  const actions = item.status === "待取件" ?
    button("申请拒收", "refusal", "secondary") + button("自助取件", "pickup-from-detail", "primary") :
    canWithdraw(item) ? button("撤回拒收", "withdraw", "secondary") : "";
  return heading("包裹详情", { label: "返回我的包裹", action: "list" }) + `
    <div class="detail-layout">
      ${notice ? message(...notice) : ""}
      <section class="form-card detail-card"><header><h2>包裹信息</h2>${badge(item.status)}</header>
        ${fieldList(fields)}${actions ? `<div class="form-footer">${actions}</div>` : ""}
      </section>
      ${requestCard(item)}
    </div>`;
}

function pickupPage(exampleError) {
  return heading("自助取件", pickupReturn ? { label: "返回包裹详情", action: "back-detail" } :
    { label: "返回我的包裹", action: "list" }) + `
    <form id="pickup-form" class="form-card pickup-form" novalidate autocomplete="off">
      <h2>核验取件信息</h2>
      <p class="muted">到站后输入取件信息。系统核验通过即确认取件并出库。</p>
      <div class="form-grid">
        <div class="field">
          <label for="pickup-code">取件码<span class="required" aria-hidden="true">*</span></label>
          <input id="pickup-code" name="code" type="text" required spellcheck="false" autocapitalize="off"
            aria-describedby="code-hint code-error" value="${exampleError ? "A1B2C3" : ""}" placeholder="输入取件码">
          <p id="code-hint" class="field-hint">可在「我的包裹」查看取件码。</p>
          <p id="code-error" class="field-error" hidden></p>
        </div>
        <div class="field">
          <label for="pickup-phone">收件手机号后四位<span class="required" aria-hidden="true">*</span></label>
          <input id="pickup-phone" name="phone" type="password" inputmode="numeric" required
            aria-describedby="phone-hint phone-error" value="${exampleError ? "0013" : ""}" placeholder="输入4位数字"
            ${exampleError ? 'aria-invalid="true"' : ""}>
          <p id="phone-hint" class="field-hint">请输入该包裹的收件手机号后四位。</p>
          <p id="phone-error" class="field-error" ${exampleError ? "" : "hidden"}>${icon("alert")}收件手机号后四位不符，请核对后重新输入。</p>
        </div>
      </div>
      <div id="pickup-feedback" aria-live="polite" ${exampleError ? "" : "hidden"}>
        ${exampleError ? message("核验失败，本次未出库", "", "danger") : ""}
      </div>
      <div class="form-footer">
        ${button("取消", pickupReturn ? "back-detail" : "list", "secondary")}
        <button type="submit" class="button button-primary">核验并取件${icon("arrow")}</button>
      </div>
    </form>`;
}

function pickupSuccess(item) {
  return heading("自助取件") + `
    <section class="form-card pickup-form pickup-result">
      <div class="dialog-icon result-icon">${icon("check")}</div>
      <h2>取件完成</h2><p class="muted">核验通过，包裹已出库。</p>
      ${fieldList([["快递公司", demoCompanyName(item.company)], ["运单号", item.waybill], ["取件时间", item.pickedUp]])}
      <div class="form-footer">
        ${button("继续自助取件", "pickup")}
        ${button("返回我的包裹", "list", "primary")}
      </div>
    </section>`;
}

function dialogMarkup(type, item) {
  const refusal = type === "refusal";
  const title = refusal ? "提交拒收申请" : "撤回拒收？";
  return `<dialog class="dialog package-dialog" id="operation-dialog" aria-labelledby="dialog-title" aria-describedby="dialog-summary">
    <div class="dialog-icon ${refusal ? "destructive" : ""}">${icon(refusal ? "alert" : "info")}</div>
    <h2 id="dialog-title">${title}</h2>
    <p id="dialog-summary" class="muted">${refusal ? "提交后包裹将暂停取件。" : "撤回后包裹恢复待取件。"}</p>
    <div class="identity-card"><dl class="identity-grid">
      <div><dt>快递公司</dt><dd>${escapeHtml(demoCompanyName(item.company))}</dd></div><div><dt>运单号</dt><dd>${escapeHtml(item.waybill)}</dd></div>
      ${refusal ? "" : `<div><dt>拒收申请编号</dt><dd>${item.request.id}</dd></div>
        <div><dt>拒收时间</dt><dd>${item.request.time}</dd></div>`}
    </dl></div>
    <form id="operation-form" data-type="${type}" data-item="${item.id}" data-request="${item.request?.id ?? ""}" novalidate>
      ${refusal ? `<div class="field"><label for="refusal-reason">拒收原因</label>
        <textarea id="refusal-reason" name="reason" rows="3" placeholder="填写拒收原因，供工作人员核对" autofocus></textarea>
      </div>` : ""}
      <div id="operation-feedback" aria-live="polite" hidden></div>
      <div class="actions-row">
        ${button("取消", "cancel-dialog", "secondary", refusal ? "" : "autofocus")}
        <button type="submit" class="button button-${refusal ? "danger" : "primary"}">${refusal ? "提交拒收" : "确认撤回"}</button>
      </div>
    </form>
  </dialog>`;
}

function openDialog(type, trigger) {
  const item = owned(selected);
  if (!item || !(type === "refusal" ? item.status === "待取件" : canWithdraw(item))) return;
  document.querySelector("#operation-dialog")?.remove();
  app.insertAdjacentHTML("beforeend", dialogMarkup(type, item));
  const dialog = document.querySelector("#operation-dialog");
  dialogTrigger = trigger;
  dialog.addEventListener("close", () => {
    if (!dialog.isConnected) return;
    dialog.remove();
    dialogTrigger?.focus();
  });
  dialog.addEventListener("cancel", event => {
    if (dialog.querySelector("form").getAttribute("aria-busy") === "true") event.preventDefault();
  });
  dialog.addEventListener("click", event => {
    if (event.target !== dialog || dialog.querySelector("form").getAttribute("aria-busy") === "true") return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.showModal();
}

function render(focusHeading = false) {
  const item = owned(selected);
  let content;
  if (scene === "forbidden" || (["detail", "pickup-success"].includes(view) && !item)) {
    content = heading("无法访问包裹") + `<section class="list-card">${emptyState(
      "无查询权限", "请使用有权访问该包裹的学生账号登录。", "", "shield"
    )}</section>`;
  } else if (view === "pickup") {
    content = pickupPage(page === "pickup-error");
  } else if (view === "pickup-success") {
    content = pickupSuccess(item);
  } else if (view === "detail") {
    content = detailPage(item);
  } else {
    content = listPage();
  }
  app.innerHTML = shell(content);
  pagePicker.value = page;
  if (focusHeading) {
    app.querySelector("h1").focus({ preventScroll: true });
    if (!exportMode) window.scrollTo(0, 0);
  }
}

function navigate(nextPage, nextView, id = null) {
  page = nextPage;
  view = nextView;
  selected = id;
  result = null;
  render(true);
}

function applyDemoReturnStart(item) {
  item.status = "退件中";
  item.returnStarted = refusalDemo.startedAt;
  item.request.status = "退件中";
}

function createRefusal(item, reason) {
  const firstDemoRequest = item.id === refusalDemo.recordId && !item.request;
  if (item.request) {
    item.previousRequests ??= [];
    item.previousRequests.push(item.request);
  }
  item.request = firstDemoRequest
    ? { ...refusalDemo.request, reason }
    : { id: `REJ-DEMO-${++sequence}`, reason, time: demoTimestamp(), status: "待退件" };
  item.status = "拒收待退件";
}

function withdrawRefusal(item) {
  if (canWithdraw(item)) {
    item.request.withdrawal = "撤回成功，恢复待取件";
    item.request.withdrawn = item.request.id === refusalDemo.request.id ? refusalDemo.withdrawnAt : demoTimestamp();
    item.status = "待取件";
    page = "withdrawn";
    result = ["撤回成功", "包裹已恢复待取件，可以重新办理取件。"];
    return;
  }
  const returned = item.status === "已退件";
  item.request.withdrawal = returned ? "撤回失败，退件已完成" : "撤回失败，退件已开始";
  page = "return-started";
  const reason = returned ? "退件已完成，无法恢复取件。" : "工作人员已开始退件，当前不可撤回，也无法取件。";
  result = ["撤回失败", reason, "warning", true];
}

function loadPreview(key = "list", scenario = "normal") {
  packages = demoStudentPackages();
  if (scenario === "empty") packages = packages.filter(item => item.owner !== demoAccountId("学生"));
  scene = scenario;
  filter = "";
  pickupReturn = null;
  result = null;
  sequence = 310;
  page = Object.hasOwn(screenshots, key) ? key : "list";
  view = "detail";
  statePicker.value = scene;
  const refusalPreview = ["refusal", "refused", "withdraw", "withdrawn", "return-started"].includes(page);
  selected = refusalPreview ? refusalDemo.recordId : exampleId;
  const item = owned(selected);

  if (!item && page !== "list" && !page.startsWith("pickup")) {
    render();
    return;
  }

  switch (page) {
    case "list": view = "list"; break;
    case "pickup":
    case "pickup-error": view = "pickup"; break;
    case "pickup-success":
      view = "pickup-success";
      if (item) {
        item.pickedUp = "2026-11-22 09:38:31";
        item.status = "已取件";
      }
      break;
    case "refusal":
      item.status = "待取件";
      delete item.request;
      break;
    case "refused":
      result = ["拒收申请已提交", "包裹已暂停取件。工作人员开始退件前，你可以撤回拒收。"];
      break;
    case "withdrawn":
      withdrawRefusal(item);
      break;
    case "return-started":
      applyDemoReturnStart(item);
      withdrawRefusal(item);
      break;
  }
  render();
  if (page === "refusal" || page === "withdraw") {
    openDialog(page, app.querySelector(`[data-action="${page}"]`));
    if (exportMode && page === "refusal") document.querySelector("#refusal-reason").value = refusalDemo.request.reason;
  }
}

function feedback(target, title, detail = "") {
  target.hidden = false;
  target.innerHTML = message(title, detail, "danger");
}

function fieldError(input, id, text = "") {
  const error = document.querySelector("#" + id);
  input.setAttribute("aria-invalid", String(Boolean(text)));
  error.hidden = !text;
  error.innerHTML = text ? icon("alert") + text : "";
}

async function submitDemo(form, submittingText, callback) {
  if (form.getAttribute("aria-busy") === "true") return;
  const controls = [...form.elements];
  const submit = form.querySelector('[type="submit"]');
  const label = submit.innerHTML;
  form.setAttribute("aria-busy", "true");
  controls.forEach(control => { control.disabled = true; });
  submit.textContent = submittingText;
  await new Promise(resolve => setTimeout(resolve, 320));
  if (!form.isConnected) return;
  form.removeAttribute("aria-busy");
  controls.forEach(control => { control.disabled = false; });
  submit.innerHTML = label;
  callback();
}

function handlePickup(form) {
  const code = form.elements.code;
  const phone = form.elements.phone;
  const panel = document.querySelector("#pickup-feedback");
  panel.hidden = true;
  const codeError = code.value.trim() ? "" : "请输入取件码。";
  const phoneError = /^\d{4}$/.test(phone.value) ? "" : "请输入4位数字。";
  fieldError(code, "code-error", codeError);
  fieldError(phone, "phone-error", phoneError);
  if (codeError || phoneError) {
    (codeError ? code : phone).focus();
    return;
  }
  const codeValue = code.value;
  const phoneValue = phone.value;
  submitDemo(form, "正在核验…", () => {
    if (scene === "pickup-failure") {
      feedback(panel, "未能确认出库", "请稍后重新核验。");
      return;
    }
    const item = packages.find(entry => entry.code === codeValue);
    if (!item && demoPickupDenialCodes.some(entry => entry.code === codeValue)) {
      feedback(panel, "无办理权限", "本次未出库。");
      return;
    }
    if (!item) {
      fieldError(code, "code-error", "取件码有误，请核对后重新输入。");
      feedback(panel, "核验失败，本次未出库");
      code.focus();
    } else if (!owned(item.id)) {
      feedback(panel, "无办理权限", "本次未出库。");
    } else if (item.phoneLast !== phoneValue) {
      fieldError(phone, "phone-error", "收件手机号后四位不符，请核对后重新输入。");
      feedback(panel, "核验失败，本次未出库");
      phone.focus();
    } else if (item.status !== "待取件") {
      const reason = {
        "已取件": "该包裹已取件，请勿重复办理。",
        "拒收待退件": "该包裹已暂停取件。撤回拒收并恢复待取后可重新办理。",
        "退件中": "工作人员已开始退件。",
        "已退件": "该包裹已完成退件。"
      };
      feedback(panel, "当前不可取件", reason[item.status]);
    } else {
      const pickedUp = demoCompletePickup(item);
      if (!pickedUp) {
        feedback(panel, "当前不可取件", "该包裹状态已更新，请返回包裹列表核对。");
        return;
      }
      item.status = "已取件";
      item.pickedUp = pickedUp;
      navigate("pickup-success", "pickup-success", item.id);
    }
  });
}

function handleOperation(form) {
  const type = form.dataset.type;
  const itemId = form.dataset.item;
  const requestId = form.dataset.request;
  const reason = type === "refusal" ? form.elements.reason.value.trim() : "";
  const panel = document.querySelector("#operation-feedback");
  panel.hidden = true;
  submitDemo(form, "正在提交…", () => {
    const item = owned(itemId);
    if (!item) {
      feedback(panel, "无办理权限");
      return;
    }
    if (type === "refusal") {
      if (item.status !== "待取件") {
        feedback(panel, "拒收申请提交失败", "只有待取件的包裹可以申请拒收。");
      } else if (scene === "refusal-failure") {
        feedback(panel, "拒收申请提交失败", "包裹仍可取件。请稍后重试。");
      } else {
        createRefusal(item, reason);
        page = "refused";
        result = ["拒收申请已提交", "包裹已暂停取件。工作人员开始退件前，你可以撤回拒收。"];
        render(true);
      }
      return;
    }
    if (!item.request || item.request.id !== requestId || item.request.withdrawn) {
      feedback(panel, "撤回失败", "该申请已失效，请返回包裹详情核对。");
      return;
    }
    if (scene === "return-race" && requestId === refusalDemo.request.id && canWithdraw(item)) {
      applyDemoReturnStart(item);
    }
    withdrawRefusal(item);
    render(true);
  });
}

app.addEventListener("submit", event => {
  event.preventDefault();
  if (event.target.id === "pickup-form") handlePickup(event.target);
  if (event.target.id === "operation-form") handleOperation(event.target);
});

app.addEventListener("click", event => {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;
  event.preventDefault();
  const action = trigger.dataset.action;
  switch (action) {
    case "list": navigate("list", "list"); break;
    case "pickup":
    case "pickup-from-detail":
      pickupReturn = action === "pickup-from-detail" ? selected : null;
      navigate("pickup", "pickup");
      break;
    case "detail":
    case "back-detail":
      navigate("detail", "detail", action === "detail" ? trigger.dataset.id : pickupReturn);
      break;
    case "retry-list":
      scene = "normal";
      statePicker.value = scene;
      navigate("list", "list");
      break;
    case "clear-filter":
      filter = "";
      render();
      document.querySelector("#filter").focus();
      break;
    case "refusal":
    case "withdraw": openDialog(action, trigger); break;
    case "cancel-dialog": document.querySelector("#operation-dialog").close(); break;
  }
});

app.addEventListener("change", event => {
  if (event.target.id !== "filter") return;
  filter = event.target.value;
  render();
  document.querySelector("#filter").focus();
});

pagePicker.innerHTML = Object.entries(screenshots).map(([key, [ui, , title]]) =>
  `<option value="${key}">UI-003-${ui} ${title}</option>`
).join("");
pagePicker.addEventListener("change", () => loadPreview(pagePicker.value));
statePicker.addEventListener("change", () => {
  const state = statePicker.value;
  const preview = { "pickup-failure": "pickup", "refusal-failure": "refusal", "return-race": "withdraw" };
  loadPreview(preview[state] ?? "list", state);
});
document.querySelector("#reset-prototype").addEventListener("click", () => loadPreview());
window.addEventListener("hashchange", () => {
  if (location.hash !== "#main") loadPreview(location.hash.slice(1));
});
loadPreview(location.hash.slice(1));

window.addEventListener("pageshow", event => {
  if (!event.persisted || exportMode) return;
  packages = demoStudentPackages();
  if (scene === "empty") packages = packages.filter(item => item.owner !== demoAccountId("学生"));
  render();
});
