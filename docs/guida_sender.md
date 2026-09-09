# sender.js — integrazione in app esterne

`sender.js` (`pages/wwwanalyzer-cli/js/sender.js`) è il modulo universale per inviare eventi di tracciamento da qualsiasi applicazione web al backend WWWANALYZER.

Requisito: l'app ospite deve supportare ES Modules (`type="module"`). Nessuna dipendenza npm.

## Installazione

Copia `pages/wwwanalyzer-cli/js/sender.js` nella cartella del tuo progetto.

## Inizializzazione

```javascript
import { UaSender } from "./percorso/sender.js";

UaSender.init({
    workerUrl: "https://wwwanalyzer-backend.workerua.workers.dev",
    userId: "utente_123",    // Opzionale: se omesso, sender.js usa "<appName>_user_id"
    disableOnLocal: false    // Opzionale: se true, salta l'invio su localhost/127.0.0.1/file:
});
```

## Invio eventi

```javascript
const result = await UaSender.sendEventAsync("nome-app", "nome_azione");

// result è null in caso di errore di rete
// result.success == true se l'evento è stato registrato
// result.id contiene l'ID del record creato
```

Se `userId` non è stato impostato nell'init, il modulo genera automaticamente `"<appName>_user_id"` (es. `sendEventAsync("shop", "click")` -> userId = `"shop_user_id"`).

Nota: il Test Client in `pages/wwwanalyzer-cli/js/app.js` non usa questo default: genera un UUID con `crypto.randomUUID()` persistito in `localStorage` (`wwwanalyzer_user_id`) e lo passa a `init()`.

Nota: l'IP del chiamante non va inviato dal client. Lo aggiunge il Worker server-side
dagli header (`CF-Connecting-IP`, fallback `X-Forwarded-For`) nella colonna `ip`.

## Metadati raccolti automaticamente

Ogni chiamata a `sendEventAsync` include nel payload:

| Campo | Fonte | Descrizione |
|-------|-------|-------------|
| userAgent | `navigator.userAgent` | Browser / OS |
| timezone | `Intl.DateTimeFormat` | Fuso orario del client |
| language | `navigator.language` | Lingua del browser |
| referrer | `document.referrer` | URL di provenienza |
| urlParams | `URLSearchParams` | Tutti i parametri della query string corrente |
| timestamp | `Date.now() / 1000` | Unix timestamp del client |

## Risposta del server

Successo (201): `{ "success": true, "id": 42 }`
Errore validazione (400): `{ "error": "Missing required fields: ..." }`
Errore DB (500): `{ "error": "Database error" }`
Errore di rete: `sendEventAsync` restituisce `null`

## Ambiente locale

Se impostato `disableOnLocal: true` in `UaSender.init()`, l'invio viene saltato automaticamente quando l'app gira su `localhost`, `127.0.0.1` o `file:`. In tal caso `sendEventAsync` restituisce `{ success: true, skipped: true }`. Il default è `false` (invio sempre attivo, utile per i test locali).
