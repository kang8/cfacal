import { format as dateFormat } from 'https://deno.land/std@0.184.0/datetime/mod.ts'

export const icsDir = './assets/ics'

function extractIcsContent(content: string): string {
  const contents = content.split('\r\n')

  return contents
    .slice(
      contents.indexOf('BEGIN:VEVENT'),
      contents.lastIndexOf('END:VCALENDAR'),
    )
    .join('\n')
}

export async function mergeIcsFiles() {
  let finalIcs = ''
  let header = ''
  let footer = ''

  const nextMonth = new Date(Date.now())
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  for (
    const event = new Date(Date.parse('2023-05'));
    // event <= new Date(Date.parse('2023-05'));
    event <= nextMonth;
    event.setMonth(event.getMonth() + 1)
  ) {
    try {
      const icsContent = await Deno.readTextFile(
        `${icsDir}/${dateFormat(event, 'yyyy-MM')}.ics`,
      )
      const icsContents = icsContent.split('\r\n')

      if (header === '') {
        header = icsContents.slice(
          icsContents.indexOf('BEGIN:VCALENDAR'),
          icsContents.indexOf('BEGIN:VEVENT'),
        ).join('\n')

        finalIcs = header
      }

      if (footer === '') {
        footer = icsContents.slice(
          icsContents.indexOf('END:VCALENDAR'),
        ).join('\n')
      }

      const onlyContext = extractIcsContent(icsContent)
      finalIcs += '\n' + onlyContext
    } catch (e: unknown) {
      if (!(e instanceof Deno.errors.NotFound)) {
        throw e
      }
    }
  }

  finalIcs += '\n' + footer

  await Deno.writeTextFile('./assets/event.ics', finalIcs)
}
