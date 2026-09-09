## Why

Serve un modo affidabile e riusabile per copiare il contenuto del database D1 remoto (`wwwanalyzer-db`) nel database locale usato da `wrangler dev`, così da poter sviluppare e verificare il frontend contro dati reali. Oggi non esiste alcuno strumento per farlo: l'unica via API (`GET /api/analytics`) è limitata a 1000 righe senza paginazione e non può produrre un backup completo.

## What Changes

- Nuovo script `bin/backup_remoto_locale.sh` (one-shot, uso manuale):
  - Chiede conferma interattiva prima di qualsiasi operazione distruttiva.
  - Applica le migrazioni al DB locale (idempotente, copre anche il locale mai inizializzato).
  - Esporta il contenuto del D1 remoto in `backup/backup-<timestamp>.sql` (solo dati, `--no-schema`).
  - Azzera la tabella `analytics` locale (dati + contatore `AUTOINCREMENT`).
  - Importa il dump nel DB locale.
  - Verifica il risultato confrontando `COUNT(*)` remoto vs locale.
- Nessuna modifica al Worker, al frontend, alle migrazioni o agli endpoint esistenti.
- Nessun nuovo file versionato oltre allo script: il dump resta in `backup/`, già escluso da `.gitignore`.

## Capabilities

### New Capabilities
- `backup-remoto-locale`: backup one-shot del D1 remoto verso il D1 locale con conferma interattiva, azzeramento e ripristino del locale, verifica finale dei conteggi.

### Modified Capabilities
- Nessuna.

## Impact

- Nuovo file: `bin/backup_remoto_locale.sh` (non versionato, come tutto `bin/` — contiene credenziali via pattern esistente).
- Nuovi file ignorati da git: `backup/*.sql` (dir già coperta da `.gitignore`).
- Sistemi coinvolti: D1 remoto (sola lettura: `export` + `COUNT`), D1 locale (scrittura: wipe + import). Il Worker deployato e il frontend non sono toccati.
- Prerequisito operativo: autenticazione wrangler con API Key + email (il token OAuth di default non ha permessi D1 sul remoto — verificato in esplorazione).
