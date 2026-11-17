import { adminOrderPatchSchema } from '#shared/schemas'
import type { OrderRow } from '../../../utils/orders'

export default defineEventHandler(async (event) => {
  const id = orderIdParam(event)
  const parsed = adminOrderPatchSchema.safeParse(await readBody<unknown>(event))
  if (!parsed.success) throw createError({ statusCode: 422, message: parsed.error.issues[0]?.message ?? 'Перевірте поля' })
  const patch = parsed.data
  const db = await useDb()

  await db.tx(async (t) => {
    const rows = await t.query<OrderRow>('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id])
    const current = rows[0]
    if (!current) throw createError({ statusCode: 404, message: 'Заявку не знайдено' })

    const next = {
      status: patch.status ?? current.status,
      measureAt: patch.measureAt !== undefined ? isoOrNull(patch.measureAt) : isoOrNull(current.measure_at),
      finalPrice: patch.finalPrice !== undefined ? patch.finalPrice : current.final_price,
      productionDays: patch.productionDays !== undefined ? patch.productionDays : current.production_days,
      agreedAt: patch.agreedAt !== undefined ? isoOrNull(patch.agreedAt) : isoOrNull(current.agreed_at),
      ownerNote: patch.ownerNote ?? current.owner_note,
    }
    if (next.status === 'measure' && !next.measureAt) {
      throw createError({ statusCode: 422, message: 'Для статусу «Замір» вкажіть дату й час заміру' })
    }
    if (next.status === 'agreed' && (next.finalPrice === null || next.productionDays === null)) {
      throw createError({ statusCode: 422, message: 'Для статусу «Погоджена» вкажіть остаточну ціну й строк виготовлення' })
    }

    await t.query(
      `UPDATE orders SET status = $2, measure_at = $3, final_price = $4, production_days = $5, agreed_at = $6, owner_note = $7, updated_at = now()
       WHERE id = $1`,
      [id, next.status, next.measureAt, next.finalPrice, next.productionDays, next.agreedAt, next.ownerNote],
    )
    if (next.status !== current.status) await logEvent(t, id, 'status', { from: current.status, to: next.status })
    if (next.measureAt !== isoOrNull(current.measure_at)) await logEvent(t, id, 'measure', { value: next.measureAt })
    if (next.finalPrice !== current.final_price) await logEvent(t, id, 'price', { value: next.finalPrice })
    if (next.productionDays !== current.production_days) await logEvent(t, id, 'days', { value: next.productionDays })
    if (next.agreedAt !== isoOrNull(current.agreed_at)) await logEvent(t, id, 'time', { value: next.agreedAt })
    if (next.ownerNote !== current.owner_note) await logEvent(t, id, 'note', {})
  })

  return await adminOrderView(id)
})
