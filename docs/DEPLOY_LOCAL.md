# Sviluppo in Locale (Deploy Locale)

Tutti i comandi seguenti devono essere eseguiti dalla **directory root** del progetto.

## 1. Inizializzazione Database Locale
Prepara il database SQLite locale applicando le tabelle iniziali:
```bash
# Dalla root del progetto:
./bin/test0.sh
```

## 2. Avvio Backend (Worker)
Avvia il server backend (API) in un terminale separato:
```bash
# Dalla root del progetto:
./bin/test1.sh
```
L'API sarà disponibile su `http://localhost:8787`.

## 3. Avvio Frontend (Pages)
Avvia il server frontend (Dashboard) in un altro terminale:
```bash
# Dalla root del progetto:
./bin/test2.sh
```
L'interfaccia sarà disponibile su `http://localhost:8788`.

## 4. Arresto Servizi
Per fermare backend e frontend e liberare le porte:
```bash
# Dalla root del progetto:
./bin/stop_dev.sh
```

---
**Nota**: Il frontend rileva automaticamente di essere in ambiente locale e si collega al Worker locale sulla porta 8787.
