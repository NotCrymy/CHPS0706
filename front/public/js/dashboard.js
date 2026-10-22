"use strict";

/* Tableau de bord : liste des bugs (GET /api/bugs) avec filtres, tri et pagination. */

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

$("#refresh-btn").addEventListener("click", loadDashboard);

/* ── Démarrage ── */

if (USE_MOCK) {
  $("#mock-banner").hidden = false;
  // Un bug envoyé depuis le popup (autre onglet) apparaît sans recharger la page.
  window.addEventListener("storage", (e) => { if (e.key === MOCK_KEY) loadDashboard(); });
}
loadDashboard();
