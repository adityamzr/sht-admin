<script setup lang="ts">
import { FileDown, ArrowLeft, Eye, Pencil, Ban, RefreshCw } from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const id = computed(() => Number(route.params.id))
const { success: toastSuccess, error: toastError } = useAdminToast()

const { data, pending, error, refresh } = await useAdminFetch<{ data: any }>(`/api/admin/tour/invoices/${id.value}`)
const invoice = computed(() => data.value?.data ?? null)

const pdfGenerating = ref(false)

function formatIdr(value: number) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`
}

function formatDate(value: string | null) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(`${value}T00:00:00Z`))
  } catch { return value }
}

function paymentStatusLabel(status: string) {
  switch (status) {
    case 'UNPAID': return 'BELUM DIBAYAR'
    case 'PARTIAL': return 'DIBAYAR SEBAGIAN'
    case 'PAID': return 'LUNAS'
    case 'OVERDUE': return 'JATUH TEMPO'
    default: return status
  }
}

async function downloadPdf() {
  if (!invoice.value) return
  if (pdfGenerating.value) return
  pdfGenerating.value = true
  try {
    const blob = await $fetch<Blob>(`/api/admin/tour/invoices/${invoice.value.id}/pdf`, {
      responseType: 'blob' as any,
      headers: import.meta.server ? useRequestHeaders(['cookie']) as any : undefined,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Invoice-${invoice.value.invoiceCode}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toastSuccess('PDF Invoice berhasil diunduh')
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || e?.message || 'Gagal mengunduh PDF'
    toastError(msg)
  } finally {
    pdfGenerating.value = false
  }
}
</script>

<template>
  <div>
    <PageHead :title="invoice ? `Invoice ${invoice.invoiceCode}` : 'Detail Invoice'" :subtitle="invoice?.description || 'Rincian tagihan pelanggan'">
      <template #actions>
        <div class="flex gap-2">
          <NuxtLink to="/tour/finance/invoices" class="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-neutral-line bg-white px-4 py-2 text-sm font-semibold">
            <ArrowLeft class="h-4 w-4" /> Kembali
          </NuxtLink>
          <button v-if="invoice" type="button" class="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-sht-olive px-5 py-2 text-sm font-semibold text-white disabled:opacity-60" :disabled="pdfGenerating" @click="downloadPdf">
            <FileDown v-if="!pdfGenerating" class="h-4 w-4" />
            <RefreshCw v-else class="h-4 w-4 animate-spin" />
            {{ pdfGenerating ? 'Membuat PDF...' : 'Download Invoice' }}
          </button>
        </div>
      </template>
    </PageHead>

    <div v-if="pending" class="mt-6">
      <AdminTableSkeleton :rows="5" :columns="2" />
    </div>

    <div v-else-if="error || !invoice" class="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
      <p class="font-semibold text-red-800">Invoice tidak ditemukan.</p>
      <p class="mt-1 text-sm text-red-700">{{ (error as any)?.data?.statusMessage || 'Gagal memuat invoice' }}</p>
      <button class="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white" @click="refresh()">Coba lagi</button>
    </div>

    <div v-else class="mt-6 space-y-6">
      <!-- Watermark alerts -->
      <div v-if="invoice.state === 'DRAFT'" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>DRAFT — BELUM DITERBITKAN:</strong> Invoice ini belum final dan belum masuk piutang.
      </div>
      <div v-if="invoice.state === 'CANCELLED'" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <strong>DIBATALKAN / CANCELLED:</strong> Invoice ini dibatalkan dan tidak dapat ditagihkan.
      </div>

      <!-- Main info -->
      <div class="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <div class="rounded-2xl border border-neutral-line bg-white p-6">
          <h3 class="font-semibold text-neutral-charcoal">Informasi Invoice</h3>
          <div class="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Nomor Invoice</p>
              <p class="mt-1 font-mono font-semibold text-sht-olive">{{ invoice.invoiceCode }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Status Invoice</p>
              <div class="mt-1"><TourStatusBadge :status="invoice.state" type="invoice" /></div>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Tanggal Invoice</p>
              <p class="mt-1 font-medium">{{ formatDate(invoice.issueDate) }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Jatuh Tempo</p>
              <p class="mt-1 font-medium">{{ invoice.dueDate ? formatDate(invoice.dueDate) : '—' }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Status Pembayaran</p>
              <div class="mt-1 flex items-center gap-2">
                <TourStatusBadge :status="invoice.paymentStatus" type="paymentStatus" />
                <span class="text-xs font-semibold">{{ paymentStatusLabel(invoice.paymentStatus) }}</span>
              </div>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Referensi Order</p>
              <NuxtLink v-if="invoice.order" :to="`/tour/orders/${invoice.order.id}`" class="mt-1 inline-block font-mono text-sm font-semibold text-brand-teal hover:underline">{{ invoice.order.orderCode }}</NuxtLink>
              <p v-else class="mt-1 text-sm">Order #{{ invoice.orderId }}</p>
            </div>
          </div>

          <div class="mt-6">
            <p class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Deskripsi</p>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{{ invoice.description || '—' }}</p>
          </div>

          <div v-if="invoice.notes" class="mt-6">
            <p class="text-xs uppercase tracking-wide text-neutral-charcoal/50">Catatan</p>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-charcoal/70">{{ invoice.notes }}</p>
          </div>
        </div>

        <div class="space-y-6">
          <div class="rounded-2xl border border-neutral-line bg-white p-6">
            <h3 class="font-semibold">Pelanggan</h3>
            <div v-if="invoice.customer" class="mt-4 space-y-2 text-sm">
              <p class="font-semibold">{{ invoice.customer.name }}</p>
              <p v-if="invoice.customer.whatsapp" class="text-neutral-charcoal/60">WA: {{ invoice.customer.whatsapp }}</p>
              <p v-if="invoice.customer.email" class="text-neutral-charcoal/60">Email: {{ invoice.customer.email }}</p>
              <p v-if="invoice.customer.city" class="text-neutral-charcoal/60">Kota: {{ invoice.customer.city }}</p>
              <p class="font-mono text-xs text-neutral-charcoal/50">{{ invoice.customer.customerCode }}</p>
            </div>
            <p v-else class="mt-4 text-sm text-neutral-charcoal/50">Data pelanggan tidak tersedia</p>
          </div>

          <div class="rounded-2xl border border-neutral-line bg-white p-6">
            <h3 class="font-semibold">Ringkasan Keuangan</h3>
            <div class="mt-4 space-y-4">
              <div class="flex justify-between">
                <span class="text-sm text-neutral-charcoal/60">Total Tagihan</span>
                <span class="font-semibold">{{ formatIdr(Number(invoice.amountIdr)) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-neutral-charcoal/60">Sudah Dibayar (VERIFIED)</span>
                <span class="font-semibold text-emerald-700">{{ formatIdr(Number(invoice.totalPaid || 0)) }}</span>
              </div>
              <div class="border-t pt-3 flex justify-between">
                <span class="text-sm font-semibold">Sisa Tagihan</span>
                <span class="font-bold" :class="(invoice.outstanding || 0) > 0 ? 'text-amber-700' : 'text-emerald-700'">{{ formatIdr(Number(invoice.outstanding || 0)) }}</span>
              </div>
              <div class="rounded-xl bg-neutral-warm px-3 py-2 text-xs">
                Hanya pembayaran <strong>VERIFIED</strong> yang dihitung. DRAFT & VOID tidak termasuk.
              </div>
            </div>

            <NuxtLink :to="`/tour/finance/payments?invoiceId=${invoice.id}`" class="mt-4 inline-flex w-full justify-center rounded-xl border border-neutral-line bg-white px-4 py-2.5 text-sm font-semibold hover:bg-neutral-warm">
              <Eye class="mr-2 h-4 w-4" /> Lihat Payments
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
