// Все числа баланса в одном месте: их использует и логика, и интерфейс.

// деньги
export const MONEY_PER_PERSON = 1 // с каждого жителя в день
export const STORAGE_INCOME = 5 // со склада в день
export const GUARDPOST_UPKEEP = 2 // содержание поста в день
export const MARKET_INCOME = 6 // доход с магазина в день

// безопасность: запас 0..100. Каждый день растёт от охраны и убывает от нагрузки
export const SEC_BASE = 0.8 // базовое восстановление без постов
export const SEC_POST = 1.2 // восстановление с каждого поста
export const SEC_PER_PERSON = 0.05 // нагрузка с каждого жителя
export const SEC_PER_BORDER = 0.04 // нагрузка с каждой клетки границы зоны
export const SEC_PER_EXPOSURE = 0.6 // нагрузка за единицу близости построек к деревням
export const NEIGHBOR_RADIUS = 8 // на каком расстоянии (в клетках) деревня создаёт нагрузку

// разрешения
export const PERMIT_PASSIVE = 0.1 // сами накапливаются в день
export const PERMIT_REQUEST_COST = 60 // цена заявки
export const PERMIT_REQUEST_DAYS = 6 // сколько дней идёт заявка
export const PERMIT_REQUEST_GAIN = 2 // сколько разрешений даёт одна заявка
export const PERMIT_REQUEST_MAX = 3 // сколько заявок может быть в пути одновременно

// порог, ниже которого семьи уезжают
export const SEC_CRITICAL = 10
export const SEC_LEAVE_EVERY = 3 // раз во сколько дней уезжает один человек
