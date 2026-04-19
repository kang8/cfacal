import { format as dateFormat } from 'jsr:@std/datetime@0.225'
import {
  archivedIcsBeijingPath,
  archivedIcsPath,
  archivedIcsShuzhouPath,
  archiveDir,
  icsDir,
  mergedIcsBeijingPath,
  mergedIcsPath,
  mergedIcsShuzhouPath,
} from './config.ts'

export function extractVEvents(content: string): string[] {
  const lines = content.split(/\r?\n/)
  const events: string[] = []
  let current: string[] = []
  let inEvent = false

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      current = [line]
    } else if (line === 'END:VEVENT') {
      current.push(line)
      events.push(current.join('\n'))
      inEvent = false
    } else if (inEvent) {
      current.push(line)
    }
  }

  return events
}

export function extractHeaderFooter(
  content: string,
): { header: string; footer: string } {
  const lines = content.split(/\r?\n/)
  const header = lines.slice(
    lines.indexOf('BEGIN:VCALENDAR'),
    lines.indexOf('BEGIN:VEVENT'),
  ).join('\n')
  const footer = lines.slice(lines.indexOf('END:VCALENDAR')).join('\n')
  return { header, footer }
}

export function isShuzhouEvent(event: string): boolean {
  const match = event.match(/SUMMARY:(.+)/)
  return match !== null && match[1].startsWith('江南')
}

export function buildIcs(
  header: string,
  events: string[],
  footer: string,
): string {
  return header + '\n' + events.join('\n') + '\n' + footer
}

export function uidOf(event: string): string {
  const match = event.match(/UID:(.+)/)
  return match ? match[1].trim() : event
}

export async function readEventsFromFile(path: string): Promise<string[]> {
  try {
    const content = await Deno.readTextFile(path)
    return extractVEvents(content)
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return []
    throw error
  }
}

async function unionByUid(
  existingPath: string,
  fresh: string[],
): Promise<string[]> {
  const byUid = new Map<string, string>()
  for (const event of await readEventsFromFile(existingPath)) {
    byUid.set(uidOf(event), event)
  }
  for (const event of fresh) {
    byUid.set(uidOf(event), event)
  }
  return [...byUid.values()]
}

export async function mergeIcsFiles() {
  const currentYearMonth = dateFormat(new Date(), 'yyyy-MM')

  const allFiles: string[] = []
  for await (const entry of Deno.readDir(icsDir)) {
    if (entry.isFile && entry.name.endsWith('.ics')) {
      allFiles.push(entry.name)
    }
  }
  allFiles.sort()

  let header = ''
  let footer = ''

  // Events from current+future month files only — these are what daily fetch
  // can change. Past months are not re-read so prune deletions stay deleted.
  const recentAll: string[] = []
  const recentBeijing: string[] = []
  const recentShuzhou: string[] = []

  // All events for archive accumulation.
  const allArchiveEvents: string[] = []
  const allArchiveBeijing: string[] = []
  const allArchiveShuzhou: string[] = []

  for (const file of allFiles) {
    const icsContent = await Deno.readTextFile(`${icsDir}/${file}`)

    if (header === '' || footer === '') {
      const parts = extractHeaderFooter(icsContent)
      if (header === '') header = parts.header
      if (footer === '') footer = parts.footer
    }

    const isRecent = file.slice(0, 7) >= currentYearMonth
    const events = extractVEvents(icsContent)

    for (const event of events) {
      allArchiveEvents.push(event)
      if (isShuzhouEvent(event)) {
        allArchiveShuzhou.push(event)
        if (isRecent) recentShuzhou.push(event)
      } else {
        allArchiveBeijing.push(event)
        if (isRecent) recentBeijing.push(event)
      }
      if (isRecent) recentAll.push(event)
    }
  }

  await Deno.mkdir(archiveDir, { recursive: true })

  const mergedAll = await unionByUid(mergedIcsPath, recentAll)
  const mergedBeijing = await unionByUid(mergedIcsBeijingPath, recentBeijing)
  const mergedShuzhou = await unionByUid(mergedIcsShuzhouPath, recentShuzhou)
  const archiveAll = await unionByUid(archivedIcsPath, allArchiveEvents)
  const archiveBeijing = await unionByUid(
    archivedIcsBeijingPath,
    allArchiveBeijing,
  )
  const archiveShuzhou = await unionByUid(
    archivedIcsShuzhouPath,
    allArchiveShuzhou,
  )

  const outputs: [string[], string][] = [
    [mergedAll, mergedIcsPath],
    [mergedBeijing, mergedIcsBeijingPath],
    [mergedShuzhou, mergedIcsShuzhouPath],
    [archiveAll, archivedIcsPath],
    [archiveBeijing, archivedIcsBeijingPath],
    [archiveShuzhou, archivedIcsShuzhouPath],
  ]

  for (const [events, path] of outputs) {
    await Deno.writeTextFile(path, buildIcs(header, events, footer))
  }
}
