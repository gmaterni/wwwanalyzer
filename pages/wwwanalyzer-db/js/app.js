"use strict";

import { UaQuery } from "./query.js";
import { UaTable } from "./table.js";

/**
 * Controller principale del DB Explorer.
 */
const UaApp = function() {

    // 1. STATO E CONFIG
    // Chiave di sicurezza predefinita per l'ambiente locale (deve coincidere con il backend)
    const DEFAULT_LOCAL_KEY = "ragindex-secret-clear-2026";
    // Chiave per l'ambiente remoto (configurata tramite wrangler secret put CLEAR_KEY)
    const REMOTE_KEY = "Mgiuseppe_0_";

    const _getWorkerUrl = function() {
        const env = localStorage.getItem("wwwanalyzer_env") || "local";
        const remoteBase = "https://wwwanalyzer-backend.workerua.workers.dev";

        const envSelect = document.getElementById("env-select");
        if (envSelect) envSelect.value = env;

        const urlDisplay = document.getElementById("current-url");
        if (urlDisplay) {
            urlDisplay.textContent = env === "local" ? "http://localhost:8787" : remoteBase;
        }

        return env === "local" ? "http://localhost:8787" : remoteBase;
    };

    const _getClearKey = function() {
        const env = localStorage.getItem("wwwanalyzer_env") || "local";
        return env === "local" ? DEFAULT_LOCAL_KEY : REMOTE_KEY;
    };

    const _workerUrl = _getWorkerUrl();

    // Inizializzazione Singleton per le query
    UaQuery.init({ workerUrl: _workerUrl });

    const _tableManager = UaTable();

    // Elementi DOM
    const _editor = document.getElementById("sql-editor");
    const _executeBtn = document.getElementById("execute-btn");
    const _clearBtn = document.getElementById("clear-btn");
    const _errorDisplay = document.getElementById("error-display");
    const _dangerClearBtn = document.getElementById("danger-clear-btn");
    const _showAllColsBtn = document.getElementById("show-all-cols-btn");
    const _deleteSelectedBtn = document.getElementById("delete-selected-btn");
    
    // Filtri
    const _filterApp = document.getElementById("filter-app");
    const _filterAction = document.getElementById("filter-action");
    const _filterUser = document.getElementById("filter-user");
    
    // Query selector in sidebar
    const _sidebarQuerySelect = document.getElementById("sidebar-query-select");

    // Stato filtri
    let _distinctValues = {
        app_name: [],
        action_name: [],
        user_id: []
    };

    // 2. FUNZIONI PRIVATE

    /**
     * Carica i valori distinti per i filtri.
     */
    const _loadFilterValuesAsync = async function() {
        try {
            const appResult = await UaQuery.executeAsync("SELECT DISTINCT app_name FROM analytics WHERE app_name IS NOT NULL ORDER BY app_name");
            if (appResult && appResult.results) {
                _distinctValues.app_name = appResult.results.map(r => r.app_name).filter(v => v);
                _populateFilter(_filterApp, _distinctValues.app_name);
            }

            const actionResult = await UaQuery.executeAsync("SELECT DISTINCT action_name FROM analytics WHERE action_name IS NOT NULL ORDER BY action_name");
            if (actionResult && actionResult.results) {
                _distinctValues.action_name = actionResult.results.map(r => r.action_name).filter(v => v);
                _populateFilter(_filterAction, _distinctValues.action_name);
            }

            const userResult = await UaQuery.executeAsync("SELECT DISTINCT user_id FROM analytics WHERE user_id IS NOT NULL ORDER BY user_id");
            if (userResult && appResult.results) {
                _distinctValues.user_id = userResult.results.map(r => r.user_id).filter(v => v);
                _populateFilter(_filterUser, _distinctValues.user_id);
            }
        } catch (error) {
            console.warn("Impossibile caricare i valori dei filtri:", error.message);
        }
    };

    /**
     * Popola un select con i valori forniti.
     */
    const _populateFilter = function(selectElement, values) {
        const currentValue = selectElement.value;
        selectElement.innerHTML = '<option value="">Tutti</option>';
        
        values.forEach(val => {
            const option = document.createElement("option");
            option.value = val;
            option.textContent = val;
            selectElement.appendChild(option);
        });

        if (values.includes(currentValue)) {
            selectElement.value = currentValue;
        }
    };

    /**
     * Costruisce la query con i filtri applicati.
     */
    const _buildFilteredQuery = function(baseSql) {
        const appValue = _filterApp.value;
        const actionValue = _filterAction.value;
        const userValue = _filterUser.value;

        if (!appValue && !actionValue && !userValue) {
            return baseSql;
        }

        let sql = baseSql.trim().replace(/;\s*$/, "");
        
        const hasWhere = /WHERE/i.test(sql);
        const whereClause = hasWhere ? " AND " : " WHERE ";

        const conditions = [];
        if (appValue) conditions.push(`app_name = '${appValue.replace(/'/g, "''")}'`);
        if (actionValue) conditions.push(`action_name = '${actionValue.replace(/'/g, "''")}'`);
        if (userValue) conditions.push(`user_id = '${userValue.replace(/'/g, "''")}'`);

        if (conditions.length > 0) {
            const orderMatch = sql.match(/\bORDER\s+BY\b/i);
            const limitMatch = sql.match(/\bLIMIT\b/i);

            if (orderMatch) {
                const insertPos = orderMatch.index;
                sql = sql.substring(0, insertPos) + whereClause + conditions.join(" AND ") + " " + sql.substring(insertPos);
            } else if (limitMatch) {
                const insertPos = limitMatch.index;
                sql = sql.substring(0, insertPos) + whereClause + conditions.join(" AND ") + " " + sql.substring(insertPos);
            } else {
                sql = sql + whereClause + conditions.join(" AND ");
            }
        }

        return sql;
    };

    /**
     * Svuota il database tramite API protetta.
     */
    const _clearDatabaseAsync = async function() {
        const confirmed = confirm("Sei sicuro di voler cancellare TUTTI gli eventi dal database?");
        if (!confirmed) return;

        const SECRET_KEY = _getClearKey();

        try {
            const response = await fetch(`${_workerUrl}/api/analytics/clear`, {
                method: "DELETE",
                headers: { "X-Clear-Key": SECRET_KEY }
            });

            const data = await response.json();
            if (response.ok) {
                alert(`Database svuotato! Righe eliminate: ${data.deleted}`);
                _tableManager.clear();
                _loadFilterValuesAsync();
            } else {
                throw new Error(data.error || "Errore durante la cancellazione");
            }
        } catch (error) {
            _showError(`Errore cancellazione: ${error.message}`);
        }
    };

    /**
     * Elimina le righe selezionate tramite API protetta.
     */
    const _deleteSelectedAsync = async function() {
        const selectedIds = Array.from(_tableManager.getSelectedRows());
        
        if (selectedIds.length === 0) {
            alert("Nessuna riga selezionata!");
            return;
        }

        const confirmed = confirm(`Sei sicuro di voler eliminare ${selectedIds.length} righe selezionate?`);
        if (!confirmed) return;

        const SECRET_KEY = _getClearKey();

        try {
            const response = await fetch(`${_workerUrl}/api/analytics/delete`, {
                method: "POST",
                headers: { 
                    "X-Clear-Key": SECRET_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ ids: selectedIds })
            });

            const data = await response.json();
            if (response.ok) {
                alert(`Righe eliminate: ${data.deleted}`);
                _tableManager.clearSelection();
                _runQueryAsync(); // Ricarica i risultati
                _loadFilterValuesAsync();
            } else {
                throw new Error(data.error || "Errore durante l'eliminazione");
            }
        } catch (error) {
            _showError(`Errore eliminazione: ${error.message}`);
        }
    };

    /**
     * Aggiorna lo stato del pulsante Elimina in base alle selezioni.
     */
    const _updateDeleteButton = function() {
        const count = _tableManager.getSelectedCount();
        _deleteSelectedBtn.disabled = count === 0;
    };

    /**
     * Mostra un errore nella UI.
     */
    const _showError = function(message) {
        if (!message) {
            _errorDisplay.style.display = "none";
            return;
        }
        _errorDisplay.textContent = message;
        _errorDisplay.style.display = "block";
    };

    /**
     * Esegue la query presente nell'editor con eventuali filtri.
     */
    const _runQueryAsync = async function() {
        const baseSql = _editor.value.trim();
        _showError(null);

        const finalSql = _buildFilteredQuery(baseSql);

        _executeBtn.disabled = true;
        _executeBtn.textContent = "Esecuzione...";

        try {
            const result = await UaQuery.executeAsync(finalSql);
            if (result && result.results) {
                _tableManager.render(result.results);
            }
        } catch (error) {
            _showError(error.message);
        } finally {
            _executeBtn.disabled = false;
            _executeBtn.textContent = "Esegui";
        }
    };

    /**
     * Gestisce il cambio ambiente.
     */
    const _handleEnvChange = function(e) {
        localStorage.setItem("wwwanalyzer_env", e.target.value);
        location.reload();
    };

    /**
     * Gestisce il cambio dei filtri.
     */
    const _handleFilterChange = function() {
        const baseSql = _editor.value.trim();
        if (baseSql) {
            _runQueryAsync();
        }
    };

    /**
     * Gestisce la selezione query dalla sidebar.
     */
    const _handleQuerySelect = function(e) {
        const selectedSql = e.target.value;
        if (selectedSql) {
            _editor.value = selectedSql;
            _runQueryAsync();
            e.target.value = ""; // Reset selezione
        }
    };

    // 3. INIZIALIZZAZIONE
    const init = function() {
        // Carica valori filtri
        _loadFilterValuesAsync();

        // Event Listeners
        _executeBtn.addEventListener("click", _runQueryAsync);

        _clearBtn.addEventListener("click", () => {
            _tableManager.clear();
            _showError(null);
        });

        _showAllColsBtn.addEventListener("click", () => {
            _tableManager.showAllColumns();
        });

        // Shortcut Ctrl+Enter
        _editor.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.key === "Enter") {
                _runQueryAsync();
            }
        });

        // Filtri
        _filterApp.addEventListener("change", _handleFilterChange);
        _filterAction.addEventListener("change", _handleFilterChange);
        _filterUser.addEventListener("change", _handleFilterChange);

        // Query selector
        _sidebarQuerySelect.addEventListener("change", _handleQuerySelect);

        // Environment switch
        const envSelect = document.getElementById("env-select");
        if (envSelect) {
            envSelect.addEventListener("change", _handleEnvChange);
        }

        // Danger actions
        _dangerClearBtn.addEventListener("click", _clearDatabaseAsync);
        _deleteSelectedBtn.addEventListener("click", _deleteSelectedAsync);

        // Monitora selezione righe
        setInterval(_updateDeleteButton, 500);

        console.log("wwwanalyzer DB Explorer inizializzato.");
    };

    return {
        init: init
    };
};

// Avvio
document.addEventListener("DOMContentLoaded", () => {
    const app = UaApp();
    app.init();
});
