'use client'

import { useCallback, useEffect, useState } from 'react'

interface Loaded<T> {
  loader: () => Promise<T>
  data: T | null
  failed: boolean
}

export interface Remote<T> {
  /** What the current `loader` answered; null while it loads, when it failed, or when it answered null. */
  data: T | null
  /** The current `loader` has answered (or failed): `data` is its answer. */
  loaded: boolean
  failed: boolean
  loading: boolean
  /** «Aggiorna» is reading again; the data on screen stays until it lands. */
  refreshing: boolean
  refresh: () => Promise<boolean>
}

/**
 * One read of the API, as the pages of Best Odds do them (§14.391): it runs when `loader` changes
 * (memoise it on what it reads, null = nothing to read) and a late answer of a loader that is no
 * longer the current one is dropped. `refresh` reads again without emptying the page; if it fails
 * the data on screen stays. State changes only in promise callbacks
 * (react-hooks/set-state-in-effect).
 */
export function useRemote<T>(loader: (() => Promise<T>) | null): Remote<T> {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!loader) return
    let cancelled = false
    loader().then(
      (data) => {
        if (!cancelled) setLoaded({ loader, data, failed: false })
      },
      () => {
        if (!cancelled) setLoaded({ loader, data: null, failed: true })
      },
    )
    return () => {
      cancelled = true
    }
  }, [loader])

  const refresh = useCallback(() => {
    if (!loader) return Promise.resolve(false)
    setRefreshing(true)
    return loader()
      .then(
        (data) => {
          setLoaded({ loader, data, failed: false })
          return true
        },
        () => false,
      )
      .finally(() => setRefreshing(false))
  }, [loader])

  const current = loader && loaded?.loader === loader ? loaded : null
  return {
    data: current?.data ?? null,
    loaded: current != null,
    failed: current?.failed ?? false,
    loading: loader != null && current == null,
    refreshing,
    refresh,
  }
}
