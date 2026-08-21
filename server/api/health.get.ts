export default defineEventHandler(() => ({
  status: 'ok',
  service: 'sht-admin',
  time: new Date().toISOString(),
}))
