"use strict";

/* ═══════════════════════════════════════════════════════════
Configuration
═══════════════════════════════════════════════════════════ */

// true  = données locales (aucune requête réseau), pour dev sans l'API
// false = appels réels vers /api/* (relayés par Nginx vers api:8080)
const USE_MOCK = true;

// laisser vide en production : le navigateur parle à Nginx (même origine).
// en dev sans Docker, mettre "http://localhost:8080" (il faudra alors gérer le CORS côté API).
const API_BASE = "";

// ajoute au payload des métriques de comportement (temps de réaction, etc.). -> TODO pour plus tard
// invisible pour le testeur. Mettre à false pour envoyer le payload tel quel.
const COLLECT_BEHAVIOR = true;

/* ═══════════════════════════════════════════════════════════
Valeurs de la spec (Specs.md)
══════════════════════════════════════════════════════════ */

const TITRES = ["BUG1", "BUG2", "BUG3", "BUG4", "BUG5"];

const TYPES_BUG = [
  { value: "MAP", label: "Décor, collision, zone inaccessible" },
  { value: "AUTRE_JOUEUR", label: "Autre joueur" },
  { value: "GRAPHIQUE", label: "Affichage, textures, animations" },
  { value: "SON", label: "Son absent, décalé ou en boucle" },
  { value: "INTERFACE", label: "Menus, HUD, boutons" },
  { value: "PERFORMANCE", label: "Ralentissement, gel, plantage" },
  { value: "AUTRE", label: "Autre" },
];
const typeLabel = (v) => (TYPES_BUG.find((t) => t.value === v) || { label: v }).label;

const SORTABLE = ["timestamp", "titre", "type_bug", "id_utilisateur"];

/* ═══════════════════════════════════════════════════════════
Couche API (mock ou réseau)
═══════════════════════════════════════════════════════════ */

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readError(response) {
  try {
    const data = await response.json();
    return new ApiError(response.status, data.message || data.error || response.statusText);
  } catch {
    return new ApiError(response.status, response.statusText);
  }
}

async function request(url, options) {
  let response;
  try {
    response = await fetch(API_BASE + url, options);
  } catch {
    throw new ApiError(0, "Impossible de joindre l'API.");
  }
  if (!response.ok) throw await readError(response);
  return response;
}

// POST /api/sessions/{id}/bugs  →  201 + id du bug
async function apiCreateBug(sessionId, body) {
  if (USE_MOCK) return mockCreate(sessionId, body);
  const response = await request(`/api/sessions/${sessionId}/bugs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // Le format exact de la réponse n'est pas figé dans la spec : on accepte {id} ou un nombre seul.
  try {
    const data = await response.json();
    return { id: typeof data === "object" && data !== null ? data.id : data };
  } catch {
    return { id: null };
  }
}

// GET /api/bugs?...  →  { total, page, taille, resultats[] }
async function apiListBugs(params) {
  if (USE_MOCK) return mockList(params);
  const response = await request(`/api/bugs?${new URLSearchParams(params)}`);
  return response.json();
}

/* ── Mock : même contrat que l'API réelle ── */

const MOCK_SESSIONS = [1, 2, 3, 4];
const MOCK_PSEUDOS = ["Storm_X9", "Kira_77", "NoctisFox", "Mala_Run"];
const mockBugs = buildMockBugs();

function buildMockBugs() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const descriptions = [
    "Le joueur traverse le mur nord",
    "J'ai perdu une vie alors que rien ne m'a touché",
    "Mon score a doublé d'un coup",
    "Les touches sont inversées, impossible d'avancer",
    "Il manque la texture du sol près de la porte",
    "",
    "Ça m'est arrivé juste après le changement de niveau",
    "Plus de son depuis le dernier checkpoint",
  ];
  const start = Date.parse("2026-10-19T09:00:00.000Z");
  return Array.from({ length: 42 }, (_, i) => ({
    id: i + 1,
    session_id: pick(MOCK_SESSIONS),
    titre: pick(TITRES),
    id_utilisateur: pick(MOCK_PSEUDOS),
    description: pick(descriptions),
    payload: { niveau: 1 + Math.floor(rnd() * 5), position: { x: Math.floor(rnd() * 400), y: Math.floor(rnd() * 200) } },
    timestamp: new Date(start + i * 7 * 60000 + Math.floor(rnd() * 59000)).toISOString(),
    type_bug: pick(TYPES_BUG).value,
  }));
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function mockList(p) {
  await wait(150);
  const tri = p.tri || "timestamp";
  const ordre = p.ordre || "desc";
  if (!SORTABLE.includes(tri)) throw new ApiError(400, `Paramètre tri invalide : ${tri}`);
  if (!["asc", "desc"].includes(ordre)) throw new ApiError(400, `Paramètre ordre invalide : ${ordre}`);
  const page = Number(p.page ?? 0);
  const taille = Number(p.taille ?? 50);
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(taille) || taille < 1 || taille > 200) {
    throw new ApiError(400, "Pagination invalide (taille max : 200).");
  }

  const dir = ordre === "asc" ? 1 : -1;
  const rows = mockBugs
    .filter((b) => (!p.type_bug || b.type_bug === p.type_bug)
      && (!p.titre || b.titre === p.titre)
      && (!p.id_utilisateur || b.id_utilisateur === p.id_utilisateur)
      && (!p.session_id || b.session_id === Number(p.session_id))
      && (!p.depuis || b.timestamp >= p.depuis)
      && (!p.jusqu_a || b.timestamp <= p.jusqu_a))
    .sort((a, b) => dir * String(a[tri]).localeCompare(String(b[tri])) || dir * (a.id - b.id));

  return {
    total: rows.length,
    page,
    taille,
    resultats: rows.slice(page * taille, (page + 1) * taille).map((b) => ({ ...b })),
  };
}

async function mockCreate(sessionId, body) {
  await wait(200);
  if (!MOCK_SESSIONS.includes(Number(sessionId))) throw new ApiError(404, "Session inconnue.");
  const invalid = (msg) => { throw new ApiError(400, msg); };
  if (!TITRES.includes(body.titre)) invalid("titre invalide");
  if (!TYPES_BUG.some((t) => t.value === body.type_bug)) invalid("type_bug invalide");
  if (!MOCK_PSEUDOS.includes(body.id_utilisateur)) invalid("id_utilisateur inconnu");
  if (Number.isNaN(Date.parse(body.timestamp))) invalid("timestamp invalide");
  if ((body.description || "").length > 500) invalid("description trop longue");
  if (typeof body.payload !== "object" || body.payload === null) invalid("payload invalide");

  const bug = { id: mockBugs.length + 1, session_id: Number(sessionId), description: "", ...body };
  mockBugs.push(bug);
  return { id: bug.id };
}

/* ═══════════════════════════════════════════════════════════
  Utilitaires DOM
═══════════════════════════════════════════════════════════ */

const $ = (selector) => document.querySelector(selector);

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);           // textContent uniquement : jamais d'innerHTML avec du contenu utilisateur
  node.append(...children);
  return node;
}

function fillSelect(select, items, placeholder) {
  select.replaceChildren(el("option", { value: "", textContent: placeholder }));
  items.forEach(({ value, label }) => select.append(el("option", { value, textContent: label })));
}

function showStatus(container, kind, ...content) {
  container.replaceChildren(el("div", { className: kind }, ...content));
}
const clearStatus = (container) => container.replaceChildren();

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" })
    + "." + String(d.getMilliseconds()).padStart(3, "0");
}

/* ═══════════════════════════════════════════════════════════
Navigation par onglets (#signaler / #dashboard)
═══════════════════════════════════════════════════════════ */

const views = { signaler: $("#view-signaler"), dashboard: $("#view-dashboard") };

function route() {
  const name = location.hash === "#dashboard" ? "dashboard" : "signaler";
  Object.entries(views).forEach(([key, section]) => {
    section.hidden = key !== name;
    const tab = $(`#tab-${key}`);
    if (key === name) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  if (name === "dashboard") loadDashboard();
  else resetBehavior();
}

/* ═══════════════════════════════════════════════════════════
Formulaire de signalement
═══════════════════════════════════════════════════════════ */

const form = $("#bug-form");
const formStatus = $("#form-status");
const submitBtn = $("#submit-btn");

fillSelect($("#f-titre"), TITRES.map((t) => ({ value: t, label: t })), "Choisir un bug");
fillSelect($("#f-type"), TYPES_BUG, "Choisir une catégorie");

$("#f-description").addEventListener("input", (e) => {
  $("#desc-counter").textContent = `${e.target.value.length} / 500`;
});

// metriques de comportement : mesurees cote client, fusionnees dans le payload à l'envoi. -> TODO pour plus tard / modif
let behavior;
function resetBehavior() {
  behavior = { ouvertA: performance.now(), premiereSaisieA: null, modifications: 0, ordreSaisie: [] };
}
resetBehavior();

form.addEventListener("input", (e) => {
  const name = e.target.name;
  if (!name || name === "payload") return;
  behavior.modifications += 1;
  if (behavior.premiereSaisieA === null) behavior.premiereSaisieA = performance.now();
  if (!behavior.ordreSaisie.includes(name)) behavior.ordreSaisie.push(name);
});

function behaviorMetrics() {
  const now = performance.now();
  return {
    tempsAvantPremiereSaisieMs: behavior.premiereSaisieA === null ? null : Math.round(behavior.premiereSaisieA - behavior.ouvertA),
    tempsAvantEnvoiMs: Math.round(now - behavior.ouvertA),
    nombreModifications: behavior.modifications,
    ordreSaisie: behavior.ordreSaisie,
  };
}

function markInvalid(field, isInvalid) {
  field.classList.toggle("invalid", isInvalid);
  field.setAttribute("aria-invalid", String(isInvalid));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearStatus(formStatus);

  const sessionField = $("#f-session");
  const pseudoField = $("#f-pseudo");
  const titreField = $("#f-titre");
  const typeField = $("#f-type");
  const payloadField = $("#f-payload");

  const sessionId = Number(sessionField.value);
  const pseudo = pseudoField.value.trim();
  const description = $("#f-description").value.trim();

  const problems = [];
  const check = (field, ok, message) => { markInvalid(field, !ok); if (!ok) problems.push(message); };
  check(sessionField, Number.isInteger(sessionId) && sessionId > 0, "Indique un numéro de session valide.");
  check(pseudoField, pseudo.length > 0 && pseudo.length <= 30, "Indique ton pseudonyme (30 caractères max).");
  check(titreField, titreField.value !== "", "Choisis le bug rencontré.");
  check(typeField, typeField.value !== "", "Choisis une catégorie.");
  check($("#f-description"), description.length <= 500, "La description ne doit pas dépasser 500 caractères.");

  let payload = {};
  const rawPayload = payloadField.value.trim();
  if (rawPayload) {
    try {
      payload = JSON.parse(rawPayload);
      if (typeof payload !== "object" || payload === null || Array.isArray(payload)) throw new Error();
      markInvalid(payloadField, false);
    } catch {
      markInvalid(payloadField, true);
      $(".advanced").open = true;
      problems.push("Le payload doit être un objet JSON valide, par exemple { \"niveau\": 3 }.");
    }
  }

  if (problems.length) {
    showStatus(formStatus, "error", problems.join(" "));
    return;
  }

  const body = {
    titre: titreField.value,
    id_utilisateur: pseudo,
    payload: COLLECT_BEHAVIOR ? { ...payload, comportement: behaviorMetrics() } : payload,
    timestamp: new Date().toISOString(),   // ISO 8601 avec millisecondes, ex. 2026-10-19T14:32:05.120Z
    type_bug: typeField.value,
  };
  if (description) body.description = description;

  submitBtn.disabled = true;
  try {
    const result = await apiCreateBug(sessionId, body);
    const suffix = result.id != null ? ` (n° ${result.id})` : "";
    showStatus(formStatus, "ok", `Bug enregistré${suffix}. `, el("a", { href: "#dashboard", textContent: "Voir dans le tableau de bord" }));
    titreField.value = "";
    typeField.value = "";
    $("#f-description").value = "";
    $("#desc-counter").textContent = "0 / 500";
    resetBehavior();
  } catch (err) {
    if (err.status === 404) showStatus(formStatus, "error", "Session inconnue : vérifie le numéro de session.");
    else if (err.status === 400) showStatus(formStatus, "error", `Le bug a été refusé : ${err.message}`);
    else showStatus(formStatus, "error", err.message || "Erreur inattendue.");
  } finally {
    submitBtn.disabled = false;
  }
});

/* ═══════════════════════════════════════════════════════════
Tableau de bord
═══════════════════════════════════════════════════════════ */

const state = { type_bug: "", titre: "", id_utilisateur: "", tri: "timestamp", ordre: "desc", page: 0, taille: 20 };
let requestCounter = 0;
let lastTotalPages = 1;

fillSelect($("#flt-type"), TYPES_BUG, "Toutes les catégories");
fillSelect($("#flt-titre"), TITRES.map((t) => ({ value: t, label: t })), "Tous les bugs");

function queryParams() {
  const params = { tri: state.tri, ordre: state.ordre, page: state.page, taille: state.taille };
  ["type_bug", "titre", "id_utilisateur"].forEach((key) => { if (state[key]) params[key] = state[key]; });
  return params;
}

async function loadDashboard() {
  const current = ++requestCounter;             // ignore les réponses arrivées dans le désordre
  const status = $("#dash-status");
  showStatus(status, "info", "Chargement…");
  try {
    const data = await apiListBugs(queryParams());
    if (current !== requestCounter) return;
    clearStatus(status);
    renderTable(data);
  } catch (err) {
    if (current !== requestCounter) return;
    showStatus(status, "error", err.status === 400 ? `Requête refusée : ${err.message}` : err.message || "Erreur inattendue.");
  }
}

function renderTable(data) {
  const body = $("#bugs-body");
  body.replaceChildren();

  if (!data.resultats.length) {
    body.append(el("tr", {}, el("td", { colSpan: 5, className: "empty", textContent: "Aucun bug ne correspond à ces filtres." })));
  }

  data.resultats.forEach((bug) => {
    const detail = el("tr", { className: "detail", hidden: true },
      el("td", { colSpan: 5 },
        el("div", { className: "muted", textContent: `Session ${bug.session_id} · bug n° ${bug.id}` }),
        el("pre", { textContent: JSON.stringify(bug.payload, null, 2) })));

    const toggle = el("button", { type: "button", className: "toggle", textContent: bug.titre });
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", () => {
      const open = detail.hidden;
      detail.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    });

    body.append(
      el("tr", { className: "row" },
        el("td", {}, toggle),
        el("td", {}, el("span", { className: "chip", textContent: typeLabel(bug.type_bug) })),
        el("td", { textContent: bug.id_utilisateur }),
        el("td", { className: "desc", textContent: bug.description || "—" }),
        el("td", {}, el("time", { dateTime: bug.timestamp, textContent: formatDate(bug.timestamp) }))),
      detail);
  });

  lastTotalPages = Math.max(1, Math.ceil(data.total / data.taille));
  $("#page-info").textContent = `Page ${data.page + 1} sur ${lastTotalPages} · ${data.total} bug${data.total > 1 ? "s" : ""}`;
  $("#prev-btn").disabled = data.page <= 0;
  $("#next-btn").disabled = data.page + 1 >= lastTotalPages;

  document.querySelectorAll("#bugs-table th[data-col]").forEach((th) => {
    th.setAttribute("aria-sort", th.dataset.col === state.tri ? (state.ordre === "asc" ? "ascending" : "descending") : "none");
  });
}

// Tri : clic sur un en-tête (même colonne = inverse le sens)
document.querySelectorAll(".sort").forEach((button) => {
  button.addEventListener("click", () => {
    const col = button.dataset.sort;
    if (state.tri === col) state.ordre = state.ordre === "asc" ? "desc" : "asc";
    else { state.tri = col; state.ordre = col === "timestamp" ? "desc" : "asc"; }
    state.page = 0;
    loadDashboard();
  });
});

// Filtres
function onFilterChange() {
  state.type_bug = $("#flt-type").value;
  state.titre = $("#flt-titre").value;
  state.taille = Number($("#flt-taille").value);
  state.page = 0;
  loadDashboard();
}
["#flt-type", "#flt-titre", "#flt-taille"].forEach((sel) => $(sel).addEventListener("change", onFilterChange));

let pseudoTimer;
$("#flt-pseudo").addEventListener("input", (e) => {
  clearTimeout(pseudoTimer);
  pseudoTimer = setTimeout(() => {
    state.id_utilisateur = e.target.value.trim();
    state.page = 0;
    loadDashboard();
  }, 300);
});

$("#filters").addEventListener("submit", (e) => e.preventDefault());
$("#flt-reset").addEventListener("click", () => {
  $("#filters").reset();
  $("#flt-taille").value = "20";
  Object.assign(state, { type_bug: "", titre: "", id_utilisateur: "", tri: "timestamp", ordre: "desc", page: 0, taille: 20 });
  loadDashboard();
});

// Pagination
$("#prev-btn").addEventListener("click", () => { if (state.page > 0) { state.page -= 1; loadDashboard(); } });
$("#next-btn").addEventListener("click", () => { if (state.page + 1 < lastTotalPages) { state.page += 1; loadDashboard(); } });

/* ═══════════════════════════════════════════════════════════
Démarrage
═══════════════════════════════════════════════════════════ */

if (USE_MOCK) $("#mock-banner").hidden = false;
window.addEventListener("hashchange", route);
route();
