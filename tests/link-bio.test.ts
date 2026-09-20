import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { linkBioInput, linkBioLinkInput, LINK_BIO_TYPES } from '../server/utils/validators'

describe('Link Bio – validation', () => {
  it('safe URLs pass', () => {
    const safe = [
      'https://sudutharamain.id/',
      'https://www.instagram.com/sudutharamain.id/',
      'https://wa.me/628212122424',
      'https://chat.whatsapp.com/abc123',
      'https://whatsapp.com/channel/0029Va',
      'http://example.com',
      'mailto:test@example.com',
      'tel:+628212122424',
    ]
    for (const url of safe) {
      const res = linkBioLinkInput.safeParse({ id: '1', label: 'Test', url, type: 'website', sortOrder: 0 })
      assert.equal(res.success, true, `should pass: ${url}`)
    }
  })

  it('unsafe URLs fail', () => {
    const unsafe = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'ftp://example.com',
      '',
      '   ',
    ]
    for (const url of unsafe) {
      const res = linkBioLinkInput.safeParse({ id: '1', label: 'Test', url, type: 'website', sortOrder: 0 })
      assert.equal(res.success, false, `should fail: ${url}`)
    }
  })

  it('link types enum valid', () => {
    assert.ok(LINK_BIO_TYPES.includes('website'))
    assert.ok(LINK_BIO_TYPES.includes('whatsapp'))
    assert.ok(LINK_BIO_TYPES.includes('instagram'))
    assert.ok(LINK_BIO_TYPES.includes('youtube'))
    assert.ok(LINK_BIO_TYPES.includes('tiktok'))
  })

  it('link persists with all fields', () => {
    const link = {
      id: 'test-id',
      label: 'Channel WhatsApp',
      description: 'Ikuti informasi terbaru',
      url: 'https://whatsapp.com/channel/xyz',
      type: 'whatsapp' as const,
      featured: true,
      isActive: true,
      sortOrder: 10,
      group: 'Komunitas',
    }
    const res = linkBioLinkInput.safeParse(link)
    assert.equal(res.success, true)
    if (res.success) {
      assert.equal(res.data.label, link.label)
      assert.equal(res.data.featured, true)
      assert.equal(res.data.group, 'Komunitas')
    }
  })

  it('full link-bio settings valid', () => {
    const input = {
      title: 'Sudut Haramain',
      description: 'Informasi, panduan, dan cerita dari Makkah & Madinah.',
      links: [
        { id: '1', label: 'Website', url: 'https://sudutharamain.id/', type: 'website' as const, sortOrder: 0 },
        { id: '2', label: 'Instagram', url: 'https://www.instagram.com/sudutharamain.id/', type: 'instagram' as const, featured: false, isActive: true, sortOrder: 10 },
      ],
    }
    const res = linkBioInput.safeParse(input)
    assert.equal(res.success, true)
  })

  it('empty links allowed', () => {
    const res = linkBioInput.safeParse({ title: 'Sudut Haramain', description: null, links: [] })
    assert.equal(res.success, true)
  })

  it('max 50 links', () => {
    const links = Array.from({ length: 51 }, (_, i) => ({ id: `${i}`, label: `Link ${i}`, url: 'https://example.com', type: 'website' as const, sortOrder: i }))
    const res = linkBioInput.safeParse({ title: 'Test', links })
    assert.equal(res.success, false)
  })
})

describe('Link Bio – ordering/active/featured', () => {
  it('active filtering', () => {
    const links = [
      { id: '1', label: 'A', url: 'https://a.com', type: 'website' as const, isActive: true, sortOrder: 30 },
      { id: '2', label: 'B', url: 'https://b.com', type: 'website' as const, isActive: false, sortOrder: 10 },
      { id: '3', label: 'C', url: 'https://c.com', type: 'website' as const, isActive: true, sortOrder: 10 },
    ]
    const active = links.filter(l => l.isActive !== false).sort((a,b) => (a.sortOrder??0)-(b.sortOrder??0))
    assert.equal(active.length, 2)
    assert.equal(active[0].label, 'C')
  })

  it('featured detection', () => {
    const links = [
      { id: '1', label: 'Featured', url: 'https://a.com', type: 'whatsapp' as const, featured: true, isActive: true, sortOrder: 0 },
      { id: '2', label: 'Normal', url: 'https://b.com', type: 'website' as const, featured: false, isActive: true, sortOrder: 10 },
    ]
    const featured = links.filter(l => l.featured)
    assert.equal(featured.length, 1)
  })

  it('reorder changes sortOrder', () => {
    let links = [
      { id: '1', label: 'A', url: 'https://a.com', type: 'website' as const, sortOrder: 0 },
      { id: '2', label: 'B', url: 'https://b.com', type: 'website' as const, sortOrder: 10 },
      { id: '3', label: 'C', url: 'https://c.com', type: 'website' as const, sortOrder: 20 },
    ]
    // Move C to first
    const from = 2, to = 0
    const next = [...links]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item!)
    next.forEach((l, idx) => l.sortOrder = idx * 10)
    assert.equal(next[0].label, 'C')
    assert.equal(next[0].sortOrder, 0)
    assert.equal(next[1].label, 'A')
  })

  it('grouping support', () => {
    const links = [
      { id: '1', label: 'A', url: 'https://a.com', type: 'website' as const, group: 'Informasi', sortOrder: 0 },
      { id: '2', label: 'B', url: 'https://b.com', type: 'website' as const, group: 'Komunitas', sortOrder: 10 },
      { id: '3', label: 'C', url: 'https://c.com', type: 'website' as const, group: 'Informasi', sortOrder: 20 },
    ]
    const groups = new Map<string | null, typeof links>()
    for (const l of links) {
      const g = l.group ?? null
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g)!.push(l)
    }
    assert.equal(groups.size, 2)
    assert.equal(groups.get('Informasi')?.length, 2)
  })
})
