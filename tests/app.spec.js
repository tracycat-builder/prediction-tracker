const { test, expect } = require('@playwright/test');

const BASE = 'https://tracycat-builder.github.io/prediction-tracker/';

test.describe('Landing Page', () => {
  test('should load and display hero', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('.hero h1')).toBeVisible();
    await expect(page.locator('.hero h1')).toContainText('Predict');
    await expect(page.locator('.hero-badge')).toBeVisible();
  });

  test('should have working nav links', async ({ page }) => {
    await page.goto(BASE);
    // Nav should be visible
    await expect(page.locator('nav .logo')).toBeVisible();
    await expect(page.locator('nav .nav-links')).toBeVisible();
  });

  test('should display 3 feature cards', async ({ page }) => {
    await page.goto(BASE);
    const cards = page.locator('#features .cards-grid .card');
    await expect(cards).toHaveCount(3);
  });

  test('should display 3 how-it-works steps', async ({ page }) => {
    await page.goto(BASE);
    // The second cards-grid has 3 step cards
    const steps = page.locator('section:last-of-type .cards-grid .card, #landing section:nth-of-type(3) .cards-grid .card');
    expect(await steps.count()).toBeGreaterThanOrEqual(3);
  });

  test('CTA button should navigate to dashboard', async ({ page }) => {
    await page.goto(BASE);
    await page.click('.hero-cta .btn-primary');
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('#landing')).toBeHidden();
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.click('.hero-cta .btn-primary');
  });

  test('should show empty state initially', async ({ page }) => {
    await expect(page.locator('#emptyState')).toBeVisible();
  });

  test('should show stats grid with 5 stat cards', async ({ page }) => {
    const stats = page.locator('.stats-grid .stat-card');
    await expect(stats).toHaveCount(5);
  });

  test('tabs should be functional', async ({ page }) => {
    const tabs = page.locator('.tabs .tab');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toHaveClass(/active/);
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveClass(/active/);
    await expect(tabs.nth(0)).not.toHaveClass(/active/);
  });

  test('+ Stock button should open stock modal', async ({ page }) => {
    await page.click('button:has-text("+ Stock")');
    await expect(page.locator('#newModal')).toHaveClass(/show/);
    await expect(page.locator('#stockForm')).toBeVisible();
    await expect(page.locator('#customForm')).toBeHidden();
    await expect(page.locator('#modalTitle')).toContainText('Stock');
  });

  test('+ Custom button should open custom modal', async ({ page }) => {
    await page.click('button:has-text("+ Custom")');
    await expect(page.locator('#newModal')).toHaveClass(/show/);
    await expect(page.locator('#customForm')).toBeVisible();
    await expect(page.locator('#stockForm')).toBeHidden();
  });

  test('modal close button should work', async ({ page }) => {
    await page.click('button:has-text("+ Stock")');
    await expect(page.locator('#newModal')).toHaveClass(/show/);
    await page.click('#newModal .modal button:has-text("✕")');
    await expect(page.locator('#newModal')).not.toHaveClass(/show/);
  });

  test('modal should close on overlay click', async ({ page }) => {
    await page.click('button:has-text("+ Stock")');
    await expect(page.locator('#newModal')).toHaveClass(/show/);
    await page.click('#newModal', { position: { x: 5, y: 5 } });
    await expect(page.locator('#newModal')).not.toHaveClass(/show/);
  });
});

test.describe('Stock Prediction Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    // Clear localStorage
    await page.evaluate(() => localStorage.clear());
    await page.click('.hero-cta .btn-primary');
  });

  test('ticker search should show results', async ({ page }) => {
    await page.click('button:has-text("+ Stock")');
    await page.fill('#tickerInput', 'MSFT');
    await expect(page.locator('#tickerResults')).toHaveClass(/show/);
    await expect(page.locator('.ticker-result-item')).toHaveCount(1);
    await expect(page.locator('.ticker-symbol')).toContainText('MSFT');
  });

  test('selecting ticker should populate fields', async ({ page }) => {
    await page.click('button:has-text("+ Stock")');
    await page.fill('#tickerInput', 'AAPL');
    await page.click('.ticker-result-item:first-child');
    await expect(page.locator('#tickerInput')).toHaveValue('AAPL');
    await expect(page.locator('#tickerResults')).not.toHaveClass(/show/);
  });

  test('should submit stock prediction and show in list', async ({ page }) => {
    await page.click('button:has-text("+ Stock")');
    await page.fill('#tickerInput', 'MSFT');
    await page.click('.ticker-result-item:first-child');
    await page.fill('#targetPrice', '500');
    await page.click('#stockForm button[type="submit"]');
    // Modal should close
    await expect(page.locator('#newModal')).not.toHaveClass(/show/);
    // Card should appear
    await expect(page.locator('.pred-card')).toHaveCount(1);
    await expect(page.locator('.pred-card h3')).toContainText('MSFT');
    await expect(page.locator('.pred-card h3')).toContainText('500');
    // Empty state should be hidden
    await expect(page.locator('#emptyState')).toBeHidden();
    // Stats should update
    await expect(page.locator('#statTotal')).toContainText('1');
    await expect(page.locator('#statPending')).toContainText('1');
  });

  test('should not submit without target price', async ({ page }) => {
    await page.click('button:has-text("+ Stock")');
    await page.fill('#tickerInput', 'MSFT');
    await page.click('.ticker-result-item:first-child');
    // Don't fill target price
    await page.click('#stockForm button[type="submit"]');
    // Modal should still be open (HTML5 validation)
    await expect(page.locator('#newModal')).toHaveClass(/show/);
  });
});

test.describe('Custom Prediction Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(() => localStorage.clear());
    await page.click('.hero-cta .btn-primary');
  });

  test('should submit custom prediction', async ({ page }) => {
    await page.click('button:has-text("+ Custom")');
    await page.fill('#customText', 'Our team will ship the feature by Friday');
    await page.click('#customForm button[type="submit"]');
    await expect(page.locator('#newModal')).not.toHaveClass(/show/);
    await expect(page.locator('.pred-card')).toHaveCount(1);
    await expect(page.locator('.pred-card h3')).toContainText('ship the feature');
  });

  test('voice button should be present', async ({ page }) => {
    await page.click('button:has-text("+ Custom")');
    await expect(page.locator('#voiceBtn')).toBeVisible();
  });

  test('should not submit without text', async ({ page }) => {
    await page.click('button:has-text("+ Custom")');
    await page.click('#customForm button[type="submit"]');
    await expect(page.locator('#newModal')).toHaveClass(/show/);
  });
});

test.describe('Resolve & Delete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    // Seed a prediction
    await page.evaluate(() => {
      localStorage.setItem('prediction_tracker_v1', JSON.stringify([{
        id:'test1', type:'custom', text:'Test prediction', category:'work',
        deadline: new Date(Date.now() - 86400000).toISOString(),
        confidence:'medium', reasoning:'', createdAt: new Date().toISOString(),
        status:'pending', result:null, resolvedAt:null
      }]));
    });
    await page.click('.hero-cta .btn-primary');
  });

  test('should resolve prediction as correct', async ({ page }) => {
    await page.click('.resolve-correct');
    await expect(page.locator('#resolveModal')).toHaveClass(/show/);
    await page.click('button:has-text("✓ Correct")');
    await expect(page.locator('#resolveModal')).not.toHaveClass(/show/);
    await expect(page.locator('.status-correct')).toBeVisible();
    await expect(page.locator('#statCorrect')).toContainText('1');
  });

  test('should resolve prediction as wrong', async ({ page }) => {
    await page.click('.resolve-correct');
    await page.click('button:has-text("✗ Wrong")');
    await expect(page.locator('.status-wrong')).toBeVisible();
    await expect(page.locator('#statWrong')).toContainText('1');
  });

  test('should delete prediction', async ({ page }) => {
    await page.click('button:has-text("Delete")');
    await expect(page.locator('.pred-card')).toHaveCount(0);
    await expect(page.locator('#emptyState')).toBeVisible();
  });
});

test.describe('Analysis Page', () => {
  test('should show not-enough-data message with < 2 resolved', async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(() => localStorage.clear());
    // Navigate to analysis via nav
    await page.click('nav .nav-links a:has-text("Analysis")');
    await expect(page.locator('#analysisPage')).toBeVisible();
    await expect(page.locator('#analysisContent')).toContainText('Not enough data');
  });

  test('should show charts with enough data', async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(() => {
      localStorage.setItem('prediction_tracker_v1', JSON.stringify([
        {id:'a1',type:'stock',ticker:'MSFT',exchange:'NASDAQ',direction:'above',targetPrice:450,deadline:'2025-01-01',confidence:'high',reasoning:'',createdAt:'2025-01-01',status:'resolved',result:'correct',resolvedAt:'2025-01-02'},
        {id:'a2',type:'custom',text:'Test',category:'work',deadline:'2025-01-01',confidence:'medium',reasoning:'',createdAt:'2025-01-01',status:'resolved',result:'wrong',resolvedAt:'2025-01-02'},
        {id:'a3',type:'custom',text:'Test2',category:'life',deadline:'2025-01-01',confidence:'low',reasoning:'',createdAt:'2025-01-01',status:'resolved',result:'correct',resolvedAt:'2025-01-02'},
      ]));
    });
    await page.click('nav .nav-links a:has-text("Analysis")');
    await expect(page.locator('#analysisContent .stat-card')).toHaveCount(3);
    await expect(page.locator('.chart-container')).toHaveCount(3); // by type, by confidence, by category
  });
});

test.describe('Navigation Flow', () => {
  test('Home -> Dashboard -> Analysis -> Home', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#landing')).toBeVisible();
    
    await page.click('nav .nav-links a:has-text("Dashboard")');
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('#landing')).toBeHidden();
    
    await page.click('nav .nav-links a:has-text("Analysis")');
    await expect(page.locator('#analysisPage')).toBeVisible();
    await expect(page.locator('#app')).toBeHidden();
    
    await page.click('nav .nav-links a:has-text("Home")');
    await expect(page.locator('#landing')).toBeVisible();
    await expect(page.locator('#analysisPage')).toBeHidden();
  });
});

test.describe('Responsiveness', () => {
  test('should render on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE);
    await expect(page.locator('.hero h1')).toBeVisible();
    await page.click('.hero-cta .btn-primary');
    await expect(page.locator('#app')).toBeVisible();
  });
});
