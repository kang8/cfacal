import {
  csvHeader,
  formatJson,
  generatePatchFromDiff,
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

Deno.test('Generate patch from diff - delete operation', () => {
  const diffOutput = `2,3d1
< line to delete 1
< line to delete 2
---
> remaining line 1
> remaining line 2`

  const patch = generatePatchFromDiff(diffOutput)

  const expected = `---
> remaining line 1
> remaining line 2`

  assertEquals(patch, expected)
})

Deno.test('Generate patch from diff - change operation', () => {
  const diffOutput = `1,3c1,2
< old line 1
< old line 2
< old line 3
---
> new line 1
> new line 2`

  const patch = generatePatchFromDiff(diffOutput)

  // The function removes deleteLine (which is 1 in this case) from position 1
  // oldTo - oldFrom + 1 - changeLine = 3 - 1 + 1 - 2 = 1
  const expected = `2,3c1,2
< old line 2
< old line 3
---
> new line 1
> new line 2`

  assertEquals(patch, expected)
})

Deno.test('Generate patch from diff - change operation with single line', () => {
  const diffOutput = `5c3
< old single line
---
> new single line`

  const patch = generatePatchFromDiff(diffOutput)

  // For single line: oldFrom=5, oldTo=5, newFrom=3, newTo=3
  // changeLine = 3-3+1 = 1
  // deleteLine = 5-5+1-1 = 0
  // So it splices 0 lines from position 1, and rewrites line 0
  // Result: 5,5c3,3 (which is "5c3" in shorthand)
  const expected = `5,5c3,3
< old single line
---
> new single line`

  assertEquals(patch, expected)
})

Deno.test('Generate patch from diff - add operation', () => {
  const diffOutput = `0a1,2
> new line 1
> new line 2`

  const patch = generatePatchFromDiff(diffOutput)

  const expected = `0a1,2
> new line 1
> new line 2`

  assertEquals(patch, expected)
})

Deno.test('Generate patch from diff - no changes', () => {
  const diffOutput = ''

  const patch = generatePatchFromDiff(diffOutput)

  assertEquals(patch, '')
})

Deno.test('Generate patch from diff - unrecognized format', () => {
  const diffOutput = 'hello there'

  const patch = generatePatchFromDiff(diffOutput)

  // When there's no recognized operation (d, c, or a), the function returns empty string
  // because patch variable is initialized to '' and never set
  assertEquals(patch, '')
})
