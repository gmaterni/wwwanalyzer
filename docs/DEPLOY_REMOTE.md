# Rilascio in Produzione (Deploy Remoto)

Tutti i comandi seguenti devono essere eseguiti dalla **directory root** del progetto.

## 1. Login a Cloudflare
Se non lo hai già fatto, autentica il tuo terminale:
```bash
# Dalla root del progetto:
wrangler login
```

## 2. Creazione del Database D1
Crea l'istanza reale del database sul tuo account Cloudflare:
```bash
# Dalla root del progetto:
wrangler d1 create wwwanalyzer-db
```
**Importante**: Copia il `database_id` restituito dal comando e incollalo nel file `wrangler.toml` nel blocco `[[d1_databases]]`. Assicurati che il `binding` sia impostato su `"DB"`.

## 3. Applicazione Tabelle Remote
Invia lo schema del database al cloud (necessario prima del deploy del backend):
```bash
# Dalla root del progetto:
wrangler d1 migrations apply wwwanalyzer-db --remote
```

## 4. Configurazione Sicurezza (CLEAR_KEY)
Imposta la chiave segreta sul server remoto (necessaria per le operazioni protette):
```bash
# Dalla root del progetto:
./bin/set_secret_key.sh TUA_CHIAVE_SEGRETA
```

## 5. Deploy del Backend (Worker)
Pubblica il codice delle API:
```bash
# Dalla root del progetto:
./bin/wrangler_deploy_worker.sh
```

## 6. Deploy del Frontend (Pages)
Pubblica l'interfaccia utente:
```bash
# Dalla root del progetto:
./bin/wrangler_deploy_pages.sh
```

---
**Verifica**: Una volta terminato, apri l'URL fornito dal deploy del frontend e seleziona lo switch "Remoto" per testare la connessione al Worker live.
