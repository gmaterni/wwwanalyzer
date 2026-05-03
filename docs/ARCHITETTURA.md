# Architettura e Organizzazione di WWWANALYZER

WWWANALYZER è un sistema modulare per il tracciamento di eventi e analytics. Questa guida spiega nel dettaglio come è organizzato il codice e come interagiscono i vari componenti.

---

## 🏗️ Struttura delle Directory

Il progetto è organizzato in modo che ogni cartella abbia un ruolo specifico e isolato:

### 1. `/WWWANALYZER` (Backend - Cloudflare Worker)
Questa è l'intelligenza del sistema. È un **Worker** che riceve le richieste e comunica con il database.
- `src/index.js`: Il codice principale. Qui vengono gestiti gli endpoint API (`/api/analytics`, `/api/query`, ecc.).
- `migrations/`: Contiene i file SQL (es. `0001_init.sql`) per creare le tabelle nel database D1.
- `wrangler.toml`: File di configurazione del Worker (nome, ID del database, variabili d'ambiente).

### 2. `/www` (Frontend - Cloudflare Pages)
Contiene l'interfaccia web per visualizzare e testare il sistema. È ospitata su **Cloudflare Pages**.
- `index.html`: La "Hub" o pagina principale. Permette di navigare tra il Test Client e l'Explorer.
- `/WWWANALYZER-cli/`: **Client di Test**. Simula un'applicazione esterna che invia dati al sistema.
  - `js/sender.js`: Il modulo "universale" che puoi copiare nei tuoi progetti per inviare eventi.
- `/WWWANALYZER-db/`: **SQL Explorer**. Un'interfaccia per vedere i dati salvati e lanciare query SELECT manuali.
- `/worker-db/`: Script di utilità per gestire il database SQLite locale durante lo sviluppo.

### 3. `/bin` (Automazione e Script)
Contiene script Bash e Python per velocizzare le operazioni comuni:
- `test0.sh`, `test1.sh`, `test2.sh`: Avviano rispettivamente il DB, il Backend e il Frontend in locale.
- `clone_app.py`: Script per duplicare l'intera struttura in un nuovo progetto.
- `set_secret_key.sh`: Configura la chiave segreta per le cancellazioni sicure.

### 4. `/docs` (Documentazione)
Tutte le guide specifiche:
- `ARCHITETTURA.md`: (Questo file) Spiegazione della struttura.
- `DEPLOY_LOCAL.md`: Come farlo girare sul tuo PC.
- `DEPLOY_REMOTE.md`: Come metterlo online su Cloudflare.
- `MANUALE_OPERATIVO.md`: Come usare il sistema e fare i test.

---

## 🔄 Flusso dei Dati

Il funzionamento segue questo percorso logico:

1. **Origine**: Un'app esterna (o il nostro `WWWANALYZER-cli`) usa `sender.js` per inviare un pacchetto JSON al Worker.
2. **Elaborazione**: Il Worker (`/WWWANALYZER/src/index.js`) riceve il JSON, aggiunge i metadati (IP, timestamp, ecc.) e valida i dati.
3. **Persistenza**: Il Worker scrive i dati nel database **D1 (SQLite)**.
4. **Visualizzazione**: L'interfaccia web (`/www/WWWANALYZER-db`) interroga il Worker tramite query SQL per mostrare i risultati a video.

---

## 🛠️ Riassunto Tecnologico

- **Runtime**: Cloudflare Workers (V8 Engine).
- **Database**: Cloudflare D1 (SQLite distribuito).
- **Frontend**: Vanilla JS (nessun framework pesante), HTML5, CSS3.
- **Protocollo**: REST API via HTTPS con supporto CORS completo.
