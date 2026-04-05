import { format as dateFormat } from 'jsr:@std/datetime@0.225'
import { stringify as csvStringify } from 'jsr:@std/csv@1'
import { crypto } from 'jsr:@std/crypto@1'
import { encodeHex } from 'jsr:@std/encoding@1/hex'
import { Body, CinemaInfo, Movie, MovieHall, sortByPlayTime } from './types.ts'
import { csvDir } from './config.ts'

const cfaApi = 'https://api.guoyingjiaying.cn/api/web/arrangementPage'
const keyApi = 'https://api.guoyingjiaying.cn/api/web/getkey'

export const csvHeader = [
  'name',
  'englishName',
  'year',
  'director',
  'cinema',
  'playTime',
  'endTime',
]

async function md5(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('MD5', msgUint8)
  return encodeHex(new Uint8Array(hashBuffer))
}

async function getApiKey(unixTimestamp: number): Promise<string> {
  const keyResponse = await fetch(keyApi, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      t: unixTimestamp.toString(),
    }),
  })

  if (!keyResponse.ok) {
    throw new Error(
      `Key API request failed: HTTP ${keyResponse.status} ${keyResponse.statusText}`,
    )
  }

  const keyData = await keyResponse.json()

  if (keyData.code !== 200) {
    throw new Error('Failed to get key')
  }

  return keyData.data.token
}

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
  return json.data.records
    // TODO: parse jiangnan cinema, and speart beijing and jiangnan movie information
    .filter((record) => record.cinemaInfo !== '江南分馆影院')
    .map<Movie>((record) => {
      const playDate = new Date(record.playTime)
      playDate.setMinutes(
        playDate.getMinutes() + record.movieInfo.movieMinute,
      )

      return {
        name: record.movieInfo.movieName,
        englishName: record.movieInfo.englishName,
        year: record.movieInfo.movieTime,
        // TODO: To get director name from another api?
        director: '',
        cinema: parseCinema(record.cinemaInfo, record.movieHall),
        playTime: record.playTime,
        endTime: dateFormat(playDate, 'yyyy-MM-dd HH:mm:ss'),
      }
    })
}

export async function fetchJsonAndConvertToCsv(firstDayOfMonth: Date) {
  const movies: Array<Movie> = []
  const unixTimestamp = Date.now()
  const key = await getApiKey(unixTimestamp)

  for (
    const nextDay = new Date(firstDayOfMonth);
    firstDayOfMonth.getMonth() === nextDay.getMonth();
    nextDay.setDate(nextDay.getDate() + 1)
  ) {
    const year = dateFormat(nextDay, 'yyyy')
    const month = dateFormat(nextDay, 'MM')
    const day = dateFormat(nextDay, 'dd')

    const signer = await md5(`${year}${month}${day}${unixTimestamp}${key}`)

    const res = await fetch(cfaApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        year,
        month,
        day,
        t: unixTimestamp.toString(),
        signer,
      }).toString(),
    })

    if (!res.ok) {
      throw new Error(
        `API request failed for ${year}-${month}-${day}: HTTP ${res.status} ${res.statusText}`,
      )
    }

    const json = await res.json() as Body

    movies.push(...formatJson(json))
  }

  if (movies.length <= 0) {
    console.log(`No data Fetch in ${dateFormat(firstDayOfMonth, 'yyyy-MM')}.`)
    return
  }

  sortByPlayTime(movies)

  const filePath = `${csvDir}/${dateFormat(firstDayOfMonth, 'yyyy-MM')}.csv`
  const newContent = csvStringify(movies, { columns: csvHeader })

  try {
    await Deno.lstat(filePath)

    const tmpPath = filePath + '.new'
    await Deno.writeTextFile(tmpPath, newContent)

    const { stdout } = await new Deno.Command('diff', {
      args: [filePath, tmpPath],
    }).output()
    const diffOutput = new TextDecoder().decode(stdout)

    await Deno.remove(tmpPath)

    if (!diffOutput) {
      console.info(
        `[${dateFormat(firstDayOfMonth, 'yyyy-MM')}] without any change!!!`,
      )
      return
    }

    console.info(
      `Comparing changes for [${dateFormat(firstDayOfMonth, 'yyyy-MM')}]`,
    )
    console.log(diffOutput)
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error
    }
  }

  await Deno.writeTextFile(filePath, newContent)
}
