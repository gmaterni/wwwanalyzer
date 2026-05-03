# Manuale Operativo e Test

Questa guida spiega come verificare che il backend e il frontend comunichino correttamente.

## 1. Test di Flusso Completo (End-to-End)

### Fase A: Preparazione
1. Avvia il backend: `./bin/test1.sh`
2. Avvia il frontend: `./bin/test2.sh`
3. Apri il browser su `http://localhost:8788`.

### Fase B: Generazione Dati (CLI)
1. Vai su **Test Client**.
2. Verifica che lo stato in alto indichi "Ambiente: Locale".
3. Inserisci un nome app (es: `test-app`) e un'azione (es: `click_bottone`).
4. Clicca su **Invia Evento**.
5. Dovresti vedere un messaggio di successo e l'evento apparire nella tabella sottostante.

### Fase C: Verifica e Analisi (DB Explorer)
1. Torna all'Hub e apri il **DB Explorer**.
2. Esegui la query predefinita (`SELECT * FROM analytics...`).
3. Verifica che l'evento inviato prima sia presente nel database con tutti i metadata (User Agent, Timezone, ecc.).

## 2. Test delle Restrizioni di Sicurezza
1. Nel **DB Explorer**, prova a eseguire: `DELETE FROM analytics`.
2. **Risultato Atteso**: Il sistema deve restituire un errore "Only SELECT queries are allowed".
3. Prova a cancellare i dati usando il tasto dedicato (che usa la `CLEAR_KEY`). Se sei in locale, funzionerà con la chiave di default.

## 3. Risoluzione Problemi Comuni
- **CORS Error**: Verifica che il Worker sia attivo. Gli errori CORS spesso appaiono quando il server di destinazione è spento.
- **Database Locked**: Succede se si tenta di scrivere sul DB locale mentre un altro processo lo tiene aperto in modo esclusivo (raro con D1 locale).
