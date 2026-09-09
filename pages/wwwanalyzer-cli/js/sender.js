/**
 * sender.js - Servizio di invio eventi e analytics.
 *
 * Gestisce l'invio asincrono di dati verso un worker Cloudflare per il tracciamento
 * delle attività, includendo metadata dell'ambiente.
 * Supporta la disattivazione automatica in ambiente locale.
 *
 * @module  services/sender
 * @version 1.1.0
 * @date    2026-09-03
 * @author  Gemini CLI
 */

"use strict";

// ============================================================================
// CONFIGURAZIONE DI SISTEMA
// ============================================================================

/** @type {boolean} Valore di default per il salto invio in ambiente locale (sovrascrivibile via init). */
const DEFAULT_DISABLE_ON_LOCAL = false;


// ============================================================================
// STATO PRIVATO (SINGLETON)
// ============================================================================

/** 
 * Configurazione globale del mittente.
 * @private 
 */
const _config = {
    workerUrl: "http://localhost:8787",
    userId: null,
    disableOnLocal: DEFAULT_DISABLE_ON_LOCAL,
    isInitialized: false
};


// ============================================================================
// FUNZIONI PRIVATE
// ============================================================================

/**
 * Verifica se l'applicazione è in esecuzione in un ambiente locale.
 *
 * @returns {boolean} True se l'ambiente è locale.
 */
const _isLocalEnvironment = function () {
    const host = window.location.hostname;
    const protocol = window.location.protocol;

    const isLocalHost = (host === "localhost" || host === "127.0.0.1");
    const isLocalFile = (protocol === "file:");
    const result = isLocalHost || isLocalFile;
    return result;
};

/**
 * Raccoglie i metadata dell'ambiente corrente.
 *
 * @returns {Object} Oggetto contenente metadata di sistema.
 */
const _getMetadata = function () {
    const metadata = {
        userAgent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        referrer: document.referrer,
        urlParams: Object.fromEntries(new URLSearchParams(window.location.search)),
        timestamp: Math.floor(Date.now() / 1000)
    };

    const result = metadata;
    return result;
};


// ============================================================================
// API PUBBLICA
// ============================================================================

export const UaSender = {

    /**
     * Inizializza il servizio di invio eventi.
     *
     * @param {Object} options - Opzioni di configurazione.
     * @param {string} options.workerUrl - URL base del worker (es: https://wwwanalyzer-backend.workerua.workers.dev)
     * @param {string} options.userId - Identificativo unico dell'utente.
     * @param {boolean} options.disableOnLocal - Se true, salta l'invio su localhost/127.0.0.1/file:.
     */
    init: function (options = {}) {
        if (options.workerUrl) {
            _config.workerUrl = options.workerUrl;
        }

        if (options.userId) {
            _config.userId = options.userId;
        }

        if (typeof options.disableOnLocal === "boolean") {
            _config.disableOnLocal = options.disableOnLocal;
        }

        _config.isInitialized = true;
        console.info(`[WWWANALYZER] Sender pronto. URL: ${_config.workerUrl}`);
    },

    /**
     * Invia un evento asincrono al server di analytics.
     *
     * @param {string} appName - Nome dell'applicazione.
     * @param {string} actionName - Nome dell'azione eseguita.
     * @returns {Promise<Object|null>} Risposta del server o null in caso di errore/skip.
     */
    sendEventAsync: async function (appName, actionName) {
        // 1. Validazione Input (Fail Fast)
        if (!appName || !actionName) {
            console.error("UaSender.sendEventAsync: parametri mancanti");
            return null;
        }

        // 2. Controllo Ambiente Locale
        if (_config.disableOnLocal && _isLocalEnvironment()) {
            console.info("UaSender.sendEventAsync: invio saltato (ambiente locale)");
            return { success: true, skipped: true };
        }

        // 3. Preparazione Payload
        const finalUserId = _config.userId || `${appName}_user_id`;
        const metadata = _getMetadata();

        const payload = {
            appName: appName,
            actionName: actionName,
            userId: finalUserId,
            ...metadata
        };

        // 4. Invio Richiesta
        try {
            const endpoint = `${_config.workerUrl}/api/analytics`;

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error(`UaSender.sendEventAsync: errore server [${response.status}]`);
                return null;
            }

            return await response.json();

        } catch (error) {
            console.warn("UaSender.sendEventAsync: errore di rete", error);
            return null;
        }
    }
};
