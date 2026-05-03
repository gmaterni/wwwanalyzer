"use strict";

/**
 * Stato globale del modulo Reader (Singleton)
 */
let _globalConfig = {
    workerUrl: "http://localhost:8787"
};

/**
 * Gestore della lettura degli eventi analytics.
 */
export const UaReader = {
    
    /**
     * Inizializza la configurazione globale per la lettura.
     */
    init: function(config = {}) {
        if (config.workerUrl) {
            _globalConfig.workerUrl = config.workerUrl;
        }
    },

    /**
     * Recupera la lista degli ultimi eventi.
     */
    fetchEventsAsync: async function(filters = {}) {
        try {
            const url = new URL(`${_globalConfig.workerUrl}/api/analytics`);
            
            if (filters.limit) url.searchParams.append("limit", filters.limit);
            if (filters.appName) url.searchParams.append("appName", filters.appName);
            if (filters.actionName) url.searchParams.append("actionName", filters.actionName);
            if (filters.userId) url.searchParams.append("userId", filters.userId);

            const response = await fetch(url.toString());
            
            if (!response.ok) {
                throw new Error("Errore nel recupero eventi");
            }

            return await response.json();
        } catch (error) {
            console.error("UaReader.fetchEventsAsync:", error);
            return null;
        }
    }
};
