export type Movie = {
  name: string
  englishName: string
  year: string
  director: string
  cinema: string
  playTime: string
  endTime: string
}

export type CinemaInfo = '小西天艺术影院' | '百子湾艺术影院' | '江南分馆影院'

export type MovieHall = '1号厅' | '2号厅' | '3号厅' | '4号厅'

export type Body = {
  status: number
  code: number
  msg: string
  date: string
  data: {
    records: Array<{
      movieId: string
      movieInfo: {
        movieName: string
        englishName: string
        movieTime: string
        movieMinute: number
      }
      cinemaInfo: CinemaInfo
      movieHall: MovieHall
      playTime: string
    }>
  }
}

export type MovieInfoBody = {
  status: number
  code: number
  msg: string
  data: {
    movieName: string
    movieActors: Array<{
      position: string
      readName: string
    }>
  }
}

export function sortByPlayTime(movies: Movie[]) {
  movies.sort((a, b) => {
    if (a.playTime !== b.playTime) {
      return a.playTime.localeCompare(b.playTime)
    }
    return a.endTime.localeCompare(b.endTime)
  })
}
