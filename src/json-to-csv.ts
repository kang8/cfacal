import { format as dateFormat } from 'https://deno.land/std@0.184.0/datetime/mod.ts'
import { stringify as csvStringify } from 'https://deno.land/std@0.184.0/csv/stringify.ts'
import { Body, CinemaInfo, Movie, MovieHall } from './types.ts'
import { csvDir } from './csv-to-ics.ts'

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

  Deno.writeTextFile(
    `${csvDir}/${dateFormat(firstDayOfMonth, 'yyyy-MM')}.csv`,
    csvStringify(movies, {
      columns: csvHeader,
    }),
  )
}
