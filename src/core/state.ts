import type { GameState } from './types'

export function createInitialState(seed = 1): GameState {
  const w = 24
  const h = 16
  const legal = new Array<boolean>(w * h).fill(false)
  // стартовая разрешённая зона: центр карты
  for (let y = 6; y <= 9; y++) for (let x = 9; x <= 13; x++) legal[y * w + x] = true

  return {
    day: 0,
    rngState: seed,
    status: 'playing',
    resources: { people: 6, money: 300, permits: 5, security: 40, morale: 60 },
    scrutiny: 0,
    map: { w, h, legal },
    buildings: [],
    villages: [
      { id: 'north', name: 'Северная деревня', attitude: 0, x: 12, y: 1 },
      { id: 'east', name: 'Восточная деревня', attitude: -1, x: 22, y: 8 },
      { id: 'south', name: 'Южная деревня', attitude: 1, x: 12, y: 14 },
    ],
    nextId: 1,
    frozenUntil: 0,
    permitRequests: [],
    pendingEventId: null,
    pendingVillageId: null,
    log: [],
  }
}
