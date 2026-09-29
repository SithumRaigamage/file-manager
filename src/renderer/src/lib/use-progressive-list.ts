import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Renders a long list in pages: starts with `pageSize` items and appends the next
 * page whenever the returned sentinel element scrolls into view. Keeps the DOM
 * proportional to what the user has actually scrolled through, for any layout
 * (grid, table, tree) without per-layout virtualization.
 */
export function useProgressiveList<T>(
  items: T[],
  pageSize = 200
): {
  visible: T[]
  hasMore: boolean
  sentinelRef: (node: HTMLElement | null) => void
} {
  const [count, setCount] = useState(pageSize)
  const [pagedItems, setPagedItems] = useState(items)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // A new result set starts again from the first page. Adjusting state during
  // render (not in an effect) avoids rendering the stale page count once.
  if (pagedItems !== items) {
    setPagedItems(items)
    setCount(pageSize)
  }

  const hasMore = count < items.length

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect()
      observerRef.current = null
      if (!node || !hasMore) return
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) setCount((c) => c + pageSize)
        },
        { rootMargin: '400px' }
      )
      observerRef.current.observe(node)
    },
    [hasMore, pageSize]
  )

  useEffect(() => () => observerRef.current?.disconnect(), [])

  return { visible: hasMore ? items.slice(0, count) : items, hasMore, sentinelRef }
}
