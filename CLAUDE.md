# MBS frontend — istruzioni per Claude

Questo repository è **pubblico**: niente segreti, credenziali, IP, host o percorsi del server, né dati di produzione, in codice, commenti, documenti o messaggi di commit. Le regole complete del progetto (VPS e database in sola lettura, worktree gemelli, harness) e la documentazione stanno nel repo privato del backend: `mbs-backend/CLAUDE.md` e `mbs-backend/docs/`.

## Regole di lavoro

- In locale (worktree sul Mac): non committare né pushare, l'utente committa da sé. Nelle sessioni cloud: lavorare solo sul branch assegnato alla sessione e aprire una PR verso `develop`; mai push su `develop` o `master`.
- Base dei feature branch: `develop`. Mai `git checkout`/`git switch` nel checkout principale `mbs-frontend` e mai `git stash`: le feature nascono in un worktree gemello `mbs-frontend-<feature>` (ricetta in `mbs-backend/CLAUDE.md`).
- Ogni fase di lavoro va registrata in `mbs-backend/docs/ADAPTER_STATUS.md`, anche quando tocca solo il frontend; i commit la citano come «ADAPTER_STATUS §14.xxx».
- Dopo ogni modifica: `npm run lint` e `npm test`. I controlli che leggono il codice del frontend da fuori (per esempio `verify-login-next.js`) stanno in `mbs-backend/smoke/verify/` e si lanciano da `mbs-backend` con `../mbs-frontend` come argomento.

## Provare il frontend senza backend

- `node mock-api/server.js` avvia il finto backend su `localhost:4000`; `npm run dev` lo usa da solo, perché in sviluppo `next.config.ts` manda `/api/*` lì.
- Per un secondo dev server in parallelo: `node mock-api/server.js 4100` e `NEXT_DIST_DIR=.next-alt MOCK_API_URL=http://localhost:4100 npm run dev -- -p 3100`.
- Le stesse coppie sono in `.claude/launch.json` (`frontend-dev` + `mock-api`, `-alt`, `-alt2`).
- Il mock risponde sempre con un admin già loggato; `MOCK_USER_HAS_PASSWORD=0` lo avvia come account solo Google, e `PATCH /api/__mock/user` cambia i campi dell'utente mentre gira.
