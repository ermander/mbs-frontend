import { describe, expect, it } from 'vitest'

import { registrationSchema } from './auth'

/** Il primo messaggio di errore di un campo, come lo mostra il form (§14.253). */
function firstError(input: Record<string, unknown>, field: string): string | undefined {
  const result = registrationSchema.safeParse(input)
  if (result.success) return undefined
  return result.error.issues.find((i) => i.path[0] === field)?.message
}

const VALID = { email: 'nome@esempio.it', password: 'CorrectHorse1!', adult: true }

describe('registrationSchema (registrazione dal design, §14.253)', () => {
  it('accetta email, password con la regola del backend e la casella dei 18 anni', () => {
    expect(registrationSchema.safeParse(VALID).success).toBe(true)
  })

  it('non chiede né nome né conferma della password', () => {
    const parsed = registrationSchema.parse({ ...VALID, name: 'ignorato' })
    expect(parsed).toEqual(VALID)
  })

  it('usa i messaggi del design per email e casella', () => {
    expect(firstError({ ...VALID, email: '' }, 'email')).toBe('Inserisci la tua email')
    expect(firstError({ ...VALID, email: 'nome.esempio.it' }, 'email')).toBe(
      "Controlla l'indirizzo: manca la @ o il dominio",
    )
    expect(firstError({ ...VALID, adult: false }, 'adult')).toBe(
      'Per registrarti devi avere almeno 18 anni e accettare i termini',
    )
  })

  it('tiene la regola del backend: 12 caratteri, minuscola, maiuscola, numero, speciale', () => {
    expect(firstError({ ...VALID, password: '' }, 'password')).toBe('Scegli una password')
    expect(firstError({ ...VALID, password: 'abc12345' }, 'password')).toBe(
      'Usa almeno 12 caratteri',
    )
    expect(firstError({ ...VALID, password: 'CORRECTHORSE1!' }, 'password')).toBe(
      'Aggiungi almeno una lettera minuscola',
    )
    expect(firstError({ ...VALID, password: 'correcthorse1!' }, 'password')).toBe(
      'Aggiungi almeno una lettera maiuscola',
    )
    expect(firstError({ ...VALID, password: 'CorrectHorse!!' }, 'password')).toBe(
      'Aggiungi almeno un numero',
    )
    expect(firstError({ ...VALID, password: 'CorrectHorse12' }, 'password')).toBe(
      'Aggiungi almeno un carattere speciale, per esempio ! o ?',
    )
  })
})
