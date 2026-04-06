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

function extractVEvents(content: string): string[] {
  const lines = content.split('\r\n')
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

function isUpcomingEvent(event: string): boolean {
  const match = event.match(/DTSTART:(\d{8})/)
  if (!match) return false
  const today = new Date()
  const todayStr = today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, '0') +
    today.getDate().toString().padStart(2, '0')
  return match[1] >= todayStr
}

function isShuzhouEvent(event: string): boolean {
  const match = event.match(/SUMMARY:(.+)/)
  return match !== null && match[1].startsWith('江南')
}

export async function mergeIcsFiles() {
  const files: string[] = []
  for await (const entry of Deno.readDir(icsDir)) {
    if (entry.isFile && entry.name.endsWith('.ics')) {
      files.push(entry.name)
    }
  }
  files.sort()

  let header = ''
  let footer = ''
  const allEvents: string[] = []
  const beijingEvents: string[] = []
  const shuzhouEvents: string[] = []

  for (const file of files) {
    const icsContent = await Deno.readTextFile(`${icsDir}/${file}`)
    const icsContents = icsContent.split('\r\n')

    if (header === '') {
      header = icsContents.slice(
        icsContents.indexOf('BEGIN:VCALENDAR'),
        icsContents.indexOf('BEGIN:VEVENT'),
      ).join('\n')
    }

    if (footer === '') {
      footer = icsContents.slice(
        icsContents.indexOf('END:VCALENDAR'),
      ).join('\n')
    }

    const events = extractVEvents(icsContent)
    for (const event of events) {
      allEvents.push(event)
      if (isShuzhouEvent(event)) {
        shuzhouEvents.push(event)
      } else {
        beijingEvents.push(event)
      }
    }
  }

  await Deno.mkdir(archiveDir, { recursive: true })

  const upcomingAll = allEvents.filter(isUpcomingEvent)
  const upcomingBeijing = beijingEvents.filter(isUpcomingEvent)
  const upcomingShuzhou = shuzhouEvents.filter(isUpcomingEvent)

  const outputs: [string[], string][] = [
    [upcomingAll, mergedIcsPath],
    [upcomingBeijing, mergedIcsBeijingPath],
    [upcomingShuzhou, mergedIcsShuzhouPath],
    [allEvents, archivedIcsPath],
    [beijingEvents, archivedIcsBeijingPath],
    [shuzhouEvents, archivedIcsShuzhouPath],
  ]

  for (const [events, path] of outputs) {
    const ics = header + '\n' + events.join('\n') + '\n' + footer
    await Deno.writeTextFile(path, ics)
  }
}
