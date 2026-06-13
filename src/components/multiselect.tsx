import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'

export interface MultiSelectProps<T> {
  /** Items to select from */
  items: T[]
  /** Function to get display label from item */
  getLabel: (item: T) => string
  /** Function to get unique key from item */
  getKey?: (item: T) => string
  /** Initially selected items */
  defaultSelected?: T[]
  /** Callback when selection changes */
  onChange?: (selected: T[]) => void
  /** Callback when confirmed */
  onConfirm?: (selected: T[]) => void
  /** Callback when cancelled */
  onCancel?: () => void
  /** Placeholder text */
  placeholder?: string
  /** Whether select all/none is available */
  showSelectAll?: boolean
  /** Search/filter placeholder */
  searchPlaceholder?: string
  /** Height of visible items */
  visibleItems?: number
}

/**
 * Rendert eine interaktive Mehrfachauswahl-UI mit Filterung, Tastaturnavigation und Bestätigungsbildschirm.
 *
 * Unterstützt Suche (eingabetextbasiert), Navigation mit Pfeiltasten, Umschalten der Auswahl mit Leertaste,
 * optionales Auswählen aller/Leeren der sichtbaren Einträge (`a` / `c`), sowie Bestätigen/Abbrechen (Enter / Esc).
 *
 * @param items - Die Liste aller Einträge, die zur Auswahl angezeigt werden sollen.
 * @param getLabel - Liefert das Anzeigetext-Label für einen Eintrag.
 * @param getKey - Liefert den eindeutigen Schlüssel für einen Eintrag; Standard ist `String(item)`.
 * @param defaultSelected - Anfangs ausgewählte Einträge; Elemente dieser Liste werden via `getKey` in die Auswahl übernommen.
 * @param onChange - Wird aufgerufen, wenn sich die Auswahl ändert; erhält die aktuell ausgewählten Items.
 * @param onConfirm - Wird aufgerufen, wenn der Benutzer die Auswahl bestätigt (Enter) und erhält die ausgewählten Items.
 * @param onCancel - Wird aufgerufen, wenn der Benutzer den Vorgang abbricht (Esc).
 * @param placeholder - Titel/Überschrift der Auswahlansicht.
 * @param showSelectAll - Wenn `true`, werden die Tastaturkürzel `a` (alles auswählen) und `c` (alles leeren) aktiviert.
 * @param searchPlaceholder - Platzhaltertext für die Suchzeile.
 * @param visibleItems - Anzahl der gleichzeitig sichtbaren Listeneinträge im Fenster (Scroll-Fensterhöhe).
 * @returns Das gerenderte React-Element der Mehrfachauswahl-Komponente.
 */
export function MultiSelect<T>({
  items,
  getLabel,
  getKey = (item) => String(item),
  defaultSelected = [],
  onChange,
  onConfirm,
  onCancel,
  placeholder = 'Select items...',
  showSelectAll = true,
  searchPlaceholder = 'Search...',
  visibleItems = 10,
}: MultiSelectProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected.map(getKey)))
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [filter, setFilter] = useState('')
  const [isConfirm, setIsConfirm] = useState(false)

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!filter) return items
    const lowerFilter = filter.toLowerCase()
    return items.filter(item => getLabel(item).toLowerCase().includes(lowerFilter))
  }, [items, filter, getLabel])

  // Ensure focused index is valid
  useEffect(() => {
    if (focusedIndex >= filteredItems.length) {
      setFocusedIndex(Math.max(0, filteredItems.length - 1))
    }
  }, [filteredItems.length, focusedIndex])

  // Notify onChange
  useEffect(() => {
    const selectedItems = items.filter(item => selected.has(getKey(item)))
    onChange?.(selectedItems)
  }, [selected, items, getKey, onChange])

  // Handle keyboard input
  useInput((input, key) => {
    if (isConfirm) {
      if (key.return) {
        onConfirm?.(items.filter(item => selected.has(getKey(item))))
      } else if (key.escape) {
        onCancel?.()
      }
      return
    }

    if (key.upArrow) {
      setFocusedIndex(i => Math.max(0, i - 1))
    } else if (key.downArrow) {
      setFocusedIndex(i => Math.min(filteredItems.length - 1, i + 1))
    } else if (key.return) {
      // Confirm selection
      setIsConfirm(true)
    } else if (key.escape) {
      onCancel?.()
    } else if (input === ' ') {
      // Toggle selection
      if (filteredItems.length > 0 && focusedIndex < filteredItems.length) {
        const item = filteredItems[focusedIndex]
        const key = getKey(item)
        const newSelected = new Set(selected)
        if (newSelected.has(key)) {
          newSelected.delete(key)
        } else {
          newSelected.add(key)
        }
        setSelected(newSelected)
      }
    } else if (input === 'a' && showSelectAll) {
      // Select all visible
      const allKeys = new Set(filteredItems.map(getKey))
      setSelected(allKeys)
    } else if (input === 'c' && showSelectAll) {
      // Clear all
      setSelected(new Set())
    } else if (input.length === 1 && !key.ctrl && !key.meta) {
      // Add to filter
      setFilter(f => f + input)
    } else if (key.backspace) {
      setFilter(f => f.slice(0, -1))
    } else if (key.escape) {
      setFilter('')
    }
  })

  // Render item
  const renderItem = (item: T, index: number) => {
    const key = getKey(item)
    const isSelected = selected.has(key)
    const isFocused = index === focusedIndex

    return (
      <Box key={key}>
        <Box width={3}>
          <Text color={isSelected ? 'green' : 'gray'}>
            {isSelected ? '✓' : ' '}
          </Text>
        </Box>
        <Text color={isFocused ? 'blue' : 'white'} bold={isFocused}>
          {getLabel(item)}
        </Text>
      </Box>
    )
  }

  // Calculate visible range
  const startIdx = Math.max(0, focusedIndex - Math.floor(visibleItems / 2))
  const endIdx = Math.min(filteredItems.length, startIdx + visibleItems)
  const visibleItemsList = filteredItems.slice(startIdx, endIdx)

  if (isConfirm) {
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">
          Confirm selection? (Enter to confirm, Esc to cancel)
        </Text>
        <Box marginTop={1}>
          <Text color="green">
            Selected: {selected.size} of {filteredItems.length}
          </Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="blue">
          {placeholder}
        </Text>
        <Text color="gray">
          {selected.size} selected
        </Text>
      </Box>

      {/* Search */}
      <Box marginBottom={1}>
        <Text color="gray">{searchPlaceholder} </Text>
        <Text color="cyan">{filter || '(empty)'}</Text>
        {filter && (
          <Text color="gray"> (Backspace to clear)</Text>
        )}
      </Box>

      {/* Select all/none hint */}
      {showSelectAll && (
        <Box marginBottom={1}>
          <Text color="gray" dimColor>
            Press 'a' to select all visible, 'c' to clear all
          </Text>
        </Box>
      )}

      {/* Items list */}
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
        {visibleItemsList.length === 0 ? (
          <Text color="gray" italic>
            No items match filter
          </Text>
        ) : (
          visibleItemsList.map((item, idx) => renderItem(item, startIdx + idx))
        )}
      </Box>

      {/* Instructions */}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          ↑↓ Navigate | Space to toggle | Enter to confirm | Esc to cancel
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Verwalte eine Menge ausgewählter Elemente und stelle Hilfsfunktionen zum Ändern und Abfragen der Auswahl bereit.
 *
 * Verwaltet intern eine `Set<string>` von Schlüsseln (abgeleitet durch `getKey`) und bietet Utilities zum
 * Umschalten, (de-)selektieren, alle auswählen, löschen sowie zur Abfrage der aktuell ausgewählten Items.
 *
 * @param items - Die komplette Liste der verfügbaren Elemente; wird zur Berechnung von `selectedItems` verwendet.
 * @param getKey - Funktion, die aus einem Element dessen eindeutigen Schlüssel (`string`) erzeugt.
 * @returns Ein Objekt mit:
 *  - `selected`: die Menge aktueller Schlüssel (`Set<string>`)
 *  - `selectedItems`: die Elemente aus `items`, deren Schlüssel in `selected` enthalten sind
 *  - `toggle(item)`: schaltet den Selektionsstatus von `item`
 *  - `select(item)`: fügt `item` zur Auswahl hinzu
 *  - `deselect(item)`: entfernt `item` aus der Auswahl
 *  - `selectAll(itemsToSelect)`: ersetzt die Auswahl durch die Schlüssel von `itemsToSelect`
 *  - `clear()`: leert die Auswahl
 *  - `isSelected(item)`: prüft, ob `item` aktuell ausgewählt ist
 *  - `setSelected`: direkter Setter für die `selected`-Menge
 */
export function useMultiSelect<T>(items: T[], getKey: (item: T) => string) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = useCallback((item: T) => {
    const key = getKey(item)
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [getKey])

  const select = useCallback((item: T) => {
    const key = getKey(item)
    setSelected(prev => new Set([...prev, key]))
  }, [getKey])

  const deselect = useCallback((item: T) => {
    const key = getKey(item)
    setSelected(prev => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }, [getKey])

  const selectAll = useCallback((itemsToSelect: T[]) => {
    const keys = new Set(itemsToSelect.map(getKey))
    setSelected(keys)
  }, [getKey])

  const clear = useCallback(() => {
    setSelected(new Set())
  }, [])

  const isSelected = useCallback((item: T) => {
    return selected.has(getKey(item))
  }, [selected, getKey])

  const selectedItems = useMemo(() => {
    return items.filter(item => selected.has(getKey(item)))
  }, [items, selected, getKey])

  return {
    selected,
    selectedItems,
    toggle,
    select,
    deselect,
    selectAll,
    clear,
    isSelected,
    setSelected,
  }
}

/**
 * Simple checkbox list component
 */
export interface CheckboxListProps<T> {
  items: T[]
  getLabel: (item: T) => string
  getKey?: (item: T) => string
  selected: Set<string>
  onToggle: (key: string) => void
  focusedIndex: number
  onFocusChange: (index: number) => void
}

/**
 * Rendert eine Spalte von Einträgen mit Checkbox-Indikator, Fokus-Hervorhebung und Label.
 *
 * @param items - Die anzuzeigenden Elemente.
 * @param getLabel - Liefert die darzustellende Bezeichnung für ein Element.
 * @param getKey - Liefert den eindeutigen Schlüssel für ein Element; standardmäßig `String(item)`.
 * @param selected - Menge von Schlüsseln, die als ausgewählt gelten.
 * @param focusedIndex - Index des aktuell fokussierten Eintrags (wird hervorgehoben).
 * @returns Ein JSX-Element mit den gerenderten Checkbox-Zeilen.
 */
export function CheckboxList<T>({
  items,
  getLabel,
  getKey = (item) => String(item),
  selected,
  onToggle,
  focusedIndex,
  onFocusChange,
}: CheckboxListProps<T>) {
  return (
    <Box flexDirection="column">
      {items.map((item, idx) => {
        const key = getKey(item)
        const isSelected = selected.has(key)
        const isFocused = idx === focusedIndex

        return (
          <Box
            key={key}
            backgroundColor={isFocused ? 'blue' : undefined}
            paddingX={1}
          >
            <Box width={3}>
              <Text color={isSelected ? 'green' : 'gray'}>
                {isSelected ? '✓' : ' '}
              </Text>
            </Box>
            <Text color={isFocused ? 'white' : 'gray'}>
              {getLabel(item)}
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}
