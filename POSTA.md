# Posta delle proposte

Gli utenti mandano giochi, app e idee dalla sezione Giochi → "📮 Proponi".
Tutto finisce nel database Supabase (progetto `chiacchiere`), **non** sul sito:
nessun file caricato da altri viene pubblicato prima di essere controllato.

- `submissions`: tipo, nome, descrizione, link, stato (`nuova`, `in valutazione`, `aggiunta`, `non adatta`), risposta
- `submission_files`: file allegati in base64 (max 3 da 5 MB)

## Come si controlla la posta
1. Leggere le proposte nuove: `select id, kind, title, description, link, created_at from submissions where status = 'nuova' order by created_at;`
2. Elenco file: `select id, name, mime, size from submission_files where submission_id = '...';`
3. Scaricare un file a pezzi: `select substr(data_base64, 1, 500000) from submission_files where id = '...';` (poi i pezzi successivi) e decodificare.
4. Rivedere il codice prima di usarlo, adattarlo e metterlo in `giochi/<nome>/` su questo repository.
5. Aggiornare lo stato e la risposta, che l'autore vede nell'app:
   `update submissions set status = 'aggiunta', reply = '...' where id = '...';`
