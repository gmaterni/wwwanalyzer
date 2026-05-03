# Registro Modifiche - WWWANALYZER

Questo file traccia le modifiche strutturali apportate al progetto per migliorare la manutenibilità e la facilità d'uso.

## [2026-05-03] Semplificazione Script e Configurazione

### 1. Semplificazione Script `bin/`
Tutti gli script nella cartella `bin/` sono stati riscritti per essere eseguiti direttamente dalla **root del progetto**.
- Rimossi i cambi di directory (`cd`) e i calcoli complessi di `BASE_DIR`.
- Aggiunto l'uso di `npx` per garantire l'esecuzione della versione locale di Wrangler.
- Aggiornati i nomi dei database e dei progetti per riflettere lo stato attuale (`wwwanalyzer`).

### 2. Configurazione Wrangler (`wrangler.toml`)
- Aggiunta la direttiva `migrations_dir = "wwwanalyzer-backend/migrations"` all'interno del blocco `[[d1_databases]]`.
- Questo permette a Wrangler di localizzare le migrazioni anche quando il comando viene lanciato dalla root del progetto, senza dover passare parametri aggiuntivi.

### 3. Script di Clonazione (`bin/clone_app.py`)
- Aggiornata la logica di sostituzione per allinearla ai nuovi script semplificati.
- Aggiunta la gestione della riga `migrations_dir` nel `wrangler.toml` generato.
- Corretti i pattern di ricerca (es. da `RAGINDEX` a `WWWANALYZER`) per garantire che la nuova app sia coerente.

### Stato attuale degli script:
- `bin/test0.sh`: Inizializza il database locale applicando le migrazioni.
- `bin/test1.sh`: Avvia il backend locale (porta 8787).
- `bin/test2.sh`: Avvia il frontend locale (porta 8788).
- `bin/stop_dev.sh`: Arresta i servizi locali liberando le porte 8787 e 8788.
- `bin/set_secret_key.sh`: Configura la `CLEAR_KEY` sul worker remoto.
- `bin/wrangler_deploy_www.sh`: Esegue il deploy del frontend su Cloudflare Pages.

### 4. Correzione Percorsi Frontend (`www/index.html`)
- Corretti i link verso il Client e il DB Explorer: ora usano percorsi assoluti rispetto alla root del server (es. `/wwwanalyzer-cli/...`) e sono rigorosamente in minuscolo per corrispondere ai nomi delle cartelle nel filesystem Linux. Questo previene errori di annidamento e problemi di case-sensitivity.

### 5. Aggiornamento Documentazione
- Aggiornati `DEPLOY_LOCAL.md` e `DEPLOY_REMOTE.md` per specificare esplicitamente che **tutti i comandi devono essere eseguiti dalla directory root del progetto**.
- Aggiunta la sezione per lo script `stop_dev.sh` nella guida locale.
- Ottimizzata la guida `DEPLOY_REMOTE.md` con l'ordine corretto delle operazioni (D1 -> Migrations -> Secret -> Deploy Backend -> Deploy Frontend).

### 6. Stabilizzazione Workflow Remoto
- Risolti i conflitti di autenticazione Wrangler tra sessioni OAuth e variabili d'ambiente (API_KEY).
- Validato il puntamento delle migrazioni tramite `wrangler.toml` su ambiente reale.
- Verificata la navigazione tra Hub, Client e DB Explorer sull'ambiente di produzione (`.pages.dev`).
