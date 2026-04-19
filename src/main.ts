import { csvToIcs } from './csv-to-ics.ts'
import {
  fetchJsonAndConvertToCsv,
  getFirstDayOfNextMonth,
} from './json-to-csv.ts'
import { format as dateFormat } from 'jsr:@std/datetime@0.225'
import { mergeIcsFiles } from './merge-ics.ts'
import { pruneOldMonths } from './prune-ics.ts'
import { csvDir } from './config.ts'
;(async () => {
  const action = Deno.args[0]

  switch (action) {
    case 'fetch': { // 'fetch' or 'fetch 2023-11'
      if (Deno.args[1]) {
        await fetchJsonAndConvertToCsv(new Date(Date.parse(Deno.args[1]))) // specified month
      } else {
        await fetchJsonAndConvertToCsv(new Date()) // current month
        await fetchJsonAndConvertToCsv(getFirstDayOfNextMonth()) // next month
        await fetchJsonAndConvertToCsv(
          getFirstDayOfNextMonth(getFirstDayOfNextMonth()),
        ) // the month after next
      }

      break
    }

    case 'convert': { // 'convert' or 'convert all'
      const isConvertAll = Deno.args[1] === 'all'
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
        files.push(dateFormat(date, 'yyyy-MM'))
      }

      await csvToIcs(files)
      break
    }

    case 'merge':
      await mergeIcsFiles()
      break

    case 'prune':
      await pruneOldMonths()
      break

    default:
      console.log(
        `Please insert the argument: fetch, convert, merge or prune.`,
      )
  }
})()
