"use strict";

/**
 * Stato globale del modulo Query (Singleton)
 */
let _globalConfig = {
    workerUrl: "http://localhost:8787"
};

/**
 * Gestore dell'esecuzione delle query SQL.
 */
export const UaQuery = {
    
    /**
     * Inizializza la configurazione globale per le query.
     */
    init: function(config = {}) {
        if (config.workerUrl) {
            _globalConfig.workerUrl = config.workerUrl;
        }
    },

    /**
     * Esegue una query SQL SELECT tramite il backend.
     */
    executeAsync: async function(sql) {
        if (!sql) {
            console.error("UaQuery: SQL mancante");
            return null;
        }

        try {
            const response = await fetch(`${_globalConfig.workerUrl}/api/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sql: sql })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Errore durante l'esecuzione della query");
            }

            return data;
        } catch (error) {
            console.error("UaQuery.executeAsync:", error);
            throw error;
        }
    }
};
