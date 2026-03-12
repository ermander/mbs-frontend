## Obiettivo Backend Profit Tracker

Questo documento descrive:

- cosa è stato implementato finora nel **frontend** per il Profit Tracker
- quali **modelli dati** servono nel backend
- quali **API REST** (su Postgres) sono necessarie

Lo scopo è permettere a un altro agent/sviluppatore di implementare il backend (es. in Node/Nest/Go/etc.) usando **Postgres** come database e fornire API che sostituiscano lo store Zustand in memoria.

---

## 1. Stato attuale del frontend

### 1.1 Stack e architettura

- **Frontend**: Next.js App Router (`src/app/(auth)`), React, TypeScript, Tailwind, Zustand.
- **Sezione**: `Profit Tracker` sotto il path base `/profit-tracker`.
- **Gestione stato**: store Zustand `useProfitTrackerStore` (`src/stores/profit-tracker-store.ts`) con dati **mock in memoria**:
  - nessuna chiamata API reale
  - nessuna persistenza (su refresh i mock tornano allo stato iniziale).

### 1.2 Rotte frontend Profit Tracker

Tutte le pagine stanno sotto `src/app/(auth)/profit-tracker/`:

- `GET /profit-tracker` → redirect a `/profit-tracker/dashboard`.
- `GET /profit-tracker/dashboard`
  - mostra KPI (mese attuale, media mensile, totale anno)
  - mostra un trend mock e riepiloghi:
    - giocate in corso (subset delle `OngoingBet`)
    - ultime transazioni (mix di movimenti conti + movimenti wallet).
- `GET /profit-tracker/giocate-in-corso`
  - tabella giocate in corso (`OngoingBet`) con azioni:
    - dettaglio (link a `/profit-tracker/giocate-in-corso/[betId]`)
    - archivia
    - clona
    - elimina.
- `GET /profit-tracker/giocate-in-corso/[betId]`
  - dettaglio di una giocata (`OngoingBet` + `BetLeg[]`):
    - editing inline di stake, quota, commissione % e stato evento
    - ricalcolo del campo `movimento` per ogni leg.
- `GET /profit-tracker/giocate-rapide`
  - tabella `QuickBet` con:
    - nuova giocata (modale)
    - inverti movimento
    - elimina.
- `GET /profit-tracker/conti`
  - tabella `Account` con:
    - nuovo conto (modale)
    - nuovo movimento (`AccountMovement`, modale)
    - toggle stato abilitato/non abilitato.
- `GET /profit-tracker/wallets`
  - tabella `Wallet` con:
    - nuovo wallet (modale)
    - trasferisci (modale, crea `WalletMovement` tipo `trasferimento`)
    - ricarica/spesa (modale, crea `WalletMovement` tipo `ricarica`/`spesa`)
    - toggle stato.
- `GET /profit-tracker/intestatari`
  - tabella `Holder` (intestatari) con:
    - nuovo intestatario (modale)
    - nuovo wallet per intestatario (riusa modale wallet con `holderId` precompilato)
    - nuovo conto per intestatario (riusa modale conto con `holderId` precompilato)
    - modifica intestatario.
- `GET /profit-tracker/book-personali`
  - tabella `Book` con:
    - nuovo book (modale, flag “exchange”)
    - modifica book.

Il backend dovrà replicare questo modello dati e questi flussi, sostituendo lo store in memoria con chiamate API + persistenza su Postgres.

---

## 2. Modello dati concettuale

### 2.1 Enumerazioni

Nel backend conviene modellarle come `TEXT` con constraint o enum nativi Postgres.

- **SportType**
  - `calcio`, `basket`, `tennis`, `altro`.
- **BetMethod**
  - `punta`, `banca`.
- **BetBonusType**
  - `none`, `bonus`, `rimborso`, `freebet`.
- **BetStatus**
  - `bozza`, `in_corso`, `vinto`, `perso`, `annullato`.
- **EnabledStatus**
  - `abilitato`, `disabilitato`.
- **ModalitaSaldo**
  - `reale`, `bonus`, `rimborso`.
- **AccountMovementType**
  - `deposito`, `prelievo`, `riconciliazione`.
- **WalletMovementType**
  - `trasferimento`, `ricarica`, `spesa`.
- **QuickGameMethod**
  - `baccarat`, `bingo`, `blackjack`, `casino_live`, `gratta_e_vinci`,
    `quick_games`, `roulette`, `slot_machine`, `sport`, `trading`, `altro`.

### 2.2 Entità principali

> Nota: si assume multiutente, quindi tutte le tabelle avranno un campo `user_id` (FK verso tabella utenti) usato nei filtri.

#### Holder (intestatario)

- `id`: UUID, PK
- `user_id`: UUID, FK utente proprietario
- `nome`: string (unique per utente)
- `descrizione`: text, nullable
- `stato`: `EnabledStatus`
- `created_at`, `updated_at`

#### Book (book personale / bookmaker / exchange)

- `id`: UUID
- `user_id`: UUID
- `nome`: string (unique per utente)
- `descrizione`: text, nullable
- `is_exchange`: boolean
- `created_at`, `updated_at`

#### Account (conto presso un book per un intestatario)

- `id`: UUID
- `user_id`: UUID
- `holder_id`: FK → `Holder`
- `book_id`: FK → `Book`
- `nome`: string
- `descrizione`: text, nullable
- `saldo_attuale`: numeric(12,2) – opzionale ma utile come denormalizzazione
- `stato`: `EnabledStatus`
- `created_at`, `updated_at`

#### Wallet (metodo di pagamento)

- `id`: UUID
- `user_id`: UUID
- `holder_id`: FK → `Holder`
- `nome`: string
- `descrizione`: text, nullable
- `saldo_attuale`: numeric(12,2)
- `stato`: `EnabledStatus`
- `created_at`, `updated_at`

#### OngoingBet (giocata in corso – intestazione)

- `id`: UUID
- `user_id`: UUID
- `evento_data`: timestamptz
- `sport`: `SportType`
- `evento_nome`: string
- `modalita_saldo`: `ModalitaSaldo`
- `account_id`: FK → `Account`
- `tag`: string, nullable
- `nota`: text, nullable
- `stato_evento`: `BetStatus`
- `archiviata`: boolean (default `false`)
- `created_at`, `updated_at`

#### BetLeg (singolo esito nel dettaglio puntata)

- `id`: UUID
- `bet_id`: FK → `ongoing_bets`
- `evento_data`: timestamptz
- `sport`: `SportType`
- `evento_nome`: string
- `competizione`: string
- `mercato`: string
- `metodo`: `BetMethod`
- `tipo_bonus`: `BetBonusType`
- `account_id`: FK → `Account`
- `stake`: numeric(12,2)
- `quota`: numeric(8,3)
- `rischio`: numeric(12,2)
- `bonus_valore`: numeric(12,2), nullable
- `rimborso_valore`: numeric(12,2), nullable
- `commissione_percentuale`: numeric(5,2), nullable
- `movimento`: numeric(12,2) – profitto netto di questo leg
- `stato_evento`: `BetStatus`
- `tag`: string, nullable
- `created_at`, `updated_at`

#### QuickBet (giocate rapide: casino, slot, ecc.)

- `id`: UUID
- `user_id`: UUID
- `data_registrazione`: timestamptz
- `account_id`: FK → `Account`
- `quick_method`: `QuickGameMethod`
- `tag`: string, nullable
- `nota`: text, nullable
- `movimento`: numeric(12,2)
- `created_at`, `updated_at`

#### AccountMovement (movimenti sui conti bookmaker)

- `id`: UUID
- `user_id`: UUID
- `account_id`: FK → `Account`
- `tipo`: `AccountMovementType`
- `wallet_id`: FK → `Wallet`, nullable (null per riconciliazione)
- `valore`: numeric(12,2)
- `data_registrazione`: timestamptz
- `descrizione`: text, nullable
- `created_at`, `updated_at`

#### WalletMovement (movimenti sui wallet)

- `id`: UUID
- `user_id`: UUID
- `wallet_id`: FK → `Wallet` (per ricarica/spesa; per trasferimento può essere nullo)
- `tipo`: `WalletMovementType`
- `from_wallet_id`: FK → `Wallet`, nullable (per trasferimento)
- `to_wallet_id`: FK → `Wallet`, nullable (per trasferimento)
- `valore`: numeric(12,2)
- `data_registrazione`: timestamptz
- `descrizione`: text, nullable
- `created_at`, `updated_at`

> Suggerimento: i saldi di `Account` e `Wallet` possono essere mantenuti con **trigger** che sommano/sottraggono i nuovi movimenti, oppure ricalcolati via query/VIEW quando serve.

---

## 3. Schema Postgres suggerito

Di seguito uno schema SQL indicativo (da adattare alle convenzioni del backend).

### 3.1 holders

```sql
CREATE TABLE holders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descrizione TEXT,
  stato TEXT NOT NULL CHECK (stato IN ('abilitato','disabilitato')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX holders_user_nome_uniq ON holders(user_id, nome);
```

### 3.2 books

```sql
CREATE TABLE books (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descrizione TEXT,
  is_exchange BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX books_user_nome_uniq ON books(user_id, nome);
```

### 3.3 accounts

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  holder_id UUID NOT NULL REFERENCES holders(id),
  book_id UUID NOT NULL REFERENCES books(id),
  nome TEXT NOT NULL,
  descrizione TEXT,
  saldo_attuale NUMERIC(12,2) NOT NULL DEFAULT 0,
  stato TEXT NOT NULL CHECK (stato IN ('abilitato','disabilitato')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX accounts_holder_idx ON accounts(holder_id);
CREATE INDEX accounts_book_idx ON accounts(book_id);
```

### 3.4 wallets

```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  holder_id UUID NOT NULL REFERENCES holders(id),
  nome TEXT NOT NULL,
  descrizione TEXT,
  saldo_attuale NUMERIC(12,2) NOT NULL DEFAULT 0,
  stato TEXT NOT NULL CHECK (stato IN ('abilitato','disabilitato')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX wallets_holder_idx ON wallets(holder_id);
```

### 3.5 ongoing_bets e bet_legs

```sql
CREATE TABLE ongoing_bets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  evento_data TIMESTAMPTZ NOT NULL,
  sport TEXT NOT NULL,
  evento_nome TEXT NOT NULL,
  modalita_saldo TEXT NOT NULL CHECK (modalita_saldo IN ('reale','bonus','rimborso')),
  account_id UUID NOT NULL REFERENCES accounts(id),
  tag TEXT,
  nota TEXT,
  stato_evento TEXT NOT NULL CHECK (stato_evento IN ('bozza','in_corso','vinto','perso','annullato')),
  archiviata BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bet_legs (
  id UUID PRIMARY KEY,
  bet_id UUID NOT NULL REFERENCES ongoing_bets(id) ON DELETE CASCADE,
  evento_data TIMESTAMPTZ NOT NULL,
  sport TEXT NOT NULL,
  evento_nome TEXT NOT NULL,
  competizione TEXT NOT NULL,
  mercato TEXT NOT NULL,
  metodo TEXT NOT NULL CHECK (metodo IN ('punta','banca')),
  tipo_bonus TEXT NOT NULL CHECK (tipo_bonus IN ('none','bonus','rimborso','freebet')),
  account_id UUID NOT NULL REFERENCES accounts(id),
  stake NUMERIC(12,2) NOT NULL,
  quota NUMERIC(8,3) NOT NULL,
  rischio NUMERIC(12,2),
  bonus_valore NUMERIC(12,2),
  rimborso_valore NUMERIC(12,2),
  commissione_percentuale NUMERIC(5,2),
  movimento NUMERIC(12,2) NOT NULL DEFAULT 0,
  stato_evento TEXT NOT NULL CHECK (stato_evento IN ('bozza','in_corso','vinto','perso','annullato')),
  tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bet_legs_bet_idx ON bet_legs(bet_id);
```

### 3.6 quick_bets

```sql
CREATE TABLE quick_bets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  data_registrazione TIMESTAMPTZ NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id),
  quick_method TEXT NOT NULL,
  tag TEXT,
  nota TEXT,
  movimento NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX quick_bets_account_idx ON quick_bets(account_id);
```

### 3.7 account_movements e wallet_movements

```sql
CREATE TABLE account_movements (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('deposito','prelievo','riconciliazione')),
  wallet_id UUID REFERENCES wallets(id),
  valore NUMERIC(12,2) NOT NULL,
  data_registrazione TIMESTAMPTZ NOT NULL,
  descrizione TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX account_movements_account_idx ON account_movements(account_id);
CREATE INDEX account_movements_wallet_idx ON account_movements(wallet_id);

CREATE TABLE wallet_movements (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  wallet_id UUID REFERENCES wallets(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('trasferimento','ricarica','spesa')),
  from_wallet_id UUID REFERENCES wallets(id),
  to_wallet_id UUID REFERENCES wallets(id),
  valore NUMERIC(12,2) NOT NULL,
  data_registrazione TIMESTAMPTZ NOT NULL,
  descrizione TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX wallet_movements_wallet_idx ON wallet_movements(wallet_id);
CREATE INDEX wallet_movements_from_idx ON wallet_movements(from_wallet_id);
CREATE INDEX wallet_movements_to_idx ON wallet_movements(to_wallet_id);
```

---

## 4. API REST richieste

Si assume:

- base path: `/api/profit-tracker`
- autenticazione già gestita (es. `user_id` derivato dal token)
- risposte JSON con proprietà in `camelCase`, facilmente mappabili sui tipi TypeScript del frontend.

### 4.1 Intestatari (Holders)

- `GET /api/profit-tracker/holders`
  - Ritorna `Holder[]` dell’utente corrente.
- `POST /api/profit-tracker/holders`
  - Body: `{ nome, descrizione?, stato }`
  - Crea un nuovo intestatario.
- `PATCH /api/profit-tracker/holders/:id`
  - Body: `{ nome?, descrizione?, stato? }`
  - Aggiorna un intestatario.

### 4.2 Book personali

- `GET /api/profit-tracker/books`
- `POST /api/profit-tracker/books`
  - Body: `{ nome, descrizione?, isExchange }`.
- `PATCH /api/profit-tracker/books/:id`
  - Body: `{ nome?, descrizione?, isExchange? }`.

### 4.3 Conti (Accounts) e movimenti conti

**Accounts**

- `GET /api/profit-tracker/accounts`
  - Query opzionali: `holderId`, `bookId`, `status`.
- `POST /api/profit-tracker/accounts`
  - Body: `{ holderId, bookId, nome, descrizione?, stato }`.
- `PATCH /api/profit-tracker/accounts/:id`
  - Body: `{ nome?, descrizione?, stato? }`.

**AccountMovements**

- `GET /api/profit-tracker/account-movements`
  - Query: `accountId?`, `fromDate?`, `toDate?`.
- `POST /api/profit-tracker/account-movements`
  - Body:
    ```json
    {
      "accountId": "uuid",
      "tipo": "deposito | prelievo | riconciliazione",
      "walletId": "uuid | null",
      "valore": 100.0,
      "dataRegistrazione": "ISO-8601",
      "descrizione": "string?"
    }
    ```
  - Logica backend:
    - inserisce il movimento
    - aggiorna `saldo_attuale` dell’`Account`
    - se `tipo` è `deposito`/`prelievo`, può aggiornare anche il saldo del `Wallet` (come nello store frontend).

### 4.4 Wallets e movimenti wallet

**Wallets**

- `GET /api/profit-tracker/wallets`
- `POST /api/profit-tracker/wallets`
  - Body: `{ holderId, nome, descrizione?, saldoIniziale?, stato }`.
- `PATCH /api/profit-tracker/wallets/:id`
  - Body: `{ nome?, descrizione?, stato? }`.

**WalletMovements**

- `GET /api/profit-tracker/wallet-movements`
  - Query: `walletId?`, `fromDate?`, `toDate?`.
- `POST /api/profit-tracker/wallet-movements`
  - Per **ricarica** / **spesa**:
    ```json
    {
      "tipo": "ricarica" | "spesa",
      "walletId": "uuid",
      "valore": 100.0,
      "dataRegistrazione": "ISO-8601",
      "descrizione": "string?"
    }
    ```
  - Per **trasferimento**:
    ```json
    {
      "tipo": "trasferimento",
      "fromWalletId": "uuid",
      "toWalletId": "uuid",
      "valore": 100.0,
      "dataRegistrazione": "ISO-8601",
      "descrizione": "string?"
    }
    ```
  - Logica backend:
    - aggiorna i saldi dei wallet coinvolti in base al tipo di movimento.

### 4.5 Giocate in corso (OngoingBet) e BetLeg

**OngoingBet**

- `GET /api/profit-tracker/bets`
  - Query: `status?`, `archiviata?`, `fromDate?`, `toDate?`, `sport?`.
- `POST /api/profit-tracker/bets`
  - Body:
    ```json
    {
      "eventoData": "ISO-8601",
      "sport": "calcio",
      "eventoNome": "string",
      "modalitaSaldo": "reale | bonus | rimborso",
      "accountId": "uuid",
      "tag": "string?",
      "nota": "string?"
    }
    ```
- `GET /api/profit-tracker/bets/:id`
  - Ritorna `{ bet: OngoingBet, legs: BetLeg[] }`.
- `PATCH /api/profit-tracker/bets/:id`
  - Body: `{ eventoData?, sport?, eventoNome?, modalitaSaldo?, accountId?, tag?, nota?, statoEvento?, archiviata? }`.
- `DELETE /api/profit-tracker/bets/:id`
  - Elimina giocata e relativi `BetLeg`.

**BetLeg**

- `POST /api/profit-tracker/bets/:betId/legs`
  - Body:
    ```json
    {
      "legs": [
        {
          "eventoData": "ISO-8601",
          "sport": "calcio",
          "eventoNome": "string",
          "competizione": "string",
          "mercato": "string",
          "metodo": "punta | banca",
          "tipoBonus": "none | bonus | rimborso | freebet",
          "accountId": "uuid",
          "stake": 50,
          "quota": 2.1,
          "rischio": 50,
          "bonusValore": 50,
          "rimborsoValore": 0,
          "commissionePercentuale": 5,
          "movimento": 55,
          "statoEvento": "in_corso",
          "tag": "string?"
        }
      ]
    }
    ```
- `PATCH /api/profit-tracker/bets/:betId/legs/:legId`
  - Body parziale per editing inline (stake, quota, commissione, stato, tag, movimento).
- `DELETE /api/profit-tracker/bets/:betId/legs/:legId`

> Il frontend oggi calcola `movimento` lato client; il backend potrebbe ricalcolarlo per sicurezza usando gli stessi parametri.

### 4.6 Giocate rapide (QuickBets)

- `GET /api/profit-tracker/quick-bets`
  - Query: `accountId?`, `fromDate?`, `toDate?`, `method?`.
- `POST /api/profit-tracker/quick-bets`
  - Body:
    ```json
    {
      "accountId": "uuid",
      "quickMethod": "slot_machine",
      "movimento": -20.0,
      "dataRegistrazione": "ISO-8601",
      "tag": "string?",
      "nota": "string?"
    }
    ```
- `PATCH /api/profit-tracker/quick-bets/:id`
  - Es. per invertire il movimento o aggiornare note/tag.
- `DELETE /api/profit-tracker/quick-bets/:id`

### 4.7 Endpoint opzionale di riepilogo dashboard

La dashboard oggi calcola tutto lato client, ma è utile avere un endpoint dedicato:

- `GET /api/profit-tracker/summary`
  - Response esemplificativa:
    ```json
    {
      "totaleAnno": 1234.56,
      "mediaMensile": 102.88,
      "meseAttuale": 250.0,
      "trendMensile": [40, 80, 65, ...],
      "ultimeTransazioni": [ /* ultimi N AccountMovement + WalletMovement */ ],
      "giocateInCorso": [ /* subset OngoingBet */ ]
    }
    ```

---

## 5. Note operative per l’implementazione backend

- **DB**: usare Postgres con le tabelle sopra (o equivalenti), facendo attenzione a mantenere coerenti i nomi dei campi con i DTO del frontend.
- **Autenticazione/multi-tenant**: tutte le query devono filtrare per `user_id` (dedotto dal token/sessione).
- **Transazioni**:
  - operazioni che inseriscono movimenti e aggiornano saldi (`AccountMovement`, `WalletMovement`) vanno eseguite in transazione.
- **Validazioni raccomandate**:
  - esistenza e appartenenza (`user_id`) di `holderId`, `bookId`, `accountId`, `walletId` e `betId`.
  - per `trasferimento`, garantire `fromWalletId != toWalletId`.
- **Estendibilità**:
  - si possono aggiungere tabelle per categorizzare movimenti, salvare promemoria, notifiche, ecc., ma quanto sopra è sufficiente per far funzionare tutto il Profit Tracker come è ora nel frontend.
