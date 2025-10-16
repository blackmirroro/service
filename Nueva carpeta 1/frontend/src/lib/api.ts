import axios from "axios";

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: apiBase
});

api.interceptors.request.use((config) => {
  // Normaliza la URL para evitar redirecciones 307 del backend (que pueden perder Authorization)
  // Si la URL no termina en "/" y no tiene querystring, se añade una barra final.
  // Ejemplos:
  //   /tickets      -> /tickets/
  //   /tickets/123  -> /tickets/123/   (también añadimos barra para mantener consistencia con FastAPI)
  //   /search?q=... -> se deja tal cual
  if (config.url) {
    const hasQuery = config.url.includes("?");
    if (!hasQuery && !config.url.endsWith("/")) {
      config.url = `${config.url}/`;
    }
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("sf_token");
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    const cid = localStorage.getItem("sf_company_id");
    if (cid) {
      config.headers = config.headers || {};
      (config.headers as any)["X-Company-Id"] = cid;
    }
  }
  return config;
});