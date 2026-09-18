import { and, asc, desc, eq, gte, ilike, isNull, or, sql, count, inArray, lte } from 'drizzle-orm'
import {
  tourAccommodationStays,
  tourAccommodationStayOrders,
  tourAccommodationRooms,
  tourRoomOccupants,
  tourTrips,
  tourBookings,
  tourOrders,
  tourTripOrders,
  tourJamaah,
  tourCustomers,
  tourVendors,
  workspaces,
} from '../db/schema'
import type { DbLike } from '../db'

function badRequest(msg: string): never {
  throw createError({ statusCode: 400, statusMessage: msg })
}
function notFound(msg: string): never {
  throw createError({ statusCode: 404, statusMessage: msg })
}

export async function getTourWorkspaceIdAccommodation(db: DbLike): Promise<number> {
  const rows = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.key, 'tour')).limit(1)
  if (!rows[0]) throw new Error('Tour workspace not found')
  return rows[0].id
}

function notDeleted(table: any) {
  return isNull(table.deletedAt)
}

function toIso(d: any): string | null {
  if (!d) return null
  if (typeof d === 'string') return d.slice(0,10)
  if (d instanceof Date) return d.toISOString().slice(0,10)
  return String(d).slice(0,10)
}

// ─── Helpers validation ────────────────────────────────────────────────────
async function ensureTripBelongsWorkspace(db: DbLike, tripId: number, workspaceId: number) {
  const rows = await db.select().from(tourTrips).where(and(eq(tourTrips.id, tripId), eq(tourTrips.workspaceId, workspaceId), notDeleted(tourTrips))).limit(1)
  if (!rows[0]) badRequest(`Trip #${tripId} tidak ditemukan atau bukan milik workspace Tour`)
  return rows[0]
}

async function ensureBookingValidForStay(db: DbLike, bookingId: number, tripId: number, workspaceId: number) {
  const rows = await db.select().from(tourBookings).where(and(eq(tourBookings.id, bookingId), eq(tourBookings.workspaceId, workspaceId), notDeleted(tourBookings))).limit(1)
  const b = rows[0]
  if (!b) badRequest(`Booking #${bookingId} tidak ditemukan`)
  if (b.bookingType !== 'HOTEL') badRequest(`Booking ${b.bookingCode} harus tipe HOTEL, bukan ${b.bookingType}`)
  // STRICT: must ref HOTEL Booking with tripId = stay tripId, reject null/mismatched
  if (!b.tripId) {
    badRequest(`Booking ${b.bookingCode} harus terikat ke Trip #${tripId}, tripId tidak boleh null. Pilih Booking HOTEL yang sudah ter-assign ke Trip ini.`)
  }
  if (b.tripId !== tripId) {
    badRequest(`Booking ${b.bookingCode} milik Trip #${b.tripId}, tidak cocok dengan Trip #${tripId}. Stay HOTEL harus referensi Booking HOTEL dengan tripId sama.`)
  }
  return b
}

async function ensureOrderBelongsTrip(db: DbLike, orderId: number, tripId: number, workspaceId: number) {
  const link = await db.select().from(tourTripOrders).where(and(eq(tourTripOrders.workspaceId, workspaceId), eq(tourTripOrders.tripId, tripId), eq(tourTripOrders.orderId, orderId))).limit(1)
  if (!link[0]) badRequest(`Order #${orderId} belum di-assign ke Trip #${tripId}. Assign Order ke Trip dulu.`)
  const order = await db.select().from(tourOrders).where(and(eq(tourOrders.id, orderId), eq(tourOrders.workspaceId, workspaceId), notDeleted(tourOrders))).limit(1)
  if (!order[0]) badRequest(`Order #${orderId} tidak ditemukan`)
  return order[0]
}

// ─── Accommodation Stays ────────────────────────────────────────────────────
export interface ListStaysFilter {
  workspaceId: number
  tripId?: number
  search?: string
  city?: string
  page?: number
  pageSize?: number
}

export async function listAccommodationStays(db: DbLike, f: ListStaysFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page-1)*pageSize
  const conds: any[] = [eq(tourAccommodationStays.workspaceId, f.workspaceId), notDeleted(tourAccommodationStays)]
  if (f.tripId) conds.push(eq(tourAccommodationStays.tripId, f.tripId))
  if (f.city) conds.push(eq(tourAccommodationStays.city, f.city))
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(or(ilike(tourAccommodationStays.hotelName, s), ilike(tourAccommodationStays.stayCode, s), ilike(tourAccommodationStays.city, s)))
  }
  const where = and(...conds)
  const [rows, totalRows] = await Promise.all([
    db.select().from(tourAccommodationStays).where(where).orderBy(desc(tourAccommodationStays.checkInDate)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourAccommodationStays).where(where),
  ])
  return { data: rows, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function listAccommodationStaysEnriched(db: DbLike, f: ListStaysFilter) {
  const base = await listAccommodationStays(db, f)
  if (!base.data.length) return { ...base, data: [] as any[] }

  const stayIds = base.data.map(s=>s.id)
  const bookingIds = base.data.map(s=>s.bookingId)

  const [bookings, stayOrders, rooms, occupants] = await Promise.all([
    db.select().from(tourBookings).where(and(eq(tourBookings.workspaceId, f.workspaceId), inArray(tourBookings.id, bookingIds))),
    db.select().from(tourAccommodationStayOrders).where(and(eq(tourAccommodationStayOrders.workspaceId, f.workspaceId), inArray(tourAccommodationStayOrders.stayId, stayIds))),
    db.select().from(tourAccommodationRooms).where(and(eq(tourAccommodationRooms.workspaceId, f.workspaceId), inArray(tourAccommodationRooms.stayId, stayIds), notDeleted(tourAccommodationRooms))),
    db.select().from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, f.workspaceId), inArray(tourRoomOccupants.stayId, stayIds))),
  ])

  const bookingMap: Record<number, any> = {}
  for (const b of bookings) bookingMap[b.id]=b

  // Enrich with orders per stay
  const orderIds = [...new Set(stayOrders.map(so=>so.orderId))]
  let orderMap: Record<number, any> = {}
  let customerMap: Record<number, any> = {}
  if (orderIds.length) {
    const orders = await db.select().from(tourOrders).where(and(eq(tourOrders.workspaceId, f.workspaceId), inArray(tourOrders.id, orderIds)))
    for (const o of orders) orderMap[o.id]=o
    const custIds = [...new Set(orders.map(o=>o.customerId))]
    if (custIds.length) {
      const customers = await db.select().from(tourCustomers).where(and(eq(tourCustomers.workspaceId, f.workspaceId), inArray(tourCustomers.id, custIds)))
      for (const c of customers) customerMap[c.id]=c
    }
  }

  // Jamaah counts per order
  let jamaahByOrder: Record<number, any[]> = {}
  if (orderIds.length) {
    const jamaah = await db.select().from(tourJamaah).where(and(eq(tourJamaah.workspaceId, f.workspaceId), inArray(tourJamaah.orderId, orderIds), notDeleted(tourJamaah)))
    for (const j of jamaah) {
      if (!jamaahByOrder[j.orderId]) jamaahByOrder[j.orderId]=[]
      jamaahByOrder[j.orderId].push(j)
    }
  }

  // Occupants enrichment for rooms – previously only counted, now include jamaah details so UI can show unassign
  const jamaahIds = [...new Set(occupants.map(o=>o.jamaahId))]
  let jamaahMap: Record<number, any> = {}
  let orderMapForOccupants: Record<number, any> = { ...orderMap }
  if (jamaahIds.length) {
    const jamaahOcc = await db.select().from(tourJamaah).where(and(eq(tourJamaah.workspaceId, f.workspaceId), inArray(tourJamaah.id, jamaahIds)))
    for (const j of jamaahOcc) jamaahMap[j.id]=j
    const orderIdsFromJamaah = [...new Set(jamaahOcc.map(j=>j.orderId).filter((id:any)=>!orderMapForOccupants[id]))]
    if (orderIdsFromJamaah.length) {
      const ordersOcc = await db.select().from(tourOrders).where(and(eq(tourOrders.workspaceId, f.workspaceId), inArray(tourOrders.id, orderIdsFromJamaah)))
      for (const o of ordersOcc) orderMapForOccupants[o.id]=o
    }
  }

  const occupantsByStay: Record<number, number> = {}
  const occupantsByRoomCount: Record<number, number> = {}
  const occupantsByRoomDetailed: Record<number, any[]> = {}
  for (const oc of occupants) {
    occupantsByStay[oc.stayId] = (occupantsByStay[oc.stayId]||0)+1
    occupantsByRoomCount[oc.roomId] = (occupantsByRoomCount[oc.roomId]||0)+1
    if (!occupantsByRoomDetailed[oc.roomId]) occupantsByRoomDetailed[oc.roomId]=[]
    const j = jamaahMap[oc.jamaahId]
    occupantsByRoomDetailed[oc.roomId].push({
      ...oc,
      jamaah: j ? { ...j, order: orderMapForOccupants[j.orderId] || null } : null,
    })
  }

  const roomsByStay: Record<number, any[]> = {}
  for (const r of rooms) {
    if (!roomsByStay[r.stayId]) roomsByStay[r.stayId]=[]
    const occDetailed = occupantsByRoomDetailed[r.id] || []
    roomsByStay[r.stayId].push({
      ...r,
      occupied: occupantsByRoomCount[r.id]||0,
      occupants: occDetailed,
      remaining: r.capacity - (occupantsByRoomCount[r.id]||0),
      isFull: (occupantsByRoomCount[r.id]||0) >= r.capacity,
    })
  }

  const data = base.data.map(stay => {
    const ordersForStay = stayOrders.filter(so=>so.stayId===stay.id)
    const ordersDetail = ordersForStay.map(so=>{
      const o = orderMap[so.orderId]
      return o ? { ...o, customer: customerMap[o.customerId] || null, jamaahCount: (jamaahByOrder[o.id]||[]).length } : null
    }).filter(Boolean)

    const eligibleJamaahCount = ordersForStay.reduce((sum, so)=> sum + (jamaahByOrder[so.orderId]?.length||0), 0)
    const assignedCount = occupantsByStay[stay.id]||0

    return {
      ...stay,
      booking: bookingMap[stay.bookingId] || null,
      orders: ordersDetail,
      ordersCount: ordersDetail.length,
      eligibleJamaahCount,
      assignedCount,
      remaining: eligibleJamaahCount - assignedCount,
      completeness: eligibleJamaahCount>0 ? Math.round((assignedCount/eligibleJamaahCount)*100) : 0,
      isComplete: eligibleJamaahCount>0 && assignedCount>=eligibleJamaahCount,
      rooms: roomsByStay[stay.id]||[],
      roomsCount: (roomsByStay[stay.id]||[]).length,
    }
  })

  return { ...base, data }
}

export async function getAccommodationStay(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourAccommodationStays).where(and(eq(tourAccommodationStays.id, id), eq(tourAccommodationStays.workspaceId, workspaceId), notDeleted(tourAccommodationStays))).limit(1)
  return rows[0] ?? null
}

export async function getAccommodationStayEnriched(db: DbLike, id: number, workspaceId: number) {
  const stay = await getAccommodationStay(db, id, workspaceId)
  if (!stay) return null

  const [booking, stayOrders, rooms, occupants] = await Promise.all([
    db.select().from(tourBookings).where(and(eq(tourBookings.id, stay.bookingId), eq(tourBookings.workspaceId, workspaceId))).limit(1).then(r=>r[0]||null),
    db.select().from(tourAccommodationStayOrders).where(and(eq(tourAccommodationStayOrders.workspaceId, workspaceId), eq(tourAccommodationStayOrders.stayId, id))),
    db.select().from(tourAccommodationRooms).where(and(eq(tourAccommodationRooms.workspaceId, workspaceId), eq(tourAccommodationRooms.stayId, id), notDeleted(tourAccommodationRooms))),
    db.select().from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.stayId, id))),
  ])

  const orderIds = stayOrders.map(so=>so.orderId)
  let ordersDetail: any[] = []
  let jamaahByOrder: Record<number, any[]> = {}
  let customerMap: Record<number, any> = {}
  if (orderIds.length) {
    const orders = await db.select().from(tourOrders).where(and(eq(tourOrders.workspaceId, workspaceId), inArray(tourOrders.id, orderIds), notDeleted(tourOrders)))
    const custIds = [...new Set(orders.map(o=>o.customerId))]
    if (custIds.length) {
      const customers = await db.select().from(tourCustomers).where(and(eq(tourCustomers.workspaceId, workspaceId), inArray(tourCustomers.id, custIds)))
      for (const c of customers) customerMap[c.id]=c
    }
    const jamaah = await db.select().from(tourJamaah).where(and(eq(tourJamaah.workspaceId, workspaceId), inArray(tourJamaah.orderId, orderIds), notDeleted(tourJamaah)))
    for (const j of jamaah) {
      if (!jamaahByOrder[j.orderId]) jamaahByOrder[j.orderId]=[]
      jamaahByOrder[j.orderId].push(j)
    }
    ordersDetail = orders.map(o=>({ ...o, customer: customerMap[o.customerId]||null, jamaah: jamaahByOrder[o.id]||[], jamaahCount: (jamaahByOrder[o.id]||[]).length }))
  }

  const occupantsByRoom: Record<number, any[]> = {}
  const jamaahIds = occupants.map(o=>o.jamaahId)
  let jamaahMap: Record<number, any> = {}
  if (jamaahIds.length) {
    const jamaah = await db.select().from(tourJamaah).where(and(eq(tourJamaah.workspaceId, workspaceId), inArray(tourJamaah.id, jamaahIds)))
    for (const j of jamaah) jamaahMap[j.id]=j
    // also need order/customer for each jamaah for display
    const orderIdsFromJamaah = [...new Set(jamaah.map(j=>j.orderId))]
    let orderMapForJamaah: Record<number, any> = {}
    if (orderIdsFromJamaah.length) {
      const orders = await db.select().from(tourOrders).where(and(eq(tourOrders.workspaceId, workspaceId), inArray(tourOrders.id, orderIdsFromJamaah)))
      for (const o of orders) orderMapForJamaah[o.id]=o
    }
    for (const oc of occupants) {
      if (!occupantsByRoom[oc.roomId]) occupantsByRoom[oc.roomId]=[]
      const j = jamaahMap[oc.jamaahId]
      occupantsByRoom[oc.roomId].push({
        ...oc,
        jamaah: j ? { ...j, order: orderMapForJamaah[j.orderId]||null } : null,
      })
    }
  }

  const roomsEnriched = rooms.map(r=>{
    const occ = occupantsByRoom[r.id]||[]
    return { ...r, occupants: occ, occupied: occ.length, remaining: r.capacity - occ.length, isFull: occ.length >= r.capacity }
  })

  const eligibleJamaahCount = orderIds.reduce((sum, oid)=> sum + (jamaahByOrder[oid]?.length||0), 0)
  const assignedCount = occupants.length
  const assignedJamaahIds = new Set(occupants.map(o=>o.jamaahId))
  const unassigned: any[] = []
  for (const oid of orderIds) {
    for (const j of (jamaahByOrder[oid]||[])) {
      if (!assignedJamaahIds.has(j.id)) unassigned.push({ ...j, order: ordersDetail.find(o=>o.id===oid) || null })
    }
  }

  return {
    ...stay,
    booking,
    orders: ordersDetail,
    rooms: roomsEnriched,
    occupants,
    eligibleJamaahCount,
    assignedCount,
    unassignedCount: unassigned.length,
    unassigned,
    completeness: eligibleJamaahCount>0 ? Math.round((assignedCount/eligibleJamaahCount)*100) : 0,
    isComplete: eligibleJamaahCount>0 && assignedCount>=eligibleJamaahCount,
  }
}

export async function createAccommodationStay(db: DbLike, workspaceId: number, input: {
  tripId: number
  bookingId: number
  hotelName: string
  city: string
  checkInDate: string
  checkOutDate: string
  notes?: string | null
  orderIds: number[]
}) {
  const tripId = Number(input.tripId)
  const bookingId = Number(input.bookingId)
  await ensureTripBelongsWorkspace(db, tripId, workspaceId)
  const booking = await ensureBookingValidForStay(db, bookingId, tripId, workspaceId)

  const checkIn = toIso(input.checkInDate)
  const checkOut = toIso(input.checkOutDate)
  if (!checkIn || !checkOut) badRequest('checkInDate dan checkOutDate wajib')
  if (checkOut < checkIn) badRequest('checkOutDate harus >= checkInDate')

  if (!input.hotelName || !String(input.hotelName).trim()) badRequest('hotelName wajib diisi (snapshot hotel aktual, Vendor mungkin provider)')

  if (!input.orderIds || !Array.isArray(input.orderIds) || input.orderIds.length===0) badRequest('Pilih minimal 1 Order untuk Stay ini')

  // Validate all orderIds belong to Trip
  for (const oid of input.orderIds) {
    await ensureOrderBelongsTrip(db, Number(oid), tripId, workspaceId)
  }

  // Insert stay – Drizzle date mode:'date' expects Date object, not string
  const stayRows = await db.insert(tourAccommodationStays).values({
    workspaceId,
    tripId,
    bookingId,
    hotelName: String(input.hotelName).trim(),
    city: input.city || 'Makkah',
    checkInDate: new Date(checkIn) as any,
    checkOutDate: new Date(checkOut) as any,
    notes: input.notes || null,
  } as any).returning()
  const stay = stayRows[0]

  // Insert stay_orders
  for (const oid of input.orderIds) {
    await db.insert(tourAccommodationStayOrders).values({
      workspaceId,
      stayId: stay.id,
      orderId: Number(oid),
    } as any).onConflictDoNothing({ target: [tourAccommodationStayOrders.stayId, tourAccommodationStayOrders.orderId] })
  }

  return stay
}

export async function updateAccommodationStay(db: DbLike, id: number, workspaceId: number, patch: {
  bookingId?: number
  hotelName?: string
  city?: string
  checkInDate?: string
  checkOutDate?: string
  notes?: string | null
  orderIds?: number[]
}) {
  const existing = await getAccommodationStay(db, id, workspaceId)
  if (!existing) notFound('Accommodation Stay tidak ditemukan')

  const tripId = existing.tripId

  if (patch.bookingId) {
    await ensureBookingValidForStay(db, Number(patch.bookingId), tripId, workspaceId)
  }

  const finalCheckIn = patch.checkInDate ? toIso(patch.checkInDate) : toIso(existing.checkInDate)
  const finalCheckOut = patch.checkOutDate ? toIso(patch.checkOutDate) : toIso(existing.checkOutDate)
  if (finalCheckIn && finalCheckOut && finalCheckOut < finalCheckIn) badRequest('checkOutDate harus >= checkInDate')

  const updatePayload: any = {}
  if (patch.bookingId) updatePayload.bookingId = Number(patch.bookingId)
  if (patch.hotelName !== undefined) {
    if (!String(patch.hotelName).trim()) badRequest('hotelName tidak boleh kosong')
    updatePayload.hotelName = String(patch.hotelName).trim()
  }
  if (patch.city !== undefined) updatePayload.city = patch.city
  if (patch.checkInDate) updatePayload.checkInDate = finalCheckIn ? new Date(finalCheckIn) as any : undefined
  if (patch.checkOutDate) updatePayload.checkOutDate = finalCheckOut ? new Date(finalCheckOut) as any : undefined
  if (patch.notes !== undefined) updatePayload.notes = patch.notes
  if (Object.keys(updatePayload).length) {
    updatePayload.updatedAt = new Date()
    await db.update(tourAccommodationStays).set(updatePayload).where(and(eq(tourAccommodationStays.id, id), eq(tourAccommodationStays.workspaceId, workspaceId)))
  }

  if (patch.orderIds) {
    if (!Array.isArray(patch.orderIds) || patch.orderIds.length===0) badRequest('Stay harus punya minimal 1 Order')
    for (const oid of patch.orderIds) {
      await ensureOrderBelongsTrip(db, Number(oid), tripId, workspaceId)
    }
    // Replace: delete existing not in new list, insert new
    const existingOrders = await db.select().from(tourAccommodationStayOrders).where(and(eq(tourAccommodationStayOrders.workspaceId, workspaceId), eq(tourAccommodationStayOrders.stayId, id)))
    const existingOrderIds = new Set(existingOrders.map(o=>o.orderId))
    const newOrderIds = new Set(patch.orderIds.map((n:any)=>Number(n)))

    // Delete removed
    for (const eo of existingOrders) {
      if (!newOrderIds.has(eo.orderId)) {
        // Check if any occupant from that order still assigned – block removal if so
        const jamaahInOrder = await db.select({ id: tourJamaah.id }).from(tourJamaah).where(and(eq(tourJamaah.workspaceId, workspaceId), eq(tourJamaah.orderId, eo.orderId), notDeleted(tourJamaah)))
        const jamaahIds = jamaahInOrder.map(j=>j.id)
        if (jamaahIds.length) {
          const occupants = await db.select().from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.stayId, id), inArray(tourRoomOccupants.jamaahId, jamaahIds)))
          if (occupants.length) badRequest(`Tidak bisa hapus Order #${eo.orderId} dari Stay karena masih ada ${occupants.length} Jamaah ter-assign di Stay ini. Pindahkan/keluarkan dulu.`)
        }
        await db.delete(tourAccommodationStayOrders).where(and(eq(tourAccommodationStayOrders.workspaceId, workspaceId), eq(tourAccommodationStayOrders.stayId, id), eq(tourAccommodationStayOrders.orderId, eo.orderId)))
      }
    }
    // Insert new
    for (const nid of newOrderIds) {
      if (!existingOrderIds.has(nid)) {
        await db.insert(tourAccommodationStayOrders).values({ workspaceId, stayId: id, orderId: nid } as any).onConflictDoNothing({ target: [tourAccommodationStayOrders.stayId, tourAccommodationStayOrders.orderId] })
      }
    }
  }

  return getAccommodationStay(db, id, workspaceId)
}

export async function softDeleteAccommodationStay(db: DbLike, id: number, workspaceId: number) {
  // Stay must NOT be deleted while any active Room exists under it – explicit cleanup sequence
  const activeRooms = await db.select({ v: count() }).from(tourAccommodationRooms).where(and(eq(tourAccommodationRooms.workspaceId, workspaceId), eq(tourAccommodationRooms.stayId, id), notDeleted(tourAccommodationRooms)))
  const roomsCount = Number(activeRooms[0]?.v ?? 0)
  if (roomsCount > 0) {
    // Also check occupants for more descriptive message
    const activeOccupants = await db.select({ v: count() }).from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.stayId, id)))
    const occCount = Number(activeOccupants[0]?.v ?? 0)
    if (occCount > 0) {
      badRequest('Akomodasi masih memiliki kamar atau jamaah yang dialokasikan. Kosongkan rooming terlebih dahulu.')
    }
    badRequest('Akomodasi masih memiliki kamar. Hapus kamar terlebih dahulu sebelum menghapus akomodasi.')
  }
  // Also block if occupants exist even without rooms (should not happen, but safety)
  const orphanOccupants = await db.select({ v: count() }).from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.stayId, id)))
  if (Number(orphanOccupants[0]?.v ?? 0) > 0) {
    badRequest('Akomodasi masih memiliki kamar atau jamaah yang dialokasikan. Kosongkan rooming terlebih dahulu.')
  }

  const rows = await db.update(tourAccommodationStays).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(tourAccommodationStays.id, id), eq(tourAccommodationStays.workspaceId, workspaceId))).returning({ id: tourAccommodationStays.id })
  return rows[0] ?? null
}

// ─── Rooms ───────────────────────────────────────────────────────────────────
export interface ListRoomsFilter {
  workspaceId: number
  stayId?: number
  search?: string
  roomType?: string
  roomingMode?: string
  page?: number
  pageSize?: number
}

export async function listAccommodationRooms(db: DbLike, f: ListRoomsFilter) {
  const page = Math.max(1, f.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, f.pageSize ?? 20))
  const offset = (page-1)*pageSize
  const conds: any[] = [eq(tourAccommodationRooms.workspaceId, f.workspaceId), notDeleted(tourAccommodationRooms)]
  if (f.stayId) conds.push(eq(tourAccommodationRooms.stayId, f.stayId))
  if (f.roomType) conds.push(eq(tourAccommodationRooms.roomType, f.roomType))
  if (f.roomingMode) conds.push(eq(tourAccommodationRooms.roomingMode, f.roomingMode))
  if (f.search) {
    const s = `%${f.search}%`
    conds.push(or(ilike(tourAccommodationRooms.roomLabel, s), ilike(tourAccommodationRooms.roomNumber, s), ilike(tourAccommodationRooms.roomCode, s)))
  }
  const where = and(...conds)
  const [rows, totalRows] = await Promise.all([
    db.select().from(tourAccommodationRooms).where(where).orderBy(asc(tourAccommodationRooms.roomLabel)).limit(pageSize).offset(offset),
    db.select({ v: count() }).from(tourAccommodationRooms).where(where),
  ])
  return { data: rows, total: totalRows[0]?.v ?? 0, page, pageSize }
}

export async function getAccommodationRoom(db: DbLike, id: number, workspaceId: number) {
  const rows = await db.select().from(tourAccommodationRooms).where(and(eq(tourAccommodationRooms.id, id), eq(tourAccommodationRooms.workspaceId, workspaceId), notDeleted(tourAccommodationRooms))).limit(1)
  return rows[0] ?? null
}

function defaultCapacityForType(roomType: string): number {
  switch (roomType) {
    case 'SINGLE': return 1
    case 'DOUBLE': return 2
    case 'TRIPLE': return 3
    case 'QUAD': return 4
    case 'QUINT': return 5
    default: return 2
  }
}

export async function createAccommodationRoom(db: DbLike, workspaceId: number, input: {
  stayId: number
  roomLabel: string
  roomNumber?: string | null
  roomType: string
  capacity?: number | null
  roomingMode: string
  orderId?: number | null
  notes?: string | null
}) {
  const stayId = Number(input.stayId)
  const stay = await getAccommodationStay(db, stayId, workspaceId)
  if (!stay) badRequest(`Stay #${stayId} tidak ditemukan`)

  const roomLabel = String(input.roomLabel||'').trim()
  if (!roomLabel) badRequest('roomLabel wajib')

  const roomType = input.roomType || 'DOUBLE'
  const validTypes = ['SINGLE','DOUBLE','TRIPLE','QUAD','QUINT','OTHER']
  if (!validTypes.includes(roomType)) badRequest(`roomType tidak valid: ${roomType}`)

  let capacity = input.capacity ? Number(input.capacity) : defaultCapacityForType(roomType)
  if (!capacity || capacity <=0) badRequest('capacity harus >0')
  if (capacity > 10) badRequest('capacity maksimal 10 untuk V1')

  const roomingMode = input.roomingMode || 'SAME_ORDER'
  if (!['SAME_ORDER','SHARED_GROUP'].includes(roomingMode)) badRequest(`roomingMode harus SAME_ORDER atau SHARED_GROUP`)

  let orderId: number | null = input.orderId ? Number(input.orderId) : null

  if (roomingMode === 'SAME_ORDER') {
    if (!orderId) badRequest('SAME_ORDER wajib pilih Order')
    // order must belong to Trip and be included in Stay
    await ensureOrderBelongsTrip(db, orderId, stay.tripId, workspaceId)
    const stayOrder = await db.select().from(tourAccommodationStayOrders).where(and(eq(tourAccommodationStayOrders.workspaceId, workspaceId), eq(tourAccommodationStayOrders.stayId, stayId), eq(tourAccommodationStayOrders.orderId, orderId))).limit(1)
    if (!stayOrder[0]) badRequest(`Order #${orderId} belum termasuk di Stay #${stayId}. Tambahkan Order ke Stay dulu.`)
  } else {
    // SHARED_GROUP orderId should be null
    if (orderId) {
      // Spec says should be null, but we allow and clear? Prefer clear.
      orderId = null
    }
  }

  const rows = await db.insert(tourAccommodationRooms).values({
    workspaceId,
    stayId,
    roomLabel,
    roomNumber: input.roomNumber || null,
    roomType,
    capacity,
    roomingMode,
    orderId,
    notes: input.notes || null,
  } as any).returning()
  return rows[0]
}

export async function updateAccommodationRoom(db: DbLike, id: number, workspaceId: number, patch: {
  roomLabel?: string
  roomNumber?: string | null
  roomType?: string
  capacity?: number
  roomingMode?: string
  orderId?: number | null
  notes?: string | null
}) {
  const existing = await getAccommodationRoom(db, id, workspaceId)
  if (!existing) notFound('Room tidak ditemukan')

  const stay = await getAccommodationStay(db, existing.stayId, workspaceId)
  if (!stay) badRequest('Stay tidak ditemukan')

  // ── Compute final merged state for validation ───────────────────────────
  const finalMode = (patch.roomingMode !== undefined ? patch.roomingMode : existing.roomingMode) as string
  const finalOrderIdRaw = patch.orderId !== undefined ? patch.orderId : existing.orderId
  const finalOrderId = finalOrderIdRaw ? Number(finalOrderIdRaw) : null

  // SAME_ORDER requires orderId
  if (finalMode === 'SAME_ORDER' && !finalOrderId) {
    badRequest('SAME_ORDER wajib memiliki Order. Pilih Order yang termasuk di Stay ini.')
  }
  if (finalMode === 'SHARED_GROUP' && finalOrderId) {
    // If final mode SHARED_GROUP but orderId present (and patch didn't explicitly clear), we will clear it, but if patch explicitly set orderId with SHARED_GROUP, reject
    if (patch.orderId !== undefined && patch.orderId !== null) {
      badRequest('SHARED_GROUP tidak boleh punya orderId, harus null')
    }
  }

  // If final is SAME_ORDER, validate order belongs to same workspace, Trip, Stay, compatible occupants
  if (finalMode === 'SAME_ORDER' && finalOrderId) {
    await ensureOrderBelongsTrip(db, finalOrderId, stay.tripId, workspaceId)
    const stayOrder = await db.select().from(tourAccommodationStayOrders).where(and(eq(tourAccommodationStayOrders.workspaceId, workspaceId), eq(tourAccommodationStayOrders.stayId, existing.stayId), eq(tourAccommodationStayOrders.orderId, finalOrderId))).limit(1)
    if (!stayOrder[0]) badRequest(`Order #${finalOrderId} belum termasuk di Stay #${existing.stayId}. Tambahkan Order ke Stay dulu.`)

    // If changing order (existing orderId != finalOrderId) and room has occupants, validate all occupants belong to new order
    if (existing.orderId && Number(existing.orderId) !== finalOrderId) {
      const occupants = await db.select().from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.roomId, id)))
      if (occupants.length) {
        const jamaahIds = occupants.map(o=>o.jamaahId)
        const jamaah = await db.select().from(tourJamaah).where(and(eq(tourJamaah.workspaceId, workspaceId), inArray(tourJamaah.id, jamaahIds)))
        const invalid = jamaah.filter(j=>j.orderId !== finalOrderId)
        if (invalid.length) {
          const invalidNames = invalid.map(j=>j.fullName || j.jamaahCode).slice(0,3).join(', ')
          badRequest(`Tidak bisa ganti Order Room ke #${finalOrderId} karena masih ada ${invalid.length} Jamaah dari Order lain (${invalidNames}). Keluarkan dulu.`)
        }
      }
    }
    // Also validate existing occupants compatibility even if orderId not changed but stay orders changed earlier – ensure all occupants still belong to finalOrderId
    if (finalMode === 'SAME_ORDER') {
      const occupants = await db.select().from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.roomId, id)))
      if (occupants.length) {
        const jamaahIds = occupants.map(o=>o.jamaahId)
        const jamaah = await db.select().from(tourJamaah).where(and(eq(tourJamaah.workspaceId, workspaceId), inArray(tourJamaah.id, jamaahIds)))
        const invalid = jamaah.filter(j=>j.orderId !== finalOrderId)
        if (invalid.length) {
          badRequest(`Room ${existing.roomLabel} berisi Jamaah yang tidak kompatibel dengan Order #${finalOrderId}. Keluarkan dulu.`)
        }
      }
    }
  }

  const updatePayload: any = {}

  if (patch.roomLabel !== undefined) {
    const label = String(patch.roomLabel).trim()
    if (!label) badRequest('roomLabel tidak boleh kosong')
    updatePayload.roomLabel = label
  }
  if (patch.roomNumber !== undefined) updatePayload.roomNumber = patch.roomNumber || null
  if (patch.roomType !== undefined) {
    const validTypes = ['SINGLE','DOUBLE','TRIPLE','QUAD','QUINT','OTHER']
    if (!validTypes.includes(patch.roomType)) badRequest(`roomType tidak valid`)
    updatePayload.roomType = patch.roomType
  }
  if (patch.capacity !== undefined) {
    const cap = Number(patch.capacity)
    if (!cap || cap <=0) badRequest('capacity harus >0')
    if (cap > 10) badRequest('capacity maksimal 10')
    const occupants = await db.select({ v: count() }).from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.roomId, id)))
    const currentOccupied = occupants[0]?.v ?? 0
    if (currentOccupied > cap) badRequest(`Room ${existing.roomLabel} sudah terisi ${currentOccupied}, tidak bisa turunkan capacity ke ${cap}`)
    updatePayload.capacity = cap
  }
  if (patch.roomingMode !== undefined) {
    if (!['SAME_ORDER','SHARED_GROUP'].includes(patch.roomingMode)) badRequest('roomingMode harus SAME_ORDER atau SHARED_GROUP')
    updatePayload.roomingMode = patch.roomingMode
    if (patch.roomingMode === 'SHARED_GROUP') {
      updatePayload.orderId = null
    }
  }
  if (patch.orderId !== undefined) {
    if (finalMode === 'SHARED_GROUP') {
      updatePayload.orderId = null
    } else {
      // SAME_ORDER – finalOrderId already validated
      updatePayload.orderId = finalOrderId
    }
  }
  if (patch.notes !== undefined) updatePayload.notes = patch.notes

  // If mode changed to SAME_ORDER without orderId in patch but existing had orderId null, final validation already rejected above.
  // If mode changed from SHARED to SAME and orderId not provided, we already rejected. But if patch provides mode SAME and orderId together, handled.

  if (Object.keys(updatePayload).length) {
    updatePayload.updatedAt = new Date()
    await db.update(tourAccommodationRooms).set(updatePayload).where(and(eq(tourAccommodationRooms.id, id), eq(tourAccommodationRooms.workspaceId, workspaceId)))
  }

  return getAccommodationRoom(db, id, workspaceId)
}

export async function softDeleteAccommodationRoom(db: DbLike, id: number, workspaceId: number) {
  // Check occupants – block delete if still occupied? Allow but cascade? Spec says allow remove from room. For safety, block delete if occupied.
  const occupants = await db.select({ v: count() }).from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.roomId, id)))
  if ((occupants[0]?.v ?? 0) > 0) badRequest('Room masih ada occupant, keluarkan dulu sebelum hapus')
  const rows = await db.update(tourAccommodationRooms).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(tourAccommodationRooms.id, id), eq(tourAccommodationRooms.workspaceId, workspaceId))).returning({ id: tourAccommodationRooms.id })
  return rows[0] ?? null
}

// ─── Occupants ───────────────────────────────────────────────────────────────
export async function assignJamaahToRoom(db: DbLike, workspaceId: number, input: {
  stayId: number
  roomId: number
  jamaahId: number
}) {
  const stayId = Number(input.stayId)
  const roomId = Number(input.roomId)
  const jamaahId = Number(input.jamaahId)

  const stay = await getAccommodationStay(db, stayId, workspaceId)
  if (!stay) badRequest(`Stay #${stayId} tidak ditemukan`)

  const room = await getAccommodationRoom(db, roomId, workspaceId)
  if (!room) badRequest(`Room #${roomId} tidak ditemukan`)
  if (room.stayId !== stayId) badRequest(`Room #${roomId} bukan milik Stay #${stayId}`)

  const jamaah = await db.select().from(tourJamaah).where(and(eq(tourJamaah.id, jamaahId), eq(tourJamaah.workspaceId, workspaceId), notDeleted(tourJamaah))).limit(1).then(r=>r[0])
  if (!jamaah) badRequest(`Jamaah #${jamaahId} tidak ditemukan atau bukan milik workspace`)

  // Jamaah's Order must be assigned to Trip
  await ensureOrderBelongsTrip(db, jamaah.orderId, stay.tripId, workspaceId)

  // Jamaah's Order must be included in Stay
  const stayOrder = await db.select().from(tourAccommodationStayOrders).where(and(eq(tourAccommodationStayOrders.workspaceId, workspaceId), eq(tourAccommodationStayOrders.stayId, stayId), eq(tourAccommodationStayOrders.orderId, jamaah.orderId))).limit(1)
  if (!stayOrder[0]) badRequest(`Order Jamaah #${jamaahId} (Order #${jamaah.orderId}) belum termasuk di Stay #${stayId}`)

  // Same Jamaah cannot occupy two Rooms in same Stay (unique stayId+jamaahId)
  const existingOccupantSameStay = await db.select().from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.stayId, stayId), eq(tourRoomOccupants.jamaahId, jamaahId))).limit(1)
  if (existingOccupantSameStay[0]) badRequest(`Jamaah ${jamaah.jamaahCode} sudah menempati Room lain di Stay yang sama (Room #${existingOccupantSameStay[0].roomId}). Satu Jamaah hanya boleh 1 Room per Stay.`)

  // Room capacity
  const occupiedCount = await db.select({ v: count() }).from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.roomId, roomId))).then(r=>r[0]?.v ?? 0)
  if (occupiedCount >= room.capacity) badRequest(`Room ${room.roomLabel} is already full (${occupiedCount}/${room.capacity}).`)

  // SAME_ORDER rule
  if (room.roomingMode === 'SAME_ORDER') {
    if (!room.orderId) badRequest('Room SAME_ORDER harus punya orderId')
    if (jamaah.orderId !== room.orderId) badRequest(`SAME_ORDER: Room ${room.roomLabel} hanya untuk Order #${room.orderId}, Jamaah ini Order #${jamaah.orderId} tidak boleh.`)
  }

  // SHARED_GROUP – no extra check, already validated order in stay

  const rows = await db.insert(tourRoomOccupants).values({
    workspaceId,
    stayId,
    roomId,
    jamaahId,
  } as any).returning()
  return rows[0]
}

export async function removeOccupant(db: DbLike, workspaceId: number, occupantId: number) {
  const rows = await db.delete(tourRoomOccupants).where(and(eq(tourRoomOccupants.id, occupantId), eq(tourRoomOccupants.workspaceId, workspaceId))).returning()
  if (!rows[0]) notFound('Occupant tidak ditemukan')
  return rows[0]
}

export async function removeJamaahFromStay(db: DbLike, workspaceId: number, stayId: number, jamaahId: number) {
  const rows = await db.delete(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.stayId, stayId), eq(tourRoomOccupants.jamaahId, jamaahId))).returning()
  return rows[0] ?? null
}

export async function moveJamaahToRoom(db: DbLike, workspaceId: number, input: {
  stayId: number
  jamaahId: number
  toRoomId: number
}) {
  const stayId = Number(input.stayId)
  const jamaahId = Number(input.jamaahId)
  const toRoomId = Number(input.toRoomId)

  // Find existing occupant in same stay
  const existing = await db.select().from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.stayId, stayId), eq(tourRoomOccupants.jamaahId, jamaahId))).limit(1).then(r=>r[0]||null)

  // Validate destination room first (without existing counting)
  const stay = await getAccommodationStay(db, stayId, workspaceId)
  if (!stay) badRequest('Stay tidak ditemukan')
  const room = await getAccommodationRoom(db, toRoomId, workspaceId)
  if (!room) badRequest('Room tujuan tidak ditemukan')
  if (room.stayId !== stayId) badRequest('Room tujuan bukan milik Stay ini')

  const jamaah = await db.select().from(tourJamaah).where(and(eq(tourJamaah.id, jamaahId), eq(tourJamaah.workspaceId, workspaceId), notDeleted(tourJamaah))).limit(1).then(r=>r[0])
  if (!jamaah) badRequest('Jamaah tidak ditemukan')

  await ensureOrderBelongsTrip(db, jamaah.orderId, stay.tripId, workspaceId)
  const stayOrder = await db.select().from(tourAccommodationStayOrders).where(and(eq(tourAccommodationStayOrders.workspaceId, workspaceId), eq(tourAccommodationStayOrders.stayId, stayId), eq(tourAccommodationStayOrders.orderId, jamaah.orderId))).limit(1)
  if (!stayOrder[0]) badRequest('Order Jamaah belum termasuk di Stay')

  const occupiedCount = await db.select({ v: count() }).from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.roomId, toRoomId))).then(r=>r[0]?.v ?? 0)
  // If moving from same room, capacity ok
  const isSameRoom = existing && existing.roomId === toRoomId
  if (!isSameRoom && occupiedCount >= room.capacity) badRequest(`Room ${room.roomLabel} is already full (${occupiedCount}/${room.capacity}).`)

  if (room.roomingMode === 'SAME_ORDER' && jamaah.orderId !== room.orderId) badRequest(`SAME_ORDER: Room hanya untuk Order #${room.orderId}`)

  if (existing) {
    // Update existing occupant to new room
    const updated = await db.update(tourRoomOccupants).set({ roomId: toRoomId } as any).where(and(eq(tourRoomOccupants.id, existing.id), eq(tourRoomOccupants.workspaceId, workspaceId))).returning()
    return updated[0]
  } else {
    // Assign fresh
    return assignJamaahToRoom(db, workspaceId, { stayId, roomId: toRoomId, jamaahId })
  }
}

export async function listOccupantsByStay(db: DbLike, workspaceId: number, stayId: number) {
  return db.select().from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.stayId, stayId))).orderBy(desc(tourRoomOccupants.createdAt))
}

export async function listOccupantsByRoom(db: DbLike, workspaceId: number, roomId: number) {
  return db.select().from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.roomId, roomId))).orderBy(desc(tourRoomOccupants.createdAt))
}

// ─── Completeness helpers ───────────────────────────────────────────────────
export async function getStayCompleteness(db: DbLike, workspaceId: number, stayId: number) {
  const stay = await getAccommodationStay(db, stayId, workspaceId)
  if (!stay) notFound('Stay tidak ditemukan')
  const stayOrders = await db.select().from(tourAccommodationStayOrders).where(and(eq(tourAccommodationStayOrders.workspaceId, workspaceId), eq(tourAccommodationStayOrders.stayId, stayId)))
  const orderIds = stayOrders.map(o=>o.orderId)
  if (!orderIds.length) return { eligible: 0, assigned: 0, unassigned: 0, completeness: 0, isComplete: false, unassignedList: [] as any[] }

  const jamaah = await db.select().from(tourJamaah).where(and(eq(tourJamaah.workspaceId, workspaceId), inArray(tourJamaah.orderId, orderIds), notDeleted(tourJamaah)))
  const occupants = await db.select().from(tourRoomOccupants).where(and(eq(tourRoomOccupants.workspaceId, workspaceId), eq(tourRoomOccupants.stayId, stayId)))
  const assignedIds = new Set(occupants.map(o=>o.jamaahId))
  const unassigned = jamaah.filter(j=>!assignedIds.has(j.id))

  return {
    eligible: jamaah.length,
    assigned: occupants.length,
    unassigned: unassigned.length,
    completeness: jamaah.length ? Math.round((occupants.length/jamaah.length)*100) : 0,
    isComplete: jamaah.length>0 && occupants.length>=jamaah.length,
    unassignedList: unassigned,
  }
}
