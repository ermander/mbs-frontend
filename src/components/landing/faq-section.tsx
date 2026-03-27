'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Container } from '@/components/ui/container'
import { LandingSection } from '@/components/landing/landing-section'

const faqItems = [
  {
    question: "Cos'è il matched betting?",
    answer:
      'Il matched betting è una tecnica matematica che consiste nel piazzare due scommesse opposte sullo stesso evento (una sul bookmaker e una sul betting exchange) per coprire tutti gli esiti e sfruttare i bonus offerti dai bookmaker, convertendoli in guadagno con rischio minimo.',
  },
  {
    question: 'È legale?',
    answer:
      "Sì. Il matched betting è legale. Si tratta di sfruttare in modo calcolato bonus e promozioni dei bookmaker, non di gioco d'azzardo in senso tradizionale. È importante operare solo con bookmaker regolamentati e nella propria giurisdizione.",
  },
  {
    question: 'Come posso iniziare?',
    answer:
      'Registrati gratuitamente al sito, consulta le guide introduttive e usa il comparatore quote e i calcolatori base. Quando ti senti pronto, puoi passare a Premium per sbloccare tutti i bookmaker e gli strumenti avanzati.',
  },
  {
    question: 'Qual è la differenza tra piano Free e Premium?',
    answer:
      'Il piano Free include il comparatore con 2 bookmaker, le guide base e un calcolatore semplice. Con Premium hai accesso a tutti i bookmaker supportati, calcolatori avanzati (matched, surebet, value), bet tracker, alert e supporto prioritario.',
  },
  {
    question: 'Quanto si può guadagnare?',
    answer:
      "I guadagni dipendono da tempo dedicato, numero di bookmaker usati e bonus disponibili. Molti utenti riportano guadagni nell'ordine di alcune centinaia di euro al mese. I numeri sulla landing sono indicativi e aggregati dalla community.",
  },
  {
    question: 'Offrite assistenza?',
    answer:
      'Sì. Gli utenti Free possono usare il forum e le guide. Gli utenti Premium hanno accesso al supporto prioritario via email o canali dedicati.',
  },
]

export function FaqSection() {
  return (
    <LandingSection id="faq" className="scroll-mt-20" hairlineTop>
      <Container>
        <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
          Domande frequenti
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Risposte alle domande più comuni su matched betting e sul servizio.
        </p>
        <Accordion type="single" collapsible className="mx-auto mt-12 max-w-3xl space-y-3">
          {faqItems.map(({ question, answer }) => (
            <AccordionItem key={question} value={question}>
              <AccordionTrigger>{question}</AccordionTrigger>
              <AccordionContent>{answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </LandingSection>
  )
}
