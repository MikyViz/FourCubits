export type Difficulty = 'easy' | 'normal' | 'hard'

// сообщение для интерфейса: ключ словаря и параметры (могут быть вложенными сообщениями)
export type Param = string | number | Msg
export interface Msg {
  key: string
  params?: Record<string, Param>
}
export interface LogEntry {
  day: number
  msg: Msg
}

export type ResourceKey = 'people' | 'money' | 'permits' | 'security' | 'morale'
export type Resources = Record<ResourceKey, number>
export type BuildingType = 'house' | 'storage' | 'guardpost'

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
  id: string // north | east | south, имя берётся из словаря: village.<id>
  attitude: number
  x: number // положение на карте: от него зависит нагрузка на безопасность
  y: number
}

export interface GameState {
  day: number
  difficulty: Difficulty
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
  log: LogEntry[]
}

export interface EventCtx {
  village: Village | null
}

export interface EventChoice {
  cost?: Partial<Resources>
  // возвращает пояснение для журнала (необязательно)
  apply: (s: GameState, ctx: EventCtx) => Msg | void
}

export interface GameEvent {
  id: string // тексты в словаре: ev.<id>.title, ev.<id>.text, ev.<id>.c0, c1...
  weight: (s: GameState) => number
  needsVillage?: boolean
  choices: EventChoice[]
}
