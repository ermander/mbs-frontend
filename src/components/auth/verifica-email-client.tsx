'use client'

import * as React from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { authClient } from '@/services/api/auth-client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Status = 'idle' | 'loading' | 'success' | 'invalid' | 'error'

export function VerificaEmailClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = React.useState<Status>(token ? 'loading' : 'invalid')
  const [userEmail, setUserEmail] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }
    let cancelled = false
    setStatus('loading')
    authClient
      .verifyEmail(token)
      .then((res) => {
        if (!cancelled) {
          setUserEmail(res.user.email)
          setStatus('success')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('invalid')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (!token) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Link non valido</h1>
            <p className="text-muted-foreground">
              Il link di verifica non è valido o è stato utilizzato in modo errato. Richiedi una
              nuova verifica effettuando di nuovo la registrazione o contatta il supporto.
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/login">Torna al login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status === 'loading') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6 text-center">
            <p className="text-muted-foreground">Verifica in corso...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status === 'success' && userEmail) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Email verificata</h1>
            <p className="font-medium text-primary">
              Email verificata con successo per {userEmail}.
            </p>
            <p className="text-sm text-muted-foreground">
              Il tuo account è attivo. Verrai reindirizzato alla homepage autenticata.
            </p>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/">Vai alla home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Link non valido o scaduto
          </h1>
          <p className="text-muted-foreground">
            Il link di verifica non è più valido. Registrati nuovamente o effettua il login per
            richiedere una nuova email di verifica.
          </p>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/login">Torna al login</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
