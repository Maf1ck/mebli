import type { CharacterSettings, CompanySettings, GameSettings, PriceList } from './types'

/** Demo values for a fresh instance. Contacts are empty on purpose: no fake phone numbers. */
export const DEFAULT_COMPANY: CompanySettings = {
  name: 'Кант',
  tagline: 'Корпусні меблі на замовлення з виїздом на замір',
  phone: '',
  email: '',
  telegram: '',
  viber: '',
  city: 'Львів',
  serviceArea: 'Замір, доставка й монтаж по місту. За місто — з фіксованою доплатою.',
  workHours: 'Пн–Сб 09:00–19:00',
  legalName: '',
  accent: 'walnut',
  retentionDays: 730,
  leadDays: { kitchen: 30, wardrobe: 21, walkin: 21, hallway: 18, cabinet: 14 },
  swatches: [
    { name: 'Білий сніг', hex: '#f1efe9', grain: false },
    { name: 'Кашемір', hex: '#d9ccb9', grain: false },
    { name: 'Дуб натуральний', hex: '#c49a6c', grain: true },
    { name: 'Горіх', hex: '#7b5236', grain: true },
    { name: 'Шавлія', hex: '#9aa58c', grain: false },
    { name: 'Глибокий синій', hex: '#2f4157', grain: false },
    { name: 'Графіт', hex: '#3a3d40', grain: false },
  ],
}

export const DEFAULT_PRICES: PriceList = {
  perM2: { wardrobe: 7200, walkin: 6400, hallway: 7600, cabinet: 8200 },
  kitchen: { lowerPerM: 11500, upperPerM: 8200, countertopPerM: 2600, corner: 3800, island: 21000 },
  facadePct: { ldsp: 0, mdf_paint: 35, acrylic: 45, veneer: 60 },
  bodyPct: { ldsp: 0, mdf: 18 },
  premiumFittingsPct: 20,
  options: { drawer: 950, shelf: 280, rod: 320, basket: 1600, lighting: 1300, softclose: 260, handle: 180, mirror: 2400, cutout: 450 },
  complexityPct: 20,
  installPct: 10,
  dismantle: 900,
  minOrder: 9000,
  measureFee: 0,
  deliveryFee: 700,
  outOfCityFee: 1000,
  liftPerFloor: 150,
  roundTo: 100,
}

export const DEFAULT_GAME: GameSettings = {
  mode: 'play',
  bonusAmount: 500,
  validDays: 90,
  minNextOrder: 15000,
}

export const DEFAULT_CHARACTERS: CharacterSettings = {
  personality: 'friendly',
  faces: true,
  phrases: true,
}
