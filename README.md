# WWWANALYZER - Analytics Multi-App System

Sistema universale di tracciamento eventi e analytics basato su **Cloudflare Workers** e **D1 Database**. Progettato per essere integrato in qualsiasi applicazione web con zero dipendenze esterne.

## COMANDI WRANGLER

I comandi canonici vanno eseguiti dalla **root del progetto** tramite gli script in `bin/`.
Per provare l'app segui [`docs/prova_locale.md`](./docs/prova_locale.md) (locale)
oppure [`docs/prova_remota.md`](./docs/prova_remota.md) (produzione).

### Backend (Worker + D1)
```bash
./bin/test0_init_db.sh    # Init DB locale (npx wrangler d1 migrations apply wwwanalyzer-db --local)
./bin/test1_backend.sh    # Sviluppo locale backend su http://localhost:8787 (wrangler dev --port 8787)
./bin/wrangler_deploy_worker.sh    # Deploy (npx wrangler deploy)
```

### Frontend (Pages)
```bash
./bin/test2_frontend.sh    # Sviluppo locale frontend su http://localhost:8788 (wrangler pages dev pages --port 8788)
./bin/wrangler_deploy_pages.sh    # Deploy (wrangler pages deploy pages --project-name=wwwanalyzer-frontend)
```

## ARCHITETTURA DEL PROGETTO

Il sistema è strutturato in modo modulare:

- **/worker**: Il nucleo del sistema (Backend). Un Cloudflare Worker che gestisce le API REST e l'interfaccia con il database SQLite D1.
- **/pages**: Il portale di controllo e monitoraggio (Frontend).
  - `index.html`: Hub statico di navigazione tra CLI e DB Explorer (nessun auto-logging, nessuno switch ambiente).
  - `wwwanalyzer-cli/`: Client di test per l'invio manuale di eventi, con switch ambiente Locale/Remoto (radio button) e auto-logging dell'apertura (`wwwanalyzer-cli/open`).
  - `wwwanalyzer-db/`: Explorer SQL interattivo per l'analisi dei dati e la manutenzione, con selettore ambiente Locale/Remoto.

---

## INTEGRAZIONE: Utilizzo di `sender.js`

Il modulo `sender.js` è il componente principale per tracciare eventi in applicazioni esterne.

### 1. Requisiti
- Il Worker deve essere accessibile via URL (locale `http://localhost:8787` oppure URL remota del deploy).
- L'applicazione ospite deve supportare i moduli ES6 (`type="module"`).

### 2. Importazione e Inizializzazione
Copia il file `sender.js` nel tuo progetto e importalo:

```javascript
import { UaSender } from "./path/to/sender.js";

// Configurazione (URL e ID Utente opzionale)
const config = {
    workerUrl: "https://wwwanalyzer-backend.workerua.workers.dev",
    userId: "utente_test_01" // Opzionale
};

// Inizializzazione
UaSender.init(config);
```

### 3. Invio di un Evento
Per registrare un'azione, usa il metodo `sendEventAsync(appName, actionName)`:

```javascript
// Esempio: Tracciamento click su un pulsante
const trackClick = async function() {
    // Se userId non è stato impostato nell'init, 
    // verrà usato "mio-ecommerce_user_id" come default.
    const result = await UaSender.sendEventAsync("mio-ecommerce", "aggiunta_carrello");
    
    if (result) {
        console.log("Evento registrato con ID:", result.id);
    }
};
```

### 4. Metadati Raccolti Automaticamente
Ogni volta che chiami `sendEventAsync`, il modulo raccoglie automaticamente:
- **User ID**: se non impostato in `init`, usa `"<appName>_user_id"` (es. `shop_user_id`). Nota: il Test Client in `pages/wwwanalyzer-cli/` usa invece un UUID persistito in `localStorage` (`wwwanalyzer_user_id`).
- **User Agent**: Browser e sistema operativo.
- **Geolocalizzazione**: Timezone e lingua del browser.
- **Referrer**: La pagina di provenienza.
- **URL Params**: Tutti i parametri presenti nella query string (es. parametri UTM).
- **Timestamp**: Unix timestamp preciso del client.
- **IP**: aggiunto server-side dal Worker (colonna `ip`), non va inviato dal client.

---

## DOCUMENTAZIONE TECNICA

Per istruzioni dettagliate su sviluppo, test e rilascio, consultare i documenti nella cartella `docs/`:

1.  **[Prova locale](./docs/prova_locale.md)**: avvio in locale, uso del browser e verifica di `sender.js`. Parti da qui.
2.  **[Prova remota](./docs/prova_remota.md)**: deploy su Cloudflare, uso del browser e verifica di `sender.js` in produzione.
3.  **[Architettura del Sistema](./docs/architettura.md)**: Mappa dei componenti e flusso dati.
4.  **[Integrazione Sender](./docs/guida_sender.md)**: Dettagli sull'utilizzo del modulo di tracciamento.
5.  **[Gestione CLEAR_KEY](./docs/secret_key.md)**: Chiave di protezione per le cancellazioni.
6.  **[Script Bash](./docs/guida_bash.md)**: Convenzioni e inventario degli script in `bin/`.

## SICUREZZA
- L'esecuzione di query SQL è limitata ai comandi `SELECT`.
- Le operazioni di eliminazione dati (`DELETE`) sono protette dall'header `X-Clear-Key` e richiedono un segreto configurato nel Worker.
- Supporto CORS aperto a qualsiasi origine (`Access-Control-Allow-Origin: *`) per permettere l'invio dati da qualsiasi dominio.
