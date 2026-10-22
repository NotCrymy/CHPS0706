"use strict";

/* Code commun au popup de signalement (report/) et au dashboard admin (index.html).
   Les deux pages sont indépendantes : elles ne partagent que ce fichier. */

/* ═══════════════ Configuration ═══════════════ */

// true  = données locales, aucune requête réseau (développement sans API)
// false = appels réels vers /api/* (relayés par Nginx vers api:8080)
const USE_MOCK = false;

// Laisser vide : le navigateur parle à Nginx (même origine, pas de CORS).
const API_BASE = "";

/* ═══════════════ Valeurs de la spec (Specs.md) ═══════════════ */

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

/* ═══════════════ Couche API ═══════════════ */

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
  // Format de réponse non figé dans la spec : on accepte {id} ou un nombre seul.
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

/* ═══════════════ Mock (même contrat que l'API) ═══════════════
   Les bugs sont gardés dans le localStorage du navigateur : un bug envoyé depuis
   le popup apparaît ensuite dans le dashboard. Pour repartir de zéro :
   localStorage.removeItem("kapture-mock-bugs") dans la console du navigateur. */

const MOCK_KEY = "kapture-mock-bugs";
const MOCK_SESSIONS = [1, 2, 3, 4];
const MOCK_PSEUDOS = ["Storm_X9", "Kira_77", "NoctisFox", "Mala_Run"];

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

function loadMockBugs() {
  try {
    const raw = localStorage.getItem(MOCK_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* stockage indisponible : on retombe sur la mémoire */ }
  return buildMockBugs();
}
function saveMockBugs(bugs) {
  try { localStorage.setItem(MOCK_KEY, JSON.stringify(bugs)); } catch { /* ignoré */ }
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
  const rows = loadMockBugs()
    .filter((b) => (!p.type_bug || b.type_bug === p.type_bug)
      && (!p.titre || b.titre === p.titre)
      && (!p.id_utilisateur || b.id_utilisateur === p.id_utilisateur)
      && (!p.session_id || b.session_id === Number(p.session_id))
      && (!p.depuis || b.timestamp >= p.depuis)
      && (!p.jusqu_a || b.timestamp <= p.jusqu_a))
    .sort((a, b) => dir * String(a[tri]).localeCompare(String(b[tri])) || dir * (a.id - b.id));

  return { total: rows.length, page, taille, resultats: rows.slice(page * taille, (page + 1) * taille) };
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

  const bugs = loadMockBugs();
  const bug = { id: Math.max(0, ...bugs.map((b) => b.id)) + 1, session_id: Number(sessionId), description: "", ...body };
  bugs.push(bug);
  saveMockBugs(bugs);
  return { id: bug.id };
}

/* ═══════════════ Utilitaires DOM ═══════════════ */

const $ = (selector) => document.querySelector(selector);

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);   // textContent uniquement : jamais d'innerHTML avec du contenu utilisateur
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
