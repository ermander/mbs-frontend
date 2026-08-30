'use client'

import * as React from 'react'

import { authSidebarNav } from '@/lib/nav-config'
import { useAuthStore } from '@/stores/auth-store'
import { SidebarNavItem } from './sidebar-nav-item'
import { SidebarNavGroup } from './sidebar-nav-group'

interface SidebarNavProps {
  collapsed: boolean
  onNavigate?: () => void
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const userRole = useAuthStore((s) => s.user?.role)

  const items = React.useMemo(
    () =>
      authSidebarNav.filter((item) => {
        if (item.requiresRole && item.requiresRole !== userRole) return false
        return true
      }),
    [userRole],
  )

  return (
    <nav aria-label="Navigazione principale" className="flex flex-col gap-0.5 px-2">
      {items.map((item, i) => {
        const showSectionLabel = !!item.section && !collapsed
        const showDividerOnly = !!item.section && collapsed && i !== 0
        const key = item.href ?? `group-${item.label}`
        return (
          <React.Fragment key={key}>
            {showSectionLabel && (
              <div className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">
                {item.section}
              </div>
            )}
            {showDividerOnly && <hr className="mx-2 my-2 border-border/60" />}
            {item.children ? (
              <SidebarNavGroup
                label={item.label}
                icon={item.icon}
                collapsed={collapsed}
                items={item.children}
                onNavigate={onNavigate}
              />
            ) : item.href ? (
              <SidebarNavItem
                href={item.href}
                label={item.label}
                icon={item.icon}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ) : null}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
