import { format as dateFormat } from 'https://deno.land/std@0.184.0/datetime/mod.ts'
import { stringify as csvStringify } from 'https://deno.land/std@0.184.0/csv/stringify.ts'
import { Body, CinemaInfo, Movie, MovieHall } from './types.ts'
import { metaDir } from './csv-to-ics.ts'

const cfaApi = 'https://yt5.cfa.org.cn/api/libraryapi/arrangementPage'
export const csvHeader = [
  'name',
  'englishName',
  'year',
  'cinima',
  'playTime',
  'endTime',
]

export function getFirstDayOfNextMonth(date: Date = new Date()): Date {
  const readableMonth = date.getMonth() + 1
  let readableMonthInNextMonth = readableMonth + 1

  const lastDayInNextMonth = new Date(
    date.getFullYear(),
    readableMonth + 1,
    0,
  )

  const yearInNextMonth = lastDayInNextMonth.getFullYear()

  readableMonthInNextMonth = readableMonthInNextMonth > 12
    ? readableMonthInNextMonth % 12
    : readableMonthInNextMonth

  return new Date(yearInNextMonth, readableMonthInNextMonth - 1, 1)
}

export function parseCinema(
  cinemaInfo: CinemaInfo,
  movieHall: MovieHall,
): string {
  const cinema = cinemaInfo.slice(0, 3)

  if (cinema === '小西天') {
    if (movieHall === '2号厅') {
      return `${cinema}(2)`
    }

    return cinema
  } else if (cinema === '百子湾') {
    return cinema
  }

  throw new Error(`Do not support cinema: [${cinemaInfo}].`)
}

export function formatJson(json: Body): Array<Movie> {
  const movies: Array<Movie> = []

  json.data.records.forEach((record) => {
    movies.push({
      name: record.movieInfo.movieName,
      englishName: record.movieInfo.englishName,
      year: parseInt(record.movieInfo.movieTime),
      cinima: parseCinema(record.cinemaInfo, record.movieHall),
      playTime: record.playTime,
      endTime: record.endTime,
    })
  })

  return movies
}

export function sortByPlayTime(movies: Movie[]) {
  movies.sort((a, b) => {
    return new Date(a.playTime).getTime() - new Date(b.playTime).getTime()
  })
}

export async function fetchJsonAndConvertToCsv() {
  const firstDayOfNextMonth = getFirstDayOfNextMonth()

  const movies: Array<Movie> = []
  const url: URL = new URL(cfaApi)

  const nextDay: Date = new Date(firstDayOfNextMonth)

  do {
    url.search = new URLSearchParams({
      playTime: dateFormat(nextDay, 'yyyy-MM-dd HH:mm:ss'),
    }).toString()

    const res = await fetch(url)
    const json = await res.json() as Body

    movies.push(...formatJson(json))

    nextDay.setDate(nextDay.getDate() + 1)
  } while (firstDayOfNextMonth.getMonth() === nextDay.getMonth())

  sortByPlayTime(movies)

  Deno.writeTextFile(
    `${metaDir}/${dateFormat(firstDayOfNextMonth, 'yyyy-MM')}.csv`,
    csvStringify(movies, {
      columns: csvHeader,
    }),
  )
}
