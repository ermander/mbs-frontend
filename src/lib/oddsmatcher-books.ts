/**
 * Lista book ed exchange per filtri Oddsmatcher.
 * exch: true = exchange, false = book.
 */

export interface BookOrExchange {
  id: string
  name: string
  exch: boolean
}

export const ODDSMATCHER_BOOKS: BookOrExchange[] = [
  { id: '14', name: '888sport', exch: false },
  { id: '28', name: 'AdmiralBet', exch: false },
  { id: '2', name: 'Bet365', exch: false },
  { id: '5', name: 'Betfair', exch: false },
  { id: '36', name: 'Betfair', exch: true },
  { id: '6', name: 'BetFlag', exch: true },
  { id: '46', name: 'Betpassion', exch: false },
  { id: '23', name: 'Betpoint', exch: false },
  { id: '19', name: 'Betsson', exch: false },
  { id: '10', name: 'Bwin', exch: false },
  { id: '47', name: 'Codere', exch: false },
  { id: '17', name: 'Daznbet', exch: false },
  { id: '12', name: 'DomusBet', exch: false },
  { id: '22', name: 'Eplay24', exch: false },
  { id: '13', name: 'Eurobet', exch: false },
  { id: '16', name: 'GoldBet', exch: false },
  { id: '18', name: 'LeoVegas', exch: false },
  { id: '1', name: 'Marathonbet', exch: false },
  { id: '45', name: 'Netwin', exch: false },
  { id: '21', name: 'PlanetWin365', exch: false },
  { id: '8', name: 'PokerStars', exch: false },
  { id: '39', name: 'Quigioco', exch: false },
  { id: '24', name: 'Sisal', exch: false },
  { id: '26', name: 'Snai', exch: false },
  { id: '37', name: 'Sportbet', exch: false },
  { id: '41', name: 'Stake', exch: false },
  { id: '30', name: 'Stanleybet', exch: false },
  { id: '31', name: 'StarCasinò', exch: false },
  { id: '34', name: 'Totosi', exch: false },
  { id: '44', name: 'VinciTu', exch: false },
  { id: '33', name: 'William Hill', exch: false },
  { id: '40', name: 'WinBet', exch: false },
  { id: '42', name: 'Zona Gioco', exch: false },
]

export const ODDSMATCHER_BOOKS_ONLY = ODDSMATCHER_BOOKS.filter((b) => !b.exch)
export const ODDSMATCHER_EXCHANGES_ONLY = ODDSMATCHER_BOOKS.filter((b) => b.exch)
