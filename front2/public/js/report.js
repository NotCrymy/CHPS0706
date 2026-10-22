"use strict";

/* Popup de signalement affichée dans le jeu (iframe / webview).

  Le jeu ouvre :  /report/?session=42&user=Storm_X9
  Le popup prévient le jeu par postMessage :
  { source: "kapture-report", type: "submitted", id }   bug envoyé
  { source: "kapture-report", type: "closed" }          popup fermée (annulée ou terminée)
  Sans ces paramètres (test dans un navigateur), un panneau « Mode développement » apparaît. */

// Ajoute au payload des métriques de comportement (temps de réaction, etc.), invisibles pour le joueur.
const COLLECT_BEHAVIOR = true;

const params = new URLSearchParams(location.search);
const gameSession = Number(params.get("session"));
const gameUser = (params.get("user") || "").trim();
const inGame = Number.isInteger(gameSession) && gameSession > 0 && gameUser.length > 0;

const form = $("#report-form");
const formStatus = $("#form-status");
const submitBtn = $("#submit-btn");

fillSelect($("#f-titre"), TITRES.map((t) => ({ value: t, label: t })), "Choisir un bug");
fillSelect($("#f-type"), TYPES_BUG, "Choisir une catégorie");
$("#dev-panel").hidden = inGame;

function notifyGame(type, detail = {}) {
  if (window.parent !== window) {
    // "*" suffit pour le POC ; à restreindre à l'origine du jeu si besoin.
    window.parent.postMessage({ source: "kapture-report", type, ...detail }, "*");
  }
}

/* ── Fermeture ── */
function closePopup() {
  notifyGame("closed");
  if (window.parent === window) {      // test hors du jeu : on remet simplement à zéro
    form.reset();
    $("#desc-counter").textContent = "0 / 500";
    clearStatus(formStatus);
  }
}
$("#close-x").addEventListener("click", closePopup);
$("#cancel-btn").addEventListener("click", closePopup);
$("#done-btn").addEventListener("click", closePopup);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePopup(); });

$("#f-description").addEventListener("input", (e) => {
  $("#desc-counter").textContent = `${e.target.value.length} / 500`;
});

/* ── Métriques de comportement ── */
const behavior = { ouvertA: performance.now(), premiereSaisieA: null, modifications: 0, ordreSaisie: [] };

form.addEventListener("input", (e) => {
  const name = e.target.name;
  if (!name || ["session", "user"].includes(name)) return;
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

/* ── Envoi ── */
function markInvalid(field, isInvalid) {
  field.classList.toggle("invalid", isInvalid);
  field.setAttribute("aria-invalid", String(isInvalid));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearStatus(formStatus);

  const titreField = $("#f-titre");
  const typeField = $("#f-type");
  const description = $("#f-description").value.trim();

  const sessionId = inGame ? gameSession : Number($("#f-session").value);
  const pseudo = inGame ? gameUser : $("#f-pseudo").value.trim();

  const problems = [];
  const check = (field, ok, message) => { markInvalid(field, !ok); if (!ok) problems.push(message); };
  check(titreField, titreField.value !== "", "Choisis le bug rencontré.");
  check(typeField, typeField.value !== "", "Choisis une catégorie.");
  check($("#f-description"), description.length <= 500, "La description ne doit pas dépasser 500 caractères.");
  if (!inGame) {
    check($("#f-session"), Number.isInteger(sessionId) && sessionId > 0, "Indique un numéro de session valide.");
    check($("#f-pseudo"), pseudo.length > 0 && pseudo.length <= 30, "Indique un pseudonyme (30 caractères max).");
  }

  // Dans le jeu, le payload (état du jeu) sera fourni par le jeu ; ici seulement en mode développement.
  let payload = {};
  if (!inGame) {
    const rawPayload = $("#f-payload").value.trim();
    if (rawPayload) {
      try {
        payload = JSON.parse(rawPayload);
        if (typeof payload !== "object" || payload === null || Array.isArray(payload)) throw new Error();
        markInvalid($("#f-payload"), false);
      } catch {
        markInvalid($("#f-payload"), true);
        problems.push("Le payload doit être un objet JSON valide.");
      }
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
    timestamp: new Date().toISOString(),   // ISO 8601 avec millisecondes
    type_bug: typeField.value,
  };
  if (description) body.description = description;

  submitBtn.disabled = true;
  try {
    const result = await apiCreateBug(sessionId, body);
    notifyGame("submitted", { id: result.id });
    form.hidden = true;
    $("#done").hidden = false;
    $("#done-btn").focus();
  } catch (err) {
    if (err.status === 404) showStatus(formStatus, "error", "Session inconnue.");
    else if (err.status === 400) showStatus(formStatus, "error", `Le signalement a été refusé : ${err.message}`);
    else showStatus(formStatus, "error", "L'envoi a échoué. Réessaie dans un instant.");
  } finally {
    submitBtn.disabled = false;
  }
});

if (USE_MOCK) console.info("[kapture] popup en mode démo (USE_MOCK = true dans js/shared.js)");
