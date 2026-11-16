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

/* Datenschutzhinweis: informiert und fragt keine Einwilligung ab, weil Digitalpath keine Cookies,
   kein Tracking und keine externen Dienste nutzt. Gespeichert wird nur, dass der Hinweis geschlossen
   wurde (Schlüssel NOTICE_KEY, beschrieben in datenschutz.html; § 165 Abs. 3 TKG 2021). */
const NOTICE_KEY = "dp.datenschutzhinweis.v1";
(() => {
  let closed = null;
  try { closed = window.localStorage.getItem(NOTICE_KEY); } catch { closed = null; }
  if (closed === "geschlossen") return;
  const box = document.createElement("aside");
  box.className = "privacy-notice";
  box.setAttribute("aria-label", "Datenschutzhinweis");
  box.innerHTML = "<p>Digitalpath setzt keine Cookies und kein Tracking ein und lädt keine externen Dienste. "
    + "Der Demonstrator speichert Eingaben nur in deinem Browser. Schließt du diesen Hinweis, wird nur das in deinem Browser vermerkt.</p>"
    + '<div class="privacy-notice-actions"><a href="/datenschutz.html">Datenschutz</a>'
    + '<button type="button">Verstanden</button></div>';
  document.body.appendChild(box);
  document.body.style.paddingBottom = `${box.offsetHeight + 24}px`;
  box.querySelector("button").addEventListener("click", () => {
    try { window.localStorage.setItem(NOTICE_KEY, "geschlossen"); } catch { /* nur für diesen Aufruf */ }
    box.remove();
    document.body.style.paddingBottom = "";
  });
})();
