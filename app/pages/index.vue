<template lang="pug">
.home
  section.hero.container
    .hero__copy
      p.eyebrow {{ company.city }} · меблі на замовлення
      h1.hero__title Меблі під ваші стіни, а не навпаки
      p.hero__lead
        | Кухні, шафи-купе, гардеробні й комоди за вашими розмірами. Зберіть виріб у 3D, побачте
        | орієнтовну ціну за відкритою формулою — точний проєкт і ціну назвемо після заміру.
      .hero__actions
        AppButton(to="/calculator" size="lg") Відкрити 3D-конфігуратор
        AppButton(to="/#services" size="lg" variant="secondary") Що робимо
    ul.hero__facts
      li
        strong Ціна одразу
        span формула відкрита, без «від…» у кінці
      li
        strong Замір {{ prices.measureFee > 0 ? `за ${formatUah(prices.measureFee)}` : 'безкоштовно' }}
        span з рулеткою й зразками
      li
        strong Без онлайн-оплати
        span передоплату погоджуємо після заміру
    .hero__visual
      .hero__stage
        CharacterStage(:active="activeCharacter")
      .hero__cast(role="group" aria-label="Обрати персонажа")
        button.hero__chip(
          v-for="s in services"
          :key="s.type"
          type="button"
          :aria-pressed="activeCharacter === s.character"
          @click="activeCharacter = s.character"
        )
          span.hero__chip-name {{ CHARACTERS[s.character].name }}
          span.hero__chip-type {{ s.title }}

  section#services.section.container(aria-labelledby="services-title")
    .section__head
      p.eyebrow Що робимо
      h2#services-title.section__title Оберіть, що зібрати
      p.section__lead.muted Ціни «від» — з налаштувань майстерні. У конфігураторі видно, з чого складається сума.
    .services
      ServiceCard(
        v-for="s in services"
        :key="s.type"
        :service="s"
        :active="activeCharacter === s.character"
        @focus="activeCharacter = s.character"
      )

  section.section.container(aria-labelledby="how-title")
    .section__head
      p.eyebrow Як це працює
      h2#how-title.section__title Від 3D-моделі до монтажу
    ol.steps
      li.steps__item(v-for="(step, i) in steps" :key="step.title")
        span.steps__num {{ i + 1 }}
        h3.steps__title {{ step.title }}
        p.muted {{ step.text }}

  section.section.container(aria-labelledby="price-title")
    .pricing
      .pricing__copy
        p.eyebrow Чесний розрахунок
        h2#price-title.section__title Як ми рахуємо
        ol.pricing__formula
          li База: м² фасаду × тариф (кухня — погонні метри низу, верху й стільниці)
          li + матеріал фасадів і корпусу у відсотках
          li + {{ prices.premiumFittingsPct }}% за преміум-фурнітуру
          li + опції за фіксованою ціною
          li + {{ prices.complexityPct }}% за складну форму
          li Заокруглення до {{ prices.roundTo }} ₴
        p.muted
          | Мінімальне замовлення меблів — {{ formatUah(prices.minOrder) }}. Монтаж — {{ prices.installPct }}% від ціни виробу,
          | доставка по місту — {{ formatUah(prices.deliveryFee) }}, за місто — +{{ formatUah(prices.outOfCityFee) }}.
          | «Інше» оцінюємо після фото й ніколи не показуємо як безкоштовне.
      .pricing__extras
        h3.pricing__subtitle Опції
        ul.extras
          li.extras__row(v-for="row in options" :key="row.id")
            span {{ row.title }}
            span.extras__price {{ formatUah(row.price) }} / {{ row.unit }}

  section.section.container(aria-labelledby="faq-title")
    .section__head
      p.eyebrow Питання
      h2#faq-title.section__title Часті запитання
    .faq
      details.faq__item(v-for="q in faq" :key="q.q")
        summary {{ q.q }}
        p.muted {{ q.a }}

  section.section.container
    .cta
      h2.cta__title Почнімо з розмірів
      p Зберіть виріб у 3D і залиште заявку — ми зателефонуємо, щоб домовитися про замір.
      AppButton(to="/calculator" size="lg" variant="secondary") Відкрити конфігуратор
</template>

<script setup lang="ts">
import { OPTION_IDS } from '#shared/types'
import type { CharacterId } from '#shared/content/services'
import { OPTION_LABELS, SERVICES } from '#shared/content/services'
import { CHARACTERS } from '#shared/content/characters'
import { formatUah } from '#shared/pricing'

const settings = useSettings()
const company = computed(() => settings.value.company)
const prices = computed(() => settings.value.prices)
const services = SERVICES
const activeCharacter = ref<CharacterId>('tape')

const options = computed(() => OPTION_IDS.map((id) => ({ id, ...OPTION_LABELS[id], price: prices.value.options[id] })))

const steps = [
  { title: 'Конфігуратор', text: 'Задайте розміри, матеріали й наповнення — 3D-модель і ціна оновлюються одразу.' },
  { title: 'Заявка', text: 'Контакти, адреса обʼєкта й, за бажання, фото приміщення чи ескіз.' },
  { title: 'Замір', text: 'Майстер приїде з рулеткою й зразками, уточнить проєкт, назве остаточну ціну й строк.' },
  { title: 'Виготовлення й монтаж', text: 'Робимо в цеху, привозимо й збираємо. Дата монтажу — на сторінці заявки.' },
]

const faq = [
  { q: 'Ціна в конфігураторі остаточна?', a: 'Ні, це орієнтовна вартість за нашою формулою. Остаточну ціну й строк ми називаємо після заміру — вони зʼявляться на сторінці вашої заявки.' },
  { q: '3D-модель — це готовий проєкт?', a: 'Це візуалізація: розміри, секції, двері, ящики й кольори перебудовуються одразу, але наповнення показане схематично. Робочий проєкт робимо після заміру.' },
  { q: 'Чи потрібна передоплата?', a: 'Онлайн-оплати на сайті немає. Передоплату на матеріали погоджуємо після заміру й підписання проєкту.' },
  { q: 'Куди вказати код домофона чи ключі?', a: 'Нікуди. Коди й ключі ми обговорюємо лише телефоном — у формі їх не збираємо.' },
  { q: 'Хто бачить фото приміщення?', a: 'Лише власник майстерні в кабінеті. Фото стискаємо, прибираємо з них геодані й не публікуємо за відкритими посиланнями.' },
  { q: 'У мене ніша зі скосом чи мансарда — це можна?', a: 'Так. Оберіть «Інше» або позначте «Складна форма» й додайте фото чи ескіз — оцінимо й приїдемо на замір.' },
]

usePageSeo({
  title: 'Корпусні меблі на замовлення з 3D-конфігуратором',
  description: `Кухні, шафи-купе, гардеробні й комоди за вашими розмірами в місті ${company.value.city}. 3D-модель і орієнтовна ціна одразу, замір і монтаж.`,
  path: '/',
})
useLocalBusinessSchema()
</script>

<style lang="scss" scoped>
.hero {
  display: grid;
  grid-template-areas: 'copy' 'visual' 'facts';
  gap: $sp-5;
  padding-top: $sp-5;

  @include up($bp-lg) {
    grid-template-columns: 1fr 1.05fr;
    grid-template-areas: 'copy visual' 'facts visual';
    grid-template-rows: auto 1fr;
    column-gap: $sp-7;
    row-gap: $sp-5;
    padding-top: $sp-7;
  }

  &__copy {
    grid-area: copy;
    display: grid;
    gap: $sp-4;
    align-content: end;
  }

  &__title {
    font-size: $fs-4xl;
  }

  &__lead {
    max-width: 52ch;
    font-size: $fs-lg;
    color: $c-ink-2;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: $sp-3;
    margin-top: $sp-2;
  }

  &__facts {
    grid-area: facts;
    align-self: start;
    display: grid;
    gap: $sp-3;
    margin: 0;
    padding: 0;
    list-style: none;

    @include up($bp-sm) {
      grid-template-columns: repeat(3, 1fr);
    }

    li {
      display: grid;
      gap: 2px;
      padding-left: $sp-3;
      border-left: $border-strong solid $c-accent;
      font-size: $fs-sm;
    }

    span {
      color: $c-ink-2;
    }
  }

  &__visual {
    grid-area: visual;
    display: grid;
    gap: $sp-3;
    align-self: center;
  }

  &__stage {
    height: clamp(320px, 62vw, 520px);
  }

  &__cast {
    display: flex;
    gap: $sp-2;
    overflow-x: auto;
    padding-bottom: $sp-1;
    scrollbar-width: thin;
  }

  &__chip {
    display: grid;
    flex: none;
    gap: 2px;
    min-height: $tap;
    padding: $sp-2 $sp-4;
    border: $border-strong solid $c-line;
    border-radius: $r-md;
    background: $c-surface;
    text-align: left;
    transition:
      border-color $dur-fast $ease-out,
      background-color $dur-fast $ease-out;

    &:hover {
      border-color: $c-ink-3;
    }

    &[aria-pressed='true'] {
      border-color: $c-accent;
      background: $c-accent-soft;
    }
  }

  &__chip-name {
    font-weight: $fw-bold;
    font-size: $fs-sm;
  }

  &__chip-type {
    font-size: $fs-xs;
    color: $c-ink-2;
  }
}

.section {
  margin-top: $sp-8;

  @include up($bp-md) {
    margin-top: $sp-9;
  }

  &__head {
    display: grid;
    gap: $sp-2;
    max-width: 640px;
    margin-bottom: $sp-6;
  }

  &__title {
    font-size: $fs-3xl;
  }
}

.services {
  display: grid;
  gap: $sp-4;

  @include up($bp-md) {
    grid-template-columns: repeat(2, 1fr);
  }

  @include up($bp-lg) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.steps {
  display: grid;
  gap: $sp-4;
  margin: 0;
  padding: 0;
  list-style: none;

  @include up($bp-md) {
    grid-template-columns: repeat(4, 1fr);
  }

  &__item {
    display: grid;
    gap: $sp-2;
    align-content: start;
    padding: $sp-5;
    border-radius: $r-lg;
    background: $c-surface;
  }

  &__num {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: $c-accent;
    color: $c-accent-ink;
    font-family: $font-display;
    font-weight: $fw-semibold;
  }

  &__title {
    font-size: $fs-lg;
  }
}

.pricing {
  display: grid;
  gap: $sp-6;
  padding: $sp-5;
  border-radius: $r-xl;
  background: $c-surface;

  @include up($bp-md) {
    grid-template-columns: 1.1fr 1fr;
    padding: $sp-7;
  }

  &__copy {
    display: grid;
    gap: $sp-4;
    align-content: start;
  }

  &__formula {
    display: grid;
    gap: $sp-2;
    margin: 0;
    padding-left: $sp-5;
    font-weight: $fw-medium;
  }

  &__subtitle {
    margin-bottom: $sp-3;
    font-size: $fs-lg;
  }
}

.extras {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;

  &__row {
    display: flex;
    justify-content: space-between;
    gap: $sp-3;
    padding: $sp-3 0;
    border-bottom: $border solid $c-line;
    font-size: $fs-sm;
  }

  &__price {
    font-weight: $fw-semibold;
    white-space: nowrap;
  }
}

.faq {
  display: grid;
  gap: $sp-2;
  max-width: 820px;

  &__item {
    padding: $sp-4 $sp-5;
    border-radius: $r-md;
    background: $c-surface;

    summary {
      min-height: $tap-sm;
      display: flex;
      align-items: center;
      font-weight: $fw-semibold;
      cursor: pointer;
    }

    p {
      margin-top: $sp-2;
    }
  }
}

.cta {
  display: grid;
  gap: $sp-3;
  justify-items: start;
  padding: $sp-6;
  border-radius: $r-xl;
  background: $c-accent;
  color: $c-accent-ink;

  @include up($bp-md) {
    padding: $sp-7;
  }

  &__title {
    font-size: $fs-3xl;
  }
}
</style>
