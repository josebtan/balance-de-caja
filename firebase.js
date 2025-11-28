// =======================================================
// FIREBASE.JS — Versión final y estable (SIN deprecated)
// =======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";

import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";


// =======================================================
// 🔥 CONFIGURACIÓN FIREBASE
// =======================================================
const firebaseConfig = {
  apiKey: "AIzaSyB9disXPYzyPpSlhmlV9sLi3QaPWV0rIfI",
  authDomain: "balance-de-caja.firebaseapp.com",
  projectId: "balance-de-caja",
  storageBucket: "balance-de-caja.firebasestorage.app",
  messagingSenderId: "1076485150484",
  appId: "1:1076485150484:web:36d69fda52a83155891401"
};


// =======================================================
// 🚀 INICIALIZACIÓN (NUEVA FORMA RECOMENDADA)
// =======================================================
const app = initializeApp(firebaseConfig);

// Nueva inicialización Firestore + cache recomendado (evita deprecated)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);


// =======================================================
// 🔐 AUTENTICACIÓN ANÓNIMA
// =======================================================
let userId = null;
let movimientosRef = null;
let firebaseReady = false;

signInAnonymously(auth).catch(e => console.error(e));

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  userId = user.uid;
  movimientosRef = collection(db, "movimientos");
  firebaseReady = true;

  console.log("🔥 Firebase Ready — UID:", userId);

  activarListener();

  window.dispatchEvent(new Event("firebaseReady"));
});


// =======================================================
// 📌 GUARDAR MOVIMIENTO
// =======================================================
export async function saveMovementToFirestore(mov) {
  if (!firebaseReady || !movimientosRef) {
    console.warn("⏳ Firebase aún no está listo...");
    return;
  }

  try {
    await addDoc(movimientosRef, {
      ...mov,
      userId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("❌ Error guardando en Firestore:", error);
  }
}


// =======================================================
// 📡 LISTENER EN TIEMPO REAL
// =======================================================
let unsubscribeMovimientos = null;

function activarListener() {
  if (!movimientosRef) return;

  const q = query(movimientosRef, orderBy("createdAt", "desc"));

  if (unsubscribeMovimientos) unsubscribeMovimientos();

  unsubscribeMovimientos = onSnapshot(q, (snapshot) => {
    const resultados = [];

    snapshot.forEach((doc) => {
      resultados.push({
        id: doc.id,
        ...doc.data()
      });
    });

    window.dispatchEvent(
      new CustomEvent("firestoreMovements", { detail: resultados })
    );
  });
}

export const firestoreDB = db;
export const firebaseAuth = auth;
