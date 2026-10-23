const filters = [...document.querySelectorAll(".filter-button")];
const groups = [...document.querySelectorAll(".project-group")];
const count = document.querySelector(".result-count");

filters.forEach((button) => {
  button.addEventListener("click", () => {
    const category = button.dataset.filter;
    filters.forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    let visible = 0;
    groups.forEach((group) => {
      const showGroup = category === "all" || group.dataset.group === category;
      group.hidden = !showGroup;
      if (showGroup) visible += group.querySelectorAll(".project-card").length;
    });
    count.textContent = `${visible} ${visible === 1 ? "Eintrag" : "Einträge"}`;
  });
});

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".primary-nav");
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
  navigation.classList.toggle("is-open", open);
});
navigation.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Menü öffnen");
    navigation.classList.remove("is-open");
  });
});

document.querySelector("#year").textContent = new Date().getFullYear();
