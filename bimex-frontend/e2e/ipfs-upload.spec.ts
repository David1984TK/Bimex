import { test, expect, type Page } from '@playwright/test'
import { mockFreighterConnected } from './fixtures/freighter'

const INDEXER = 'http://localhost:3001'
const MOCK_CID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'

const MIN_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

const MIN_PDF = Buffer.from(
  '%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n',
  'utf8',
)

async function seedWalletSession(page: Page) {
    await page.addInitScript(() => {
      sessionStorage.setItem('bimex.wallet.session', '1')
      localStorage.setItem('bimex.tour.completed', 'true')
    })
}

async function stubIndexerReads(page: Page) {
  await page.route(`${INDEXER}/**`, async (route) => {
    const req = route.request()
    const url = req.url()

    if (req.method() === 'GET' && url.includes('/proyectos')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
      return
    }

    // Let a later, more specific /ipfs-upload handler fulfill uploads (Playwright LIFO).
    if (url.includes('/ipfs-upload')) {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
}

test.describe('IPFS upload via indexer proxy (#145)', () => {
  test('create-project docs upload hits /ipfs-upload, never api.pinata.cloud', async ({ page }) => {
    const pinataHits: string[] = []
    const uploadBodies: unknown[] = []

    await mockFreighterConnected(page)
    await seedWalletSession(page)

    // Broader stub first; more specific /ipfs-upload route registered after wins (LIFO).
    await stubIndexerReads(page)

    await page.route('**/api.pinata.cloud/**', async (route) => {
      pinataHits.push(route.request().url())
      await route.abort()
    })

    await page.route(`${INDEXER}/ipfs-upload`, async (route) => {
      const req = route.request()
      expect(req.method()).toBe('POST')
      expect(req.headers()['content-type'] || '').toContain('application/json')
      const body = req.postDataJSON()
      uploadBodies.push(body)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ IpfsHash: MOCK_CID }),
      })
    })

    await page.goto('/proyectos')
    await expect(page.getByRole('button', { name: /crear/i }).first()).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /crear/i }).first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    await dialog.locator('#campo-nombre').fill('Proyecto E2E IPFS')
    await dialog.locator('#campo-meta').fill('10000')
    await dialog.locator('#campo-tiempo').fill('6')
    await dialog.getByRole('button', { name: /siguiente.*documentos/i }).click()

    await dialog.locator('#doc-ine').setInputFiles({
      name: 'ine.png',
      mimeType: 'image/png',
      buffer: MIN_PNG,
    })
    await dialog.locator('#doc-plan').setInputFiles({
      name: 'plan.pdf',
      mimeType: 'application/pdf',
      buffer: MIN_PDF,
    })
    await dialog.locator('#doc-presupuesto').setInputFiles({
      name: 'presupuesto.pdf',
      mimeType: 'application/pdf',
      buffer: MIN_PDF,
    })

    const generateBtn = dialog.getByRole('button', { name: /generar huella digital/i })
    await expect(generateBtn).toBeEnabled({ timeout: 10_000 })
    await generateBtn.click()

    await expect(dialog.getByText('Documentos en IPFS')).toBeVisible({ timeout: 15_000 })
    const truncated = `${MOCK_CID.slice(0, 20)}…`
    await expect(dialog.getByRole('link', { name: truncated }).first()).toBeVisible()

    expect(uploadBodies.length).toBe(3)
    for (const body of uploadBodies as Array<{ filename: string; mimeType: string; base64: string }>) {
      expect(body.filename).toMatch(/\.(png|pdf)$/)
      expect(body.mimeType).toMatch(/^(image\/png|application\/pdf)$/)
      expect(body.base64.length).toBeGreaterThan(0)
    }
    expect(pinataHits).toEqual([])
  })
})
