"use strict";

const refusalSample = {
  recordId: "RK20261121006",
  refusalId: "JS20261121002",
  company: "jd",
  tracking: "JD000444555666",
  location: "B-1",
  arrivedAt: "2026-11-21 16:02:00",
  refusedAt: "2026-11-21 18:20:00",
  startedAt: "2026-11-22 09:40:00"
};

function demoTimestamp() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
}
