// src/config/api.js
export const API_BASE_URL = window.location.hostname === 'localhost'
  ? "http://localhost:8000"                  // dev local
  : "https://clean-mboka-backend.onrender.com"; // production Render
