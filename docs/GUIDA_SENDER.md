# Guida Integrazione sender.js

Il file `sender.js` è l'unico componente necessario per integrare il tracciamento in applicazioni esterne.

## 1. Installazione
Copia il file `www/WWWANALYZER-cli/js/sender.js` nel tuo progetto.

## 2. Inizializzazione
Importa il modulo e inizializzalo con l'URL del tuo Worker:

```javascript
import { UaSender } from "./js/sender.js";

UaSender.init({
    workerUrl: "https://WWWANALYZER.tuo-subdomain.workers.dev",
    userId: "utente_123", // Opzionale: se omesso verrà generato un ID automatico
    disableOnLocal: false // Se true, non invia dati se l'app gira su localhost
});
```

## 3. Invio Eventi
Usa il metodo asincrono per registrare le azioni degli utenti:

```javascript
// Esempio: Tracciamento click acquisto
const trackPurchase = async () => {
    const result = await UaSender.sendEventAsync("mio-ecommerce", "click_acquisto");
    if (result && !result.skipped) {
        console.log("Evento registrato con ID:", result.id);
    }
};
```

## 4. Metadata Raccolti
Il modulo raccoglie automaticamente per ogni evento:
- User Agent (Browser/OS)
- Timezone e Lingua
- Referrer (URL di provenienza)
- Parametri URL (es. campagne UTM)
- Timestamp preciso del client
