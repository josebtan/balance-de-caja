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
const proveedorEl = document.getElementById("proveedor");
const scEl = document.getElementById("sc");
const camposGasto = document.getElementById("campos-gasto");
const chkWhatsapp = document.getElementById("chkWhatsapp");


const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const lblSemana = document.getElementById("lblSemana");

// Filtros
const filtroTexto    = document.getElementById("filtroTexto");
const filtroFecha    = document.getElementById("filtroFecha");
const filtroProveedor = document.getElementById("filtroProveedor");
const filtroSC       = document.getElementById("filtroSC");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");
const filtroInfo     = document.getElementById("filtroInfo");

filtroTexto.addEventListener("input", aplicarFiltros);
filtroFecha.addEventListener("input", aplicarFiltros);
filtroProveedor.addEventListener("input", aplicarFiltros);
filtroSC.addEventListener("input", aplicarFiltros);

btnLimpiarFiltros.addEventListener("click", () => {
  filtroTexto.value = "";
  filtroFecha.value = "";
  filtroProveedor.value = "";
  filtroSC.value = "";
  aplicarFiltros();
});

document.getElementById("btnIngreso").addEventListener("click", () => {
  camposGasto.style.display = "none";
  registrar(true);
});
document.getElementById("btnGasto").addEventListener("click", () => {
  camposGasto.style.display = "flex";
  registrar(false);
});

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

  // Campos extra solo para gastos
  const proveedor = !esIngreso ? (proveedorEl.value.trim() || "") : "";
  const sc = !esIngreso ? (scEl.value.trim() || "") : "";

  if (chkWhatsapp.checked) {
    const simbolo = esIngreso ? "+" : "-";
    let msg =
      `📌 *${tipo} registrado*\n\n` +
      `💵 *Movimiento:* ${simbolo}$${formatoMiles(monto)}\n` +
      `📝 *Detalle:* ${detalle}\n`;
    if (!esIngreso) {
      if (proveedor) msg += `🏢 *Proveedor:* ${proveedor}\n`;
      if (sc) msg += `🔢 *SC:* ${sc}\n`;
    }
    msg += `📊 *Nuevo saldo:* $${formatoMiles(saldoNuevo)}`;

    window.location.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  await saveMovementToFirestore({ tipo, monto, detalle, proveedor, sc });

  montoEl.value = "";
  detalleEl.value = "";
  proveedorEl.value = "";
  scEl.value = "";
  camposGasto.style.display = "none";
}

// =======================================================
// 🔍 FILTROS
// =======================================================
function hayFiltrosActivos() {
  return filtroTexto.value.trim() || filtroFecha.value || filtroProveedor.value.trim() || filtroSC.value.trim();
}

function aplicarFiltros() {
  if (!hayFiltrosActivos()) {
    filtroInfo.style.display = "none";
    // Restaurar paginación por semana
    document.querySelector(".pagination").style.display = "flex";
    renderSemana();
    return;
  }

  // Ocultar paginación por semana mientras hay filtros
  document.querySelector(".pagination").style.display = "none";

  const texto    = filtroTexto.value.trim().toLowerCase();
  const fecha    = filtroFecha.value; // "YYYY-MM-DD"
  const proveedor = filtroProveedor.value.trim().toLowerCase();
  const sc       = filtroSC.value.trim().toLowerCase();

  const resultado = todosLosMovimientos.filter(m => {
    if (texto && !(m.detalle || "").toLowerCase().includes(texto)) return false;

    if (fecha) {
      const fechaMov = m.createdAt?.toDate?.();
      if (!fechaMov) return false;
      const fechaStr = fechaMov.toISOString().slice(0, 10);
      if (fechaStr !== fecha) return false;
    }

    if (proveedor && !(m.proveedor || "").toLowerCase().includes(proveedor)) return false;
    if (sc && !(m.sc || "").toLowerCase().includes(sc)) return false;

    return true;
  });

  renderMovimientos(resultado);

  filtroInfo.style.display = "block";
  filtroInfo.textContent = `${resultado.length} resultado${resultado.length !== 1 ? "s" : ""} encontrado${resultado.length !== 1 ? "s" : ""}`;
}

function renderMovimientos(lista) {
  historialEl.innerHTML = "";

  lista.forEach(mov => {
    const li = document.createElement("li");
    li.className = "tabla-row";

    li.innerHTML = `
      <span>${mov.createdAt.toDate().toLocaleDateString()}</span>
      <span class="${mov.tipo === "Ingreso" ? "tipo-verde" : "tipo-rojo"}">${mov.tipo}</span>
      <span>${mov.detalle}</span>
      <span>${mov.proveedor || "-"}</span>
      <span>${mov.sc || "-"}</span>
      <span>$${formatoMiles(mov.monto)}</span>
    `;

    historialEl.appendChild(li);
  });
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

  renderMovimientos(filtrados);
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
