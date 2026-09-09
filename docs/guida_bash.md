# Guida agli script Bash in bin/

Tutti gli script vanno **sempre eseguiti dalla root del progetto**.

## Convenzioni

- **Permessi:** eseguibili (chmod +x), già impostati.
- **Shebang:** #!/bin/bash in tutti gli script. Nessuno usa #!/usr/bin/env bash.
- **Prefisso ./bin/:** per eseguire, usa sempre ./bin/nome-script.sh (mai solo nome-script.sh).
- **Lingua:** commenti ed echo in **italiano**.
- **Nessuna libreria esterna:** solo comandi POSIX + lsof, curl, wrangler.

## Script disponibili

| Script | Cosa fa | Dipende da |
|--------|---------|-----------|
| test0_init_db.sh | Init database locale (npx wrangler d1 migrations apply) | wrangler, Node.js |
| test1_backend.sh | Avvia backend su porta 8787 (wrangler dev --port 8787) | wrangler, DB inizializzato |
| test2_frontend.sh | Avvia frontend su porta 8788 (wrangler pages dev pages --port 8788) | wrangler |
| stop_dev.sh | Uccide processi sulle porte 8787 e 8788 (usa lsof + kill -9) | lsof |
| wrangler_deploy_worker.sh | Deploy Worker su Cloudflare (npx wrangler deploy) | wrangler |
| wrangler_migrate_remote.sh | Migrazione DB D1 remoto (npx wrangler d1 migrations apply --remote) | wrangler |
| wrangler_deploy_pages.sh | Deploy Pages su Cloudflare (wrangler pages deploy) | wrangler |
| set_secret_key.sh | Imposta CLEAR_KEY come segreto Cloudflare + fa deploy | wrangler |
| git_create.sh | Crea repo GitHub via API REST + configura remote | curl, token GitHub |
| git_push.sh | Forza push su main con token GitHub | git |

## Inconsistenze note

- **npx wrangler vs wrangler:** `test0_init_db.sh` e `wrangler_deploy_worker.sh` usano `npx wrangler`; `test1_backend.sh`, `test2_frontend.sh`, `set_secret_key.sh`, `wrangler_deploy_pages.sh` usano `wrangler` diretto. Entrambi funzionano se wrangler è installato globalmente o se `npx` lo risolve. Per i nuovi script usa `npx wrangler` per coerenza con `test0_init_db.sh`.
- **Secret hardcoded (da non committare):** `wrangler_deploy_pages.sh` contiene una Cloudflare API key in chiaro ma inutilizzata; `git_create.sh` e `git_push.sh` contengono un GitHub token in chiaro. Questi script non vanno committati su repository pubblici (`bin/` è in `.gitignore`).
- **stop_dev.sh forza kill -9:** termina immediatamente senza dare ai processi la possibilità di fare cleanup.

## Come aggiungere un nuovo script

1. Crea il file in bin/ con #!/bin/bash come prima riga
2. Aggiungi commento iniziale che descrive scopo e uso
3. Imposta eseguibile: chmod +x bin/nuovo-script.sh
4. Se lo script usa wrangler, usa npx wrangler per coerenza con test0_init_db.sh
5. Usa $(dirname "$0") se devi costruire path relativi: BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" risale alla root del progetto
