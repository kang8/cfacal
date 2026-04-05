import { icsDir, mergedIcsPath } from './config.ts'

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
  const files: string[] = []
  for await (const entry of Deno.readDir(icsDir)) {
    if (entry.isFile && entry.name.endsWith('.ics')) {
      files.push(entry.name)
    }
  }
  files.sort()

  let finalIcs = ''
  let header = ''
  let footer = ''

  for (const file of files) {
    const icsContent = await Deno.readTextFile(`${icsDir}/${file}`)
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
  }

  finalIcs += '\n' + footer

  await Deno.writeTextFile(mergedIcsPath, finalIcs)
}
