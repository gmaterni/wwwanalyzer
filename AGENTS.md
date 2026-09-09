# AGENTS.md — WWWANALYZER

## Struttura

- **`worker/src/index.js`** — Backend Cloudflare Worker (entrypoint unico, routing manuale, nessun framework).
- **`pages/`** — Frontend Cloudflare Pages (Vanilla JS, nessun framework, niente bundler).
- **`bin/`** — Script di sviluppo e deploy (percorso canonico per tutti i comandi). **Non versionato** (in `.gitignore`) e contiene credenziali hardcoded (token GitHub/API Cloudflare): non committarlo mai.
- **`docs/`** — Guide autorevoli: `prova_locale.md` e `prova_remota.md` (prove didattiche, parti da qui), poi `architettura.md`, `guida_sender.md`, `secret_key.md`, `guida_bash.md` (riferimenti).
- Due config wrangler separate: `wrangler.toml` (Worker backend) e `wrangler.pages.toml` (Pages frontend).

## Comandi (da eseguire SEMPRE dalla root del progetto)

| Azione | Comando |
|--------|---------|
| Init DB locale | `./bin/test0_init_db.sh` (esegue `npx wrangler d1 migrations apply wwwanalyzer-db --local`) |
| Avvio backend | `./bin/test1_backend.sh` (porta 8787, `wrangler dev --port 8787`) |
| Avvio frontend | `./bin/test2_frontend.sh` (porta 8788, `wrangler pages dev pages --port 8788`) |
| Stop servizi | `./bin/stop_dev.sh` |
| Deploy worker | `./bin/wrangler_deploy_worker.sh` (esegue `npx wrangler deploy`) |
| Migra DB remoto | `./bin/wrangler_migrate_remote.sh` (esegue `npx wrangler d1 migrations apply wwwanalyzer-db --remote`) |
| Deploy pages | `./bin/wrangler_deploy_pages.sh` (esegue `wrangler pages deploy pages --project-name=wwwanalyzer-frontend`) |
| Imposta CLEAR_KEY remota | `./bin/set_secret_key.sh [CHIAVE]` (poi esegue deploy automatico) |
| Push GitHub | `./bin/git_push.sh` (force-push su `main`, token embedded) |

**Non usare** `npx wrangler pages dev` senza `--port 8788` (la porta esplicita evita conflitti). Il backend DEVE essere su 8787 perché il frontend hard-coda questo URL per l'ambiente locale. Le porte 8787/8788 sono riservate a questi due servizi (`stop_dev.sh` le libera con `kill -9`).

## D1 Database

- Binding: `DB` (definito in `wrangler.toml`).
- Nome: `wwwanalyzer-db` (locale e remoto usano lo stesso nome).
- Migrazioni: `worker/migrations/0001_init.sql` e `0002_add_ip.sql` (aggiunge colonna `ip` + `idx_ip`).
- Solo query `SELECT` sono permesse via API (`/api/query`). `DELETE`/`INSERT`/`UPDATE`/`ALTER`/`TRUNCATE` sono bloccate anche se mascherate.

## API Endpoint (Routing manuale in `worker/src/index.js`)

| Metodo | Path | Funzione |
|--------|------|----------|
| POST | `/api/analytics` | Registra evento (body: appName, userId, actionName) |
| GET | `/api/analytics` | Lista eventi (query: limit, appName, actionName, userId, ip) |
| GET | `/api/analytics/:id` | Singolo evento per ID |
| DELETE | `/api/analytics/clear` | Svuota tabella (header X-Clear-Key richiesto) |
| POST | `/api/analytics/delete` | Elimina per IDs (body: ids[], header X-Clear-Key richiesto) |
| POST | `/api/query` | Query SELECT raw (body: sql) |

## Sicurezza

- `CLEAR_KEY` locale di default: `ragindex-secret-clear-2026` (hardcoded in `worker/src/index.js:184` e `:212`, volutamente storico: non rinominare per compatibilità).
- `CLEAR_KEY` remota: impostata via `wrangler secret put CLEAR_KEY`, mai nel codice. La chiave remota attuale è hardcoded nel frontend (`REMOTE_KEY` in `pages/wwwanalyzer-db/js/app.js`); anche la chiave locale è replicata come `DEFAULT_LOCAL_KEY` nello stesso file.
- Header richiesto per operazioni di cancellazione: `X-Clear-Key` (gli unici header CORS consentiti sono `Content-Type` e `X-Clear-Key`).

## Convenzioni

- **Tutto il progetto è in italiano**: commenti, documentazione, messaggi di errore, UI, commit.
- **Nessun test automatizzato**: nessun test framework, nessun CI. Il testing è manuale via `./bin/test*.sh` e l'interfaccia web. **I test li lancia sempre l'utente**: non eseguire `./bin/test*.sh` da solo, al massimo prepara lo stato e chiedi all'utente di lanciarli.
- **Nessun lint/typecheck configurato**.
- Il Worker usa `export default { async fetch(...) }` (ESM) anche se `worker/package.json` ha `"type": "commonjs"` — wrangler gestisce la compatibilità.
- L'ambiente frontend (Locale/Remoto) è selezionabile via radio button/select nell'UI.
- I commit seguono il formato `DD-MM-YY (HH:MM)` (es. `12-05-26 (11:45)`).

## Note per il frontend

- I moduli JS in `pages/` sono ES module (`type="module"`).
- `sender.js` in `pages/wwwanalyzer-cli/js/` è il modulo universale da copiare in app esterne per tracciamento eventi.
- Nessuna dipendenza npm per il frontend — tutto Vanilla JS.

## File `.gitignore` include

- `.wrangler/`, `.dev.vars*`, `.env`, `*.code-workspace`, `*.log`, `__pycache__/`, `build/`, `dist/`
