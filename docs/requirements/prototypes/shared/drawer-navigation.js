"use strict";

document.addEventListener("keydown", event => {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  const closeButton = document.querySelector(".drawer [data-drawer-close]");
  if (!closeButton) return;
  event.preventDefault();
  closeButton.click();
});
