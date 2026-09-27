import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { TabActiveContext } from '../../lib/tab-activity'

export interface KeepAliveRoute {
  path: string
  element: React.ReactNode
}

/**
 * Route outlet that mounts each page on first visit and then keeps it mounted,
 * hiding inactive pages instead of unmounting them. Switching tabs therefore
 * never discards in-progress work: component state, running scans and their
 * progress subscriptions all survive navigation.
 */
export function KeepAliveRoutes({ routes }: { routes: KeepAliveRoute[] }): React.JSX.Element {
  const { pathname } = useLocation()
  const [visited, setVisited] = useState<string[]>([pathname])

  if (!visited.includes(pathname) && routes.some((r) => r.path === pathname)) {
    // Setting state during render (instead of in an effect) mounts the page in
    // this same render, so there is no blank frame on first visit.
    setVisited([...visited, pathname])
  }

  return (
    <>
      {routes
        .filter((r) => visited.includes(r.path))
        .map((r) => {
          const isActive = r.path === pathname
          return (
            <div
              key={r.path}
              className={isActive ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}
              aria-hidden={!isActive}
            >
              <TabActiveContext.Provider value={isActive}>{r.element}</TabActiveContext.Provider>
            </div>
          )
        })}
    </>
  )
}
