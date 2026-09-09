## 1. Allineamento script a spec e design

- [x] 1.1 Allineare `bin/backup_remoto_locale.sh` a spec e design (conferma prima di ogni effetto collaterale, fail-fast con exit non-zero, messaggi in italiano, `export` delle credenziali) e verificare con `bash -n bin/backup_remoto_locale.sh`
- [x] 1.2 Rendere lo script eseguibile e verificare con `ls -l bin/backup_remoto_locale.sh`

## 2. Verifica

- [x] 2.1 Verificare la lettura remota di sola lettura (`SELECT COUNT(*)` con API Key) e verificare che restituisca il conteggio senza creare file né modificare alcun database
- [x] 2.2 Eseguire il backup completo via `./bin/backup_remoto_locale.sh` (lo lancia l'utente: azzera il DB locale) e verificare che i conteggi remoto/locale coincidano, che il dump esista in `backup/` e che sia ignorato da git
