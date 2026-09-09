# Architettura di WWWANALYZER

WWWANALYZER è un sistema di tracciamento eventi e analytics basato su Cloudflare Workers (backend) e Cloudflare Pages (frontend), con database D1 (SQLite distribuito).

## Stack tecnologico

| Componente | Tecnologia |
|-----------|-----------|
| Backend API | Cloudflare Worker (V8), singolo file `worker/src/index.js` |
| Database | Cloudflare D1 (SQLite), binding name `DB` |
| Frontend | Cloudflare Pages, Vanilla JS (nessun framework, nessun bundler) |
| Stili frontend | CSS3 inline nelle pagine HTML (nessun file .css separato) |

## Struttura del progetto

```
wwwanalyzer/
  worker/                 # Backend Cloudflare Worker
    src/index.js           #   Entrypoint UNICO: routing manuale, gestione API
    migrations/            #   Migrazioni D1 (0001_init.sql)
    package.json           #   Solo metadati; "type": "commonjs" ma export è ESM
  pages/                   # Frontend Cloudflare Pages
    index.html             #   Hub di navigazione tra CLI e DB Explorer
    wwwanalyzer-cli/       #   Client di test per invio eventi manuali
      index.html
      js/sender.js         #   Modulo esportabile per app esterne
      js/reader.js         #   Lettura eventi dal Worker
      js/app.js            #   Controller Test Client
    wwwanalyzer-db/        #   SQL Explorer per analisi dati e manutenzione
      index.html
      js/query.js          #   Esecuzione query SQL via /api/query
      js/table.js          #   Rendering tabella risultati
      js/app.js            #   Controller DB Explorer
  bin/                     # Script di automazione (sviluppo, deploy, clone)
  docs/                    # Documentazione
  wrangler.toml            # Config Worker backend (puntato da root)
  wrangler.pages.toml      # Config Pages frontend (separata)
```

## Routing delle richieste (worker/src/index.js)

Il Worker non usa framework di routing. Il path matching è manuale via `if/else if` su `url.pathname`:

```
POST   /api/analytics              -> handlePostAnalytics
GET    /api/analytics              -> handleGetAnalytics
GET    /api/analytics/:id          -> handleGetAnalyticsById
DELETE /api/analytics/clear        -> handleDeleteClear
POST   /api/analytics/delete       -> handlePostDelete
POST   /api/query                  -> handlePostQuery
```

Le richieste `OPTIONS` su qualsiasi path ricevono una risposta CORS preflight vuota con header `Access-Control-Allow-Origin: *`.

Nota: `GET /api/analytics/clear` o `GET /api/analytics/delete` non eseguono cancellazioni: il routing le tratta come `GET /api/analytics/:id` con `id="clear"`/`"delete"` e restituisce `404 Not found`. Solo `DELETE` su `/clear` e `POST` su `/delete` sono operativi.

## Dettaglio endpoint API

### POST /api/analytics

Registra un evento.

**Body JSON:**
| Campo | Tipo | Obbligatorio | Descrizione |
|-------|------|-------------|-------------|
| appName | string | si | Nome applicazione |
| userId | string | si | ID utente |
| actionName | string | si | Nome azione |
| userAgent | string | no | navigator.userAgent |
| timezone | string | no | fuso orario (es. Europe/Rome) |
| language | string | no | lingua browser (es. it-IT) |
| referrer | string | no | document.referrer |
| urlParams | object | no | query string params |
| timestamp | integer | no | unix timestamp del client; se omesso usa il tempo del Worker (`Date.now()`) — distinto da `created_at` generato da D1 |

L'IP del chiamante **non** va inviato nel body: lo legge il Worker dagli header
(`CF-Connecting-IP`, fallback sul primo di `X-Forwarded-For`, altrimenti `NULL`).

**Risposta 201:** `{ "success": true, "id": 42 }`

**Risposta 400:** `{ "error": "Missing required fields: appName, userId, actionName" }`

### GET /api/analytics

Lista eventi con filtri opzionali.

**Query params:** `limit` (default 100, max 1000), `appName`, `actionName`, `userId`, `ip`

Ordinamento: `created_at DESC`.

### GET /api/analytics/:id

Singolo evento per ID numerico.

**Risposta 404:** `{ "error": "Not found" }`

### DELETE /api/analytics/clear

Svuota l'intera tabella e riazzera il contatore `AUTOINCREMENT` (il prossimo evento riparte da ID 1). Richiede header `X-Clear-Key`.

### POST /api/analytics/delete

Elimina righe per ID. Richiede header `X-Clear-Key`.

**Body:** `{ "ids": [1, 2, 3] }`

### POST /api/query

Esegue SQL raw (solo SELECT). **Bloccate:** `DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `TRUNCATE` anche se mascherate (test regex case-insensitive). La violazione restituisce 403.

## Schema database (D1)

Tabella `analytics`:

| Colonna | Tipo | Obbligatorio | Significato |
|---------|------|-------------|-------------|
| id | INTEGER | auto (PK autoincrement) | Identificativo univoco dell'evento. Si riazzera a 1 solo con lo svuotamento completo (`DELETE /api/analytics/clear`); la cancellazione di righe singole non lo tocca |
| app_name | TEXT | sì | Nome dell'applicazione che ha generato l'evento (es. `test-app`, `mia-app`). Separa i dati di app diverse nello stesso DB |
| user_id | TEXT | sì | Identificativo dell'utente. Se passato a `UaSender.init()` usa quello; altrimenti `sender.js` usa `"<appName>_user_id"`, mentre il Test Client genera un UUID persistito in `localStorage` (`wwwanalyzer_user_id`) |
| action_name | TEXT | sì | Nome dell'azione tracciata (es. `click_pulsante`, `open`, `page_view`) |
| user_agent | TEXT | no | Stringa `navigator.userAgent` del browser: browser, versione e sistema operativo del chiamante |
| timezone | TEXT | no | Fuso orario del client (es. `Europe/Rome`), da `Intl.DateTimeFormat` |
| language | TEXT | no | Lingua del browser (es. `it-IT`), da `navigator.language` |
| referrer | TEXT | no | URL della pagina di provenienza (`document.referrer`); vuoto se apertura diretta |
| url_params | TEXT | no | Parametri della query string della pagina, salvati come stringa JSON (utili per UTM/campagne) |
| timestamp | INTEGER | no | Unix timestamp (secondi) generato dal client al momento dell'evento; se manca il Worker usa il proprio tempo. Distinto da `created_at`, che resta il tempo D1 |
| ip | TEXT | no | IP del chiamante, letto server-side dal Worker (`CF-Connecting-IP`, fallback sul primo di `X-Forwarded-For`); mai da inviare dal client. Può essere IPv4 (es. `93.184.216.34`) o IPv6 (es. `2001:b07:...`); `NULL` per le righe vecchie e quando l'header manca in locale |
| created_at | DATETIME | auto | Data/ora di scrittura nel DB (`DEFAULT CURRENT_TIMESTAMP` di D1). Riferimento affidabile per ordinare (`ORDER BY created_at DESC`) e per la retention |

Indici: `app_name`, `action_name`, `created_at`, `ip`.

## Flusso dei dati

1. Un'app esterna (o `pages/wwwanalyzer-cli/`) chiama `POST /api/analytics` via `sender.js`
2. Il Worker valida i campi obbligatori (`appName`, `userId`, `actionName`) e restituisce 400 se mancanti
3. Il Worker legge l'IP del chiamante dagli header e scrive il record in D1 tramite `env.DB.prepare(...).bind(...).run()`
4. Il frontend (`pages/wwwanalyzer-db/`) interroga i dati via `POST /api/query` con SQL SELECT arbitrario
5. Le operazioni di cancellazione (`DELETE /api/analytics/clear`, `POST /api/analytics/delete`) richiedono header `X-Clear-Key` con valore corrispondente a `CLEAR_KEY`

## Sicurezza

- **Sola lettura via query libere:** l'endpoint `/api/query` accetta solo `SELECT`; keyword pericolose (`DELETE`, `DROP`, `INSERT`, `UPDATE`, `ALTER`, `TRUNCATE`) sono bloccate anche se nascoste in sottoquery
- **Protezione cancellazione:** le operazioni DELETE richiedono header `X-Clear-Key`; la chiave è confrontata con `env.CLEAR_KEY` (segreto Cloudflare in remoto, fallback hardcoded in locale)
- **IP come dato personale:** la colonna `ip` è coperta dalle stesse cancellazioni protette; valuta retention e informativa prima di tracciare utenti reali
- **CORS:** aperto a qualsiasi origine (`Access-Control-Allow-Origin: *`)

## Ambiente e configurazione

Due file wrangler separati nella root del progetto:
- **`wrangler.toml`** — config del Worker backend (`name = "wwwanalyzer-backend"`, binding D1 `DB`, migrations dir)
- **`wrangler.pages.toml`** — config del Pages frontend (`name = "wwwanalyzer-frontend"`)

Il frontend permette di selezionare ambiente **Locale** (`http://localhost:8787`) o **Remoto** (`https://wwwanalyzer-backend.workerua.workers.dev`) tramite radio button (CLI) o select (DB Explorer). La scelta è persistita in `localStorage` con chiave `wwwanalyzer_env`.
