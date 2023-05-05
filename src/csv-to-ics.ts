import { createEvents, DateArray, EventAttributes } from 'npm:ics@^3.1.0'
import { parse as csvParse } from 'https://deno.land/std@0.184.0/csv/parse.ts'
import { Movie } from './types.ts'
import { sortByPlayTime } from './json-to-csv.ts'

export const metaDir = './assets/meta'

function parseDate(date: Date): DateArray {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ]
}

export function parseTitle(movie: Movie): string {
  if (movie.englishName.trim() === '') {
    return `${movie.cinima}|${movie.name}`
  }

  return `${movie.cinima}|${movie.name}(${movie.englishName})`
}

export async function csvToIcs() {
  const movies: Movie[] = []

  for await (const file of Deno.readDir(metaDir)) {
    const content = await Deno.readTextFile(`${metaDir}/${file.name}`)

    movies.push(
      ...csvParse(content, { skipFirstRow: true }) as unknown as Movie[],
    )
  }

  sortByPlayTime(movies)

  const events = movies.map<EventAttributes>((movie) => ({
    calName: '电影资料馆',
    start: parseDate(new Date(movie.playTime)),
    end: parseDate(new Date(movie.endTime)),
    title: parseTitle(movie),
    description: 'TBD',
  }))

  createEvents(events, async (error, value) => {
    if (error) throw error

    await Deno.writeTextFile(`./assets/event.ics`, value)
  })
}
