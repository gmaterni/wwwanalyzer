## Context

Vedi `proposal.md` (Why) per la motivazione. Stato attuale rilevante:

- Lo script `bin/backup_remoto_locale.sh` esiste già come bozza funzionante (creato prima del workflow OpenSpec) e segue lo stile degli script `bin/` esistenti (header `echo`, check `$?`, messaggi ✓/✗ in italiano).
- Il DB ha una sola tabella dati (`analytics`, da `0001_init.sql` + `0002_add_ip.sql`); il remoto contiene oggi 1 riga.
- Vincoli: `bin/` e `backup/` sono gitignored (i segreti non finiscono nel repo); il backend DEVE restare su porta 8787; i test li lancia l'utente (`AGENTS.md`).
- Fatto verificato in esplorazione: il token OAuth wrangler di default fallisce sul D1 remoto (errore 7403), mentre la coppia API Key + email (già hardcoded in `bin/wrangler_deploy_pages.sh`) funziona.

## Goals / Non-Goals

**Goals:**

- Portare lo script esistente a piena conformità con `specs/backup-remoto-locale/spec.md`.
- Rendere ogni passo fallibile in modo fail-fast, con messaggi in italiano e codici di uscita corretti.

**Non-Goals:**

- Automazione/schedulazione del backup (resta one-shot manuale).
- Merge incrementale dei dati (semantica = wipe + restore, da decisione utente).
- Modifiche a Worker, frontend, migrazioni o endpoint API.

## Decisions

- **Autenticazione via `export CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL`** (stessi valori di `wrangler_deploy_pages.sh`).
  Alternativa scartata: affidarsi al login OAuth ambient — verificato non funzionante per D1 remoto (7403).
  Nota: rispetto a `wrangler_deploy_pages.sh` (assegnazione senza `export`) qui si usa `export`, altrimenti i processi figli di wrangler non ereditano le variabili.
- **Export con `--no-schema --table analytics` (solo dati della tabella dati)** invece del dump completo.
  Alternativa scartata: dump schema+dati — i `CREATE TABLE` andrebbero in conflitto con le tabelle già create dalle migrazioni locali. Lo schema resta governato da `migrations apply --local` (idempotente, copre anche il locale vergine).
  Dettaglio scoperto in verifica: senza `--table`, l'export include anche le tabelle interne D1 (`d1_migrations`, `sqlite_sequence`) e il loro import fallisce con `UNIQUE constraint failed: d1_migrations.id` perché il locale ha già le proprie righe di migrazione. Il filtro `--table analytics` produce un dump con sole `INSERT INTO analytics` (verificato).
- **Conteggio remoto prima della conferma**: un `SELECT COUNT(*)` in sola lettura (nessun effetto collaterale) permette di mostrare all'operatore quante righe sta per importare. Il fallimento di questa lettura blocca tutto prima di qualsiasi modifica.
- **Parsing JSON con `grep`, non con dipendenze extra**: `wrangler ... --json` + `grep -o` estrae il conteggio senza richiedere `jq`/python, coerente con "nessuna dipendenza" del progetto.
- **Flag `-y` su `d1 export` ed `execute --file`**: la conferma è già stata data dall'operatore via prompt; i flag evitano prompt secondari di wrangler che bloccherebbero lo script.

## Risks / Trade-offs

- [Rischio] La chiave API hardcoded in `bin/` è un segreto in chiaro → Mitigazione: `bin/` è gitignored da sempre (stesso pattern di `wrangler_deploy_pages.sh`); nessun cambiamento al modello di sicurezza esistente.
- [Rischio] Se l'import fallisce a metà, il locale resta azzerato/parziale → Mitigazione: il dump resta in `backup/` e lo script è rieseguibile (le migrazioni sono idempotenti, il wipe è ripetibile); la verifica COUNT segnala comunque l'anomalia con exit non-zero.
- [Rischio] `sqlite_sequence` non esportato con `--no-schema` → Mitigazione: il wipe locale cancella anche la riga di `sqlite_sequence`, così `AUTOINCREMENT` riparte da `max(id)` senza collisioni.
- [Trade-off] Nessuna transazionalità tra wipe e import (D1 via CLI = comandi separati) → accettato: uso one-shot supervisionato, non pipeline automatica.
