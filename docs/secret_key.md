# Gestione CLEAR_KEY

`CLEAR_KEY` è la chiave che protegge le operazioni di cancellazione dati (svuota tabella, elimina righe selezionate). Il frontend la invia come header HTTP `X-Clear-Key`; il Worker la confronta con il valore atteso e restituisce `401 Unauthorized` in caso di mismatch.

## Ambiente locale

- **Chiave di default:** `ragindex-secret-clear-2026`
- Hardcoded come fallback in `worker/src/index.js:184` (`handleDeleteClear`) e `:212` (`handlePostDelete`), e come `DEFAULT_LOCAL_KEY` in `pages/wwwanalyzer-db/js/app.js`
- Funziona out-of-the-box, nessuna configurazione necessaria

Per cambiare la chiave locale, modifica entrambi i file (Worker e frontend) con lo stesso valore.

## Ambiente remoto

- La chiave remota è impostata come **segreto Cloudflare** (`wrangler secret put CLEAR_KEY`), NON nel codice del Worker
- La stessa chiave deve essere cablata nel frontend (`REMOTE_KEY` in `pages/wwwanalyzer-db/js/app.js`)

### Procedura per cambiare la chiave remota

1. Imposta il nuovo segreto sul Worker:
   ```bash
   ./bin/set_secret_key.sh NUOVA_CHIAVE
   ```
   Questo script esegue `wrangler secret put CLEAR_KEY` e poi `wrangler deploy`.

2. Aggiorna il frontend:
   Modifica `const REMOTE_KEY = "NUOVA_CHIAVE";` in `pages/wwwanalyzer-db/js/app.js`

3. Ridistribuisci il frontend:
   ```bash
   ./bin/wrangler_deploy_pages.sh
   ```

## Sicurezza

- Non committare chiavi di produzione in repository pubblici
- Se sospetti che la chiave sia compromessa, cambiala immediatamente seguendo la procedura sopra
- Le chiavi in questo repository (locale e remota attuale) sono visibili a chiunque abbia accesso al codice — considera l'uso di variabili d'ambiente o secret injection anche per il frontend in produzione
