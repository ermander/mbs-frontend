/**
 * Destinazione condivisa per tutti i flussi post-autenticazione:
 * - login OK
 * - reset password OK (quando il backend ritorna l'utente)
 * - verifica email OK
 * - GuestGuard (utente già loggato che visita /login o /registrazione)
 */
export const POST_AUTH_REDIRECT = '/profit-tracker/dashboard'
