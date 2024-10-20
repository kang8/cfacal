export type Movie = {
  name: string
  englishName: string
  year: number
  director: string
  cinima: string
  playTime: string
  endTime: string
}

export type CinemaInfo = '小西天艺术影院' | '百子湾艺术影院' | '江南分馆影院'

export type MovieHall = '1号厅' | '2号厅'

export type movieActor = {
  position: '导演' | '编剧' | '演员'
  realName: string
}

export type Body = {
  data: {
    records: [{
      movieInfo: {
        movieName: string
        englishName: string
        movieTime: string
        movieMinute: number
      }
      cinemaInfo: CinemaInfo
      movieHall: MovieHall
      playTime: string
    }]
  }
  total: string
  size: string
}
