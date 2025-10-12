import { createEvents, DateArray, EventAttributes } from 'npm:ics@^3.5.0'
import { encodeHex } from 'https://deno.land/std@0.224.0/encoding/hex.ts'
import { parse as csvParse } from 'https://deno.land/std@0.224.0/csv/parse.ts'
import { Movie } from './types.ts'
import { sortByPlayTime } from './json-to-csv.ts'

export const csvDir = './assets/csv'

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

export function parseDescription(movie: Movie): string {
  let description = ''

  if (movie?.director) {
    description += `导演: ${movie.director}\n`
  }

  if (movie?.year) {
    description += `年份: ${movie.year}`
  }

  if (description.trim() === '') {
    return 'TBD'
  }

  return description
}

export async function csvToIcs(filenames: string[]) {
  for await (const filename of filenames) {
    const movies: Movie[] = []
    const content = await Deno.readTextFile(`${csvDir}/${filename}.csv`)

    movies.push(
      ...csvParse(content, { skipFirstRow: true }) as unknown as Movie[],
    )
    sortByPlayTime(movies)

    const events: EventAttributes[] = await Promise.all(
      movies.map((movie) =>
        crypto.subtle.digest(
          'SHA-1',
          new TextEncoder().encode(parseTitle(movie)),
        ).then((hashBuffer) => {
          const uid = encodeHex(hashBuffer).slice(0, 6) + '_' +
            new Date(movie.playTime).getTime().toString().slice(0, 8)

          return {
            calName: '电影资料馆',
            uid: uid,
            timestamp: '20111111T000000Z',
            start: parseDate(new Date(movie.playTime)),
            end: parseDate(new Date(movie.endTime)),
            title: parseTitle(movie),
            description: parseDescription(movie),
          }
        })
      ),
    )

    createEvents(events, async (error: Error | undefined, value: string) => {
      if (error) throw error

      await Deno.writeTextFile(`./assets/ics/${filename}.ics`, value)
    })
  }
}
