# WWWANALYZER - Analytics Multi-App System

Sistema universale di tracciamento eventi e analytics basato su **Cloudflare Workers** e **D1 Database**. Progettato per essere integrato in qualsiasi applicazione web con zero dipendenze esterne.

## 🚀 Panoramica del Progetto

Il progetto (noto anche come **RAGINDEX**) è un sistema modulare per la raccolta e l'analisi di dati di utilizzo provenienti da diverse applicazioni web.

### Tecnologie Principali
- **Runtime**: Cloudflare Workers (V8 Engine) con `nodejs_compat`.
- **Database**: Cloudflare D1 (SQLite distribuito).
- **Frontend**: Cloudflare Pages (Vanilla JS, HTML5, CSS3).
- **Tooling**: Wrangler CLI per lo sviluppo e il deploy.

## 📁 Struttura della Directory

- `wwwanalyzer-backend/`: Il nucleo del sistema (Backend).
  - `src/index.js`: Handler principale del Worker con endpoint API REST.
  - `migrations/`: Script SQL per l'inizializzazione del database D1.
- `www/`: Il portale di controllo e monitoraggio (Frontend).
  - `wwwanalyzer-cli/`: Client di test per simulare l'invio di eventi.
  - `wwwanalyzer-db/`: Explorer SQL interattivo per query e manutenzione.
  - `js/sender.js`: Modulo universale ES6 per l'integrazione in app esterne.
- `bin/`: Script di automazione (Bash/Python).
- `docs/`: Documentazione tecnica dettagliata.
- `wrangler.toml`: Configurazione globale per il backend.
- `wrangler.pages.toml`: Configurazione per il frontend (Cloudflare Pages).

## 🛠️ Comandi Comuni

### Sviluppo Locale
Per avviare l'ambiente di sviluppo locale, puoi usare gli script in `bin/`:
- **DB Locale**: `bash bin/test0.sh` (Inizializza o avvia il DB locale)
- **Backend**: `bash bin/test1.sh` (Avvia `wrangler dev` per il backend)
- **Frontend**: `bash bin/test2.sh` (Avvia `wrangler pages dev` per il frontend)

Oppure manualmente:
```bash
# Backend
npx wrangler dev

# Frontend
npx wrangler pages dev www
```

### Deploy
```bash
# Backend
npx wrangler deploy

# Frontend
npx wrangler pages deploy www
```

## 📝 Convenzioni di Sviluppo

- **Backend**: Scritto in Vanilla JavaScript (CommonJS/ESM). Gli endpoint seguono il pattern `/api/analytics` e `/api/query`.
- **Database**: Le modifiche allo schema devono essere effettuate tramite migrazioni in `wwwanalyzer-backend/migrations/`.
- **Integrazione Client**: Per tracciare eventi in nuove applicazioni, importare `UaSender` da `sender.js`.
- **Sicurezza**: 
  - Le query SQL raw sono limitate ai soli comandi `SELECT`.
  - Le operazioni distruttive (`DELETE`) richiedono l'header `X-Clear-Key`.
- **Lingua**: Commenti nel codice in italiano, nomi di variabili e file in inglese.

## 🔍 Note per l'AI
- Quando si lavora sul backend, fare riferimento a `wwwanalyzer-backend/src/index.js`.
- Il database D1 è collegato tramite il binding `DB`.
- Consultare `docs/ARCHITETTURA.md` per una comprensione profonda dei flussi dati.
