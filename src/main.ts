import { csvToIcs } from './csv-to-ics.ts'
import { fetchJsonAndConvertToCsv } from './json-to-csv.ts'
;(async () => {
  await fetchJsonAndConvertToCsv()
  await csvToIcs()
})()
