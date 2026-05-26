// ============================================================
// VGV SpA — Portal de Operaciones (FRONTEND)
// script_v2_corregido.js
// ============================================================

const API_URL = "https://script.google.com/macros/s/AKfycbzP04DM6clsY4oUASPu3HDRLdFlsjk4EwORNVcYMlC4hNPaPr2W4KsUGNOoecXJIUCr/exec";

console.log("SCRIPT VGV CARGADO — API:", API_URL);

let usuarioActivo = null;
let fotoBase64 = null;

// ============================================================
// HELPER — fetch sin CORS preflight
// Envía como URLSearchParams (form-encoded) → no dispara OPTIONS
// El backend lee con: e.parameter.data
// ============================================================

async function apiPost(payload) {
  const params = new URLSearchParams();
  params.append("data", JSON.stringify(payload));

  const resp = await fetch(API_URL, {
    method: "POST",
    // ✅ SIN Content-Type: application/json → sin preflight OPTIONS
    body: params
  });

  return resp.json();
}

// ============================================================
// INDEXEDDB — MODO OFFLINE
// ============================================================

let db;
const DB_NAME   = "vgv_entregas";
const STORE_NAME = "pendientes";

function initDB() {
  const request = indexedDB.open(DB_NAME, 1);

  request.onupgradeneeded = e => {
    db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
    }
  };

  request.onsuccess = e => { db = e.target.result; };
  request.onerror   = e => console.error("IndexedDB error:", e);
}

initDB();

function guardarEntregaOffline(data) {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({
      ...data,
      estadoEnvio:   "pendiente",
      fechaGuardado: Date.now()
    });
    tx.oncomplete = () => resolve(true);
  });
}

function obtenerPendientes() {
  return new Promise(resolve => {
    const tx  = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

function eliminarPendiente(id) {
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
}

// ============================================================
// REENVÍO OFFLINE — definida una sola vez ✅
// ============================================================

window.addEventListener("online", reenviarPendientes);

async function reenviarPendientes() {
  const pendientes = await obtenerPendientes();

  for (const item of pendientes) {
    try {
      // ✅ Usa apiPost para evitar CORS también en reenvíos
      const data = await apiPost(item);
      if (data.ok) eliminarPendiente(item.id);
    } catch (err) {
      console.warn("No se pudo reenviar:", err);
    }
  }

  actualizarBadgePendientes();
}

// ============================================================
// UTILIDADES
// ============================================================

function hayInternet() {
  return navigator.onLine;
}

async function compressImage(base64, maxWidth = 1200, quality = 0.7) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");

      const targetWidth = Math.min(maxWidth, img.width);
      const scale = targetWidth / img.width;

      canvas.width  = targetWidth;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = base64;
  });
}

// ============================================================
// LOGIN
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const sesion = sessionStorage.getItem("vgv_usuario");
  if (sesion) {
    usuarioActivo = JSON.parse(sesion);
    mostrarMenu();
  }

  document.getElementById("login-pass").addEventListener("keydown", e => {
    if (e.key === "Enter") doLogin();
  });

  document.querySelectorAll(".estado-box").forEach(box => {
    box.addEventListener("click", () => {
      document.querySelectorAll(".estado-box")
        .forEach(b => b.classList.remove("selected"));

      box.classList.add("selected");
      document.getElementById("estado").value = box.dataset.value;
    });
  });
});

async function doLogin() {
  const usuario  = document.getElementById("login-user").value.trim().toLowerCase();
  const clave    = document.getElementById("login-pass").value;
  const errorEl  = document.getElementById("login-error");
  const btn      = document.querySelector("#screen-login .btn-primary");

  if (!usuario || !clave) {
    errorEl.textContent = "Ingresa tu usuario y contraseña.";
    errorEl.classList.remove("hidden");
    return;
  }

  btn.textContent = "Verificando...";
  btn.disabled    = true;
  errorEl.classList.add("hidden");

  try {
    // ✅ Usa apiPost — sin CORS preflight
    const data = await apiPost({ accion: "login", usuario, password: clave });

    if (data.ok) {
      usuarioActivo = data.usuario;
      sessionStorage.setItem("vgv_usuario", JSON.stringify(usuarioActivo));
      mostrarMenu();
    } else {
      errorEl.textContent = data.error || "Usuario o contraseña incorrectos";
      errorEl.classList.remove("hidden");
      document.getElementById("login-pass").value = "";
    }
  } catch (err) {
    errorEl.textContent = "Error de conexión. Intenta nuevamente.";
    errorEl.classList.remove("hidden");
  }

  btn.textContent = "Ingresar";
  btn.disabled    = false;
}

function doLogout() {
  sessionStorage.removeItem("vgv_usuario");
  usuarioActivo = null;
  showScreen("screen-login");
  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
}

// ============================================================
// NAVEGACIÓN
// ============================================================

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo(0, 0);
}

function mostrarMenu() {
  if (!usuarioActivo) return;

 const iniciales = usuarioActivo.nombre
  ? usuarioActivo.nombre.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()
  : "US";
  document.getElementById("menu-avatar").textContent = iniciales;
  document.getElementById("menu-nombre").textContent = usuarioActivo.nombre;
  document.getElementById("menu-rol").textContent    = usuarioActivo.rol;

  const ahora = new Date();
  document.getElementById("menu-fecha").innerHTML =
    `${ahora.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}<br>
     ${ahora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`;

  actualizarBadgePendientes();
  showScreen("screen-menu");
}

function goToModule(mod) {
  if (mod === "entregas") {
    resetFormEntregas();
    showScreen("screen-entregas");
  }
}

function goBack(destino) {
  if (destino === "menu") {
    mostrarMenu();
  } else {
    showScreen("screen-" + destino);
  }
}

// ============================================================
// MÓDULO ENTREGAS
// ============================================================

function resetFormEntregas() {
  fotoBase64 = null;

  document.getElementById("guia-numero").value = "";
  document.getElementById("estado").value      = "";

  document.querySelectorAll(".estado-box").forEach(b => b.classList.remove("selected"));

  document.getElementById("photo-preview").src = "";
  document.getElementById("photo-preview").classList.add("hidden");
  document.getElementById("photo-placeholder").style.display = "flex";
  document.getElementById("btn-retake").style.display        = "none";
  document.getElementById("camera-input").value              = "";
  document.getElementById("submit-status").classList.add("hidden");
  document.getElementById("btn-submit").disabled             = false;

  actualizarDatetime();
}

function actualizarDatetime() {
  const ahora = new Date();
  const texto = ahora.toLocaleDateString("es-CL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }) + " · " + ahora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

  const el = document.getElementById("datetime-auto");
  if (el) el.textContent = texto;
}

setInterval(() => {
  if (document.getElementById("screen-entregas").classList.contains("active")) {
    actualizarDatetime();
  }
}, 30000);

function triggerCamera() {
  document.getElementById("camera-input").click();
}

function handlePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async e => {
    const originalBase64 = e.target.result;
    fotoBase64 = await compressImage(originalBase64);

    const preview = document.getElementById("photo-preview");
    preview.src = fotoBase64;
    preview.classList.remove("hidden");

    document.getElementById("photo-placeholder").style.display = "none";
    document.getElementById("btn-retake").style.display        = "block";
  };

  reader.readAsDataURL(file);
}

function retakePhoto() {
  fotoBase64 = null;
  document.getElementById("camera-input").value = "";
  document.getElementById("photo-preview").classList.add("hidden");
  document.getElementById("photo-placeholder").style.display = "flex";
  document.getElementById("btn-retake").style.display        = "none";
}

// ============================================================
// ENVÍO DE ENTREGA (ONLINE + OFFLINE)
// ============================================================

async function submitEntrega() {
  const guia   = document.getElementById("guia-numero").value.trim();
  const estado = document.getElementById("estado").value;
  const btn    = document.getElementById("btn-submit");
  const status = document.getElementById("submit-status");

  // Evitar doble envío
  if (btn.disabled) return;

  if (!guia) {
    alert("Por favor ingresa el número de guía.");
    return;
  }
  if (!fotoBase64) {
    alert("Por favor toma o sube la foto.");
    return;
  }
  if (!estado) {
    alert("Por favor selecciona el estado de la entrega.");
    return;
  }

  // Asegurar formato correcto
  let foto = fotoBase64;
  if (foto.startsWith("data:image")) {
    foto = foto.split(",")[1];
  }

  const payload = {
    accion: "registrarEntrega",
    guia,
    estado,
    usuario: usuarioActivo.nombre,
    rol: usuarioActivo.rol,
    fecha: new Date().toLocaleDateString("es-CL"),
    hora:  new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
    fotoBase64: foto
  };

  btn.disabled    = true;
  btn.textContent = "Enviando...";
  status.textContent = "⏳ Guardando...";
  status.classList.remove("hidden");

  // MODO OFFLINE
  if (!hayInternet()) {
    await guardarEntregaOffline(payload);
    btn.disabled = false;
    btn.textContent = "Enviar";
    mostrarExito(guia);
    actualizarBadgePendientes();
    return;
  }

  // MODO ONLINE
  try {
    const data = await apiPost(payload);

    if (data.ok) {
      mostrarExito(guia);
    } else {
      throw new Error(data.error || "Error desconocido");
    }

  } catch (err) {
    // Guarda offline si falla
    await guardarEntregaOffline(payload);
    mostrarExito(guia);
  }

  btn.disabled = false;
  btn.textContent = "Enviar";
  actualizarBadgePendientes();
}

function mostrarExito(guia) {
  document.getElementById("exito-guia").textContent = "Guía N° " + guia;
  showScreen("screen-exito");
}

function nuevaEntrega() {
  showScreen("screen-entregas");
  resetFormEntregas();
}

// ============================================================
// BADGE DE PENDIENTES
// ============================================================

async function actualizarBadgePendientes() {
  const pendientes = await obtenerPendientes();
  const badge = document.getElementById("badge-pendientes");
  if (!badge) return;

  if (pendientes.length > 0) {
    badge.textContent = pendientes.length;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}
