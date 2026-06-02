import { test, expect } from '@playwright/test'
import { mockFreighterConnected, MOCK_ADDRESS } from './fixtures/freighter'

const MOCK_PROJECTS = [
  {
    id: 0, nombre: 'Proyecto Alfa', estado: 'EtapaInicial', dueno: MOCK_ADDRESS,
    meta: '100000000', aportado: '20000000', yield_entregado: '0',
    capital_en_cetes: '0', capital_en_amm: '0',
    yield_cetes_acumulado: '0', yield_amm_acumulado: '0',
    timestamp_inicio: 0, timestamp_vencimiento: 0, tiempo_meses: 12,
    doc_hash: '', motivo_rechazo: '', descripcion: 'Descripción alfa',
  },
  {
    id: 1, nombre: 'Proyecto Beta', estado: 'EnProgreso', dueno: MOCK_ADDRESS,
    meta: '200000000', aportado: '150000000', yield_entregado: '500000',
    capital_en_cetes: '75000000', capital_en_amm: '75000000',
    yield_cetes_acumulado: '250000', yield_amm_acumulado: '250000',
    timestamp_inicio: Math.floor(Date.now() / 1000) - 86400,
    timestamp_vencimiento: Math.floor(Date.now() / 1000) + 2592000,
    tiempo_meses: 12, doc_hash: 'QmHash1', motivo_rechazo: '',
    descripcion: 'Descripción beta con energía solar',
  },
  {
    id: 2, nombre: 'Proyecto Gamma', estado: 'Liberado', dueno: MOCK_ADDRESS,
    meta: '50000000', aportado: '50000000', yield_entregado: '1000000',
    capital_en_cetes: '0', capital_en_amm: '0',
    yield_cetes_acumulado: '500000', yield_amm_acumulado: '500000',
    timestamp_inicio: 0, timestamp_vencimiento: 0, tiempo_meses: 6,
    doc_hash: 'QmHash2', motivo_rechazo: '', descripcion: 'Descripción gamma',
  },
  {
    id: 3, nombre: 'Proyecto Delta', estado: 'Abandonado', dueno: MOCK_ADDRESS,
    meta: '30000000', aportado: '5000000', yield_entregado: '0',
    capital_en_cetes: '0', capital_en_amm: '0',
    yield_cetes_acumulado: '0', yield_amm_acumulado: '0',
    timestamp_inicio: 0, timestamp_vencimiento: 0, tiempo_meses: 3,
    doc_hash: '', motivo_rechazo: 'Fondos insuficientes', descripcion: '',
  },
]

async function stubContrato(page: import('@playwright/test').Page) {
  await page.addInitScript((projects: typeof MOCK_PROJECTS) => {
    const originalFetch = window.fetch.bind(window)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('soroban') || url.includes('stellar') || url.includes('rpc')) {
        return new Response(
          JSON.stringify({
            jsonrpc: '2.0', id: 1,
            result: { results: [{ xdr: btoa(JSON.stringify(projects)) }] },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return originalFetch(input, init)
    }
    ;(window as any).__BIMEX_MOCK_PROJECTS__ = projects
  }, MOCK_PROJECTS)
}

test.describe('Filtros de proyectos', () => {
  test.beforeEach(async ({ page }) => {
    await mockFreighterConnected(page)
    await stubContrato(page)
    await page.addInitScript(() => {
      sessionStorage.setItem('bimex.wallet.session', '1')
    })
    await page.goto('/proyectos')
  })

  test('carga la página de lista de proyectos', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10_000 })
  })

  test('renderiza la fila de filtros (Todos, En Progreso, etc.)', async ({ page }) => {
    const todosBtn = page.getByRole('button', { name: /todos/i })
    await expect(todosBtn).toBeVisible({ timeout: 10_000 })
  })

  test('el filtro "Todos" está activo por defecto', async ({ page }) => {
    const todosBtn = page.getByRole('button', { name: /todos/i })
    await expect(todosBtn).toBeVisible({ timeout: 10_000 })
    await expect(todosBtn).toHaveAttribute('aria-pressed', 'true')
  })

  test('al hacer clic en "En Progreso" se activa ese filtro', async ({ page }) => {
    const enProgresoBtn = page.getByRole('button', { name: /en progreso/i })
    await expect(enProgresoBtn).toBeVisible({ timeout: 10_000 })
    await enProgresoBtn.click()
    await expect(enProgresoBtn).toHaveAttribute('aria-pressed', 'true')
  })

  test('muestra el campo de búsqueda de proyectos', async ({ page }) => {
    const search = page.getByRole('searchbox')
    await expect(search).toBeVisible({ timeout: 10_000 })
  })

  test('muestra la navbar de la aplicación', async ({ page }) => {
    const navbar = page.getByRole('navigation', { name: /navegación principal/i })
    await expect(navbar).toBeVisible({ timeout: 10_000 })
  })

  test('muestra el botón para crear un proyecto', async ({ page }) => {
    const crearBtn = page.getByRole('button', { name: /crear/i })
    await expect(crearBtn.first()).toBeVisible({ timeout: 10_000 })
  })
})
