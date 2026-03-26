import { useState, useCallback, useEffect, useRef } from 'react'

interface DropdownPos {
  top: number
  left: number
  minWidth?: number
  maxHeight?: number
}

export function useDropdownPortal() {
  const triggerRef = useRef<HTMLElement | null>(null)
  const dropdownRef = useRef<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<DropdownPos>({ top: 0, left: 0 })

  const openDropdown = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const top = rect.bottom + 2
      setPos({
        top,
        left: rect.left,
        minWidth: rect.width,
        maxHeight: window.innerHeight - top - 8,
      })
    }
    setOpen(true)
  }, [])

  const closeDropdown = useCallback(() => setOpen(false), [])
  const toggleDropdown = useCallback(() => {
    if (open) closeDropdown()
    else openDropdown()
  }, [open, openDropdown, closeDropdown])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const inTrigger = triggerRef.current?.contains(e.target as Node)
      const inDropdown = dropdownRef.current?.contains(e.target as Node)
      if (!inTrigger && !inDropdown) closeDropdown()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, closeDropdown])

  return { triggerRef, dropdownRef, open, pos, openDropdown, closeDropdown, toggleDropdown }
}
