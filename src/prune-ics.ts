import { format as dateFormat } from 'jsr:@std/datetime@0.225'
import {
  mergedIcsBeijingPath,
  mergedIcsPath,
  mergedIcsShuzhouPath,
} from './config.ts'
import { buildIcs, extractHeaderFooter, extractVEvents } from './merge-ics.ts'

function isOnOrAfter(event: string, cutoffYyyymmdd: string): boolean {
  const match = event.match(/DTSTART:(\d{8})/)
  if (!match) return true
  return match[1] >= cutoffYyyymmdd
}

async function pruneFile(path: string, cutoffYyyymmdd: string) {
  let content: string
  try {
    content = await Deno.readTextFile(path)
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return
    throw error
  }

  const { header, footer } = extractHeaderFooter(content)
  const events = extractVEvents(content)
  const kept = events.filter((e) => isOnOrAfter(e, cutoffYyyymmdd))

  if (kept.length === events.length) return

  await Deno.writeTextFile(path, buildIcs(header, kept, footer))
  console.log(
    `Pruned ${events.length - kept.length} event(s) from ${path}.`,
  )
}

export async function pruneOldMonths() {
  const today = new Date()
  const cutoff = dateFormat(
    new Date(today.getFullYear(), today.getMonth(), 1),
    'yyyyMMdd',
  )

  await pruneFile(mergedIcsPath, cutoff)
  await pruneFile(mergedIcsBeijingPath, cutoff)
  await pruneFile(mergedIcsShuzhouPath, cutoff)
}
