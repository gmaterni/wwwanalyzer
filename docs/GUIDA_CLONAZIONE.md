# Guida alla Clonazione di un'Applicazione

Questa guida descrive esclusivamente i comandi per clonare la struttura del progetto in una nuova istanza.

## 🚀 Comandi per la Clonazione

Eseguire il comando dalla root del progetto attuale passando il nome della nuova applicazione come argomento:

```bash
# Sostituisci 'mia-nuova-app' con il nome desiderato
python3 bin/clone_app.py mia-nuova-app
```

Lo script eseguirà automaticamente:
1. La creazione della cartella `../mia-nuova-app`.
2. Il trasferimento e la ridenominazione di tutti i file sorgente.
3. La personalizzazione interna dei nomi progetto e dei link.

---
**Cosa fare dopo:**
Una volta completata la clonazione, entra nella nuova cartella e segui i documenti di deploy:
- Per lo sviluppo locale: `docs/DEPLOY_LOCAL.md`
- Per il deploy in produzione: `docs/DEPLOY_REMOTE.md`
