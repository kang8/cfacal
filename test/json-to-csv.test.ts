import {
  csvHeader,
  formatJson,
  getFirstDayOfNextMonth,
  parseCinema,
  sortByPlayTime,
} from '../src/json-to-csv.ts'
import { format as dateFormat } from 'jsr:@std/datetime@0.225'
import { stringify as csvStringify } from 'jsr:@std/csv@1'
import { assertEquals, assertThrows } from 'jsr:@std/assert@1'
import { assertSnapshot } from 'jsr:@std/testing@1/snapshot'
import { Body, CinemaInfo, Movie } from '../src/types.ts'

Deno.test('Get first day of next month', () => {
  assertEquals(
    dateFormat(getFirstDayOfNextMonth(new Date('2023-04-25')), 'yyyy-MM-dd'),
    '2023-05-01',
  )
  assertEquals(
    dateFormat(getFirstDayOfNextMonth(new Date('2023-11-25')), 'yyyy-MM-dd'),
    '2023-12-01',
  )
  assertEquals(
    dateFormat(getFirstDayOfNextMonth(new Date('2023-12-25')), 'yyyy-MM-dd'),
    '2024-01-01',
  )
})

Deno.test(
  'Iterate through all days of the next month',
  async (t) => {
    const firstDay = getFirstDayOfNextMonth(new Date('2023-04-25'))
    const url = new URL('https://kang.test')

    const days: Array<string> = []

    for (
      const nextDay = new Date(firstDay);
      firstDay.getMonth() === nextDay.getMonth();
      nextDay.setDate(nextDay.getDate() + 1)
    ) {
      url.search = new URLSearchParams({
        playTime: dateFormat(nextDay, 'yyyy-MM-dd HH:mm:ss'),
      }).toString()

      days.push(url.toString())
    }

    await assertSnapshot(t, days)
  },
)

Deno.test('Format json', async (t) => {
  const json = JSON.parse(
    await Deno.readTextFile('./test/fixtures/23_05_07.json'),
  ) as Body

  const res = formatJson(json)

  await assertSnapshot(t, res)
})

Deno.test('Parse cinema', () => {
  assertEquals(parseCinema('小西天艺术影院', '1号厅'), '小西天')
  assertEquals(parseCinema('小西天艺术影院', '2号厅'), '小西天(2)')
  assertEquals(parseCinema('百子湾艺术影院', '1号厅'), '百子湾')
  assertEquals(parseCinema('百子湾艺术影院', '2号厅'), '百子湾')

  assertThrows(
    () => {
      parseCinema('西天艺术影院' as CinemaInfo, '2号厅')
    },
    Error,
    'Do not support cinema: [西天艺术影院].',
  )
})

Deno.test('Sort movies by play time', () => {
  const movies: Movie[] = [
    {
      cinima: '小西天',
      endTime: '2023-05-07 20:40:00',
      englishName: 'Ryuichi Sakamoto: CODA',
      name: '坂本龙一：终曲',
      playTime: '2023-05-07 19:00:00',
      year: 2017,
      director: '史蒂芬·野村·斯奇博',
    },
    {
      cinima: '百子湾',
      endTime: '2023-05-07 15:35:00',
      englishName: 'On the Milky Road',
      name: '牛奶配送员的奇幻人生',
      playTime: '2023-05-07 13:30:00',
      year: 2016,
      director: '埃米尔·库斯图里卡 Emir Kusturiča',
    },
    {
      cinima: '百子湾',
      endTime: '2023-05-07 18:09:00',
      englishName: 'Black Cat, White Cat',
      name: '黑猫白猫',
      playTime: '2023-05-07 16:00:00',
      year: 1998,
      director: '埃米尔·库斯图里卡 Emir Kusturiča',
    },
  ]

  sortByPlayTime(movies)

  assertEquals(movies[0].name, '牛奶配送员的奇幻人生')
  assertEquals(movies[1].name, '黑猫白猫')
  assertEquals(movies[2].name, '坂本龙一：终曲')
})

Deno.test('convert movies to csv', async (t) => {
  const movies: Movie[] = [
    {
      cinima: '小西天',
      endTime: '2023-05-07 20:40:00',
      englishName: 'Ryuichi Sakamoto: CODA',
      name: '坂本龙一：终曲',
      playTime: '2023-05-07 19:00:00',
      year: 2017,
      director: '史蒂芬·野村·斯奇博',
    },
    {
      cinima: '百子湾',
      endTime: '2023-05-07 15:35:00',
      englishName: 'On the Milky Road',
      name: '牛奶配送员的奇幻人生',
      playTime: '2023-05-07 13:30:00',
      year: 2016,
      director: '埃米尔·库斯图里卡 Emir Kusturiča',
    },
    {
      cinima: '百子湾',
      endTime: '2023-05-07 18:09:00',
      englishName: 'Black Cat, White Cat',
      name: '黑猫白猫',
      playTime: '2023-05-07 16:00:00',
      year: 1998,
      director: '埃米尔·库斯图里卡 Emir Kusturiča',
    },
  ]

  const csvStr = csvStringify(movies, {
    columns: csvHeader,
  })

  await assertSnapshot(t, csvStr)
})
