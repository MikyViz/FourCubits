export type ResourceKey = 'people' | 'money' | 'permits' | 'security' | 'morale'
export type Resources = Record<ResourceKey, number>
export type BuildingType = 'house' | 'storage' | 'guardpost' //| 'market'

export interface Building {
  id: number
  type: BuildingType
  x: number
  y: number
  legal: boolean // построено внутри разрешённой зоны
  daysLeft: number
  done: boolean
  placedDay: number // день, когда поставлена (перенос возможен только в этот день)
  paid: number // сколько денег уплачено за текущее место
}

// attitude: -2 (враждебная) ... +2 (дружественная)
export interface Village {
  id: string
  name: string
  attitude: number
  x: number // положение на карте: от него зависит нагрузка на безопасность
  y: number
}

export interface GameState {
  day: number
  rngState: number
  status: 'playing' | 'won' | 'lost'
  resources: Resources
  scrutiny: number // внимание инспекций/СМИ/суда, 0..100
  map: { w: number; h: number; legal: boolean[] }
  buildings: Building[]
  villages: Village[]
  nextId: number
  frozenUntil: number // стройка заморожена до этого дня
  permitRequests: { arriveDay: number; gain: number }[] // поданные заявки на разрешения
  pendingEventId: string | null
  pendingVillageId: string | null
  log: string[]
}

export interface EventCtx {
  village: Village | null
}

export interface EventChoice {
  label: string
  cost?: Partial<Resources>
  // возвращает строку для лога (необязательно)
  apply: (s: GameState, ctx: EventCtx) => string | void
}

export interface GameEvent {
  id: string
  title: string
  text: string // можно использовать {village}
  weight: (s: GameState) => number
  needsVillage?: boolean
  choices: EventChoice[]
}
