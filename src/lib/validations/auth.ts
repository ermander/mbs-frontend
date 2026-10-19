import { z } from 'zod'

/** I caratteri speciali accettati dal passwordSchema del backend (user.validation.ts). */
const PASSWORD_SPECIAL = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/

const passwordRules = z
  .string()
  .min(1, 'Campo obbligatorio')
  .min(12, 'La password deve avere almeno 12 caratteri')
  .regex(/[a-z]/, 'La password deve contenere almeno una lettera minuscola')
  .regex(/[A-Z]/, 'La password deve contenere almeno una lettera maiuscola')
  .regex(/\d/, 'La password deve contenere almeno un numero')
  .regex(PASSWORD_SPECIAL, 'La password deve contenere almeno un carattere speciale')

/** Il suggerimento sotto il campo password della registrazione: la regola del backend. */
export const REGISTRATION_PASSWORD_HINT =
  'Almeno 12 caratteri, con una minuscola, una maiuscola, un numero e un carattere speciale'

/**
 * Registrazione dal design (§14.253): solo email, password e la dichiarazione dei 18 anni con i
 * termini. Il design chiedeva 8 caratteri con una lettera e un numero; resta la regola del
 * backend (12 caratteri, quattro classi), con i messaggi nella voce del design. Il nome non si
 * chiede più: il backend lo accetta vuoto e si completa dal profilo.
 */
export const registrationSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Inserisci la tua email')
    .email("Controlla l'indirizzo: manca la @ o il dominio"),
  password: z
    .string()
    .min(1, 'Scegli una password')
    .min(12, 'Usa almeno 12 caratteri')
    .regex(/[a-z]/, 'Aggiungi almeno una lettera minuscola')
    .regex(/[A-Z]/, 'Aggiungi almeno una lettera maiuscola')
    .regex(/\d/, 'Aggiungi almeno un numero')
    .regex(PASSWORD_SPECIAL, 'Aggiungi almeno un carattere speciale, per esempio ! o ?'),
  adult: z
    .boolean()
    .refine((v) => v, 'Per registrarti devi avere almeno 18 anni e accettare i termini'),
})

export type RegistrationFormData = z.infer<typeof registrationSchema>

/** Messaggi del design della pagina di accesso (§14.252). Nessun minimo sulla password: la verifica è del backend. */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Inserisci l'email con cui ti sei registrato")
    .email("Controlla l'indirizzo: manca la @ o il dominio"),
  password: z.string().min(1, 'Inserisci la password'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Campo obbligatorio').email('Email non valida'),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: passwordRules,
    confirmPassword: z.string().min(1, 'Campo obbligatorio'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
  })

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
