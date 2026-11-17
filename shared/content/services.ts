import type { BodyMaterial, FacadeMaterial, Fittings, FurnitureType, KitchenLayout, OptionId, OrderStatus } from '../types'

export const TYPE_LABELS: Record<FurnitureType, string> = {
  kitchen: 'Кухня',
  wardrobe: 'Шафа-купе',
  walkin: 'Гардеробна',
  hallway: 'Передпокій',
  cabinet: 'Комод, тумба, стелаж',
  other: 'Інше',
}

export type CharacterId = 'drill' | 'tape' | 'level' | 'hammer' | 'pencil' | 'toolbox'

export interface ServiceInfo {
  type: FurnitureType
  title: string
  lead: string
  includes: string[]
  excludes: string[]
  character: CharacterId
}

export const SERVICES: ServiceInfo[] = [
  {
    type: 'kitchen',
    title: TYPE_LABELS.kitchen,
    lead: 'Пряма, кутова чи П-подібна — під ваші стіни й техніку.',
    includes: ['Нижні й верхні модулі', 'Стільниця по довжині низу', 'Фасади й фурнітура обраного класу', 'Проєкт після заміру'],
    excludes: ['Побутова техніка й мийка', 'Стінова панель (фартух)', 'Підключення води й газу'],
    character: 'drill',
  },
  {
    type: 'wardrobe',
    title: TYPE_LABELS.wardrobe,
    lead: 'Розсувні двері, наповнення під ваші речі.',
    includes: ['Корпус і розсувні двері', 'Напрямні й профілі', 'Полиці, штанги, ящики за лічильником'],
    excludes: ['Демонтаж старої шафи (окремо)', 'Вирівнювання стін і підлоги', 'Фотодрук на дверях'],
    character: 'tape',
  },
  {
    type: 'walkin',
    title: TYPE_LABELS.walkin,
    lead: 'Відкрита система вздовж стіни або в ніші.',
    includes: ['Стійки й секції', 'Полиці, штанги, ящики, корзини', 'Монтаж на стіну'],
    excludes: ['Двері в гардеробну кімнату', 'Освітлення кімнати', 'Оздоблення стін'],
    character: 'level',
  },
  {
    type: 'hallway',
    title: TYPE_LABELS.hallway,
    lead: 'Відкрита вішалка, закриті секції й дзеркало.',
    includes: ['Корпус і розпашні двері', 'Відкрита секція зі штангою', 'Полиці за лічильником'],
    excludes: ['Пуф і мʼякі елементи', 'Взуттєві сушарки', 'Гачки нестандартного дизайну'],
    character: 'hammer',
  },
  {
    type: 'cabinet',
    title: TYPE_LABELS.cabinet,
    lead: 'Комоди, ТВ-тумби, стелажі, шафи для дому й офісу.',
    includes: ['Корпус і фасади', 'Ящики й полиці за лічильником', 'Ручки обраного класу'],
    excludes: ['Мʼякі меблі', 'Столи й стільці', 'Скло з гартуванням (окремо)'],
    character: 'pencil',
  },
  {
    type: 'other',
    title: TYPE_LABELS.other,
    lead: 'Нестандартна форма чи задача — оцінимо після фото й заміру.',
    includes: ['Ніші, скоси, мансарди', 'Меблі для офісу й закладів', 'Доопрацювання наявних меблів'],
    excludes: ['Ціна до перегляду фото', 'Мʼякі меблі й оббивка'],
    character: 'toolbox',
  },
]

export const SERVICE_BY_TYPE = Object.fromEntries(SERVICES.map((s) => [s.type, s])) as Record<FurnitureType, ServiceInfo>

export const OPTION_LABELS: Record<OptionId, { title: string; unit: string; hint?: string }> = {
  drawer: { title: 'Висувний ящик', unit: 'шт' },
  shelf: { title: 'Полиця', unit: 'шт' },
  rod: { title: 'Штанга для одягу', unit: 'шт' },
  basket: { title: 'Висувна корзина', unit: 'шт' },
  lighting: { title: 'LED-підсвітка', unit: 'секція' },
  softclose: { title: 'Доводчик', unit: 'шт', hint: 'на двері чи ящик' },
  handle: { title: 'Ручка', unit: 'шт' },
  mirror: { title: 'Дзеркальний фасад', unit: 'шт' },
  cutout: { title: 'Виріз під мийку чи техніку', unit: 'шт' },
}

/** Which options make sense for each type; others are dropped on save. */
export const TYPE_OPTIONS: Record<Exclude<FurnitureType, 'other'>, OptionId[]> = {
  kitchen: ['drawer', 'basket', 'lighting', 'softclose', 'handle', 'cutout'],
  wardrobe: ['shelf', 'rod', 'drawer', 'lighting', 'mirror', 'softclose'],
  walkin: ['shelf', 'rod', 'drawer', 'basket', 'lighting'],
  hallway: ['shelf', 'rod', 'drawer', 'mirror', 'handle', 'softclose'],
  cabinet: ['drawer', 'shelf', 'handle', 'softclose', 'lighting', 'mirror'],
}

export const LAYOUT_LABELS: Record<KitchenLayout, string> = {
  straight: 'Пряма',
  corner: 'Кутова',
  u: 'П-подібна',
}

export const BODY_LABELS: Record<BodyMaterial, string> = {
  ldsp: 'ЛДСП',
  mdf: 'МДФ',
}

export const FACADE_LABELS: Record<FacadeMaterial, string> = {
  ldsp: 'ЛДСП',
  mdf_paint: 'МДФ фарбований',
  acrylic: 'Акрил',
  veneer: 'Шпон',
}

export const FITTINGS_LABELS: Record<Fittings, string> = {
  standard: 'Стандарт',
  premium: 'Преміум',
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Нова',
  measure: 'Замір',
  agreed: 'Погоджена',
  done: 'Виконана',
  cancelled: 'Скасована',
}

export const STATUS_HINTS: Record<OrderStatus, string> = {
  new: 'Заявку отримано. Ми зателефонуємо, щоб домовитися про замір.',
  measure: 'Замір призначено. Майстер приїде з рулеткою й зразками матеріалів.',
  agreed: 'Проєкт і ціну погоджено. Меблі у виробництві — строк і дату монтажу видно нижче.',
  done: 'Меблі встановлено. Дякуємо, що обрали нас!',
  cancelled: 'Заявку скасовано. Якщо це помилка — звʼяжіться з нами.',
}
