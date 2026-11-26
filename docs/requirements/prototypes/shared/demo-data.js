"use strict";

const demoStorageKey = "campus-delivery.req001.demo.v1";
const demoExport = new URLSearchParams(location.search).get("export") === "1";
const demoDefaultIds = { "学生": "00120001", "工作人员": "staff001", "管理员": "admin001" };
const demoDefaultAccounts = {
  "00120001": { name: "示例学生", phone: "13800000001", role: "学生", changeReason: "first" },
  "00120002": { name: "示例学生乙", phone: "13900000009", role: "学生", changeReason: "first" },
  staff001: { name: "示例工作人员", phone: "13800000002", role: "工作人员" },
  admin001: { name: "示例管理员", phone: "13800000003", role: "管理员" }
};

const demoInitialCompanies = [
  ["sf", "顺丰速运"],
  ["jd", "京东快递"],
  ["yd", "韵达快递"],
  ["zt", "中通快递"],
  ["yt", "圆通速递"],
  ["st", "申通快递"],
  ["jt", "极兔速递"],
  ["db", "德邦快递"],
  ["post", "中国邮政"],
  ["ems", "邮政EMS"],
  ["cainiao", "菜鸟速递"],
  ["ky", "跨越速运"],
].map(([id, name]) => ({ id, name }));

const demoIntakeStudent = { ...demoDefaultAccounts["00120001"], account: "00120001" };
const demoReturn = {
  ...refusalSample,
  returnId: "TJ20261122002", finishedAt: "2026-11-22 10:30:00"
};
const demoIntakeExample = {
  id: "RK20261122003", company: "yt", tracking: "YT000555666777", receiver: demoIntakeStudent.name,
  phone: demoIntakeStudent.phone, location: "B-2", status: "待取件", account: demoIntakeStudent.account,
  arrivedAt: "2026-11-22 10:12:00", pickupCode: "001234"
};
const demoInitialIntakes = [
  {
    id: "RK20261122001", company: "sf", tracking: "SF000123456789", receiver: demoIntakeStudent.name,
    phone: demoIntakeStudent.phone, location: "A-3", status: "待取件", account: null, arrivedAt: "2026-11-22 09:05:00",
    pickupCode: "009876",
    correction: { field: "存放位置名称", operator: "示例工作人员", at: "2026-11-22 09:30:00" }
  },
  {
    id: demoReturn.recordId, company: demoReturn.company, tracking: demoReturn.tracking, receiver: demoIntakeStudent.name,
    phone: demoIntakeStudent.phone, location: demoReturn.location, status: "拒收待退件", account: demoIntakeStudent.account, arrivedAt: demoReturn.arrivedAt
  },
  {
    id: "RK20261122002", company: "jd", tracking: "JD000987654321", receiver: demoIntakeStudent.name,
    phone: demoIntakeStudent.phone, location: "A-1", status: "已取件", account: demoIntakeStudent.account,
    arrivedAt: "2026-11-21 16:40:00", pickedAt: "2026-11-21 17:05:00"
  },
  demoIntakeExample
];

const demoPackageExampleId = "IN-DEMO-301";
// 入库、拒收和退件开始时间对应REQ-002退件办理的同一组合成记录。
const demoRefusal = {
  recordId: refusalSample.recordId,
  request: { id: refusalSample.refusalId, reason: "商品已申请退款。", time: refusalSample.refusedAt, status: "待退件" },
  startedAt: refusalSample.startedAt,
  withdrawnAt: "2026-11-22 09:39:00"
};
const demoSamplePackages = [
  { id: demoPackageExampleId, owner: demoDefaultIds["学生"], company: "zt", waybill: "001234567890", shelf: "C-2", code: "A1B2C3", phoneLast: "0003", arrived: "2026-11-22 09:12:00", status: "待取件" },
  { id: demoRefusal.recordId, owner: demoDefaultIds["学生"], company: refusalSample.company, waybill: refusalSample.tracking, shelf: refusalSample.location, code: "JD04P8", phoneLast: "0001", arrived: refusalSample.arrivedAt, status: "拒收待退件", request: demoRefusal.request },
  { id: "IN-DEMO-302", owner: demoDefaultIds["学生"], company: "yd", waybill: "001234567890", shelf: "B-5", code: "00B215", phoneLast: "0042", arrived: "2026-11-22 08:46:00", status: "待取件" },
  { id: "IN-DEMO-303", owner: demoDefaultIds["学生"], company: "sf", waybill: "SF000940120667", shelf: "H-1", code: "SF6K11", phoneLast: "0001", arrived: "2026-11-21 12:40:00", status: "已取件", pickedUp: "2026-11-21 16:06:00" },
  { id: "IN-DEMO-305", owner: demoDefaultIds["学生"], company: "yt", waybill: "YT000000576101", shelf: "A-6", code: "Y0A617", phoneLast: "0003", arrived: "2026-11-21 08:16:00", status: "退件中", returnStarted: "2026-11-22 08:35:00" },
  { id: "IN-DEMO-306", owner: demoDefaultIds["学生"], company: "st", waybill: "ST000601708215", shelf: "L-6", code: "ST0L67", phoneLast: "0003", arrived: "2026-11-20 10:30:00", status: "已退件", returnStarted: "2026-11-21 08:33:00", returned: "2026-11-21 11:42:00", request: { id: "REJ-DEMO-306", reason: "商家已补发。", time: "2026-11-20 15:24:00", status: "已退件" } },
  { id: "IN-DEMO-OTHER", owner: "00120002", code: "OTHER1" },
  { id: "IN-DEMO-UNLINKED", owner: null, code: "UNLINK" }
];

const demoShippedEvent = { by: "staff002", at: "2026-11-23 10:00:00", company: "jd", tracking: "001234567890" };

const demoCompanyStats = {
  inbound: [
    ["RK20261102001", "sf", "SF000123456789", "2026-11-02 09:00:00", "已关联"],
    ["RK20261103002", "jd", "JD000987654321", "2026-11-03 09:00:00", "已关联"],
    ["RK20261104003", "zt", "ZT000111222333", "2026-11-04 09:00:00", "已关联"],
    ["RK20261105004", "yd", "YD000555666777", "2026-11-05 09:00:00", "已关联"],
    ["RK20261106005", "yt", "YT000555666778", "2026-11-06 09:00:00", "待关联"],
    ["RK20261107006", "st", "ST000444555666", "2026-11-07 09:00:00", "已关联"],
    ["RK20261108007", "jt", "JT000777888999", "2026-11-08 09:00:00", "已关联"],
    ["RK20261120009", "db", "DB000123123123", "2026-11-20 09:00:00", "已关联"],
    ["IN-OUT", "sf", "SF000999888777", "2026-10-31 09:00:00", "已关联"]
  ],
  pickup: [
    ["RK20261102001", "sf", "SF000123456789", "2026-11-02 10:00:00", "成功出库"],
    ["RK20261103002", "jd", "JD000987654321", "2026-11-03 10:00:00", "成功出库"],
    ["RK20261105004", "yd", "YD000555666777", "2026-11-05 10:00:00", "核验失败"],
    ["IN-OUT", "sf", "SF000999888777", "2026-10-31 10:00:00", "成功出库"]
  ],
  shipped: [
    ["SJ20261113001", "已寄出", "2026-11-13 10:00:00", "sf", "SF000321654987"],
    ["SJ20261114002", "已寄出", "2026-11-14 10:00:00", "jd", "JD000654987321"],
    ["SJ20261115003", "待受理", "—", "zt", "ZT000321987654"],
    ["S-OUT", "已寄出", "2026-10-31 10:00:00", "yd", "YD000987321654"]
  ],
};

function readDemoData() {
  const saved = demoExport ? null : JSON.parse(sessionStorage.getItem(demoStorageKey));
  return {
    accounts: { ...structuredClone(demoDefaultAccounts), ...saved?.accounts },
    currentId: saved?.currentId ?? null,
    companies: saved?.companies ?? structuredClone(demoInitialCompanies),
    intakes: saved?.intakes ?? structuredClone(demoInitialIntakes),
    shipments: saved?.shipments ?? {}
  };
}

let demoData = readDemoData();

function saveDemoData() {
  if (!demoExport) sessionStorage.setItem(demoStorageKey, JSON.stringify(demoData));
}

function resetDemoData() {
  if (!demoExport) sessionStorage.removeItem(demoStorageKey);
  demoData = readDemoData();
}

window.addEventListener("pageshow", event => {
  if (event.persisted && !demoExport) demoData = readDemoData();
});

function demoAccountId(role) {
  const { accounts, currentId } = demoData;
  return accounts[currentId]?.role === role ? currentId : demoDefaultIds[role];
}

function demoStudentAccounts() {
  return Object.entries(demoData.accounts)
    .filter(([, account]) => account.role === "学生")
    .map(([account, data]) => ({ account, name: data.name, phone: data.phone }));
}

function demoStudentForPhone(phone) {
  const matches = demoStudentAccounts().filter(account => account.phone === phone);
  return matches.length === 1 ? matches[0].account : null;
}

function demoCompanyName(id) {
  return demoData.companies.find(company => company.id === id)?.name ?? "—";
}

function demoHasCompany(id) {
  return demoData.companies.some(company => company.id === id);
}

function demoCompanyReferenced(id) {
  return demoData.intakes.some(record => record.company === id)
    || demoSamplePackages.some(record => record.company === id)
    || demoShippedEvent.company === id
    || Object.values(demoData.shipments).some(record => record.shipped.company === id)
    || demoCompanyStats.inbound.some(row => row[1] === id)
    || demoCompanyStats.pickup.some(row => row[1] === id)
    || demoCompanyStats.shipped.some(row => row[3] === id);
}
