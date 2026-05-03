"use strict";

/**
 * Cloudflare Worker per la gestione degli Analytics RAGINDEX.
 * Gestisce la registrazione di eventi, il recupero dati e le query SQL raw.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Clear-Key",
};

/**
 * Crea una risposta JSON standard con header CORS.
 */
const _createJsonResponse = function(data, status = 200) {
  const body = JSON.stringify(data);
  const response = new Response(body, {
    status: status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
  return response;
};

/**
 * Gestisce la registrazione di un nuovo evento.
 */
const handlePostAnalytics = async function(request, env) {
  let body = null;
  try {
    body = await request.json();
  } catch (error) {
    console.error("handlePostAnalytics: Error parsing JSON", error);
    const errorResponse = _createJsonResponse({ error: "Invalid JSON" }, 400);
    return errorResponse;
  }

  const appName = body.appName;
  const userId = body.userId;
  const actionName = body.actionName;

  // Fail Fast: Validazione campi obbligatori
  if (!appName || !userId || !actionName) {
    const missingResponse = _createJsonResponse({ error: "Missing required fields: appName, userId, actionName" }, 400);
    return missingResponse;
  }

  const userAgent = body.userAgent || null;
  const timezone = body.timezone || null;
  const language = body.language || null;
  const referrer = body.referrer || null;
  const urlParams = body.urlParams ? JSON.stringify(body.urlParams) : null;
  const timestamp = body.timestamp || Math.floor(Date.now() / 1000);

  let result = null;
  try {
    const insertResult = await env.DB.prepare(
      "INSERT INTO analytics (app_name, user_id, action_name, user_agent, timezone, language, referrer, url_params, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(appName, userId, actionName, userAgent, timezone, language, referrer, urlParams, timestamp)
    .run();
    
    result = _createJsonResponse({ success: true, id: insertResult.meta.last_row_id }, 201);
  } catch (error) {
    console.error("handlePostAnalytics: DB Error", error);
    result = _createJsonResponse({ error: "Database error" }, 500);
  }

  return result;
};

/**
 * Gestisce il recupero degli eventi con filtri.
 */
const handleGetAnalytics = async function(request, env) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 1000);
  const appName = url.searchParams.get("appName");
  const actionName = url.searchParams.get("actionName");
  const userId = url.searchParams.get("userId");

  let query = "SELECT * FROM analytics WHERE 1=1";
  const params = [];

  if (appName) {
    query += " AND app_name = ?";
    params.push(appName);
  }
  if (actionName) {
    query += " AND action_name = ?";
    params.push(actionName);
  }
  if (userId) {
    query += " AND user_id = ?";
    params.push(userId);
  }

  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  let result = null;
  try {
    const stmt = env.DB.prepare(query);
    const dbResult = await stmt.bind(...params).all();
    result = _createJsonResponse(dbResult.results);
  } catch (error) {
    console.error("handleGetAnalytics: DB Error", error);
    result = _createJsonResponse({ error: "Database error" }, 500);
  }

  return result;
};

/**
 * Gestisce il recupero di un singolo evento per ID.
 */
const handleGetAnalyticsById = async function(request, env, id) {
  let result = null;
  try {
    const dbResult = await env.DB.prepare("SELECT * FROM analytics WHERE id = ?").bind(id).first();
    if (!dbResult) {
      result = _createJsonResponse({ error: "Not found" }, 404);
    } else {
      result = _createJsonResponse(dbResult);
    }
  } catch (error) {
    console.error("handleGetAnalyticsById: DB Error", error);
    result = _createJsonResponse({ error: "Database error" }, 500);
  }
  return result;
};

/**
 * Gestisce l'esecuzione di query SQL raw (solo SELECT).
 */
const handlePostQuery = async function(request, env) {
  let body = null;
  try {
    body = await request.json();
  } catch (error) {
    const errorResponse = _createJsonResponse({ error: "Invalid JSON" }, 400);
    return errorResponse;
  }

  const sql = body.sql ? body.sql.trim() : "";
  
  // Fail Fast: Solo SELECT permesse
  if (!sql.toUpperCase().startsWith("SELECT")) {
    const forbiddenResponse = _createJsonResponse({ error: "Only SELECT queries are allowed" }, 403);
    return forbiddenResponse;
  }

  // Blocco comandi pericolosi (anche se iniziano con SELECT per truffa)
  const forbiddenPatterns = [/DROP/i, /DELETE/i, /INSERT/i, /UPDATE/i, /ALTER/i, /TRUNCATE/i];
  const isForbidden = forbiddenPatterns.some(pattern => pattern.test(sql));
  
  if (isForbidden) {
    const unsafeResponse = _createJsonResponse({ error: "SQL statement contains forbidden keywords" }, 403);
    return unsafeResponse;
  }

  let result = null;
  try {
    // Nota: D1 ha un timeout intrinseco, non serve gestire i 5s manualmente qui se non per logica complessa
    const dbResult = await env.DB.prepare(sql).all();
    result = _createJsonResponse({ results: dbResult.results, meta: dbResult.meta });
  } catch (error) {
    console.error("handlePostQuery: DB Error", error);
    result = _createJsonResponse({ error: error.message }, 500);
  }

  return result;
};

/**
 * Gestisce lo svuotamento della tabella.
 */
const handleDeleteClear = async function(request, env) {
  const clearKey = request.headers.get("X-Clear-Key");
  const SECRET_KEY = env.CLEAR_KEY || "ragindex-secret-clear-2026";

  if (!clearKey || clearKey !== SECRET_KEY) {
    console.error("handleDeleteClear: Chiave non valida o mancante");
    const unauthorizedResponse = _createJsonResponse({
      error: "Unauthorized",
      details: !clearKey ? "Header mancante" : "Chiave errata"
    }, 401);
    return unauthorizedResponse;
  }

  let result = null;
  try {
    const dbResult = await env.DB.prepare("DELETE FROM analytics").run();
    result = _createJsonResponse({ success: true, deleted: dbResult.meta.rows_written });
  } catch (error) {
    console.error("handleDeleteClear: DB Error", error);
    result = _createJsonResponse({ error: "Database error" }, 500);
  }

  return result;
};

/**
 * Gestisce l'eliminazione di righe selezionate per ID.
 */
const handlePostDelete = async function(request, env) {
  const clearKey = request.headers.get("X-Clear-Key");
  const SECRET_KEY = env.CLEAR_KEY || "ragindex-secret-clear-2026";

  if (!clearKey || clearKey !== SECRET_KEY) {
    console.error("handlePostDelete: Chiave non valida o mancante");
    const unauthorizedResponse = _createJsonResponse({
      error: "Unauthorized",
      details: !clearKey ? "Header mancante" : "Chiave errata"
    }, 401);
    return unauthorizedResponse;
  }

  let body = null;
  try {
    body = await request.json();
  } catch (error) {
    const errorResponse = _createJsonResponse({ error: "Invalid JSON" }, 400);
    return errorResponse;
  }

  const ids = body.ids;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    const invalidResponse = _createJsonResponse({ error: "Missing or empty 'ids' array" }, 400);
    return invalidResponse;
  }

  // Costruisce la query DELETE con placeholders
  const placeholders = ids.map(() => "?").join(", ");
  const query = `DELETE FROM analytics WHERE id IN (${placeholders})`;

  let result = null;
  try {
    const stmt = env.DB.prepare(query);
    const dbResult = await stmt.bind(...ids).run();
    result = _createJsonResponse({ success: true, deleted: dbResult.meta.rows_written });
  } catch (error) {
    console.error("handlePostDelete: DB Error", error);
    result = _createJsonResponse({ error: "Database error" }, 500);
  }

  return result;
};

export default {
  /**
   * Handler principale fetch per il Worker.
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Gestione CORS Preflight
    if (method === "OPTIONS") {
      const optionsResponse = new Response(null, { headers: corsHeaders });
      return optionsResponse;
    }

    let response = null;

    // Routing manuale degli endpoint
    if (path === "/api/analytics") {
      if (method === "POST") {
        response = await handlePostAnalytics(request, env);
      } else if (method === "GET") {
        response = await handleGetAnalytics(request, env);
      }
    } else if (path.startsWith("/api/analytics/")) {
      const id = path.split("/").pop();
      if (id === "clear") {
        if (method === "DELETE") {
          response = await handleDeleteClear(request, env);
        }
      } else if (id === "delete") {
        if (method === "POST") {
          response = await handlePostDelete(request, env);
        }
      } else if (method === "GET") {
        response = await handleGetAnalyticsById(request, env, id);
      }
    } else if (path === "/api/query" && method === "POST") {
      response = await handlePostQuery(request, env);
    }

    // Se nessun route corrisponde
    if (!response) {
      response = _createJsonResponse({ error: "Not Found" }, 404);
    }

    return response;
  }
};
