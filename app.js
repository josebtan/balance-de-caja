// =======================================================
// APP.JS — Historial paginado por semanas
// =======================================================

import { saveMovementToFirestore } from "./firebase.js";

let saldo = 0;
let todosLosMovimientos = [];
let semanaActualOffset = 0;

// Elementos
const saldoEl = document.getElementById("saldo");
const historialEl = document.getElementById("historial");
const montoEl = document.getElementById("monto");
const detalleEl = document.getElementById("detalle");
const chkWhatsapp = document.getElementById("chkWhatsapp");

const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const lblSemana = document.getElementById("lblSemana");

document.getElementById("btnIngreso").addEventListener("click", () => registrar(true));
document.getElementById("btnGasto").addEventListener("click", () => registrar(false));

btnPrev.addEventListener("click", () => {
  semanaActualOffset--;
  renderSemana();
});

btnNext.addEventListener("click", () => {
  if (semanaActualOffset < 0) {
    semanaActualOffset++;
    renderSemana();
  }
});

// =======================================================
// 🔢 FORMATO
// =======================================================
function formatoMiles(num) {
  num = Number(num);
  if (isNaN(num)) return "";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function limpiarFormato(valor) {
  return valor.replace(/\./g, "");
}

// =======================================================
// ➕➖ REGISTRAR MOVIMIENTO
// =======================================================
async function registrar(esIngreso) {
  if (!montoEl.value.trim()) return alert("Ingresa un monto válido.");

  let monto = parseInt(limpiarFormato(montoEl.value));
  if (isNaN(monto) || monto <= 0) return alert("Monto inválido.");

  let detalle = detalleEl.value.trim();
  if (!esIngreso && !detalle) return alert("El detalle del gasto es obligatorio.");
  if (esIngreso && !detalle) detalle = "Sin detalle";

  const tipo = esIngreso ? "Ingreso" : "Salida";
  const saldoNuevo = esIngreso ? saldo + monto : saldo - monto;

  if (chkWhatsapp.checked) {
    const simbolo = esIngreso ? "+" : "-";
    const msg =
      `📌 *${tipo} registrado*\n\n` +
      `💵 *Movimiento:* ${simbolo}$${formatoMiles(monto)}\n` +
      `📝 *Detalle:* ${detalle}\n` +
      `📊 *Nuevo saldo:* $${formatoMiles(saldoNuevo)}`;

    window.location.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  await saveMovementToFirestore({ tipo, monto, detalle });

  montoEl.value = "";
  detalleEl.value = "";
}

// =======================================================
// 💰 SALDO
// =======================================================
function actualizarSaldo() {
  saldoEl.textContent = "$" + formatoMiles(saldo);
  saldoEl.className = saldo >= 0 ? "saldo-valor saldo-positivo" : "saldo-valor saldo-negativo";
}

// =======================================================
// 📆 UTILIDADES DE FECHA
// =======================================================
function getSemanaRango(offset) {
  const hoy = new Date();
  const inicio = new Date(hoy);
  inicio.setDate(hoy.getDate() - hoy.getDay() + offset * 7);
  inicio.setHours(0, 0, 0, 0);

  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);
  fin.setHours(23, 59, 59, 999);

  return { inicio, fin };
}

function renderSemana() {
  const { inicio, fin } = getSemanaRango(semanaActualOffset);

  lblSemana.textContent =
    `${inicio.toLocaleDateString()} - ${fin.toLocaleDateString()}`;

  historialEl.innerHTML = "";

  const filtrados = todosLosMovimientos.filter(m => {
    const fecha = m.createdAt?.toDate?.();
    return fecha && fecha >= inicio && fecha <= fin;
  });

  filtrados.forEach(mov => {
    const li = document.createElement("li");
    li.className = "tabla-row";

    li.innerHTML = `
      <span>${mov.createdAt.toDate().toLocaleDateString()}</span>
      <span class="${mov.tipo === "Ingreso" ? "tipo-verde" : "tipo-rojo"}">${mov.tipo}</span>
      <span>${mov.detalle}</span>
      <span>$${formatoMiles(mov.monto)}</span>
    `;

    historialEl.appendChild(li);
  });

  btnNext.disabled = semanaActualOffset === 0;
}

// =======================================================
// 📡 DATOS DESDE FIRESTORE
// =======================================================
window.addEventListener("firestoreMovements", (e) => {
  todosLosMovimientos = e.detail;

  saldo = todosLosMovimientos.reduce((acc, m) => {
    return m.tipo === "Ingreso" ? acc + m.monto : acc - m.monto;
  }, 0);

  actualizarSaldo();
  renderSemana();
});
