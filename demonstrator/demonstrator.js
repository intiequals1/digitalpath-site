/* Digitalpath · Digitaler Demonstrator DP—D1
   Dokumentation und Auswertung von Beobachtungen aus Customer Journeys.
   Läuft vollständig im Browser; Daten liegen nur im localStorage dieses Browsers. */
(() => {
  "use strict";

  const KEY_B = "dp.demonstrator.betrieb.v1";
  const KEY_O = "dp.demonstrator.beobachtungen.v1";
  const K_MIN = 3;   // Werte unter 3 werden nur als "<3" gezeigt
  const N_MIN = 5;   // Auswertung erst ab 5 Personen mit Forschungseinwilligung je Version
  const TEXT_VERSION = "E-1";

  const TEMPLATES = {
    "idee-klaeren": {
      titel: "Eine Idee klären",
      stationen: [
        { id: "s1", titel: "Die Idee in eigenen Worten aufschreiben" },
        { id: "s2", titel: "Annahmen sichtbar machen" },
        { id: "s3", titel: "Den ersten kleinen Schritt wählen" },
        { id: "s4", titel: "Rückschau" }
      ]
    },
    "mit-ki-arbeiten": {
      titel: "Mit KI an der eigenen Idee arbeiten",
      stationen: [
        { id: "s1", titel: "Einen Auftrag formulieren" },
        { id: "s2", titel: "Lokal und online vergleichen" },
        { id: "s3", titel: "Ergebnisse prüfen" },
        { id: "s4", titel: "KI-Nutzung offenlegen" }
      ]
    }
  };

  const TYPES = [
    { id: "frage", label: "Frage", kurz: "Frage" },
    { id: "unsicherheit", label: "Unsicherheit", kurz: "Unsicherheit", cat: true },
    { id: "barriere", label: "Barriere", kurz: "Barriere", cat: true },
    { id: "hilfe", label: "Hilfreiche Unterstützung", kurz: "Hilfe", support: true },
    { id: "uebersprungen", label: "Station übersprungen", kurz: "Übersprungen" },
    { id: "pause", label: "Pause oder Abbruch", kurz: "Pause/Abbruch" },
    { id: "idee", label: "Idee entstanden", kurz: "Idee" }
  ];
  const CATS = [
    { id: "verstaendnis", label: "Verständnis" },
    { id: "bedienung", label: "Bedienung" },
    { id: "zugang", label: "Zugang & Barrierefreiheit" },
    { id: "vertrauen", label: "Vertrauen & Datenschutz" },
    { id: "tempo", label: "Tempo & Zeit" }
  ];
  const SUPPORT = [
    { id: "erklaeren", label: "Erklären" },
    { id: "vormachen", label: "Vormachen" },
    { id: "ausprobieren", label: "Selbst ausprobieren lassen" },
    { id: "pause", label: "Pause" },
    { id: "austausch", label: "Austausch mit anderen" }
  ];
  const ROLES = {
    teilnehmend: {
      label: "Teilnehmende Person",
      tabs: ["einwilligung", "meinedaten"],
      note: "<b>Teilnehmende Person:</b> Du entscheidest, ob und wofür dokumentiert wird, siehst, was zu deinem Pseudonym festgehalten ist, und kannst jederzeit widerrufen."
    },
    begleitung: {
      label: "Begleitung",
      tabs: ["beobachten", "deuten", "journey", "entscheidungen"],
      note: "<b>Begleitung:</b> Du hältst den Weg durch die Journey fest, nicht die Person. Beobachtung, Deutung und Empfehlung bleiben getrennt; Änderungen an der Journey brauchen eine Begründung."
    },
    auswertung: {
      label: "Auswertung",
      tabs: ["auswertung", "entscheidungen"],
      note: "<b>Auswertung:</b> Du siehst nur Zusammenfassungen von Personen mit Forschungseinwilligung, ohne Pseudonyme und ohne Notizen."
    }
  };
  const TABS = {
    einwilligung: "Einwilligung",
    meinedaten: "Meine Daten",
    beobachten: "Beobachten",
    deuten: "Deuten",
    journey: "Journey",
    entscheidungen: "Entscheidungen",
    auswertung: "Auswertung"
  };
  const PII = [
    { re: /[^\s@]+@[^\s@]+\.[a-z]{2,}/i, was: "eine E-Mail-Adresse" },
    { re: /(\+|00)\d[\d\s/-]{6,}\d|\b0\d{2,4}[\s/-]?\d{4,}/, was: "eine Telefonnummer" },
    { re: /\b(diagnos|krank|therap|medikament|behinder|depress|adhs|autis|psych)/i, was: "eine Gesundheitsangabe" },
    { re: /\b(herr|frau|hr\.|fr\.)\s+[A-ZÄÖÜ]/, was: "einen Namen" }
  ];

  /* ---------- Speicher ---------- */
  const mem = {};
  function load(key) {
    let raw = null;
    try { raw = window.localStorage.getItem(key); } catch (e) { raw = null; }
    if (raw === null && Object.prototype.hasOwnProperty.call(mem, key)) raw = mem[key];
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function persist() {
    [[KEY_B, B], [KEY_O, O]].forEach(([key, value]) => {
      const raw = JSON.stringify(value);
      mem[key] = raw;
      try { window.localStorage.setItem(key, raw); } catch (e) { /* bleibt im Arbeitsspeicher */ }
    });
  }

  /* ---------- Hilfen ---------- */
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function today() { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function nowStamp() { const d = new Date(); return today() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function fmtDate(iso) {
    if (!iso) return "";
    const p = iso.slice(0, 10).split("-");
    return p[2] + "." + p[1] + "." + p[0] + (iso.length > 10 ? ", " + iso.slice(11, 16) : "");
  }
  function nextId(prefix, kind, width) {
    B.counter[kind] = (B.counter[kind] || 0) + 1;
    return prefix + "-" + String(B.counter[kind]).padStart(width, "0");
  }
  function makePseudonym() {
    const abc = "ACDEFHJKLMNPQRTUVWXY3479";
    let p;
    do {
      p = "P-";
      const buf = new Uint32Array(4);
      if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(buf);
      else for (let i = 0; i < 4; i++) buf[i] = Math.floor(Math.random() * 1e6);
      for (let i = 0; i < 4; i++) p += abc[buf[i] % abc.length];
    } while (B.einwilligungen.some((c) => c.pseudonym === p));
    return p;
  }
  const typeOf = (id) => TYPES.find((t) => t.id === id) || { label: id, kurz: id };
  const catLabel = (id) => (CATS.find((c) => c.id === id) || { label: "" }).label;
  const supLabel = (id) => (SUPPORT.find((c) => c.id === id) || { label: "" }).label;
  function piiCheck(text) {
    const hit = PII.find((p) => p.re.test(text || ""));
    return hit ? hit.was : null;
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 800);
  }

  /* ---------- Datenmodell ---------- */
  let B = null; // Betrieb: Journeys, Versionen, Einwilligungsregister, Deutungen, Empfehlungen, Entscheidungen
  let O = null; // Beobachtungen: pseudonyme Einträge

  function baseStations(jid) { return TEMPLATES[jid].stationen.map((s) => ({ id: s.id, titel: s.titel, aktiv: true })); }
  function ensureJourney(jid, datum) {
    if (B.journeys[jid]) return;
    B.journeys[jid] = { versionen: [{ v: "1.0", datum: datum || today(), stationen: baseStations(jid) }] };
    B.entscheidungen.push({ id: nextId("D", "d", 2), journeyId: jid, v: "1.0", datum: datum || today(), aenderung: "Erste Fassung mit " + TEMPLATES[jid].stationen.length + " Stationen, übernommen von coolwebtoday.org", begruendung: "Ausgangsversion für den Demonstrator", bezug: null });
  }
  function emptyState() {
    B = { schema: 1, journeyId: "idee-klaeren", journeys: {}, einwilligungen: [], interpretationen: [], empfehlungen: [], entscheidungen: [], counter: { b: 0, i: 0, e: 0, d: 0 } };
    O = { schema: 1, beobachtungen: [] };
    ensureJourney("idee-klaeren");
  }
  const J = () => B.journeys[B.journeyId];
  const lastVersion = (j) => j.versionen[j.versionen.length - 1];
  const versionOf = (jid, v) => (B.journeys[jid] ? B.journeys[jid].versionen.find((x) => x.v === v) : null);
  function stationTitle(jid, v, sid) {
    const ver = versionOf(jid, v);
    const s = ver && ver.stationen.find((x) => x.id === sid);
    if (s) return s.titel;
    const any = (B.journeys[jid] ? B.journeys[jid].versionen : []).flatMap((x) => x.stationen).find((x) => x.id === sid);
    return any ? any.titel : sid;
  }
  const consentOf = (p) => B.einwilligungen.find((c) => c.pseudonym === p);
  const canDoc = (c) => !!(c && c.doku && !c.widerrufenAm);
  const canResearch = (c) => !!(c && c.doku && c.forschung && !c.widerrufenAm);

  function describeChange(a, b) {
    const parts = [];
    const am = {}, bm = {};
    a.forEach((s) => { am[s.id] = s; });
    b.forEach((s) => { bm[s.id] = s; });
    b.forEach((s) => {
      const o = am[s.id];
      if (!o) parts.push("Station „" + s.titel + "“ ergänzt");
      else {
        if (o.aktiv && !s.aktiv) parts.push("„" + s.titel + "“ nicht mehr angeboten");
        if (!o.aktiv && s.aktiv) parts.push("„" + s.titel + "“ wieder angeboten");
      }
    });
    const ao = a.map((s) => s.id).filter((id) => bm[id]).join();
    const bo = b.map((s) => s.id).filter((id) => am[id]).join();
    if (ao !== bo) parts.push("Reihenfolge geändert");
    return parts.join("; ");
  }
  function bumpVersion(v) { const p = v.split("."); return p[0] + "." + (Number(p[1]) + 1); }

  /* ---------- Beispieldaten ---------- */
  function sampleState() {
    emptyState();
    B.journeys = {}; B.entscheidungen = []; B.counter = { b: 0, i: 0, e: 0, d: 0 };
    ensureJourney("idee-klaeren", "2026-10-01");
    const v10 = baseStations("idee-klaeren");
    const v11 = [v10[0], { id: "s5", titel: "Ein Beispiel-Steckbrief ansehen", aktiv: true }, v10[1], v10[2], v10[3]];
    B.journeys["idee-klaeren"].versionen.push({ v: "1.1", datum: "2026-10-16", stationen: clone(v11) });

    const P = ["P-3HKD", "P-7QWM", "P-A2XR", "P-C9TF", "P-K4NB", "P-M8VJ", "P-UV3E", "P-R5LZ", "P-W4HT", "P-X7DN", "P-Y3QE"];
    const days = ["2026-10-02", "2026-10-03", "2026-10-03", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-06", "2026-10-07", "2026-10-17", "2026-10-18", "2026-10-20"];
    P.forEach((p, i) => {
      const c = { pseudonym: p, datum: days[i], text: TEXT_VERSION, doku: true, forschung: i !== 6, verlauf: [{ datum: days[i], was: i === 6 ? "Dokumentation erteilt, Forschung nicht erteilt" : "Dokumentation und Forschung erteilt" }] };
      if (i === 7) { c.doku = false; c.forschung = false; c.widerrufenAm = "2026-10-09"; c.verlauf.push({ datum: "2026-10-09", was: "Alles widerrufen, Einträge gelöscht" }); }
      B.einwilligungen.push(c);
    });

    // [Person, Version, Station, Art, Kategorie/Unterstützung, Notiz, Uhrzeit]
    const spec = [
      [0, "1.0", "s1", "frage", "", "Fragt, wie ausführlich die Ausgangsfrage sein soll.", "14:05"],
      [1, "1.0", "s1", "frage", "", "", "10:12"],
      [2, "1.0", "s1", "frage", "", "Fragt, ob die Idee schon fertig sein muss.", "15:20"],
      [3, "1.0", "s1", "frage", "", "", "09:40"],
      [4, "1.0", "s1", "unsicherheit", "tempo", "Möchte mehr Zeit für den ersten Satz.", "13:10"],
      [0, "1.0", "s1", "hilfe", "erklaeren", "", "14:09"],
      [2, "1.0", "s1", "hilfe", "erklaeren", "Ein Satz als Beispiel hat gereicht.", "15:24"],
      [5, "1.0", "s1", "idee", "", "", "11:02"],
      [0, "1.0", "s2", "unsicherheit", "verstaendnis", "Fragt, was mit „Annahme“ gemeint ist.", "14:21"],
      [1, "1.0", "s2", "unsicherheit", "verstaendnis", "", "10:30"],
      [3, "1.0", "s2", "unsicherheit", "verstaendnis", "Verwechselt Annahme mit Ziel.", "09:58"],
      [4, "1.0", "s2", "unsicherheit", "verstaendnis", "", "13:31"],
      [5, "1.0", "s2", "unsicherheit", "verstaendnis", "", "11:15"],
      [6, "1.0", "s2", "unsicherheit", "verstaendnis", "Unklar, wozu Annahmen aufgeschrieben werden.", "16:05"],
      [1, "1.0", "s2", "barriere", "bedienung", "Findet im Zeichenwerkzeug die Verbindungslinie nicht.", "10:36"],
      [2, "1.0", "s2", "barriere", "bedienung", "", "15:41"],
      [5, "1.0", "s2", "barriere", "bedienung", "Zoomt versehentlich aus der Zeichenfläche heraus.", "11:22"],
      [3, "1.0", "s2", "barriere", "zugang", "Kontrast der Zeichenfläche zu schwach.", "10:04"],
      [1, "1.0", "s2", "hilfe", "vormachen", "Gemeinsam eine erste Annahme aufgezeichnet.", "10:41"],
      [4, "1.0", "s2", "hilfe", "vormachen", "", "13:40"],
      [5, "1.0", "s2", "hilfe", "vormachen", "", "11:25"],
      [6, "1.0", "s2", "hilfe", "vormachen", "", "16:10"],
      [0, "1.0", "s2", "hilfe", "ausprobieren", "", "14:30"],
      [3, "1.0", "s2", "hilfe", "ausprobieren", "", "10:10"],
      [2, "1.0", "s2", "frage", "", "", "15:45"],
      [4, "1.0", "s2", "pause", "", "Kurze Pause, danach weiter.", "13:45"],
      [0, "1.0", "s3", "idee", "", "Will die Idee zuerst mit zwei Personen aus dem Haus besprechen.", "14:44"],
      [1, "1.0", "s3", "idee", "", "", "10:55"],
      [3, "1.0", "s3", "idee", "", "", "10:20"],
      [5, "1.0", "s3", "idee", "", "", "11:40"],
      [2, "1.0", "s3", "unsicherheit", "vertrauen", "Unsicher, ob jemand die Idee übernimmt.", "15:58"],
      [2, "1.0", "s3", "hilfe", "austausch", "", "16:02"],
      [4, "1.0", "s3", "hilfe", "austausch", "Austausch in der Kleingruppe brachte den Schritt.", "13:58"],
      [4, "1.0", "s3", "frage", "", "", "14:01"],
      [3, "1.0", "s4", "uebersprungen", "", "Wollte lieber gleich anfangen.", "10:31"],
      [5, "1.0", "s4", "uebersprungen", "", "", "11:52"],
      [4, "1.0", "s4", "idee", "", "", "14:12"],
      [1, "1.0", "s4", "hilfe", "erklaeren", "", "11:05"],
      [0, "1.0", "s4", "unsicherheit", "tempo", "Rückschau kam zu knapp vor Ende.", "14:58"],
      [2, "1.0", "s4", "unsicherheit", "tempo", "", "16:15"],
      [8, "1.1", "s5", "hilfe", "erklaeren", "Das Beispiel hat den Begriff geklärt.", "10:15"],
      [9, "1.1", "s5", "hilfe", "erklaeren", "", "14:20"],
      [10, "1.1", "s2", "unsicherheit", "verstaendnis", "", "11:30"],
      [8, "1.1", "s2", "barriere", "bedienung", "", "10:28"],
      [9, "1.1", "s3", "idee", "", "", "14:51"],
      [10, "1.1", "s3", "idee", "", "", "11:55"]
    ];
    O.beobachtungen = spec.map(([pi, v, s, typ, det, notiz, time]) => {
      const t = typeOf(typ);
      return { id: nextId("B", "b", 3), journeyId: "idee-klaeren", version: v, station: s, pseudonym: P[pi], typ, kat: t.cat ? det : null, hilfe: t.support ? det : null, notiz, zeit: days[pi] + " " + time };
    });
    const ids = (pred) => O.beobachtungen.filter(pred).map((o) => o.id);
    B.interpretationen = [
      { id: nextId("I", "i", 2), journeyId: "idee-klaeren", datum: "2026-10-12", text: "Der Begriff „Annahme“ ist ohne Beispiel schwer greifbar.", bezug: ids((o) => o.version === "1.0" && o.station === "s2" && o.kat === "verstaendnis") },
      { id: nextId("I", "i", 2), journeyId: "idee-klaeren", datum: "2026-10-12", text: "Beim ersten Mal bindet das Zeichenwerkzeug mehr Aufmerksamkeit als die Annahmen selbst.", bezug: ids((o) => o.version === "1.0" && o.station === "s2" && o.typ === "barriere") },
      { id: nextId("I", "i", 2), journeyId: "idee-klaeren", datum: "2026-10-13", text: "Die Rückschau fällt weg, wenn die Zeit knapp wird.", bezug: ids((o) => o.version === "1.0" && o.station === "s4" && (o.typ === "uebersprungen" || o.kat === "tempo")) }
    ];
    B.empfehlungen = [
      { id: nextId("E", "e", 2), journeyId: "idee-klaeren", datum: "2026-10-14", text: "Vor „Annahmen sichtbar machen“ einen ausgefüllten Beispiel-Steckbrief zeigen.", bezug: "I-01" },
      { id: nextId("E", "e", 2), journeyId: "idee-klaeren", datum: "2026-10-14", text: "Annahmen auch auf Papier anbieten; das Zeichenwerkzeug bleibt freiwillig.", bezug: "I-02" },
      { id: nextId("E", "e", 2), journeyId: "idee-klaeren", datum: "2026-10-14", text: "Nach jeder Station eine kurze Rückschau-Frage anbieten, nicht nur am Schluss.", bezug: "I-03" }
    ];
    B.entscheidungen.push({ id: nextId("D", "d", 2), journeyId: "idee-klaeren", v: "1.1", datum: "2026-10-16", aenderung: describeChange(v10, v11), begruendung: "Fünf von sechs Personen mit Forschungseinwilligung waren bei „Annahmen sichtbar machen“ unsicher, was eine Annahme ist (I-01).", bezug: "E-01" });
  }

  /* ---------- Oberfläche ---------- */
  const ui = {
    role: "teilnehmend",
    tab: { teilnehmend: "einwilligung", begleitung: "beobachten", auswertung: "auswertung" },
    consentResult: null,
    lookup: null,
    confirmWipe: false,
    confirmRevoke: false,
    draft: null,
    obs: { p: null, s: null, typ: "unsicherheit", kat: null, hilfe: null, notiz: "" },
    pick: {},
    deutStation: "",
    interpText: "",
    empText: "",
    empInterp: "",
    evalVersion: null
  };

  function setStatus(msg) { const el = $("#status"); if (el) el.textContent = msg || ""; }

  function renderRoles() {
    $("#roles").innerHTML = Object.keys(ROLES).map((r) =>
      `<button class="role-button" type="button" data-action="role" data-v="${r}" aria-pressed="${ui.role === r}">${esc(ROLES[r].label)}</button>`).join("");
    $("#role-note").innerHTML = ROLES[ui.role].note;
  }
  function renderTabs() {
    const tabs = ROLES[ui.role].tabs;
    if (!tabs.includes(ui.tab[ui.role])) ui.tab[ui.role] = tabs[0];
    $("#tabs").innerHTML = tabs.map((t, i) =>
      `<button class="tab-button" type="button" role="tab" id="tab-${t}" aria-controls="panel" aria-selected="${ui.tab[ui.role] === t}" data-action="tab" data-v="${t}"><span class="tab-no">0${i + 1}</span>${esc(TABS[t])}</button>`).join("");
    $("#panel").setAttribute("aria-labelledby", "tab-" + ui.tab[ui.role]);
  }
  function renderStore() {
    const versions = Object.values(B.journeys).reduce((n, j) => n + j.versionen.length, 0);
    $("#store").innerHTML =
      `<div><b>Betrieb</b><em>${versions}</em> Journey-Versionen · <em>${B.einwilligungen.length}</em> Einträge im Einwilligungsregister · <em>${B.interpretationen.length + B.empfehlungen.length}</em> Deutungen und Empfehlungen · <em>${B.entscheidungen.length}</em> Entscheidungen</div>` +
      `<div><b>Beobachtungen, pseudonym</b><em>${O.beobachtungen.length}</em> Einträge, verknüpft nur über das Pseudonym</div>` +
      `<div><b>Forschungsausgabe</b>wird bei Bedarf berechnet, nie gespeichert</div>`;
  }

  function keyOf(el) {
    if (!el || el === document.body) return null;
    if (el.id) return "#" + el.id;
    if (el.dataset && el.dataset.action) return "a|" + el.dataset.action + "|" + (el.dataset.v || el.dataset.id || el.dataset.i || el.dataset.p || el.dataset.d || "");
    if (el.name) return "n|" + el.name;
    return null;
  }
  function restoreFocus(key) {
    if (!key) return;
    let el = null;
    if (key[0] === "#") el = document.getElementById(key.slice(1));
    else {
      el = Array.from(document.querySelectorAll("[data-action],[name]")).find((x) => keyOf(x) === key);
    }
    if (el && typeof el.focus === "function") el.focus({ preventScroll: true });
  }

  function render() {
    const key = keyOf(document.activeElement);
    renderRoles();
    renderTabs();
    renderStore();
    const t = ui.tab[ui.role];
    const views = { einwilligung: viewEinwilligung, meinedaten: viewMeineDaten, beobachten: viewBeobachten, deuten: viewDeuten, journey: viewJourney, entscheidungen: viewEntscheidungen, auswertung: viewAuswertung };
    $("#panel").innerHTML = views[t]();
    restoreFocus(key);
  }

  /* ----- Teilnehmende: Einwilligung ----- */
  function viewEinwilligung() {
    const r = ui.consentResult;
    const form =
      `<form class="card" data-form="consent" novalidate>
        <h3>Einwilligung für diesen Durchlauf</h3>
        <p class="small">Beispieltext ${TEXT_VERSION}. Alle Punkte sind freiwillig. Die Journey kannst du auch ohne Einwilligung machen.</p>
        <h4>Was festgehalten wird</h4>
        <p>An welcher Station Fragen, Unsicherheiten, Barrieren oder hilfreiche Unterstützung auftreten, dazu kurze Notizen der Begleitung ohne Namen.</p>
        <h4>Was nicht festgehalten wird</h4>
        <p>Name, Kontaktdaten, Gesundheitsangaben, Bild- oder Tonaufnahmen. Es gibt keine Bewertung von Leistung oder Tempo.</p>
        <h4>Wer was sieht</h4>
        <p>Die Begleitung sieht die Einträge zu deinem Pseudonym. Die Auswertung sieht nur Zusammenfassungen, ohne Pseudonyme und ohne Notizen.</p>
        <h4>Widerruf</h4>
        <p>Jederzeit unter „Meine Daten“, ohne Begründung und ohne Nachteil.</p>
        <label class="check"><input type="checkbox" name="doku"><span>Die Begleitung darf meinen Weg durch die Journey pseudonym festhalten.</span></label>
        <label class="check is-disabled" id="forschung-label"><input type="checkbox" name="forschung" disabled><span>Diese Einträge dürfen zusammengefasst ausgewertet werden, um die Journeys weiterzuentwickeln (Forschung). Setzt das Festhalten voraus.</span></label>
        <div class="actions"><button class="dbtn" type="submit">Entscheidung speichern</button></div>
      </form>`;
    let res;
    if (r && r.pseudonym) {
      const c = consentOf(r.pseudonym);
      res = `<div class="card" aria-live="polite">
        <h3>Dein Pseudonym</h3>
        <div class="pseudonym">${esc(r.pseudonym)}</div>
        <p>Notiere es. Damit siehst du unter „Meine Daten“, was festgehalten ist, und kannst widerrufen. Ein Name wird nirgends gespeichert.</p>
        <p class="meta"><span class="tag ok">Festhalten erteilt</span> ${c && c.forschung ? '<span class="tag ok">Forschung erteilt</span>' : '<span class="tag">Forschung nicht erteilt</span>'}</p>
        <div class="actions"><button class="dbtn ghost" type="button" data-action="goto-mine">Zu „Meine Daten“</button><button class="dbtn ghost" type="button" data-action="role" data-v="begleitung">Als Begleitung weiter</button></div>
      </div>`;
    } else if (r && r.none) {
      res = `<div class="card" aria-live="polite"><h3>Nichts wird festgehalten</h3><p>Ohne Einwilligung entsteht kein Pseudonym und kein Eintrag. Du kannst die Journey trotzdem machen; die Begleitung unterstützt dich wie alle anderen.</p></div>`;
    } else {
      res = `<div class="card"><h3>Was danach passiert</h3><p>Mit dem Speichern entsteht ein zufälliges Pseudonym. Nur darüber werden Beobachtungen zu deinem Weg verknüpft.</p><p>Die Einwilligung gilt getrennt nach Zweck: Festhalten für die Begleitung im Durchlauf, Forschung für zusammengefasste Auswertungen.</p><p class="small">Im Register stehen danach nur Pseudonym, Datum, Textversion und deine Entscheidungen.</p></div>`;
    }
    return `<div class="cols">${form}${res}</div>`;
  }

  /* ----- Teilnehmende: Meine Daten ----- */
  function viewMeineDaten() {
    const p = ui.lookup;
    const examples = B.einwilligungen.slice(0, 8).map((c) => `<button class="chip" type="button" data-action="lookup" data-p="${esc(c.pseudonym)}" aria-pressed="${p === c.pseudonym}">${esc(c.pseudonym)}</button>`).join("");
    let html = `<form class="card" data-form="lookup" novalidate>
      <h3>Was zu meinem Pseudonym festgehalten ist</h3>
      <div class="field-row"><div class="field"><label for="lookup-p">Dein Pseudonym</label><input id="lookup-p" name="p" value="${esc(p || "")}" placeholder="P-XXXX" autocomplete="off" spellcheck="false"></div>
      <div class="field" style="align-self:end"><button class="dbtn" type="submit">Anzeigen</button></div></div>
      ${examples ? `<p class="small">Zum Ausprobieren mit den Beispieldaten:</p><div class="chips">${examples}</div>` : ""}
    </form>`;
    if (!p) return html;
    const c = consentOf(p);
    if (!c) return html + `<div class="notice warn"><p>Zu „${esc(p)}“ gibt es keinen Eintrag. Ohne Einwilligung wird nichts gespeichert.</p></div>`;
    const verlauf = c.verlauf.map((v) => `<li><span class="meta"><span class="ref">${esc(fmtDate(v.datum))}</span></span>${esc(v.was)}</li>`).join("");
    const state = `<p class="meta">
      ${c.widerrufenAm ? '<span class="tag off">Alles widerrufen</span>' : (c.doku ? '<span class="tag ok">Festhalten erteilt</span>' : '<span class="tag off">Festhalten nicht erteilt</span>')}
      ${c.widerrufenAm ? "" : (c.forschung ? '<span class="tag ok">Forschung erteilt</span>' : '<span class="tag">Forschung nicht erteilt</span>')}
      <span class="tag">Text ${esc(c.text)}</span></p>`;
    if (c.widerrufenAm) {
      return html + `<div class="card"><h3>${esc(p)}</h3>${state}<p>Am ${esc(fmtDate(c.widerrufenAm))} widerrufen. Alle Einträge zu diesem Pseudonym sind gelöscht. Im Register steht nur noch der Vermerk des Widerrufs, ohne Inhalte.</p><h4>Verlauf</h4><ul class="list">${verlauf}</ul></div>`;
    }
    const mine = O.beobachtungen.filter((o) => o.pseudonym === p);
    const items = mine.map((o) => obsItem(o, { showPseudonym: false })).join("") || `<li>Noch nichts festgehalten.</li>`;
    let actions;
    if (ui.confirmRevoke) {
      actions = `<div class="notice stop"><p>Alles widerrufen löscht ${mine.length} ${mine.length === 1 ? "Eintrag" : "Einträge"} zu ${esc(p)} sofort. Das lässt sich nicht rückgängig machen.</p></div>
        <div class="actions"><button class="dbtn warn" type="button" data-action="revoke-all-confirm">Ja, alles löschen</button><button class="dbtn ghost" type="button" data-action="revoke-cancel">Abbrechen</button></div>`;
    } else {
      actions = `<div class="actions">
        ${c.forschung ? '<button class="dbtn ghost" type="button" data-action="revoke-research">Forschungseinwilligung widerrufen</button>' : ""}
        <button class="dbtn warn" type="button" data-action="revoke-all">Alles widerrufen und löschen</button>
        <button class="dbtn ghost" type="button" data-action="export-mine">Meine Daten herunterladen (JSON)</button></div>
        <p class="small">Ein Widerruf der Forschung wirkt ab sofort: deine Einträge zählen in keiner Auswertung mehr mit. Zusammenfassungen, die vorher veröffentlicht wurden, ändern sich nicht rückwirkend.</p>`;
    }
    return html + `<div class="card"><h3>${esc(p)}</h3>${state}
      <h4>${mine.length} ${mine.length === 1 ? "Eintrag" : "Einträge"}</h4><ul class="list">${items}</ul>
      <h4>Verlauf der Einwilligung</h4><ul class="list">${verlauf}</ul>${actions}</div>`;
  }

  function obsItem(o, opt) {
    const t = typeOf(o.typ);
    const detail = o.kat ? catLabel(o.kat) : (o.hilfe ? supLabel(o.hilfe) : "");
    const station = stationTitle(o.journeyId, o.version, o.station);
    const pick = opt && opt.pick;
    const body = `<span class="meta"><span class="ref">${esc(o.id)}</span>${opt && opt.showPseudonym ? `<span class="tag">${esc(o.pseudonym)}</span>` : ""}<span class="tag">v${esc(o.version)}</span><b>${esc(t.label)}</b>${detail ? `<span class="tag">${esc(detail)}</span>` : ""}</span>
      <span class="small">${esc(station)} · ${esc(fmtDate(o.zeit))}</span>${o.notiz ? `<span class="note">${esc(o.notiz)}</span>` : ""}`;
    if (pick) return `<li><label class="pick"><input type="checkbox" data-change="pick" data-id="${esc(o.id)}" ${ui.pick[o.id] ? "checked" : ""}><span>${body}</span></label></li>`;
    const del = opt && opt.del ? `<span class="actions"><button class="dbtn mini ghost" type="button" data-action="del-obs" data-id="${esc(o.id)}">Korrigieren: löschen</button></span>` : "";
    return `<li>${body}${del}</li>`;
  }

  /* ----- Begleitung: Beobachten ----- */
  function viewBeobachten() {
    const j = J(), v = lastVersion(j);
    const stations = v.stationen.filter((s) => s.aktiv);
    const people = B.einwilligungen.filter(canDoc);
    if (!people.length) {
      return `<div class="notice warn"><p>Noch niemand hat dem Festhalten zugestimmt. Ohne Einwilligung wird nichts dokumentiert. Wechsle zur Rolle „Teilnehmende Person“ oder lade die Beispieldaten.</p></div>`;
    }
    const st = ui.obs;
    if (!people.some((c) => c.pseudonym === st.p)) st.p = people[people.length - 1].pseudonym;
    if (!stations.some((s) => s.id === st.s)) st.s = stations[0] ? stations[0].id : null;
    const t = typeOf(st.typ);
    const typeChips = TYPES.map((x) => `<button class="chip" type="button" data-action="obs-type" data-v="${x.id}" aria-pressed="${st.typ === x.id}">${esc(x.label)}</button>`).join("");
    const catChips = t.cat ? `<span class="fieldset-label">Art der Hürde</span><div class="chips" role="group" aria-label="Art der Hürde">${CATS.map((x) => `<button class="chip" type="button" data-action="obs-kat" data-v="${x.id}" aria-pressed="${st.kat === x.id}">${esc(x.label)}</button>`).join("")}</div>` : "";
    const supChips = t.support ? `<span class="fieldset-label">Was hat geholfen?</span><div class="chips" role="group" aria-label="Was hat geholfen">${SUPPORT.map((x) => `<button class="chip" type="button" data-action="obs-hilfe" data-v="${x.id}" aria-pressed="${st.hilfe === x.id}">${esc(x.label)}</button>`).join("")}</div>` : "";
    const pii = piiCheck(st.notiz);
    const form = `<form class="card" data-form="observe" novalidate>
      <h3>Beobachtung festhalten</h3>
      <p class="small">Journey „${esc(TEMPLATES[B.journeyId].titel)}“, Version ${esc(v.v)}. Festgehalten wird, was passiert, nicht wie gut jemand ist.</p>
      <div class="field-row">
        <div class="field"><label for="obs-p">Pseudonym</label><select id="obs-p" name="p" data-change="obs-p">${people.map((c) => `<option value="${esc(c.pseudonym)}" ${c.pseudonym === st.p ? "selected" : ""}>${esc(c.pseudonym)}${canResearch(c) ? "" : " (ohne Forschung)"}</option>`).join("")}</select></div>
        <div class="field"><label for="obs-s">Station</label><select id="obs-s" name="s" data-change="obs-s">${stations.map((s) => `<option value="${esc(s.id)}" ${s.id === st.s ? "selected" : ""}>${esc(s.titel)}</option>`).join("")}</select></div>
      </div>
      <span class="fieldset-label">Was ist passiert?</span>
      <div class="chips" role="group" aria-label="Was ist passiert">${typeChips}</div>
      ${catChips}${supChips}
      <div class="field"><label for="obs-notiz">Kurze Notiz, freiwillig</label>
        <textarea id="obs-notiz" name="notiz" maxlength="200" aria-describedby="obs-notiz-hint">${esc(st.notiz)}</textarea>
        <span class="counter" id="obs-count">${st.notiz.length}/200</span>
        <span class="small" id="obs-notiz-hint">Ohne Namen, Kontaktdaten oder Gesundheitsangaben. Beschreibe die Situation, nicht die Person.</span>
      </div>
      <div id="pii">${pii ? piiNotice(pii) : ""}</div>
      <div class="actions"><button class="dbtn" type="submit">Festhalten</button></div>
    </form>`;
    const recent = O.beobachtungen.filter((o) => o.journeyId === B.journeyId).slice(-8).reverse();
    const list = `<div class="card"><h3>Zuletzt festgehalten</h3><p class="small">Die Begleitung kann eigene Einträge korrigieren. Deutungen gehören in „Deuten“.</p><ul class="list">${recent.map((o) => obsItem(o, { showPseudonym: true, del: true })).join("") || "<li>Noch keine Einträge.</li>"}</ul></div>`;
    return `<div class="cols">${form}${list}</div>`;
  }
  function piiNotice(was) {
    return `<div class="notice stop"><p>Die Notiz enthält offenbar ${esc(was)}. So wird sie nicht gespeichert. Beschreibe die Situation, nicht die Person; für Zugangsthemen gibt es die Art „Zugang &amp; Barrierefreiheit“.</p></div>`;
  }

  /* ----- Begleitung: Deuten ----- */
  function viewDeuten() {
    const jid = B.journeyId;
    const all = O.beobachtungen.filter((o) => o.journeyId === jid);
    const stationMap = {};
    J().versionen.forEach((v) => v.stationen.forEach((s) => { stationMap[s.id] = s.titel; }));
    const filtered = ui.deutStation ? all.filter((o) => o.station === ui.deutStation) : all;
    const picked = Object.keys(ui.pick).filter((id) => ui.pick[id] && all.some((o) => o.id === id));
    const exists = (id) => O.beobachtungen.some((o) => o.id === id);
    const interps = B.interpretationen.filter((i) => i.journeyId === jid);
    const emps = B.empfehlungen.filter((e) => e.journeyId === jid);
    const decidedBy = (eid) => B.entscheidungen.find((d) => d.bezug === eid);

    const col1 = `<div class="card board-col">
      <h4>Beobachtung</h4><p class="small">Was geschehen ist. Markiere, worauf sich eine Deutung stützt.</p>
      <div class="field"><label for="deut-s">Station</label><select id="deut-s" data-change="deut-s"><option value="">Alle Stationen</option>${Object.keys(stationMap).map((id) => `<option value="${esc(id)}" ${ui.deutStation === id ? "selected" : ""}>${esc(stationMap[id])}</option>`).join("")}</select></div>
      <ul class="list scroll">${filtered.map((o) => obsItem(o, { pick: true })).join("") || "<li>Keine Beobachtungen.</li>"}</ul>
    </div>`;
    const col2 = `<div class="card board-col">
      <h4>Interpretation</h4><p class="small">Was es bedeuten könnte. Eine Lesart der Begleitung, kein Befund.</p>
      <form data-form="interp" novalidate>
        <div class="field"><label for="interp-text" id="interp-label">${interpLabel(picked.length)}</label><textarea id="interp-text" name="text" maxlength="240">${esc(ui.interpText)}</textarea></div>
        <div class="actions"><button class="dbtn" type="submit" id="interp-submit" ${picked.length ? "" : "disabled"}>Deutung festhalten</button><button class="dbtn ghost mini" type="button" id="interp-unpick" data-action="unpick" ${picked.length ? "" : "disabled"}>Markierung aufheben</button></div>
      </form>
      <ul class="list">${interps.slice().reverse().map((i) => {
        const gone = i.bezug.filter((id) => !exists(id)).length;
        const live = i.bezug.filter(exists);
        return `<li><span class="meta"><span class="ref">${esc(i.id)}</span><span class="small">${esc(fmtDate(i.datum))}</span></span>${esc(i.text)}
          <span class="small">stützt sich auf ${live.length} ${live.length === 1 ? "Beobachtung" : "Beobachtungen"}${gone ? `; ${gone} durch Widerruf gelöscht` : ""}</span></li>`;
      }).join("") || "<li>Noch keine Deutungen.</li>"}</ul>
    </div>`;
    const col3 = `<div class="card board-col">
      <h4>Empfehlung</h4><p class="small">Was an der Journey geändert werden soll. Entschieden wird unter „Journey“.</p>
      <form data-form="emp" novalidate>
        <div class="field"><label for="emp-i">Gestützt auf</label><select id="emp-i" name="i" data-change="emp-i"><option value="">Deutung wählen</option>${interps.map((i) => `<option value="${esc(i.id)}" ${ui.empInterp === i.id ? "selected" : ""}>${esc(i.id)}: ${esc(i.text.slice(0, 50))}${i.text.length > 50 ? "…" : ""}</option>`).join("")}</select></div>
        <div class="field"><label for="emp-text">Empfehlung</label><textarea id="emp-text" name="text" maxlength="240">${esc(ui.empText)}</textarea></div>
        <div class="actions"><button class="dbtn" type="submit">Empfehlung festhalten</button></div>
      </form>
      <ul class="list">${emps.slice().reverse().map((e) => {
        const d = decidedBy(e.id);
        return `<li><span class="meta"><span class="ref">${esc(e.id)}</span><span class="small">aus ${esc(e.bezug)}</span>${d ? `<span class="tag ok">umgesetzt in v${esc(d.v)}</span>` : '<span class="tag">offen</span>'}</span>${esc(e.text)}</li>`;
      }).join("") || "<li>Noch keine Empfehlungen.</li>"}</ul>
    </div>`;
    return `<div class="cols-3">${col1}${col2}${col3}</div>`;
  }

  function interpLabel(n) { return "Deutung zu " + n + " markierten " + (n === 1 ? "Beobachtung" : "Beobachtungen"); }
  function updatePickState() {
    const n = Object.keys(ui.pick).filter((id) => ui.pick[id] && O.beobachtungen.some((o) => o.id === id && o.journeyId === B.journeyId)).length;
    const l = $("#interp-label"); if (l) l.textContent = interpLabel(n);
    ["#interp-submit", "#interp-unpick"].forEach((sel) => { const b = $(sel); if (b) b.disabled = !n; });
  }

  /* ----- Begleitung: Journey und Versionen ----- */
  function viewJourney() {
    const j = J(), v = lastVersion(j);
    if (!ui.draft || ui.draft.journeyId !== B.journeyId || ui.draft.base !== v.v) {
      ui.draft = { journeyId: B.journeyId, base: v.v, stationen: clone(v.stationen), begruendung: "", bezug: "" };
    }
    const d = ui.draft;
    const change = describeChange(v.stationen, d.stationen);
    const known = {};
    v.stationen.forEach((s) => { known[s.id] = true; });
    const rows = d.stationen.map((s, i) => `<div class="station-row ${s.aktiv ? "" : "is-off"}">
        <span class="no">${pad(i + 1)}</span>
        <span class="title">${esc(s.titel)}${known[s.id] ? "" : '<span class="new">NEU</span>'}</span>
        <span class="ctrl"><label><input type="checkbox" data-change="station-aktiv" data-i="${i}" ${s.aktiv ? "checked" : ""}> anbieten</label>
          <button class="dbtn mini ghost" type="button" data-action="move" data-i="${i}" data-d="-1" aria-label="${esc(s.titel)} nach oben" ${i === 0 ? "disabled" : ""}>↑</button>
          <button class="dbtn mini ghost" type="button" data-action="move" data-i="${i}" data-d="1" aria-label="${esc(s.titel)} nach unten" ${i === d.stationen.length - 1 ? "disabled" : ""}>↓</button></span>
      </div>`).join("");
    const emps = B.empfehlungen.filter((e) => e.journeyId === B.journeyId);
    return `<div class="cols">
      <div class="card">
        <h3>Journey und Stationen</h3>
        <div class="field"><label for="journey-sel">Journey</label><select id="journey-sel" data-change="journey">${Object.keys(TEMPLATES).map((id) => `<option value="${id}" ${id === B.journeyId ? "selected" : ""}>${esc(TEMPLATES[id].titel)}</option>`).join("")}</select></div>
        <p class="small">Aktuelle Version <b>${esc(v.v)}</b> seit ${esc(fmtDate(v.datum))}. Jede Station bleibt ein Angebot: überspringen, umstellen oder aufhören ist immer möglich.</p>
        <div>${rows}</div>
        <form data-form="add-station" novalidate class="field-row" style="margin-top:14px">
          <div class="field"><label for="new-station">Station ergänzen</label><input id="new-station" name="titel" maxlength="80" autocomplete="off"></div>
          <div class="field" style="align-self:end"><button class="dbtn ghost" type="submit">Ergänzen</button></div>
        </form>
      </div>
      <form class="card" data-form="save-version" novalidate>
        <h3>Neue Version ${esc(bumpVersion(v.v))}</h3>
        <p>${change ? `<b>Änderung:</b> ${esc(change)}` : "Noch keine Änderung gegenüber Version " + esc(v.v) + "."}</p>
        <div class="field"><label for="ver-why">Begründung, Pflicht</label><textarea id="ver-why" name="begruendung" maxlength="300">${esc(d.begruendung)}</textarea></div>
        <div class="field"><label for="ver-ref">Gestützt auf Empfehlung</label><select id="ver-ref" name="bezug" data-change="ver-ref"><option value="">keine</option>${emps.map((e) => `<option value="${esc(e.id)}" ${d.bezug === e.id ? "selected" : ""}>${esc(e.id)}: ${esc(e.text.slice(0, 50))}${e.text.length > 50 ? "…" : ""}</option>`).join("")}</select></div>
        <div class="actions"><button class="dbtn" type="submit" ${change ? "" : "disabled"}>Version speichern</button><button class="dbtn ghost" type="button" data-action="discard-draft" ${change ? "" : "disabled"}>Verwerfen</button></div>
        <p class="small">Stationen werden nie gelöscht, nur nicht mehr angeboten. So bleiben ältere Beobachtungen ihrer Version zugeordnet.</p>
      </form>
    </div>`;
  }

  /* ----- Entscheidungsprotokoll ----- */
  function viewEntscheidungen() {
    const list = B.entscheidungen.filter((d) => d.journeyId === B.journeyId).slice().reverse();
    const rows = list.map((d) => `<tr><td class="num">${esc(d.v)}</td><td>${esc(fmtDate(d.datum))}</td><td>${esc(d.aenderung)}</td><td>${esc(d.begruendung)}</td><td>${d.bezug ? `<span class="ref">${esc(d.bezug)}</span>` : "–"}</td></tr>`).join("");
    return `<div class="card">
      <h3>Entscheidungsprotokoll: ${esc(TEMPLATES[B.journeyId].titel)}</h3>
      <p class="small">Jede Version der Journey mit Änderung, Begründung und der Empfehlung, auf die sie sich stützt. Neueste zuerst.</p>
      <div class="table-wrap"><table class="dtable"><thead><tr><th class="num">Version</th><th>Datum</th><th>Änderung</th><th>Begründung</th><th>Bezug</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="actions"><button class="dbtn ghost" type="button" data-action="export-decisions">Protokoll herunterladen (JSON)</button></div>
    </div>`;
  }

  /* ----- Auswertung ----- */
  function aggregate(jid, v) {
    const obs = O.beobachtungen.filter((o) => o.journeyId === jid && o.version === v);
    const inc = obs.filter((o) => canResearch(consentOf(o.pseudonym)));
    const people = new Set(inc.map((o) => o.pseudonym));
    return { obs, inc, n: people.size, excluded: obs.length - inc.length };
  }
  function cellView(c, max) {
    if (c === 0) return { cls: "num zero", txt: "·", style: "" };
    if (c < K_MIN) return { cls: "num sup", txt: "&lt;" + K_MIN, style: "" };
    const a = (0.12 + 0.55 * (c / Math.max(max, 1))).toFixed(2);
    return { cls: "num", txt: String(c), style: `background:rgba(106,148,80,${a})` };
  }
  function bars(items) {
    const max = Math.max(1, ...items.map((i) => i.c));
    return `<div class="bars">${items.map((i) => {
      const sup = i.c > 0 && i.c < K_MIN;
      const w = i.c === 0 ? 0 : (sup ? 6 : Math.round((i.c / max) * 100));
      return `<div class="bar ${sup ? "is-sup" : ""}"><span>${esc(i.label)}</span><span class="track" aria-hidden="true"><span class="fill" style="width:${w}%"></span></span><span class="val">${i.c === 0 ? "0" : (sup ? "&lt;" + K_MIN : i.c)}</span></div>`;
    }).join("")}</div>`;
  }
  function viewAuswertung() {
    const j = J();
    const versions = j.versionen.map((x) => x.v);
    if (!ui.evalVersion || !versions.includes(ui.evalVersion)) {
      const ok = versions.slice().reverse().find((v) => aggregate(B.journeyId, v).n >= N_MIN);
      ui.evalVersion = ok || versions[versions.length - 1];
    }
    const v = ui.evalVersion;
    const ag = aggregate(B.journeyId, v);
    const chips = versions.map((x) => `<button class="chip" type="button" data-action="eval-v" data-v="${esc(x)}" aria-pressed="${x === v}">Version ${esc(x)}</button>`).join("");
    let html = `<div class="card">
      <h3>Auswertung: ${esc(TEMPLATES[B.journeyId].titel)}</h3>
      <div class="chips" role="group" aria-label="Version wählen">${chips}</div>
      <div class="stat-row">
        <div class="stat"><b>${ag.n}</b><span>Personen mit Forschungseinwilligung</span></div>
        <div class="stat"><b>${ag.inc.length}</b><span>Einträge in der Auswertung</span></div>
        <div class="stat"><b>${ag.excluded}</b><span>Einträge ohne Forschungseinwilligung, nicht einbezogen</span></div>
      </div>`;
    if (ag.n < N_MIN) {
      return html + `<div class="notice stop"><p>Version ${esc(v)}: erst ${ag.n} ${ag.n === 1 ? "Person" : "Personen"} mit Forschungseinwilligung. Ausgewertet wird ab ${N_MIN}, damit niemand aus den Zahlen erkennbar wird.</p></div></div>`;
    }
    const ver = versionOf(B.journeyId, v);
    const counts = {};
    ag.inc.forEach((o) => { const k = o.station + "|" + o.typ; counts[k] = (counts[k] || 0) + 1; });
    const max = Math.max(1, ...Object.values(counts));
    const rows = ver.stationen.map((s) => {
      const cells = TYPES.map((t) => { const c = counts[s.id + "|" + t.id] || 0; const cv = cellView(c, max); return `<td class="${cv.cls}" style="${cv.style}">${cv.txt}</td>`; }).join("");
      return `<tr><th scope="row">${esc(s.titel)}${s.aktiv ? "" : ' <span class="tag">nicht angeboten</span>'}</th>${cells}</tr>`;
    }).join("");
    let best = null;
    ver.stationen.forEach((s) => {
      const c = (counts[s.id + "|unsicherheit"] || 0) + (counts[s.id + "|barriere"] || 0);
      if (c >= K_MIN && (!best || c > best.c)) best = { s, c };
    });
    const hurdles = ag.inc.filter((o) => o.kat);
    const catItems = CATS.map((c) => ({ label: c.label, c: hurdles.filter((o) => o.kat === c.id).length })).sort((a, b) => b.c - a.c);
    const supItems = SUPPORT.map((c) => ({ label: c.label, c: ag.inc.filter((o) => o.hilfe === c.id).length })).sort((a, b) => b.c - a.c);
    html += `${best ? `<p><b>Lesart der Zahlen:</b> Die meisten Unsicherheiten und Barrieren entstehen bei „${esc(best.s.titel)}“ (${best.c} Einträge). Das beschreibt die Journey, nicht die Personen.</p>` : ""}
      <h4>Einträge je Station und Art</h4>
      <div class="table-wrap"><table class="dtable"><caption>„&lt;3“: weniger als drei Einträge, aus Schutzgründen nicht genau angegeben. „·“: kein Eintrag.</caption>
        <thead><tr><th>Station</th>${TYPES.map((t) => `<th class="num">${esc(t.kurz)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>
      <div class="cols">
        <div><h4>Unsicherheiten und Barrieren nach Art</h4>${bars(catItems)}</div>
        <div><h4>Was geholfen hat</h4>${bars(supItems)}</div>
      </div>
      <div class="actions"><button class="dbtn" type="button" data-action="export-csv">Open-Science-Ausgabe (CSV)</button></div>
      <p class="small">Enthält Journey, Version, Station, Merkmal und Anzahl; Werte unter ${K_MIN} als „&lt;${K_MIN}“. Nicht enthalten: Pseudonyme, Notizen, Zeitpunkte und Deutungen.</p>
    </div>`;
    return html;
  }

  function csvExport() {
    const v = ui.evalVersion;
    const ag = aggregate(B.journeyId, v);
    if (ag.n < N_MIN) return;
    const ver = versionOf(B.journeyId, v);
    const val = (c) => (c === 0 ? "0" : (c < K_MIN ? "<" + K_MIN : String(c)));
    const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
    const lines = [
      "# Digitalpath, Digitaler Demonstrator DP-D1. Beispieldaten, keine echten Personen.",
      "# Journey: " + TEMPLATES[B.journeyId].titel + "; Version: " + v + "; Personen mit Forschungseinwilligung: " + ag.n + "; Mindestzellgröße: " + K_MIN + "; erstellt: " + today(),
      "tabelle;station;merkmal;anzahl"
    ];
    ver.stationen.forEach((s) => TYPES.forEach((t) => {
      lines.push(["stationen", q(s.titel), q(t.label), val(ag.inc.filter((o) => o.station === s.id && o.typ === t.id).length)].join(";"));
    }));
    CATS.forEach((c) => lines.push(["huerden", "", q(c.label), val(ag.inc.filter((o) => o.kat === c.id).length)].join(";")));
    SUPPORT.forEach((c) => lines.push(["unterstuetzung", "", q(c.label), val(ag.inc.filter((o) => o.hilfe === c.id).length)].join(";")));
    download("dp-d1_" + B.journeyId + "_v" + v + ".csv", "﻿" + lines.join("\r\n") + "\r\n", "text/csv;charset=utf-8");
    setStatus("Open-Science-Ausgabe für Version " + v + " heruntergeladen.");
  }

  /* ---------- Ereignisse ---------- */
  function onClick(e) {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const a = el.dataset.action, v = el.dataset.v;
    switch (a) {
      case "role": ui.role = v; ui.confirmRevoke = false; setStatus(""); break;
      case "tab": ui.tab[ui.role] = v; ui.confirmRevoke = false; setStatus(""); break;
      case "goto-mine": ui.tab.teilnehmend = "meinedaten"; break;
      case "lookup": ui.lookup = el.dataset.p; ui.confirmRevoke = false; break;
      case "revoke-research": {
        const c = consentOf(ui.lookup);
        if (c) { c.forschung = false; c.verlauf.push({ datum: today(), was: "Forschungseinwilligung widerrufen" }); persist(); setStatus("Forschungseinwilligung für " + c.pseudonym + " widerrufen. Die Einträge zählen in keiner Auswertung mehr mit."); }
        break;
      }
      case "revoke-all": ui.confirmRevoke = true; break;
      case "revoke-cancel": ui.confirmRevoke = false; break;
      case "revoke-all-confirm": {
        const c = consentOf(ui.lookup);
        if (c) {
          const before = O.beobachtungen.length;
          O.beobachtungen = O.beobachtungen.filter((o) => o.pseudonym !== c.pseudonym);
          Object.keys(ui.pick).forEach((id) => { if (!O.beobachtungen.some((o) => o.id === id)) delete ui.pick[id]; });
          c.doku = false; c.forschung = false; c.widerrufenAm = today();
          c.verlauf.push({ datum: today(), was: "Alles widerrufen, Einträge gelöscht" });
          persist();
          setStatus((before - O.beobachtungen.length) + " Einträge zu " + c.pseudonym + " gelöscht. Im Register bleibt nur der Vermerk des Widerrufs.");
        }
        ui.confirmRevoke = false;
        break;
      }
      case "export-mine": {
        const c = consentOf(ui.lookup);
        if (!c) break;
        const data = { erstellt: today(), hinweis: "Auskunft aus dem Digitalpath-Demonstrator DP-D1 (Beispieldaten)", einwilligung: c, eintraege: O.beobachtungen.filter((o) => o.pseudonym === c.pseudonym).map((o) => ({ id: o.id, journey: TEMPLATES[o.journeyId].titel, version: o.version, station: stationTitle(o.journeyId, o.version, o.station), art: typeOf(o.typ).label, hürde: o.kat ? catLabel(o.kat) : null, unterstützung: o.hilfe ? supLabel(o.hilfe) : null, notiz: o.notiz, zeit: o.zeit })) };
        download("auskunft_" + c.pseudonym + ".json", JSON.stringify(data, null, 2), "application/json");
        setStatus("Auskunft für " + c.pseudonym + " heruntergeladen.");
        return;
      }
      case "obs-type": ui.obs.typ = v; ui.obs.kat = null; ui.obs.hilfe = null; break;
      case "obs-kat": ui.obs.kat = v; break;
      case "obs-hilfe": ui.obs.hilfe = v; break;
      case "del-obs": {
        const id = el.dataset.id;
        O.beobachtungen = O.beobachtungen.filter((o) => o.id !== id);
        delete ui.pick[id];
        persist(); setStatus(id + " gelöscht.");
        break;
      }
      case "unpick": ui.pick = {}; break;
      case "move": {
        const i = Number(el.dataset.i), d = Number(el.dataset.d), s = ui.draft.stationen;
        const k = i + d;
        if (k >= 0 && k < s.length) { const tmp = s[i]; s[i] = s[k]; s[k] = tmp; }
        break;
      }
      case "discard-draft": ui.draft = null; setStatus("Änderungen verworfen."); break;
      case "export-decisions": {
        const data = { erstellt: today(), journey: TEMPLATES[B.journeyId].titel, versionen: J().versionen, entscheidungen: B.entscheidungen.filter((d) => d.journeyId === B.journeyId), empfehlungen: B.empfehlungen.filter((x) => x.journeyId === B.journeyId), interpretationen: B.interpretationen.filter((x) => x.journeyId === B.journeyId).map((i) => ({ id: i.id, datum: i.datum, text: i.text, anzahl_beobachtungen: i.bezug.length })) };
        download("dp-d1_entscheidungen_" + B.journeyId + ".json", JSON.stringify(data, null, 2), "application/json");
        setStatus("Entscheidungsprotokoll heruntergeladen.");
        return;
      }
      case "eval-v": ui.evalVersion = v; break;
      case "export-csv": csvExport(); return;
      case "sample":
        sampleState(); resetUi(); persist(); setStatus("Beispieldaten neu geladen."); break;
      case "wipe":
        if (!ui.confirmWipe) { ui.confirmWipe = true; el.textContent = "Wirklich alles löschen?"; return; }
        emptyState(); resetUi(); persist(); setStatus("Alles gelöscht. Es gibt nur noch die Journey in Version 1.0."); break;
      default: return;
    }
    if (a !== "wipe") resetWipeButton();
    render();
  }
  function resetWipeButton() {
    if (ui.confirmWipe) { ui.confirmWipe = false; const b = document.querySelector('[data-action="wipe"]'); if (b) b.textContent = "Alles löschen"; }
  }
  function resetUi() {
    ui.consentResult = null; ui.lookup = null; ui.confirmRevoke = false; ui.draft = null; ui.pick = {};
    ui.obs = { p: null, s: null, typ: "unsicherheit", kat: null, hilfe: null, notiz: "" };
    ui.deutStation = ""; ui.interpText = ""; ui.empText = ""; ui.empInterp = ""; ui.evalVersion = null;
    resetWipeButton();
  }

  function onChange(e) {
    const el = e.target;
    const form = el.closest("form");
    if (form && form.dataset.form === "consent" && el.name === "doku") {
      const f = form.querySelector('[name="forschung"]');
      f.disabled = !el.checked; if (!el.checked) f.checked = false;
      $("#forschung-label").classList.toggle("is-disabled", !el.checked);
      return;
    }
    const c = el.dataset.change;
    if (!c) return;
    switch (c) {
      case "obs-p": ui.obs.p = el.value; return;
      case "obs-s": ui.obs.s = el.value; return;
      case "pick": ui.pick[el.dataset.id] = el.checked; updatePickState(); return;
      case "deut-s": ui.deutStation = el.value; break;
      case "emp-i": ui.empInterp = el.value; return;
      case "station-aktiv": ui.draft.stationen[Number(el.dataset.i)].aktiv = el.checked; break;
      case "ver-ref": ui.draft.bezug = el.value; return;
      case "journey": B.journeyId = el.value; ensureJourney(el.value); ui.draft = null; ui.pick = {}; ui.deutStation = ""; ui.evalVersion = null; ui.obs.s = null; persist(); break;
      default: return;
    }
    render();
  }

  function onInput(e) {
    const el = e.target;
    if (el.id === "obs-notiz") {
      ui.obs.notiz = el.value;
      const cnt = $("#obs-count"); if (cnt) cnt.textContent = el.value.length + "/200";
      const pii = piiCheck(el.value);
      $("#pii").innerHTML = pii ? piiNotice(pii) : "";
    } else if (el.id === "interp-text") ui.interpText = el.value;
    else if (el.id === "emp-text") ui.empText = el.value;
    else if (el.id === "ver-why" && ui.draft) ui.draft.begruendung = el.value;
  }

  function onSubmit(e) {
    const form = e.target.closest("form[data-form]");
    if (!form) return;
    e.preventDefault();
    const f = form.dataset.form;
    if (f === "consent") {
      const doku = form.querySelector('[name="doku"]').checked;
      const forschung = doku && form.querySelector('[name="forschung"]').checked;
      if (!doku) { ui.consentResult = { none: true }; setStatus("Keine Einwilligung: es wird nichts festgehalten."); render(); return; }
      const p = makePseudonym();
      B.einwilligungen.push({ pseudonym: p, datum: today(), text: TEXT_VERSION, doku: true, forschung, verlauf: [{ datum: today(), was: forschung ? "Dokumentation und Forschung erteilt" : "Dokumentation erteilt, Forschung nicht erteilt" }] });
      ui.consentResult = { pseudonym: p }; ui.lookup = p; ui.obs.p = p;
      persist(); setStatus("Pseudonym " + p + " erzeugt.");
    } else if (f === "lookup") {
      ui.lookup = (form.querySelector('[name="p"]').value || "").trim().toUpperCase() || null;
      ui.confirmRevoke = false;
    } else if (f === "observe") {
      const st = ui.obs, t = typeOf(st.typ);
      if (t.cat && !st.kat) { setStatus("Bitte die Art der Hürde wählen."); return; }
      if (t.support && !st.hilfe) { setStatus("Bitte wählen, was geholfen hat."); return; }
      const pii = piiCheck(st.notiz);
      if (pii) { setStatus("Nicht gespeichert: die Notiz enthält offenbar " + pii + "."); return; }
      const c = consentOf(st.p);
      if (!canDoc(c)) { setStatus("Für dieses Pseudonym liegt keine gültige Einwilligung vor."); return; }
      const o = { id: nextId("B", "b", 3), journeyId: B.journeyId, version: lastVersion(J()).v, station: st.s, pseudonym: st.p, typ: st.typ, kat: t.cat ? st.kat : null, hilfe: t.support ? st.hilfe : null, notiz: st.notiz.trim(), zeit: nowStamp() };
      O.beobachtungen.push(o);
      st.notiz = "";
      persist(); setStatus(o.id + " festgehalten: " + t.label + " bei „" + stationTitle(o.journeyId, o.version, o.station) + "“.");
    } else if (f === "interp") {
      const ids = Object.keys(ui.pick).filter((id) => ui.pick[id] && O.beobachtungen.some((o) => o.id === id && o.journeyId === B.journeyId));
      const text = ui.interpText.trim();
      if (!ids.length) { setStatus("Bitte zuerst Beobachtungen markieren."); return; }
      if (!text) { setStatus("Bitte die Deutung in einem Satz beschreiben."); return; }
      const i = { id: nextId("I", "i", 2), journeyId: B.journeyId, datum: today(), text, bezug: ids };
      B.interpretationen.push(i); ui.interpText = ""; ui.pick = {}; ui.empInterp = i.id;
      persist(); setStatus(i.id + " festgehalten, gestützt auf " + ids.length + " " + (ids.length === 1 ? "Beobachtung." : "Beobachtungen."));
    } else if (f === "emp") {
      const text = ui.empText.trim();
      if (!ui.empInterp) { setStatus("Bitte die Deutung wählen, auf die sich die Empfehlung stützt."); return; }
      if (!text) { setStatus("Bitte die Empfehlung beschreiben."); return; }
      const x = { id: nextId("E", "e", 2), journeyId: B.journeyId, datum: today(), text, bezug: ui.empInterp };
      B.empfehlungen.push(x); ui.empText = "";
      persist(); setStatus(x.id + " festgehalten. Entschieden wird unter „Journey“.");
    } else if (f === "add-station") {
      const input = form.querySelector('[name="titel"]');
      const titel = (input.value || "").trim();
      if (!titel) { setStatus("Bitte einen Titel für die Station eingeben."); return; }
      const ids = J().versionen.flatMap((v) => v.stationen.map((s) => Number(s.id.slice(1)))).concat(ui.draft.stationen.map((s) => Number(s.id.slice(1))));
      ui.draft.stationen.push({ id: "s" + (Math.max(0, ...ids) + 1), titel, aktiv: true });
      setStatus("Station „" + titel + "“ im Entwurf ergänzt.");
    } else if (f === "save-version") {
      const j = J(), v = lastVersion(j), d = ui.draft;
      const change = describeChange(v.stationen, d.stationen);
      if (!change) { setStatus("Keine Änderung zum Speichern."); return; }
      if (!d.begruendung.trim()) { setStatus("Ohne Begründung wird keine neue Version gespeichert."); const w = $("#ver-why"); if (w) w.focus(); return; }
      const nv = bumpVersion(v.v);
      j.versionen.push({ v: nv, datum: today(), stationen: clone(d.stationen) });
      B.entscheidungen.push({ id: nextId("D", "d", 2), journeyId: B.journeyId, v: nv, datum: today(), aenderung: change, begruendung: d.begruendung.trim(), bezug: d.bezug || null });
      ui.draft = null;
      persist(); setStatus("Version " + nv + " gespeichert und im Entscheidungsprotokoll vermerkt.");
    }
    render();
  }

  /* ---------- Start ---------- */
  function init() {
    B = load(KEY_B); O = load(KEY_O);
    let fresh = false;
    if (!B || !O || B.schema !== 1 || O.schema !== 1) { sampleState(); persist(); fresh = true; }
    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    document.addEventListener("input", onInput);
    document.addEventListener("submit", onSubmit);
    render();
    if (fresh) setStatus("Beispieldaten geladen. Alles bleibt in diesem Browser.");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
