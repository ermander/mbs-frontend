import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().optional(),
  email: z.string().min(1, 'Campo obbligatorio').email('Email non valida'),
  message: z.string().min(1, 'Campo obbligatorio'),
})

export type ContactFormData = z.infer<typeof contactSchema>
