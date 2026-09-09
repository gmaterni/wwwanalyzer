## Purpose

Permette di copiare il contenuto del database D1 remoto nel database locale con un singolo comando interattivo, così da sviluppare e verificare il frontend contro dati reali.

## Requirements

### Requirement: Conferma interattiva prima dell'azzeramento

Lo script SHALL chiedere conferma esplicita all'operatore prima di eseguire qualsiasi operazione che modifica il database locale, e SHALL terminare senza effetti se la conferma è negata.

#### Scenario: Operatore conferma

- **WHEN** l'operatore risponde affermativamente (`s`/`S`, eventualmente `y`/`Y`) alla richiesta di conferma
- **THEN** lo script procede con esportazione, azzeramento e ripristino

#### Scenario: Operatore nega o non risponde

- **WHEN** l'operatore risponde in qualsiasi altro modo (incluso invio a vuoto o interruzione)
- **THEN** lo script termina immediatamente con codice di uscita non-zero e non crea, modifica né elimina alcun dato o file

#### Scenario: Conferma precedente a ogni effetto collaterale

- **WHEN** l'operatore nega la conferma
- **THEN** nessun file di dump viene creato in `backup/` e nessuna query viene eseguita contro il DB locale o remoto

### Requirement: Esportazione completa del contenuto remoto

Lo script SHALL esportare tutte le righe della tabella dati `analytics` del D1 remoto in un file SQL dentro `backup/`, con nome contenente marca temporale di esecuzione.

#### Scenario: Esportazione riuscita

- **WHEN** il database remoto è raggiungibile con le credenziali configurate
- **THEN** viene creato `backup/backup-<timestamp>.sql` contenente tutte le righe del remoto e lo script prosegue

#### Scenario: Esportazione fallita

- **WHEN** l'esportazione dal remoto fallisce (rete, autenticazione, permessi)
- **THEN** lo script termina con codice di uscita non-zero e non tocca il database locale

### Requirement: Azzeramento e ripristino del database locale

Lo script SHALL garantire che lo schema locale esista, SHALL svuotare integralmente la tabella `analytics` locale (inclusa la ripartenza del contatore `AUTOINCREMENT` da `max(id)`), e SHALL importarvi tutte le righe del dump remoto, senza mai scrivere sul database remoto.

#### Scenario: Ripristino su locale vergine

- **WHEN** il database locale non è mai stato inizializzato
- **THEN** lo script applica prima le migrazioni esistenti e poi importa i dati, senza errori di tabella mancante

#### Scenario: Ripristino su locale popolato

- **WHEN** il database locale contiene già righe proprie
- **THEN** dopo l'esecuzione il locale contiene esattamente le righe del remoto (le righe locali precedenti sono eliminate) e i successivi inserimenti proseguono senza collisioni di `id`

#### Scenario: Importazione fallita

- **WHEN** l'importazione del dump nel locale fallisce
- **THEN** lo script termina con codice di uscita non-zero e segnala l'errore in italiano

### Requirement: Verifica finale dei conteggi

Lo script SHALL confrontare il numero di righe della tabella `analytics` tra remoto e locale al termine del ripristino e SHALL riportare esito positivo solo se i conteggi coincidono.

#### Scenario: Conteggi coincidenti

- **WHEN** `COUNT(*)` su remoto e locale restituiscono lo stesso valore
- **THEN** lo script stampa un messaggio di successo con il numero di righe ripristinate e termina con codice zero

#### Scenario: Conteggi divergenti

- **WHEN** i conteggi differiscono
- **THEN** lo script stampa entrambi i valori, segnala l'anomalia e termina con codice di uscita non-zero

### Requirement: Dump escluso dal versionamento

Il file di dump generato SHALL trovarsi in un percorso già escluso dal versionamento git, così che nessun dato del database (inclusi IP e user-agent) possa essere committato per errore.

#### Scenario: Posizione del dump

- **WHEN** lo script crea il file di dump
- **THEN** il file risiede sotto `backup/` ed è ignorato da git senza modifiche a `.gitignore`
