export type Movie = {
  name: string
  englishName: string
  year: number
  cinima: string
  playTime: string
  endTime: string
}

export type CinemaInfo = '小西天艺术影院' | '百子湾艺术影院'

export type MovieHall = '1号厅' | '2号厅'

export type Body = {
  data: {
    records: [{
      movieInfo: {
        movieName: string
        englishName: string
        movieTime: string
      }
      cinemaInfo: CinemaInfo
      movieHall: MovieHall
      playTime: string
      endTime: string
    }]
  }
  total: string
  size: string
}
