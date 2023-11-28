import { csvDir, csvToIcs } from './csv-to-ics.ts'
import {
  fetchJsonAndConvertToCsv,
  getFirstDayOfNextMonth,
} from './json-to-csv.ts'
import { mergeIcsFiles } from './merge-ics.ts'
;(async () => {
  const action = Deno.args[0]

  switch (action) {
    case 'fetch': { // 'fetch' or 'fetch 2023-11'
      const date = Deno.args[1]
        ? new Date(Date.parse(Deno.args[1]))
        : getFirstDayOfNextMonth()

      // TODO: current month or next month
      // await fetchJsonAndConvertToCsv(date)
      await fetchJsonAndConvertToCsv(date)
      break
    }

    case 'convert': { // 'convert' or 'convert all'
      const isConvertAll = Deno.args[1] === 'all' ? true : false
      const files: string[] = []

      if (isConvertAll) {
        for await (const file of Deno.readDir(csvDir)) {
          const filenameExcludeCSVSuffix = file.name.split('.').shift()
          if (filenameExcludeCSVSuffix) {
            files.push(filenameExcludeCSVSuffix)
          }
        }
      } else {
        const date = getFirstDayOfNextMonth()
        files.push(`${date.getFullYear()}-${date.getMonth() + 1}`)
      }

      await csvToIcs(files)
      break
    }

    case 'merge':
      await mergeIcsFiles()
      break

    default:
      console.log(`Please insert the argument: fetch, convert or merge.`)
  }
})()
