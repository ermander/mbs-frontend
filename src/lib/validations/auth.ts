import { z } from 'zod'

export const registrationSchema = z
  .object({
    email: z.string().min(1, 'Campo obbligatorio').email('Email non valida'),
    password: z
      .string()
      .min(1, 'Campo obbligatorio')
      .min(8, 'La password deve essere di almeno 8 caratteri'),
    confirmPassword: z.string().min(1, 'Campo obbligatorio'),
    terms: z.boolean().refine((v) => v === true, 'Devi accettare i termini'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
  })

export type RegistrationFormData = z.infer<typeof registrationSchema>

export const loginSchema = z.object({
  email: z.string().min(1, 'Campo obbligatorio').email('Email non valida'),
  password: z.string().min(1, 'Campo obbligatorio'),
})

export type LoginFormData = z.infer<typeof loginSchema>
