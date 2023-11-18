import { format as dateFormat } from 'https://deno.land/std@0.184.0/datetime/mod.ts'
import { stringify as csvStringify } from 'https://deno.land/std@0.184.0/csv/stringify.ts'
import { Body, CinemaInfo, Movie, MovieHall } from './types.ts'
import { csvDir } from './csv-to-ics.ts'

const cfaApi = 'https://yt5.cfa.org.cn/api/libraryapi/arrangementPage'
const patchFileName = 'diff.patch'
export const csvHeader = [
  'name',
  'englishName',
  'year',
  'cinima',
  'playTime',
  'endTime',
]

export function getFirstDayOfNextMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

export function parseCinema(
  cinemaInfo: CinemaInfo,
  movieHall: MovieHall,
): string {
  const cinema = cinemaInfo.slice(0, 3)

  switch (cinema) {
    case '小西天':
      if (movieHall === '2号厅') {
        return `${cinema}(2)`
      }

      return cinema
    case '百子湾':
      return cinema
  }

  throw new Error(`Do not support cinema: [${cinemaInfo}].`)
}

export function formatJson(json: Body): Array<Movie> {
  return json.data.records.map<Movie>((record) => ({
    name: record.movieInfo.movieName,
    englishName: record.movieInfo.englishName,
    year: parseInt(record.movieInfo.movieTime),
    cinima: parseCinema(record.cinemaInfo, record.movieHall),
    playTime: record.playTime,
    endTime: record.endTime,
  }))
}

export function sortByPlayTime(movies: Movie[]) {
  movies.sort((a, b) => {
    return new Date(a.playTime).getTime() - new Date(b.playTime).getTime()
  })
}

export async function fetchJsonAndConvertToCsv(firstDayOfMonth: Date) {
  const movies: Array<Movie> = []
  const url: URL = new URL(cfaApi)

  for (
    const nextDay = new Date(firstDayOfMonth);
    firstDayOfMonth.getMonth() === nextDay.getMonth();
    nextDay.setDate(nextDay.getDate() + 1)
  ) {
    url.search = new URLSearchParams({
      playTime: dateFormat(nextDay, 'yyyy-MM-dd HH:mm:ss'),
    }).toString()

    const res = await fetch(url)
    const json = await res.json() as Body

    movies.push(...formatJson(json))
  }

  sortByPlayTime(movies)

  const filePath = `${csvDir}/${dateFormat(firstDayOfMonth, 'yyyy-MM')}.csv`

  try {
    await Deno.lstat(filePath)

    Deno.writeTextFile(
      filePath + '.new',
      csvStringify(movies, {
        columns: csvHeader,
      }),
    )

    // diff
    const diffCommand = new Deno.Command('diff', {
      args: [
        filePath,
        filePath + '.new',
      ],
    })

    const { stdout } = await diffCommand.output()
    const diffOutput = new TextDecoder().decode(stdout)

    console.log(diffOutput); // always output diff message for debugging

    const diffOutputs = diffOutput.split('\n')

    let patch = ''

    if (diffOutputs[0].includes('d')) { // delete
      const range = diffOutputs[0].split('d')[0].split(',')
      const from = parseInt(range[0])
      const to = parseInt(range[1])

      const deleteLine = to - from + 1 // add from itself

      diffOutputs.splice(0, deleteLine + 1) // delete from 0 index

      patch = diffOutputs.join('\n')
    } else if (diffOutputs[0].includes('c')) { // changes
      const [oldRange, newRange] = diffOutputs[0].split('c')

      const oldFrom = parseInt(oldRange.split(',')[0])
      const oldTo = parseInt(oldRange.split(',')[1])

      const newFrom = parseInt(newRange.split(',')[0])
      const newTo = parseInt(newRange.split(',')[1] ?? newFrom)

      const changeLine = newTo - newFrom + 1 // add newFrom itself
      const deleteLine = oldTo - oldFrom + 1 - changeLine // add oldFrom itself and subtract changeLine

      diffOutputs.splice(1, deleteLine)
      diffOutputs[0] = `${oldTo - changeLine + 1},${oldTo}c${newFrom},${newTo}`

      patch = diffOutputs.join('\n')
    } else {
      console.info('Without any change!!!');
    }

    Deno.writeTextFile(patchFileName, patch)

    // followed by https://github.com/denoland/deno/blob/c213ad380f349dee1f65e6d9a9f7a8fa669b2af2/cli/tests/unit/command_test.ts#L206-L233
    // TODO: May be have a sort way: https://github.com/denoland/deno/blob/c213ad380f349dee1f65e6d9a9f7a8fa669b2af2/cli/tests/unit/command_test.ts#L56-L84
    const patchCommand = new Deno.Command('patch', {
      args: [
        filePath,
      ],
      stdin: 'piped',
    })

    const child = patchCommand.spawn();

    const file = await Deno.open(patchFileName);
    await file.readable.pipeTo(child.stdin, {
      preventClose: true
    })

    await child.stdin.close();

    Deno.remove(patchFileName)
    Deno.remove(filePath + '.new')
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error
    }

    Deno.writeTextFile(
      filePath,
      csvStringify(movies, {
        columns: csvHeader,
      }),
    )
  }
}
