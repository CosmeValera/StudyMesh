const { chromium } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

const outDir = path.join(process.cwd(), 'tmp', 'playwright-audit')
fs.mkdirSync(outDir, { recursive: true })

function parseRgb(value) {
  const match = String(value).match(/rgba?\(([^)]+)\)/)
  if (!match) return null
  const parts = match[1].split(',').map((p) => Number.parseFloat(p.trim()))
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }
}

function blend(fg, bg) {
  const a = fg.a ?? 1
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  }
}

function luminance(c) {
  const vals = [c.r, c.g, c.b].map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * vals[0] + 0.7152 * vals[1] + 0.0722 * vals[2]
}

function contrast(fg, bg) {
  const l1 = luminance(fg)
  const l2 = luminance(bg)
  const hi = Math.max(l1, l2)
  const lo = Math.min(l1, l2)
  return (hi + 0.05) / (lo + 0.05)
}

async function scanContrast(page, label) {
  return await page.evaluate(({ label }) => {
    function parseRgb(value) {
      const match = String(value).match(/rgba?\(([^)]+)\)/)
      if (!match) return null
      const parts = match[1].split(',').map((p) => Number.parseFloat(p.trim()))
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }
    }
    function blend(fg, bg) {
      const a = fg.a ?? 1
      return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 }
    }
    function luminance(c) {
      const vals = [c.r, c.g, c.b].map((v) => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * vals[0] + 0.7152 * vals[1] + 0.0722 * vals[2]
    }
    function contrast(fg, bg) {
      const l1 = luminance(fg)
      const l2 = luminance(bg)
      const hi = Math.max(l1, l2)
      const lo = Math.min(l1, l2)
      return (hi + 0.05) / (lo + 0.05)
    }
    function effectiveBg(el) {
      let cur = el
      let bg = { r: 255, g: 255, b: 255, a: 1 }
      const chain = []
      while (cur && cur.nodeType === 1) {
        chain.push(cur)
        cur = cur.parentElement
      }
      chain.reverse().forEach((node) => {
        const c = parseRgb(getComputedStyle(node).backgroundColor)
        if (c && c.a > 0) bg = blend(c, bg)
      })
      return bg
    }
    const issues = []
    const nodes = Array.from(document.querySelectorAll('body *'))
    for (const el of nodes) {
      const style = getComputedStyle(el)
      if (style.visibility === 'hidden' || style.display === 'none') continue
      const rect = el.getBoundingClientRect()
      if (rect.width < 3 || rect.height < 3 || rect.bottom < 0 || rect.top > innerHeight) continue
      const text = (el.innerText || '').trim().replace(/\s+/g, ' ')
      if (!text || text.length > 160) continue
      if (Array.from(el.children).some((child) => (child.innerText || '').trim() === text)) continue
      const fg = parseRgb(style.color)
      if (!fg) continue
      const bg = effectiveBg(el)
      const actualFg = blend(fg, bg)
      const ratio = contrast(actualFg, bg)
      const fontSize = Number.parseFloat(style.fontSize) || 12
      const fontWeight = Number.parseInt(style.fontWeight, 10) || 400
      const threshold = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5
      if (ratio + 0.01 < threshold) {
        issues.push({ label, text, ratio: Number(ratio.toFixed(2)), threshold, color: style.color, bg: getComputedStyle(el).backgroundColor, tag: el.tagName, className: String(el.className).slice(0, 80) })
      }
    }
    return issues.slice(0, 40)
  }, { label })
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true })
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('console-error:', msg.text()) })
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.setItem('userData', JSON.stringify({ id: 'admin', name: 'Admin User', role: 'ADMIN_ROLE' })))
  await page.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' }).catch(async () => {})
  await page.waitForTimeout(1500)
  await shot(page, 'audit-workspace')
  const results = []
  results.push(...await scanContrast(page, 'workspace'))

  const dashboards = page.getByRole('button', { name: /dashboards/i }).first()
  if (await dashboards.count()) {
    await dashboards.click()
    await page.waitForTimeout(300)
    await shot(page, 'audit-dashboard-menu')
    results.push(...await scanContrast(page, 'dashboard-menu'))
    await page.keyboard.press('Escape')
  }

  const addWidget = page.getByRole('button', { name: /add widget/i }).first()
  if (await addWidget.count()) {
    await addWidget.click()
    await page.waitForTimeout(300)
    await shot(page, 'audit-add-widget-menu')
    results.push(...await scanContrast(page, 'add-widget-menu'))
    await page.keyboard.press('Escape')
  }

  const userButton = page.getByRole('button', { name: /admin user/i }).first()
  if (await userButton.count()) {
    await userButton.click()
    await page.waitForTimeout(300)
    await shot(page, 'audit-user-menu')
    results.push(...await scanContrast(page, 'user-menu'))
    await page.keyboard.press('Escape')
  }

  const create = page.getByRole('button', { name: /create widget/i }).first()
  if (await create.count()) {
    await create.click()
    await page.waitForTimeout(1000)
    await shot(page, 'audit-widget-editor')
    results.push(...await scanContrast(page, 'widget-editor'))
    const settings = page.locator('button').filter({ has: page.locator('svg') }).nth(0)
    const settingsByTitle = page.getByTitle(/settings/i).first()
    if (await settingsByTitle.count()) {
      await settingsByTitle.click()
      await page.waitForTimeout(500)
      await shot(page, 'audit-settings-dialog')
      results.push(...await scanContrast(page, 'settings-dialog'))
      await page.keyboard.press('Escape')
    }
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
  await mobile.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await mobile.evaluate(() => localStorage.setItem('userData', JSON.stringify({ id: 'admin', name: 'Admin User', role: 'ADMIN_ROLE' })))
  await mobile.goto('http://localhost:3000/workspace', { waitUntil: 'networkidle' }).catch(async () => {})
  await mobile.waitForTimeout(1500)
  await shot(mobile, 'audit-workspace-mobile')
  results.push(...await scanContrast(mobile, 'workspace-mobile'))

  fs.writeFileSync(path.join(outDir, 'contrast-results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify({ issueCount: results.length, firstIssues: results.slice(0, 12), outDir }, null, 2))
  await browser.close()
}

main().catch((err) => { console.error(err); process.exit(1) })
