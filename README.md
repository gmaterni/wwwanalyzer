# RAGINDEX - Analytics Multi-App System

Sistema universale di tracciamento eventi e analytics basato su **Cloudflare Workers** e **D1 Database**. Progettato per essere integrato in qualsiasi applicazione web con zero dipendenze esterne.

## COMANDI WRANGLER

### Backend (Worker + D1)
```bash
npx wrangler dev          # Sviluppo locale
npx wrangler deploy       # Deploy
```

### Frontend (Pages)
```bash
npx wrangler pages dev www   # Sviluppo locale
npx wrangler pages deploy www # Deploy
```

## ARCHITETTURA DEL PROGETTO

Il sistema è strutturato in modo modulare:

- **/ragindex**: Il nucleo del sistema (Backend). Un Cloudflare Worker che gestisce le API REST e l'interfaccia con il database SQLite D1.
- **/www**: Il portale di controllo e monitoraggio (Frontend).
  - `index.html`: Home con auto-logging e switch di ambiente (Locale/Remoto).
  - `ragindex-cli/`: Client di test per l'invio manuale di eventi.
  - `ragindex-db/`: Explorer SQL interattivo per l'analisi dei dati e la manutenzione.

---

## INTEGRAZIONE: Utilizzo di `sender.js`

Il modulo `sender.js` è il componente principale per tracciare eventi in applicazioni esterne.

### 1. Requisiti
- Il Worker deve essere deployato e accessibile via URL.
- L'applicazione ospite deve supportare i moduli ES6 (`type="module"`).

### 2. Importazione e Inizializzazione
Copia il file `sender.js` nel tuo progetto e importalo:

```javascript
import { UaSender } from "./path/to/sender.js";

// Configurazione (URL e ID Utente opzionale)
const config = {
    workerUrl: "https://ragindex.tuo-subdominio.workers.dev",
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
- **User ID**: Generato e salvato in `localStorage` per tracciare lo stesso utente nel tempo.
- **User Agent**: Browser e sistema operativo.
- **Geolocalizzazione**: Timezone e lingua del browser.
- **Referrer**: La pagina di provenienza.
- **URL Params**: Tutti i parametri presenti nella query string (es. parametri UTM).
- **Timestamp**: Unix timestamp preciso del client.

---

## DOCUMENTAZIONE TECNICA

Per istruzioni dettagliate su sviluppo, test e rilascio, consultare i documenti nella cartella `docs/`:

1.  **[Architettura del Sistema](./docs/ARCHITETTURA.md)**: Mappa dei componenti e flusso dati.
2.  **[Sviluppo Locale](./docs/DEPLOY_LOCAL.md)**: Guida all'avvio dell'ambiente di sviluppo.
3.  **[Manuale Operativo e Test](./docs/MANUALE_OPERATIVO.md)**: Procedure di verifica e risoluzione problemi.
4.  **[Deploy in Produzione](./docs/DEPLOY_REMOTE.md)**: Istruzioni per il rilascio su Cloudflare.
5.  **[Guida alla Clonazione](./docs/GUIDA_CLONAZIONE.md)**: Come creare una nuova istanza del sistema.
6.  **[Integrazione Sender](./docs/GUIDA_SENDER.md)**: Dettagli sull'utilizzo del modulo di tracciamento.

## SICUREZZA
- L'esecuzione di query SQL è limitata ai comandi `SELECT`.
- Le operazioni di eliminazione dati (`DELETE`) sono protette dall'header `X-Clear-Key` e richiedono un segreto configurato nel Worker.
- Supporto CORS integrato per permettere l'invio dati da qualsiasi dominio autorizzato.
