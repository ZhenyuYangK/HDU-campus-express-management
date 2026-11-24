"use strict";

const prototypePages = {
  "001": "../杨振煜_REQ-001/REQ-001_界面原型.html",
  "002": "../任奕阳_REQ-002/REQ-002_界面原型.html",
  "003": "../张海睿_REQ_003/REQ-003_界面原型.html"
};

const roleMenu = {
  student: {
    home: ["003", "list", "我的包裹"],
    groups: [
      ["包裹服务", [["003", "list", "我的包裹", "box"], ["003", "pickup", "自助取件", "shield"]]],
      ["账号安全", [["001", "password", "修改密码", "lock"]]]
    ]
  },
  admin: {
    home: ["001", "account-create", "账号管理"],
    groups: [
      ["账号与权限", [["001", "account-create", "创建账号", "users"], ["001", "password-reset", "重置密码", "lock"], ["001", "phone-change", "变更手机号", "phone"]]],
      ["基础信息", [["001", "company-list", "快递公司", "truck"], ["001", "locations", "存放位置", "grid"]]],
      ["收件与退件", [["002", "records-admin", "记录查询（只读）", "search"]]]
    ]
  },
  staff: {
    home: ["002", "intake", "收件入库"],
    groups: [
      ["收件与退件", [
        ["002", "intake", "收件入库", "box"], ["002", "linking/list", "待关联补关联", "users"],
        ["002", "returns", "退件办理", "return"], ["002", "correction", "记录更正", "edit"],
        ["002", "records", "记录查询", "search"]
      ]]
    ]
  }
};

function prototypeHref(module, route) {
  const target = new URL(prototypePages[module], location.href);
  if (target.pathname === location.pathname) return `#${route}`;
  if (new URLSearchParams(location.search).get("export") === "1") target.searchParams.set("export", "1");
  target.hash = route;
  return target.href;
}

function roleBrand(role, logo, packageActions = false) {
  const [module, route, label] = roleMenu[role]?.home ?? ["001", "login", "登录页"];
  return `<a class="brand" href="${prototypeHref(module, route)}" aria-label="CampusDelivery Station ${label}" ${packageActions ? 'data-action="list"' : ""}>
    <img class="brand-mark" src="${logo}" width="34" height="34" alt="">
    <span class="brand-name">CampusDelivery Station</span>
  </a>`;
}

function roleNavigation(role, current, icon, packageActions = false) {
  const groups = roleMenu[role].groups.map(([caption, items]) => `<div class="nav-group"><p class="sidebar-caption">${caption}</p>
    ${items.map(([module, route, label, glyph]) => {
      const selected = route === current ? 'aria-current="page"' : "";
      const action = packageActions && module === "003" ? `data-action="${route}"` : "";
      return `<a class="nav-item" href="${prototypeHref(module, route)}" ${selected} ${action}>${icon(glyph)}<span>${label}</span></a>`;
    }).join("")}
  </div>`);
  return `<nav>${groups.join("")}</nav>`;
}
