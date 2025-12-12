// =======================================================
// APP.JS — Versión con checkbox para WhatsApp
// =======================================================

import { saveMovementToFirestore } from "./firebase.js";

let saldo = 0;

// Elementos
const saldoEl = document.getElementById("saldo");
const historialEl = document.getElementById("historial");
const montoEl = document.getElementById("monto");
const detalleEl = document.getElementById("detalle");
const chkWhatsapp = document.getElementById("chkWhatsapp");

document.getElementById("btnIngreso").addEventListener("click", () => registrar(true));
document.getElementById("btnGasto").addEventListener("click", () => registrar(false));


// =======================================================
// 🔢 FORMATO MILES (1.234.567)
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
// ➕➖ REGISTRAR INGRESO / GASTO + WHATSAPP OPCIONAL
// =======================================================
async function registrar(esIngreso) {

  if (!montoEl.value.trim()) {
    alert("Ingresa un monto válido.");
    return;
  }

  let monto = parseInt(limpiarFormato(montoEl.value));

  if (isNaN(monto) || monto <= 0) {
    alert("Ingresa un monto válido.");
    return;
  }

  monto = Math.round(monto);

  let detalle = detalleEl.value.trim();

  if (esIngreso && detalle === "") detalle = "Sin detalle";

  if (!esIngreso && detalle === "") {
    alert("El detalle del gasto es obligatorio.");
    return;
  }

  const tipo = esIngreso ? "Ingreso" : "Salida";

  const saldoAnterior = saldo;
  const saldoNuevo = esIngreso ? saldoAnterior + monto : saldoAnterior - monto;

  // =====================================================
  // 📲 ENVÍO OPCIONAL POR WHATSAPP
  // =====================================================
  if (chkWhatsapp.checked) {
    const simbolo = esIngreso ? "+" : "-";

    const msg =
      `📌 *${tipo} registrado*\n\n` +
      `💵 *Saldo anterior:* $${formatoMiles(saldoAnterior)}\n` +
      `🔄 *Movimiento:* ${simbolo}$${formatoMiles(monto)}\n` +
      `📝 *Detalle:* ${detalle}\n\n` +
      `📊 *Nuevo saldo:* $${formatoMiles(saldoNuevo)}`;

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.location.href = url;
  }

  // =====================================================
  // 🔥 GUARDAR EN FIRESTORE
  // =====================================================
  await saveMovementToFirestore({
    tipo,
    monto,
    detalle
  });

  montoEl.value = "";
  detalleEl.value = "";
}



// =======================================================
// 💰 ACTUALIZAR SALDO
// =======================================================
function actualizarSaldo() {
  saldoEl.textContent = "$" + formatoMiles(saldo);

  saldoEl.classList.remove("saldo-positivo", "saldo-negativo");
  saldo >= 0
    ? saldoEl.classList.add("saldo-positivo")
    : saldoEl.classList.add("saldo-negativo");
}



// =======================================================
// 📋 RECIBIR HISTORIAL EN TIEMPO REAL
// =======================================================
window.addEventListener("firestoreMovements", (e) => {
  const datos = e.detail;

  saldo = datos.reduce((total, mov) => {
    const monto = parseInt(mov.monto) || 0;
    return mov.tipo === "Ingreso" ? total + monto : total - monto;
  }, 0);

  actualizarSaldo();

  historialEl.innerHTML = "";

  datos.forEach((mov) => {
    const fecha = mov.createdAt?.toDate
      ? mov.createdAt.toDate().toLocaleString()
      : "—";

    const li = document.createElement("li");
    li.classList.add("tabla-row");

    li.innerHTML = `
      <span>${fecha}</span>
      <span class="${mov.tipo === "Ingreso" ? "tipo-verde" : "tipo-rojo"}">${mov.tipo}</span>
      <span>${mov.detalle}</span>
      <span>$${formatoMiles(parseInt(mov.monto))}</span>
    `;

    historialEl.appendChild(li);
  });
});
