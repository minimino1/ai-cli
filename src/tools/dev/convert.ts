// Unit conversions
// length, weight, temperature, data, time

interface ConversionRate {
  toBase: (value: number) => number
  fromBase: (value: number) => number
}

// Length conversions (base: meters)
const lengthUnits: Record<string, ConversionRate> = {
  m: { toBase: (v) => v, fromBase: (v) => v },
  km: { toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
  cm: { toBase: (v) => v / 100, fromBase: (v) => v * 100 },
  mm: { toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
  mi: { toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
  ft: { toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
  in: { toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
  yd: { toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
  nmi: { toBase: (v) => v * 1852, fromBase: (v) => v / 1852 },
}

// Weight conversions (base: kilograms)
const weightUnits: Record<string, ConversionRate> = {
  kg: { toBase: (v) => v, fromBase: (v) => v },
  g: { toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
  mg: { toBase: (v) => v / 1_000_000, fromBase: (v) => v * 1_000_000 },
  lb: { toBase: (v) => v * 0.45359237, fromBase: (v) => v / 0.45359237 },
  oz: { toBase: (v) => v * 0.028349523125, fromBase: (v) => v / 0.028349523125 },
  st: { toBase: (v) => v * 6.35029318, fromBase: (v) => v / 6.35029318 },
  ct: { toBase: (v) => v * 0.0002, fromBase: (v) => v / 0.0002 },
}

// Temperature conversions (special handling)
type TempUnit = 'c' | 'f' | 'k'
const tempUnits: Record<TempUnit, { toBase: (v: number) => number; fromBase: (v: number) => number }> = {
  c: {
    toBase: (v) => v + 273.15,
    fromBase: (v) => v - 273.15,
  },
  f: {
    toBase: (v) => ((v - 32) * 5 / 9) + 273.15,
    fromBase: (v) => ((v - 273.15) * 9 / 5) + 32,
  },
  k: {
    toBase: (v) => v,
    fromBase: (v) => v,
  },
}

// Data size conversions (base: bytes)
const dataUnits: Record<string, ConversionRate> = {
  B: { toBase: (v) => v, fromBase: (v) => v },
  KB: { toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
  MB: { toBase: (v) => v * 1024 ** 2, fromBase: (v) => v / 1024 ** 2 },
  GB: { toBase: (v) => v * 1024 ** 3, fromBase: (v) => v / 1024 ** 3 },
  TB: { toBase: (v) => v * 1024 ** 4, fromBase: (v) => v / 1024 ** 4 },
  PB: { toBase: (v) => v * 1024 ** 5, fromBase: (v) => v / 1024 ** 5 },
  KiB: { toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
  MiB: { toBase: (v) => v * 1024 ** 2, fromBase: (v) => v / 1024 ** 2 },
  GiB: { toBase: (v) => v * 1024 ** 3, fromBase: (v) => v / 1024 ** 3 },
  TiB: { toBase: (v) => v * 1024 ** 4, fromBase: (v) => v / 1024 ** 4 },
  kb: { toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
  Mb: { toBase: (v) => v * 1000 ** 2, fromBase: (v) => v / 1000 ** 2 },
  Gb: { toBase: (v) => v * 1000 ** 3, fromBase: (v) => v / 1000 ** 3 },
  Tb: { toBase: (v) => v * 1000 ** 4, fromBase: (v) => v / 1000 ** 4 },
}

// Time conversions (base: milliseconds)
const timeUnits: Record<string, ConversionRate> = {
  ms: { toBase: (v) => v, fromBase: (v) => v },
  s: { toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
  m: { toBase: (v) => v * 60 * 1000, fromBase: (v) => v / (60 * 1000) },
  h: { toBase: (v) => v * 60 * 60 * 1000, fromBase: (v) => v / (60 * 60 * 1000) },
  d: { toBase: (v) => v * 24 * 60 * 60 * 1000, fromBase: (v) => v / (24 * 60 * 60 * 1000) },
  wk: { toBase: (v) => v * 7 * 24 * 60 * 60 * 1000, fromBase: (v) => v / (7 * 24 * 60 * 60 * 1000) },
  mo: { toBase: (v) => v * 30.44 * 24 * 60 * 60 * 1000, fromBase: (v) => v / (30.44 * 24 * 60 * 60 * 1000) },
  y: { toBase: (v) => v * 365.25 * 24 * 60 * 60 * 1000, fromBase: (v) => v / (365.25 * 24 * 60 * 60 * 1000) },
}

/**
 * Konvertiert einen numerischen Wert zwischen zwei unterstützten Einheiten derselben Kategorie.
 *
 * @param value - Der Wert in der Ausgangseinheit
 * @param from - Ausgangseinheit (Symbol), z. B. "m", "kg", "c"; Groß-/Kleinschreibung wird ignoriert
 * @param to - Ziel­einheit (Symbol); Groß-/Kleinschreibung wird ignoriert
 * @returns Der Wert ausgedrückt in der Ziel­einheit
 * @throws {Error} Wenn weder `from` noch `to` zu einer unterstützten Kategorie gehören oder wenn eine der Einheiten in der ermittelten Kategorie nicht unterstützt wird
 */
export function convert(value: number, from: string, to: string): number {
  const normalizedFrom = from.toLowerCase()
  const normalizedTo = to.toLowerCase()

  // Determine unit category
  const categories: Record<string, Record<string, ConversionRate>> = {
    length: lengthUnits,
    weight: weightUnits,
    temperature: tempUnits as any,
    data: dataUnits,
    time: timeUnits,
  }

  let category: keyof typeof categories | null = null
  for (const [catName, units] of Object.entries(categories)) {
    if (normalizedFrom in units || normalizedTo in units) {
      category = catName
      break
    }
  }

  if (!category) {
    throw new Error(`Unknown unit: ${from} or ${to}. Supported categories: length, weight, temperature, data, time`)
  }

  const units = categories[category]

  if (!(normalizedFrom in units)) {
    throw new Error(`Unsupported ${category} unit: ${from}`)
  }
  if (!(normalizedTo in units)) {
    throw new Error(`Unsupported ${category} unit: ${to}`)
  }

  const fromRate = units[normalizedFrom]
  const toRate = units[normalizedTo]

  // Convert to base unit, then to target
  const baseValue = fromRate.toBase(value)
  return toRate.fromBase(baseValue)
}

/**
 * Liefert die unterstützten Einheitensymbole für eine bestimmte Kategorie oder für alle Kategorien.
 *
 * Wenn `category` angegeben ist (Groß-/Kleinschreibung wird ignoriert), werden die Einheitenschlüssel
 * dieser Kategorie zurückgegeben; ist die Kategorie unbekannt, wird ein leeres Array geliefert.
 * Wird `category` weggelassen, werden die Einheitenschlüssel aller Kategorien flach zusammengeführt zurückgegeben.
 *
 * @param category - Optionaler Kategoriename (z. B. "length", "weight", "temperature", "data", "time"); Groß-/Kleinschreibung wird ignoriert
 * @returns Eine Liste von Einheitenschlüsseln: die Einheiten der angegebenen Kategorie oder, falls keine Kategorie angegeben wurde, alle Einheiten über alle Kategorien hinweg; ein leeres Array, wenn die angegebene Kategorie nicht existiert
 */
export function getUnits(category?: string): string[] {
  const allUnits = {
    length: Object.keys(lengthUnits),
    weight: Object.keys(weightUnits),
    temperature: Object.keys(tempUnits),
    data: Object.keys(dataUnits),
    time: Object.keys(timeUnits),
  }

  if (category) {
    const cat = category.toLowerCase()
    return allUnits[cat as keyof typeof allUnits] || []
  }

  return Object.keys(allUnits).flatMap(cat => allUnits[cat as keyof typeof allUnits])
}

/**
 * Gibt eine formatierte Darstellung eines numerischen Ergebnisses mit passender Genauigkeit zurück.
 *
 * Bei sehr großen oder sehr kleinen Beträgen wird Exponentialnotation verwendet, sonst eine gerundete Dezimaldarstellung.
 *
 * @param value - Der zu formatierende numerische Wert
 * @param precision - Anzahl der Dezimalstellen für die Rundung bzw. Stellen für die Exponentialnotation (Standard: 6)
 * @returns Die formatierte Zahl als String
 */
export function formatConverted(value: number, precision: number = 6): string {
  // Use scientific notation for very large/small numbers
  if (Math.abs(value) >= 1e9 || (Math.abs(value) < 1e-6 && value !== 0)) {
    return value.toExponential(precision)
  }
  // Round to avoid floating point artifacts
  const rounded = Math.round(value * 10 ** precision) / 10 ** precision
  return String(rounded)
}
