# Prova locale (passo passo)

Guida didattica per provare WWWANALYZER sul tuo computer.
Alla fine avrai: backend su `http://localhost:8787`, frontend su `http://localhost:8788`,
un evento inviato dal browser e la verifica che sia salvato nel database.
Poi vedrai come collegare una tua applicazione che usa `sender.js`.

Tutti i comandi vanno eseguiti dalla **root del progetto**.
Non serve configurare chiavi: in locale funziona tutto out-of-the-box
(`CLEAR_KEY` locale di default, vedi `secret_key.md`).

## Prerequisiti

- Node.js 18+ e npm
- Wrangler (`npx wrangler` oppure installato globale)
- Login Cloudflare già fatto (`wrangler login`, serve anche in locale per il binding D1)
- Due terminali aperti nella root del progetto
- Un browser moderno

## Passo 1 — Prepara il database (terminale 1)

```bash
./bin/test0_init_db.sh
```

Equivale a `npx wrangler d1 migrations apply wwwanalyzer-db --local`.
Crea le tabelle SQLite dentro `.wrangler/`. Va lanciato una sola volta
(ripetilo solo se cancelli `.wrangler/` o cambi le migrazioni).

## Passo 2 — Avvia il backend (terminale 1)

```bash
./bin/test1_backend.sh
```

Equivale a `wrangler dev --port 8787`.
Lascia il terminale aperto: finché gira, l'API risponde su `http://localhost:8787`.
La porta deve restare 8787 perché il frontend la usa come URL hardcoded per l'ambiente Locale.

## Passo 3 — Avvia il frontend (terminale 2)

In un **secondo terminale**:

```bash
./bin/test2_frontend.sh
```

Equivale a `wrangler pages dev pages --port 8788`.
Lascia aperto anche questo. Il frontend è su `http://localhost:8788`.

Ordine da ricordare: `test0_init_db.sh` -> `test1_backend.sh` -> `test2_frontend.sh`.
Se una porta risulta occupata: `./bin/stop_dev.sh` e riprova.

## Passo 4 — Invia un evento dal browser

1. Apri `http://localhost:8788` (Hub con due card).
2. Clicca **Test Client**.
3. In alto a destra verifica che il radio sia su **Locale**
   (la scritta deve dire `Ambiente: Locale` e `Worker URL: http://localhost:8787`).
4. Nel form **Invia Evento** scrivi:
   - App Name: `test-app`
   - Action Name: `click_prova`
5. Clicca **Invia Evento**.
6. Cosa devi vedere:
   - messaggio verde `Evento inviato con successo!`
   - la tabella **Ultimi Eventi** sotto il form mostra la riga appena creata
     (data/ora, app, azione, inizio dello user ID).
   - Nota: la tabella filtra per l'App Name scritto nel campo: se il campo è vuoto vedi tutto.

Se vedi `Compila tutti i campi`: entrambi i campi sono obbligatori.
Se vedi `Errore nell'invio dell'evento`: controlla che il terminale del backend sia acceso
e che il radio sia su Locale (vedi problemi comuni sotto).

## Passo 5 — Verifica nel DB Explorer

1. Torna all'Hub (`http://localhost:8788`) e apri **DB Explorer**.
2. Nel selettore in alto scegli **Locale** (l'URL mostrato deve essere `http://localhost:8787`).
3. Nell'editor c'è già `SELECT * FROM analytics ORDER BY created_at DESC LIMIT 50`: clicca **Esegui**
   (oppure `Ctrl+Enter`).
4. Devi vedere il tuo evento `test-app / click_prova` con tutti i metadati
   (`user_agent`, `timezone`, `language`, `referrer`, `url_params`, `timestamp`, `created_at`, `ip`).
   In locale `ip` può essere `127.0.0.1` o `NULL` (l'header non sempre c'è in `wrangler dev`): è normale.
5. Prova contatore: esegui `SELECT COUNT(*) as cnt FROM analytics` e verifica che il numero cresca
   a ogni invio.

Prova di sicurezza (facoltativa): esegui `DELETE FROM analytics` nel DB Explorer.
Devi ricevere `"Only SELECT queries are allowed"`: le query libere accettano solo `SELECT`.
Per cancellare davvero si usano i pulsanti protetti (vedi `secret_key.md`).

## Passo 6 — Verifica una tua applicazione che usa sender.js

Questo passo simula un'app esterna che traccia eventi con il modulo universale
(`pages/wwwanalyzer-cli/js/sender.js`, dettagli in `guida_sender.md`).

1. Copia `pages/wwwanalyzer-cli/js/sender.js` nel tuo progetto.
2. Nella tua pagina (deve usare `type="module"`) inizializza verso il backend locale:

```javascript
import { UaSender } from "./percorso/sender.js";

UaSender.init({
    workerUrl: "http://localhost:8787",
    userId: "utente_prova_01" // opzionale
});
```

3. Invia un evento, ad esempio al click di un pulsante:

```javascript
const result = await UaSender.sendEventAsync("mia-app", "click_pulsante");
console.log(result); // atteso: { success: true, id: <numero> }
```

4. Cosa verificare:
   - `result` non è `null` (se è `null` c'è un errore di rete o il backend è spento).
   - `result.success === true` e `result.id` è un numero: è l'ID del record creato.
   - Nel DB Explorer (ambiente Locale) esegui
     `SELECT app_name, action_name, user_id, ip FROM analytics WHERE app_name = 'mia-app' ORDER BY created_at DESC LIMIT 10`
     e ritrova l'evento con `user_id = 'utente_prova_01'`.
   - Se ometti `userId` in `init`, lo user diventa `"<appName>_user_id"`
     (es. `mia-app_user_id`): cercalo così nel DB.
5. Se la tua app gira su `localhost` e vuoi silenziare gli invii di sviluppo,
   passa `disableOnLocal: true` a `init()`: in locale `sendEventAsync`
   restituisce `{ success: true, skipped: true }` senza scrivere nel DB.

## Problemi comuni

| Cosa vedi | Causa probabile | Cosa fare |
|-----------|----------------|-----------|
| `CORS error` o fetch fallita | Backend spento | Controlla che `test1_backend.sh` stia girando sulla 8787 |
| Tabella vuota dopo l'invio | Filtro App Name o ambiente Remoto | Svuota il campo App Name oppure verifica che il radio dica Locale |
| `Missing required fields` | Payload senza appName/userId/actionName | Compila entrambi i campi del form |
| Porta occupata | Servizio rimasto acceso | `./bin/stop_dev.sh` e riavvia i due script |

## Spegnimento

Quando hai finito, in un terminale:

```bash
./bin/stop_dev.sh
```

Libera le porte 8787 e 8788 (usa `lsof` + `kill -9`).

## Prossimi passi

- Per capire cosa fa ogni endpoint leggi `architettura.md`.
- Per integrare `sender.js` in un'app vera leggi `guida_sender.md`.
- Per provare tutto in produzione segui `prova_remota.md`.
