'use client'

import * as React from 'react'

import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Sidebar } from './sidebar'
import { useSidebar } from './sidebar-provider'

export function SidebarMobileSheet() {
  const { mobileOpen, setMobileOpen } = useSidebar()

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="w-64 p-0 sm:max-w-none md:hidden" hideClose>
        <SheetTitle className="sr-only">Menu di navigazione</SheetTitle>
        <SheetDescription className="sr-only">
          Voci di navigazione dell&apos;area autenticata
        </SheetDescription>
        <Sidebar variant="mobile" />
      </SheetContent>
    </Sheet>
  )
}
