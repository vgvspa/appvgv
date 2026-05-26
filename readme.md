VGV SpA — App Web v2
Aplicación web para el registro de entregas de VGV SpA.
Frontend en GitHub Pages y backend en Google Apps Script.

📌 Funcionalidades principales
Login de usuarios (validado desde Google Sheets)

Registro de entregas con:

Número de guía

Estado de entrega

Foto comprimida

Fecha y hora automática

Guardado de fotos en Google Drive

Registro en Google Sheets

Modo offline con sincronización automática

App instalable como PWA

Interfaz optimizada para choferes

📂 Estructura del proyecto
Código
/
├── index.html
├── style.css
├── script_v2.js
├── manifest.json
├── service-worker.js
└── /icons
      ├── icon-192.png
      └── icon-512.png
⚙️ Backend (Apps Script)
El backend se encuentra en un proyecto de Google Apps Script e incluye:

doPost() para login y registro de entregas

Guardado de fotos en Google Drive

Registro en Google Sheets

Auditoría de acciones

Validación de guías

Configurar los IDs en Code.gs:

js
const SPREADSHEET_ID    = "ID_HOJA_ENTREGAS";
const SHEET_LOGIN_ID    = "ID_HOJA_USUARIOS";
const FOLDER_FOTOS_NAME = "VGV_Fotos_Entregas";
Publicar como Web App y usar la URL en:

js
const API_URL = "URL_DEL_WEBAPP";
🌐 Frontend (GitHub Pages)
Subir todos los archivos al repositorio

Activar GitHub Pages:

Settings → Pages → Source: main

La app quedará disponible en:

Código
https://TU_USUARIO.github.io/TU_REPO/
📱 Instalación como PWA
La app incluye:

manifest.json

service-worker.js

Permite instalarla en:

Android

iPhone

Desktop (Chrome/Edge)

🧩 Próximos módulos
Rutas del día

Rendiciones

Incidencias

KPIs para gerencia

Panel administrativo

👤 Autor
Desarrollado por Mauro Olea Valenzuela  
VGV SpA — Área de Sistemas