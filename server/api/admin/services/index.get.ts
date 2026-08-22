import { useDb } from '~/server/db'
import { listServices } from '~/server/services/catalog'
import { adminService } from '~/server/utils/serializers'

export default defineEventHandler(async () => {
  const rows = await listServices(useDb())
  return { data: rows.map(adminService) }
})
