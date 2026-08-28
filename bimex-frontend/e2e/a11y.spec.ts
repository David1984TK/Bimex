import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockFreighterDisconnected } from './fixtures/freighter'

test.describe('Accessibility Checks', () => {
  const routes = ['/', '/proyectos']
  
  for (const route of routes) {
    test(`a11y for route ${route}`, async ({ page }) => {
      await page.addInitScript(() => {
        sessionStorage.clear()
        localStorage.removeItem('bimex.wallet.session')
      })
      await mockFreighterDisconnected(page)
      await page.goto(route)
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
        
      const criticalAndSerious = accessibilityScanResults.violations.filter(
        (v: any) => v.impact === 'serious' || v.impact === 'critical'
      )
      
      expect(criticalAndSerious).toEqual([])
    })
  }
})
