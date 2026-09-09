# Prova remota (passo passo)

Guida didattica per provare WWWANALYZER in produzione su Cloudflare.
Stesso percorso della [prova locale](./prova_locale.md), ma contro
il Worker deployato invece di `localhost`.

Alla fine avrai: un evento inviato al backend remoto, verificato nel DB Explorer
remoto, e una tua applicazione con `sender.js` puntata all'URL remota.

Tutti i comandi vanno eseguiti dalla **root del progetto**.

## Prerequisiti

- Node.js 18+ e Wrangler con `wrangler login` già fatto
- Account Cloudflare con Workers, Pages e D1
- Backend e frontend già deployati (se mancano, fai prima il Passo 0)
- L'URL del frontend Pages (lo mostra Cloudflare dopo il deploy)
- La `CLEAR_KEY` remota a portata di mano solo se devi cancellare dati
  (per inviare e leggere non serve, vedi `secret_key.md`)

## Passo 0 — Deploy (solo se non l'hai ancora fatto)

Se il Worker e le Pages sono già online, salta al Passo 1.

```bash
npx wrangler d1 create wwwanalyzer-db
```

Copia il `database_id` stampato e incollalo in `wrangler.toml`
nella sezione `[[d1_databases]]` al posto di quello esistente.

```bash
./bin/wrangler_migrate_remote.sh
./bin/set_secret_key.sh TUA_CHIAVE_SEGRETA
./bin/wrangler_deploy_worker.sh
```

`wrangler_migrate_remote.sh` equivale a `npx wrangler d1 migrations apply wwwanalyzer-db --remote`
e conserva i dati esistenti (le righe vecchie restano con `ip = NULL`).
`set_secret_key.sh` imposta il segreto `CLEAR_KEY` e fa già un deploy.
`wrangler_deploy_worker.sh` equivale a `npx wrangler deploy`
e pubblica `worker/src/index.js`.

```bash
./bin/wrangler_deploy_pages.sh
```

Equivale a `wrangler pages deploy pages --project-name=wwwanalyzer-frontend`
e pubblica la cartella `pages/`.

Ultimo allineamento chiavi: apri `pages/wwwanalyzer-db/js/app.js`,
metti in `REMOTE_KEY` la stessa chiave usata sopra:

```javascript
const REMOTE_KEY = "TUA_CHIAVE_SEGRETA";
```

Poi ripeti `./bin/wrangler_deploy_pages.sh` per pubblicare il frontend aggiornato.
Dettagli e rotazione chiavi in `secret_key.md`.

## Passo 1 — Apri il frontend e scegli Remoto

1. Apri l'URL del frontend Pages dato da Cloudflare (finisce con `.pages.dev`).
2. Vedrai lo stesso Hub del locale: due card, **Test Client** e **DB Explorer**.
3. Ovunque vedi il selettore ambiente, scegli **Remoto**:
   - Test Client: radio in alto a destra su **Remoto**
     (`Ambiente: Remoto`, Worker URL `https://wwwanalyzer-backend.workerua.workers.dev`).
   - DB Explorer: select in alto su **Remoto** (stesso URL mostrato accanto).
4. La scelta resta salvata in `localStorage` (`wwwanalyzer_env`),
   ma ricontrollala ogni volta che cambi pagina: Locale e Remoto hanno database separati.

## Passo 2 — Invia un evento al backend remoto

1. Apri **Test Client** (ambiente Remoto).
2. Nel form scrivi:
   - App Name: `test-app-remota`
   - Action Name: `click_prova`
3. Clicca **Invia Evento**.
4. Cosa devi vedere: messaggio verde di successo e la nuova riga
   nella tabella **Ultimi Eventi**.
5. Se vedi `Errore nell'invio dell'evento`: controlla di essere davvero su Remoto
   e che il Worker risponda, ad esempio aprendo
   `https://wwwanalyzer-backend.workerua.workers.dev/api/analytics?limit=1` nel browser
   (devi ricevere un JSON, anche vuoto `[]`, non un errore di connessione).

## Passo 3 — Verifica nel DB Explorer remoto

1. Apri **DB Explorer** (ambiente Remoto).
2. Esegui la query già presente nell'editor
   (`SELECT * FROM analytics ORDER BY created_at DESC LIMIT 50`) con **Esegui**.
   Per carichi maggiori usa le scorciatoie della sidebar **Query**: `Ultimi 1000 eventi`, `Ultimi 1000 eventi (campi espliciti)`
   e `Eventi per IP` (`SELECT ip, COUNT(*) ... GROUP BY ip`), tutte con `LIMIT 1000` (massimo API).
3. Ritrovati `test-app-remota / click_prova` con tutti i metadati.
4. Per isolare la prova: `SELECT * FROM analytics WHERE app_name = 'test-app-remota' ORDER BY created_at DESC LIMIT 10`
   oppure la variante ridotta `SELECT id, app_name, action_name, user_id, ip, created_at FROM analytics ORDER BY created_at DESC LIMIT 1000`.

Nota: in locale e in remoto vedi dati diversi, è normale: sono due database D1 distinti.

## Passo 4 — Verifica una tua applicazione che usa sender.js in remoto

Stesso schema della prova locale, cambia solo l'URL (dettagli del modulo in `guida_sender.md`).

```javascript
import { UaSender } from "./percorso/sender.js";

UaSender.init({
    workerUrl: "https://wwwanalyzer-backend.workerua.workers.dev",
    userId: "utente_prova_01" // opzionale
});

const result = await UaSender.sendEventAsync("mia-app", "click_pulsante");
console.log(result); // atteso: { success: true, id: <numero> }
```

Cosa verificare:
- `result` non è `null` e `result.success === true`.
- Nel DB Explorer **remoto**: `SELECT app_name, action_name, user_id, ip FROM analytics WHERE app_name = 'mia-app' ORDER BY created_at DESC LIMIT 10`
  mostra l'evento con lo user giusto (o `mia-app_user_id` se hai omesso `userId`) e l'IP pubblico del chiamante.
  L'IP può essere IPv4 o IPv6 (es. `2001:b07:...`): è normale, dipende da come esce la rete del chiamante.
- Se non lo trovi: quasi sempre stai guardando l'ambiente sbagliato
  (Locale invece di Remoto) oppure l'app punta ancora a `http://localhost:8787`.

## Problemi comuni

| Cosa vedi | Causa probabile | Cosa fare |
|-----------|----------------|-----------|
| Evento inviato ma non visibile | Stai guardando l'altro ambiente | Metti **Remoto** sia nel Client che nell'Explorer |
| Fetch fallita verso il Worker | Deploy mancato o URL errata | Ricontrolla l'URL remota e rifai `./bin/wrangler_deploy_worker.sh` |
| `401 Unauthorized` in cancellazione | `REMOTE_KEY` diversa dal segreto | Riallinea `REMOTE_KEY` in `pages/wwwanalyzer-db/js/app.js` e ridistribuisci le Pages (vedi `secret_key.md`) |
| `Only SELECT queries are allowed` | Normale: hai lanciato una non-SELECT in `/api/query` | Usa i pulsanti di cancellazione protetti invece della SQL |

## Prossimi passi

- Per l'integrazione completa di `sender.js` leggi `guida_sender.md`.
- Per la gestione delle chiavi leggi `secret_key.md`.
- Per il riferimento API leggi `architettura.md`.
- Per riprovare tutto in locale segui `prova_locale.md`.
