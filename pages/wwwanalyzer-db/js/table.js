"use strict";

/**
 * Gestore del rendering delle tabelle, visibilità colonne e ordinamento.
 */
export const UaTable = function(containerId) {

    // 1. STATO PRIVATO
    const _head = document.getElementById("results-head");
    const _body = document.getElementById("results-body");

    let _hiddenColumns = new Set(JSON.parse(sessionStorage.getItem("ragindex_hidden_cols") || "[]"));
    let _currentData = [];
    let _currentColumns = [];
    let _sortColumn = null;
    let _sortDirection = 'asc';
    let _selectedRows = new Set(); // ID delle righe selezionate
    let _idColumn = 'id'; // Colonna usata come identificatore

    // 2. FUNZIONI PRIVATE

    /**
     * Salva lo stato della visibilità in sessionStorage.
     */
    const _saveVisibility = function() {
        sessionStorage.setItem("ragindex_hidden_cols", JSON.stringify(Array.from(_hiddenColumns)));
    };

    /**
     * Ordina i dati per una colonna specifica.
     */
    const _sortData = function(data, column, direction) {
        if (!data || data.length === 0) return data;

        const sorted = [...data].sort((a, b) => {
            let valA = a[column];
            let valB = b[column];

            if (valA === null && valB === null) return 0;
            if (valA === null) return direction === 'asc' ? -1 : 1;
            if (valB === null) return direction === 'asc' ? 1 : -1;

            const numA = parseFloat(valA);
            const numB = parseFloat(valB);
            const isNumeric = !isNaN(numA) && !isNaN(numB);

            if (isNumeric) {
                return direction === 'asc' ? numA - numB : numB - numA;
            }

            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            if (strA < strB) return direction === 'asc' ? -1 : 1;
            if (strA > strB) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    };

    /**
     * Crea l'header della tabella con checkbox selezione e ordinamento inline.
     */
    const _createHeader = function(columns) {
        const visibleColumns = columns.filter(col => !_hiddenColumns.has(col));

        const headerRow = document.createElement("tr");

        // Prima colonna: Checkbox "Seleziona tutti"
        const thSelect = document.createElement("th");
        thSelect.style.width = "40px";
        thSelect.style.textAlign = "center";

        const selectAllCheckbox = document.createElement("input");
        selectAllCheckbox.type = "checkbox";
        selectAllCheckbox.checked = _selectedRows.size > 0 && _currentData.length > 0 && _selectedRows.size === _currentData.length;
        selectAllCheckbox.indeterminate = _selectedRows.size > 0 && _selectedRows.size < _currentData.length;
        selectAllCheckbox.title = "Seleziona tutte le righe";

        selectAllCheckbox.addEventListener("change", (e) => {
            e.stopPropagation();
            const rowIds = _currentData.map(row => row[_idColumn]);
            if (selectAllCheckbox.checked) {
                rowIds.forEach(id => _selectedRows.add(id));
            } else {
                _selectedRows.clear();
            }
            _updateSelectAllState();
            render(_currentData, false, false);
        });

        thSelect.appendChild(selectAllCheckbox);
        headerRow.appendChild(thSelect);

        // Restanti colonne con checkbox visibilità e ordinamento
        visibleColumns.forEach(col => {
            const th = document.createElement("th");

            const thContent = document.createElement("div");
            thContent.className = "th-content";

            // Checkbox + Label
            const label = document.createElement("label");
            label.title = "Mostra/Nascondi colonna";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = !_hiddenColumns.has(col);

            checkbox.addEventListener("change", (e) => {
                e.stopPropagation();
                if (checkbox.checked) {
                    _hiddenColumns.delete(col);
                } else {
                    _hiddenColumns.add(col);
                }
                _saveVisibility();
                render(_currentData);
            });

            const colLabel = document.createElement("span");
            colLabel.className = "col-label";
            colLabel.textContent = col;

            label.appendChild(checkbox);
            label.appendChild(colLabel);

            // Icona ordinamento
            const sortIcon = document.createElement("span");
            sortIcon.className = "sort-icon";
            sortIcon.textContent = '⇅';
            sortIcon.title = "Ordina ascending/descending";

            if (_sortColumn === col) {
                sortIcon.classList.add("active");
                sortIcon.textContent = _sortDirection === 'asc' ? '▲' : '▼';
            }

            sortIcon.addEventListener("click", (e) => {
                e.stopPropagation();

                if (_sortColumn === col) {
                    if (_sortDirection === 'asc') {
                        _sortDirection = 'desc';
                    } else {
                        _sortColumn = null;
                        _sortDirection = 'asc';
                    }
                } else {
                    _sortColumn = col;
                    _sortDirection = 'asc';
                }

                // Aggiorna tutte le icone
                const allIcons = _head.querySelectorAll('.sort-icon');
                allIcons.forEach(icon => {
                    icon.classList.remove("active");
                    icon.textContent = '⇅';
                });

                if (_sortColumn) {
                    sortIcon.classList.add("active");
                    sortIcon.textContent = _sortDirection === 'asc' ? '▲' : '▼';
                }

                // Riordina e renderizza i dati
                render(_currentData, false, true);
            });

            thContent.appendChild(label);
            thContent.appendChild(sortIcon);
            th.appendChild(thContent);
            headerRow.appendChild(th);
        });

        return headerRow;
    };

    /**
     * Aggiorna lo stato del checkbox "Seleziona tutti".
     */
    const _updateSelectAllState = function() {
        const checkbox = _head.querySelector('th input[type="checkbox"]');
        if (checkbox) {
            checkbox.checked = _selectedRows.size > 0 && _currentData.length > 0 && _selectedRows.size === _currentData.length;
            checkbox.indeterminate = _selectedRows.size > 0 && _selectedRows.size < _currentData.length;
        }
    };

    /**
     * Crea il body della tabella con checkbox per ogni riga.
     */
    const _createBody = function(data, visibleColumns) {
        const fragment = document.createDocumentFragment();

        data.forEach(row => {
            const tr = document.createElement("tr");
            const rowId = row[_idColumn];

            // Evidenzia righe selezionate
            if (_selectedRows.has(rowId)) {
                tr.classList.add("selected");
            }

            // Prima colonna: Checkbox selezione riga
            const tdSelect = document.createElement("td");
            tdSelect.style.textAlign = "center";

            const rowCheckbox = document.createElement("input");
            rowCheckbox.type = "checkbox";
            rowCheckbox.checked = _selectedRows.has(rowId);
            rowCheckbox.title = "Seleziona riga";

            rowCheckbox.addEventListener("change", (e) => {
                e.stopPropagation();
                if (rowCheckbox.checked) {
                    _selectedRows.add(rowId);
                } else {
                    _selectedRows.delete(rowId);
                }
                _updateSelectAllState();
                // Aggiorna evidenziazione riga
                if (rowCheckbox.checked) {
                    tr.classList.add("selected");
                } else {
                    tr.classList.remove("selected");
                }
            });

            tdSelect.appendChild(rowCheckbox);
            tr.appendChild(tdSelect);

            // Restanti colonne
            visibleColumns.forEach(col => {
                const td = document.createElement("td");
                const val = row[col];

                if (val !== null && typeof val === "object") {
                    td.textContent = JSON.stringify(val);
                } else if (col === "created_at" || col === "timestamp") {
                    td.textContent = val;
                } else {
                    td.textContent = val !== null ? val : "NULL";
                }

                tr.appendChild(td);
            });
            fragment.appendChild(tr);
        });

        return fragment;
    };

    // 3. FUNZIONI PUBBLICHE

    /**
     * Renderizza i dati nella tabella.
     * @param {Array} data - I dati da renderizzare
     * @param {boolean} updateHeader - Se aggiornare l'header
     * @param {boolean} applySort - Se applicare l'ordinamento
     */
    const render = function(data, updateHeader = true, applySort = false) {
        _currentData = data || [];

        if (!_currentData || _currentData.length === 0) {
            _head.innerHTML = "";
            _body.innerHTML = "<tr><td colspan='100'>Nessun risultato</td></tr>";
            return;
        }

        const columns = Object.keys(_currentData[0]);
        _currentColumns = columns;

        // Rileva colonna ID (priorità: id, created_at, prima colonna)
        if (columns.includes('id')) {
            _idColumn = 'id';
        } else if (columns.includes('created_at')) {
            _idColumn = 'created_at';
        } else {
            _idColumn = columns[0];
        }

        // Applica ordinamento se richiesto
        let renderData = _currentData;
        if (applySort && _sortColumn && columns.includes(_sortColumn)) {
            renderData = _sortData(_currentData, _sortColumn, _sortDirection);
        }

        const visibleColumns = columns.filter(col => !_hiddenColumns.has(col));

        // Header
        if (updateHeader) {
            _head.innerHTML = "";
            const headerRow = _createHeader(columns);
            _head.appendChild(headerRow);
        } else {
            // Aggiorna solo stato checkbox esistenti
            const existingThs = _head.querySelectorAll("th");
            existingThs.forEach((th, idx) => {
                if (idx < visibleColumns.length + 1) { // +1 per checkbox selezione
                    const checkbox = th.querySelector('input[type="checkbox"]');
                    if (idx === 0) {
                        // Checkbox "Seleziona tutti"
                        if (checkbox) {
                            checkbox.checked = _selectedRows.size > 0 && _currentData.length > 0 && _selectedRows.size === _currentData.length;
                            checkbox.indeterminate = _selectedRows.size > 0 && _selectedRows.size < _currentData.length;
                        }
                    } else if (checkbox) {
                        // Checkbox visibilità colonna
                        const col = visibleColumns[idx - 1];
                        if (col) {
                            checkbox.checked = !_hiddenColumns.has(col);
                        }
                    }
                }
            });
        }

        // Body
        _body.innerHTML = "";
        const bodyFragment = _createBody(renderData, visibleColumns);
        _body.appendChild(bodyFragment);
    };

    /**
     * Svuota la tabella.
     */
    const clear = function() {
        _head.innerHTML = "";
        _body.innerHTML = "";
        _currentData = [];
        _currentColumns = [];
        _sortColumn = null;
        _sortDirection = 'asc';
        _selectedRows.clear();
    };

    /**
     * Mostra tutte le colonne.
     */
    const showAllColumns = function() {
        _hiddenColumns.clear();
        _saveVisibility();
        render(_currentData);
    };

    /**
     * Ottieni lo stato ordinamento.
     */
    const getSortState = function() {
        return { column: _sortColumn, direction: _sortDirection };
    };

    /**
     * Imposta lo stato di ordinamento.
     */
    const setSortState = function(column, direction) {
        _sortColumn = column;
        _sortDirection = direction;
    };

    /**
     * Ottieni le righe selezionate.
     * @returns {Set} - Set con gli ID delle righe selezionate
     */
    const getSelectedRows = function() {
        return new Set(_selectedRows);
    };

    /**
     * Ottieni il conteggio delle righe selezionate.
     * @returns {number} - Numero di righe selezionate
     */
    const getSelectedCount = function() {
        return _selectedRows.size;
    };

    /**
     * Deseleziona tutte le righe.
     */
    const clearSelection = function() {
        _selectedRows.clear();
        render(_currentData, false, false);
    };

    // 4. API PUBBLICA
    return {
        render: render,
        clear: clear,
        showAllColumns: showAllColumns,
        getSortState: getSortState,
        setSortState: setSortState,
        getSelectedRows: getSelectedRows,
        getSelectedCount: getSelectedCount,
        clearSelection: clearSelection
    };
};
