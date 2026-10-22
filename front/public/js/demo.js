"use strict";

/* Jeu factice : montre comment un jeu intègre le popup de signalement (voir l'en-tête de js/report.js).
   Volontairement indépendant de shared.js, comme le serait le vrai jeu. */

const $ = (selector) => document.querySelector(selector);

const player = { x: 120, y: 48 };
const STEP = 8;
let frame = null;          // iframe du popup, présente seulement quand il est ouvert
let snapshot = null;       // état du jeu figé à l'ouverture du popup

function gameState() {
  return { niveau: Number($("#g-niveau").value), position: { x: player.x, y: player.y } };
}

function render() {
  $("#player").style.left = `${(player.x / 400) * 100}%`;
  $("#player").style.top = `${(player.y / 200) * 100}%`;
  $("#hud").textContent = `Niveau ${$("#g-niveau").value} · x ${player.x} · y ${player.y}`;
}

const MOVES = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const clamp = (v, max) => Math.min(max, Math.max(0, v));

document.addEventListener("keydown", (e) => {
  if (frame) return;                                   // jeu en pause pendant le signalement
  if (e.key === "F2") { e.preventDefault(); openReport(); return; }
  const move = MOVES[e.key];
  if (!move || e.target.matches?.("input, select, textarea")) return;
  e.preventDefault();
  player.x = clamp(player.x + move[0] * STEP, 400);
  player.y = clamp(player.y + move[1] * STEP, 200);
  render();
});
$("#g-niveau").addEventListener("change", render);

/* ── Popup ── */

function openReport() {
  if (frame) return;
  const params = new URLSearchParams({ session: $("#g-session").value, user: $("#g-user").value.trim() });
  snapshot = gameState();
  frame = document.createElement("iframe");
  frame.className = "report-frame";
  frame.title = "Signaler un bug";
  frame.src = `../report/?${params}`;
  frame.addEventListener("load", () => frame.contentWindow.focus());
  document.body.append(frame);
}

function closeReport() {
  frame?.remove();
  frame = null;
  $("#report-btn").focus();
}

$("#report-btn").addEventListener("click", openReport);

window.addEventListener("message", (e) => {
  const msg = e.data;
  if (!frame || e.source !== frame.contentWindow || !msg || msg.source !== "kapture-report") return;
  logMessage(msg);

  if (msg.type === "ready") {
    frame.contentWindow.postMessage({ source: "kapture-game", type: "state", payload: snapshot }, location.origin);
  } else if (msg.type === "submitted") {
    showGameStatus(`Bug${msg.id != null ? ` n° ${msg.id}` : ""} envoyé. Il apparaît dans le tableau de bord.`);
  } else if (msg.type === "closed") {
    closeReport();
  }
});

function logMessage(msg) {
  const item = document.createElement("li");
  const code = document.createElement("code");
  code.textContent = JSON.stringify(msg);
  item.append(`${new Date().toLocaleTimeString("fr-FR")} `, code);
  $("#message-log").prepend(item);
}

function showGameStatus(text) {
  const box = document.createElement("div");
  box.className = "ok";
  box.textContent = text;
  $("#game-status").replaceChildren(box);
}

render();
