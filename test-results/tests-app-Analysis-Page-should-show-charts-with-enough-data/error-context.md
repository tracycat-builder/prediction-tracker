# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/app.spec.js >> Analysis Page >> should show charts with enough data
- Location: tests/app.spec.js:193:5

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('#analysisContent .stat-card')
Expected: 3
Received: 0
Timeout:  5000ms

Call log:
  - Expect "to.have.count" with timeout 5000ms
  - waiting for locator('#analysisContent .stat-card')
    9 × locator resolved to 0 elements
      - unexpected value "0"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e3]: ↗ Predict.
    - generic [ref=e4]:
      - link "Home" [ref=e5] [cursor=pointer]:
        - /url: "#"
      - link "Dashboard" [ref=e6] [cursor=pointer]:
        - /url: "#"
      - link "Analysis" [active] [ref=e7] [cursor=pointer]:
        - /url: "#"
  - generic [ref=e9]:
    - heading "Analysis" [level=2] [ref=e10]
    - generic [ref=e12]:
      - generic [ref=e13]: 📊
      - heading "Not enough data yet" [level=3] [ref=e14]
      - paragraph [ref=e15]: Resolve at least 2 predictions to see your analysis.
```

# Test source

```ts
  103 |   test('ticker search should show results', async ({ page }) => {
  104 |     await page.click('button:has-text("+ Stock")');
  105 |     await page.fill('#tickerInput', 'MSFT');
  106 |     await expect(page.locator('#tickerResults')).toHaveClass(/show/);
  107 |     await expect(page.locator('.ticker-result-item')).toHaveCount(1);
  108 |     await expect(page.locator('.ticker-symbol')).toContainText('MSFT');
  109 |   });
  110 | 
  111 |   test('selecting ticker should populate fields', async ({ page }) => {
  112 |     await page.click('button:has-text("+ Stock")');
  113 |     await page.fill('#tickerInput', 'AAPL');
  114 |     await page.click('.ticker-result-item:first-child');
  115 |     await expect(page.locator('#tickerInput')).toHaveValue('AAPL');
  116 |     await expect(page.locator('#tickerResults')).not.toHaveClass(/show/);
  117 |   });
  118 | 
  119 |   test('should submit stock prediction and show in list', async ({ page }) => {
  120 |     await page.click('button:has-text("+ Stock")');
  121 |     await page.fill('#tickerInput', 'MSFT');
  122 |     await page.click('.ticker-result-item:first-child');
  123 |     await page.fill('#targetPrice', '500');
  124 |     await page.click('#stockForm button[type="submit"]');
  125 |     // Modal should close
  126 |     await expect(page.locator('#newModal')).not.toHaveClass(/show/);
  127 |     // Card should appear
  128 |     await expect(page.locator('.pred-card')).toHaveCount(1);
  129 |     await expect(page.locator('.pred-card h3')).toContainText('MSFT');
  130 |     await expect(page.locator('.pred-card h3')).toContainText('500');
  131 |     // Empty state should be hidden
  132 |     await expect(page.locator('#emptyState')).toBeHidden();
  133 |     // Stats should update
  134 |     await expect(page.locator('#statTotal')).toContainText('1');
  135 |     await expect(page.locator('#statPending')).toContainText('1');
  136 |   });
  137 | 
  138 |   test('should not submit without target price', async ({ page }) => {
  139 |     await page.click('button:has-text("+ Stock")');
  140 |     await page.fill('#tickerInput', 'MSFT');
  141 |     await page.click('.ticker-result-item:first-child');
  142 |     // Don't fill target price
  143 |     await page.click('#stockForm button[type="submit"]');
  144 |     // Modal should still be open (HTML5 validation)
  145 |     await expect(page.locator('#newModal')).toHaveClass(/show/);
  146 |   });
  147 | });
  148 | 
  149 | test.describe('Custom Prediction Flow', () => {
  150 |   test.beforeEach(async ({ page }) => {
  151 |     await page.goto(BASE);
  152 |     await page.evaluate(() => localStorage.clear());
  153 |     await page.click('.hero-cta .btn-primary');
  154 |   });
  155 | 
  156 |   test('should submit custom prediction', async ({ page }) => {
  157 |     await page.click('button:has-text("+ Custom")');
  158 |     await page.fill('#customText', 'Our team will ship the feature by Friday');
  159 |     await page.click('#customForm button[type="submit"]');
  160 |     await expect(page.locator('#newModal')).not.toHaveClass(/show/);
  161 |     await expect(page.locator('.pred-card')).toHaveCount(1);
  162 |     await expect(page.locator('.pred-card h3')).toContainText('ship the feature');
  163 |   });
  164 | 
  165 |   test('voice button should be present', async ({ page }) => {
  166 |     await page.click('button:has-text("+ Custom")');
  167 |     await expect(page.locator('#voiceBtn')).toBeVisible();
  168 |   });
  169 | 
  170 |   test('should not submit without text', async ({ page }) => {
  171 |     await page.click('button:has-text("+ Custom")');
  172 |     await page.click('#customForm button[type="submit"]');
  173 |     await expect(page.locator('#newModal')).toHaveClass(/show/);
  174 |   });
  175 | });
  176 | 
  177 | test.describe('Resolve & Delete', () => {
  178 |   test.beforeEach(async ({ page }) => {
  179 |     await page.goto(BASE);
  180 |     // Seed a prediction
  181 |     await page.evaluate(() => {
  182 |       localStorage.setItem('prediction_tracker_v1', JSON.stringify([{
  183 |         id:'test1', type:'custom', text:'Test prediction', category:'work',
  184 |         deadline: new Date(Date.now() - 86400000).toISOString(),
  185 |         confidence:'medium', reasoning:'', createdAt: new Date().toISOString(),
  186 |         status:'pending', result:null, resolvedAt:null
  187 |       }]));
  188 |     });
  189 |     await page.click('.hero-cta .btn-primary');
  190 |   });
  191 | 
  192 |   test('should resolve prediction as correct', async ({ page }) => {
  193 |     await page.click('.resolve-correct');
  194 |     await expect(page.locator('#resolveModal')).toHaveClass(/show/);
  195 |     await page.click('button:has-text("✓ Correct")');
  196 |     await expect(page.locator('#resolveModal')).not.toHaveClass(/show/);
  197 |     await expect(page.locator('.status-correct')).toBeVisible();
  198 |     await expect(page.locator('#statCorrect')).toContainText('1');
  199 |   });
  200 | 
  201 |   test('should resolve prediction as wrong', async ({ page }) => {
  202 |     await page.click('.resolve-correct');
> 203 |     await page.click('button:has-text("✗ Wrong")');
      |                                                                 ^ Error: expect(locator).toHaveCount(expected) failed
  204 |     await expect(page.locator('.status-wrong')).toBeVisible();
  205 |     await expect(page.locator('#statWrong')).toContainText('1');
  206 |   });
  207 | 
  208 |   test('should delete prediction', async ({ page }) => {
  209 |     await page.click('button:has-text("Delete")');
  210 |     await expect(page.locator('.pred-card')).toHaveCount(0);
  211 |     await expect(page.locator('#emptyState')).toBeVisible();
  212 |   });
  213 | });
  214 | 
  215 | test.describe('Analysis Page', () => {
  216 |   test('should show not-enough-data message with < 2 resolved', async ({ page }) => {
  217 |     await page.goto(BASE);
  218 |     await page.evaluate(() => localStorage.clear());
  219 |     // Navigate to analysis via nav
  220 |     await page.click('nav .nav-links a:has-text("Analysis")');
  221 |     await expect(page.locator('#analysisPage')).toBeVisible();
  222 |     await expect(page.locator('#analysisContent')).toContainText('Not enough data');
  223 |   });
  224 | 
  225 |   test('should show charts with enough data', async ({ page }) => {
  226 |     await page.goto(BASE);
  227 |     await page.evaluate(() => {
  228 |       localStorage.setItem('prediction_tracker_v1', JSON.stringify([
  229 |         {id:'a1',type:'stock',ticker:'MSFT',exchange:'NASDAQ',direction:'above',targetPrice:450,deadline:'2025-01-01',confidence:'high',reasoning:'',createdAt:'2025-01-01',status:'resolved',result:'correct',resolvedAt:'2025-01-02'},
  230 |         {id:'a2',type:'custom',text:'Test',category:'work',deadline:'2025-01-01',confidence:'medium',reasoning:'',createdAt:'2025-01-01',status:'resolved',result:'wrong',resolvedAt:'2025-01-02'},
  231 |         {id:'a3',type:'custom',text:'Test2',category:'life',deadline:'2025-01-01',confidence:'low',reasoning:'',createdAt:'2025-01-01',status:'resolved',result:'correct',resolvedAt:'2025-01-02'},
  232 |       ]));
  233 |     });
  234 |     await page.click('nav .nav-links a:has-text("Analysis")');
  235 |     await expect(page.locator('#analysisContent .stat-card')).toHaveCount(3);
  236 |     await expect(page.locator('.chart-container')).toHaveCount(3); // by type, by confidence, by category
  237 |   });
  238 | });
  239 | 
  240 | test.describe('Navigation Flow', () => {
  241 |   test('Home -> Dashboard -> Analysis -> Home', async ({ page }) => {
  242 |     await page.goto(BASE);
  243 |     await expect(page.locator('#landing')).toBeVisible();
  244 |     
  245 |     await page.click('nav .nav-links a:has-text("Dashboard")');
  246 |     await expect(page.locator('#app')).toBeVisible();
  247 |     await expect(page.locator('#landing')).toBeHidden();
  248 |     
  249 |     await page.click('nav .nav-links a:has-text("Analysis")');
  250 |     await expect(page.locator('#analysisPage')).toBeVisible();
  251 |     await expect(page.locator('#app')).toBeHidden();
  252 |     
  253 |     await page.click('nav .nav-links a:has-text("Home")');
  254 |     await expect(page.locator('#landing')).toBeVisible();
  255 |     await expect(page.locator('#analysisPage')).toBeHidden();
  256 |   });
  257 | });
  258 | 
  259 | test.describe('Responsiveness', () => {
  260 |   test('should render on mobile viewport', async ({ page }) => {
  261 |     await page.setViewportSize({ width: 375, height: 812 });
  262 |     await page.goto(BASE);
  263 |     await expect(page.locator('.hero h1')).toBeVisible();
  264 |     await page.click('.hero-cta .btn-primary');
  265 |     await expect(page.locator('#app')).toBeVisible();
  266 |   });
  267 | });
  268 | 
```