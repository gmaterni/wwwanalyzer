# Gestione delle Chiavi di Sicurezza (SECRET_KEY / CLEAR_KEY)

Questo documento spiega come vengono gestite le chiavi di sicurezza nel sistema WWWANALYZER per proteggere le operazioni critiche (cancellazione dati).

## 🔐 Logica di Funzionamento

Il sistema utilizza una chiave denominata `CLEAR_KEY` che deve essere inviata dal client (Frontend) al server (Backend) tramite l'header HTTP `X-Clear-Key`. Se le chiavi non corrispondono, il server restituisce un errore `401 Unauthorized`.

---

## 🏠 Ambiente LOCALE (Sviluppo)

In locale, il sistema è progettato per funzionare "out-of-the-box" con una chiave predefinita.

- **Chiave di Default**: `ragindex-secret-clear-2026`
- **Configurazione Backend**: Definita come fallback nel file `worker/src/index.js`.
- **Configurazione Frontend**: Definita nella costante `DEFAULT_LOCAL_KEY` in `pages/wwwanalyzer-db/js/app.js`.

**Nota**: Non è necessario configurare nulla per lo sviluppo locale a meno che non si desideri cambiare la chiave di default.

---

## 🌐 Ambiente REMOTO (Produzione)

In produzione, la chiave **NON deve essere scritta nel codice** del backend per motivi di sicurezza, ma gestita come segreto di Cloudflare.

- **Chiave Attuale**: `Mgiuseppe_0_` (cablata nel frontend per semplicità in questa fase).
- **Configurazione Backend**: Gestita tramite i segreti di Wrangler (`wrangler secret`).
- **Configurazione Frontend**: Definita nella costante `REMOTE_KEY` in `pages/wwwanalyzer-db/js/app.js`.

### Come cambiare la chiave remota:

1.  **Aggiorna il Server**: Esegui il comando dalla root del progetto:
    ```bash
    ./bin/set_secret_key.sh NUOVA_CHIAVE_MOLTO_LUNGA
    ```
2.  **Aggiorna il Frontend**: Modifica la variabile `REMOTE_KEY` nel file `pages/wwwanalyzer-db/js/app.js`:
    ```javascript
    const REMOTE_KEY = "NUOVA_CHIAVE_MOLTO_LUNGA";
    ```
3.  **Deploy del Frontend**:
    ```bash
    npx wrangler pages deploy pages
    ```

---

## 🛠️ Script Utili

- `bin/set_secret_key.sh`: Script automatizzato per impostare il segreto su Cloudflare Workers e rieseguire il deploy del backend.

---

## ⚠️ Avvertenze
- Non pubblicare mai chiavi segrete reali su repository pubblici.
- Se sospetti che la `REMOTE_KEY` sia stata compromessa, cambiala immediatamente seguendo la procedura sopra.
