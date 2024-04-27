import { parse as csvParse } from 'https://deno.land/std@0.184.0/csv/parse.ts'
import { Movie } from '../src/types.ts'
import { parseTitle } from '../src/csv-to-ics.ts'
import { assertSnapshot } from 'https://deno.land/std@0.185.0/testing/snapshot.ts'

Deno.test('CSV parse', async (t) => {
  const content = await Deno.readTextFile('test/fixtures/test.csv')
  const movies: Movie[] = []

  movies.push(...csvParse(content, {
    skipFirstRow: true,
  }) as unknown as Movie[])

  await assertSnapshot(t, movies)
})

Deno.test('Parse title', async (t) => {
  const movies: Movie[] = [{
    cinima: '小西天',
    endTime: '2023-05-07 20:40:00',
    englishName: '',
    name: '弗兰兹',
    playTime: '2023-05-07 19:00:00',
    year: 2016,
    director: '弗朗索瓦·欧容',
  }, {
    cinima: '百子湾',
    endTime: '2023-05-07 18:09:00',
    englishName: 'Black Cat, White Cat',
    name: '黑猫白猫',
    playTime: '2023-05-07 16:00:00',
    year: 1998,
    director: '埃米尔·库斯图里卡 Emir Kusturiča',
  }]

  const titles = movies.map(parseTitle)

  await assertSnapshot(t, titles)
})
