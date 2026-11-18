const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { createHmac } = require('node:crypto');

async function run() {
  const classpathFile = path.resolve('.tmp/browser-classpath.txt');
  if (!fs.existsSync(classpathFile)) throw new Error('Run .\\mvnw.cmd test-compile dependency:build-classpath -Dmdep.outputFile=.tmp/browser-classpath.txt first.');
  const cp = [path.resolve('target/test-classes'), path.resolve('target/classes'), fs.readFileSync(classpathFile, 'utf8').trim()].join(path.delimiter);
  const server = spawn('java', ['-Dspring.devtools.restart.enabled=false', '-cp', cp, 'blockchain.ChainPoint.BrowserTestApplication', '--server.port=18085'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/browser-server.log', '');
  const receiveLog = chunk => { log += chunk.toString(); fs.appendFileSync('test-results/browser-server.log', chunk); };
  server.stdout.on('data', receiveLog);
  server.stderr.on('data', receiveLog);
  const ready = new Promise((resolve, reject) => {
    const timer = setInterval(() => { if (log.includes('CHAINPOINT_BROWSER_FIXTURES_READY')) { clearInterval(timer); clearTimeout(timeout); resolve(); } }, 200);
    const timeout = setTimeout(() => { clearInterval(timer); reject(new Error('Test server did not start. ' + log.slice(-2000))); }, 60000);
    server.once('exit', code => { clearInterval(timer); clearTimeout(timeout); reject(new Error('Test server exited: ' + code + '\n' + log.slice(-2000))); });
  });
  let browser, page;
  const base = 'http://localhost:18085';
  const outcomes = [];
  outcomes.push = function (item) { console.log('PASS ' + item); return Array.prototype.push.call(this, item); };
  try {
    await ready;
    browser = await chromium.launch({ channel: process.env.CHAINPOINT_BROWSER_CHANNEL || 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    page = await context.newPage();
    const errors = [];
    const failedRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', async response => {
      if (response.status() >= 400 && response.url().includes('/api/v1/')) failedRequests.push({ status: response.status(), path: new URL(response.url()).pathname, body: await response.text().catch(() => '') });
    });
    page.on('close', () => fs.writeFileSync('test-results/browser-errors.json', JSON.stringify({ errors, failedRequests }, null, 2)));
    page.on('dialog', dialog => dialog.accept());
    async function login(role, username = role, password = 'BrowserTest123!') {
      await page.goto(base + '/Frontend/pages/auth/login.html?role=' + role);
      await page.locator('#username').fill(username); await page.locator('#password').fill(password);
      await page.locator('#loginSubmitBtn').click();
      await page.waitForURL(role === 'owner' ? '**/owner/dashboard.html' : role === 'manager' ? '**/branch/dashboard.html' : '**/pos/index.html');
      await page.evaluate(() => CP.ready);
    }
    await login('owner');
    await page.locator('#searchInput').fill('Coffee'); await page.locator('#dashboardSearchResults a').first().waitFor();
    await page.locator('#searchInput').fill('');
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    await page.locator('#dashboardFrom').fill(today); await page.locator('#dashboardTo').fill(today);
    await page.getByRole('button', { name: 'Lọc ngày', exact: true }).click();
    await page.getByRole('button', { name: 'Thông báo', exact: true }).click();
    await page.locator('.toast').first().waitFor();
    outcomes.push('Live dashboard search, custom dates and operational notifications');
    await page.locator('.sidebar .nav a').filter({ hasText: /^Chi nhánh$/ }).click();
    await page.locator('#addBranchBtn').click();
    await page.locator('#formBranchCode').fill('E2E-BRANCH'); await page.locator('#formBranchName').fill('E2E branch');
    await page.locator('#formBranchAddress').fill('Test persisted address');
    await page.locator('#branchForm button[type=submit]').click();
    await page.getByText('E2E branch', { exact: true }).first().waitFor();
    outcomes.push('Owner login, branch modal and persisted branch creation');
    await page.goto(base + '/Frontend/pages/admin/staff.html?role=manager');
    await page.locator('#addStaffBtn').click(); await page.locator('#formStaffName').fill('E2E Manager');
    await page.locator('#formStaffUsername').fill('e2emanager'); await page.locator('#formStaffPassword').fill('Manager123!');
    await page.locator('#formStaffBranch').selectOption({ label: 'E2E branch' });
    await page.locator('#managerBranchAssignments').selectOption({ label: 'Browser branch B' });
    await page.locator('#staffForm button[type=submit]').click();
    await page.getByText('E2E Manager', { exact: true }).first().waitFor();
    outcomes.push('Owner manager creation and multiple branch assignments');
    await page.evaluate(() => CP.logout());
    await page.waitForURL('**/auth/login.html');
    await login('manager');
    await page.goto(base + '/Frontend/pages/branch/menu.html');
    await page.locator('#btnAddProduct').click(); await page.locator('#productCode').fill('E2E-TEA');
    await page.locator('#productName').fill('E2E Tea'); await page.locator('#productPrice').fill('25000');
    await page.locator('#saveProductBtn').click(); await page.getByText('E2E Tea', { exact: true }).first().waitFor();
    await page.locator('#menuSearchInput').fill('no-such-dish'); await page.getByText('Không tìm thấy món ăn nào').waitFor();
    await page.locator('#menuSearchInput').fill('E2E Tea'); await page.getByText('E2E Tea', { exact: true }).first().waitFor();
    outcomes.push('Manager menu creation, search and modal persistence');
    await page.goto(base + '/Frontend/pages/branch/staff.html');
    await page.getByRole('button', { name: 'Trang sau', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Trang trước', exact: true }).isEnabled(), true);
    await page.locator('#staffSearchInput').fill('Fixture cashier 23');
    assert.equal(await page.locator('#staffTableBody tr:visible').count(), 1);
    await page.locator('#staffSearchInput').fill('');
    await page.locator('#btnAddStaff').click(); await page.locator('#staffName').fill('E2E Cashier');
    await page.locator('#staffUsername').fill('e2ecashier'); await page.locator('#staffPassword').fill('Cashier123!');
    await page.locator('#staffPhone').fill('0901234567');
    await page.locator('#staffForm button[type=submit]').click();
    await page.locator('#staffSearchInput').fill('E2E Cashier'); await page.getByText('E2E Cashier', { exact: true }).first().waitFor();
    assert.equal(await page.locator('#staffRole option').count(), 1);
    outcomes.push('Manager cashier creation and restricted role options');
    await page.evaluate(() => CP.logout()); await page.waitForURL('**/auth/login.html');
    await login('cashier', 'e2ecashier', 'Cashier123!');
    await page.locator('[data-table="T1"]').first().click();
    await page.getByText('E2E Tea', { exact: true }).click();
    await page.locator('#btn-save').click(); await page.waitForURL('**/pos/index.html');
    await page.reload(); await page.locator('[data-table="T1"]').first().waitFor();
    await page.locator('[data-table="T1"]').first().click();
    await page.locator('#btn-pay').click(); await page.waitForURL('**/payment.html?bill=*');
    await page.locator('#btn-quick-add-cust').click();
    await page.locator('#quick-cust-name').fill('E2E Member'); await page.locator('#quick-cust-phone').fill('0908888888');
    await page.locator('#quickAddCustForm button[type=submit]').click();
    await page.locator('#cust-name-display').filter({ hasText: 'E2E Member' }).waitFor();
    await page.locator('#method-cash').click(); await page.locator('#received').fill('25000');
    await page.locator('#btn-confirm-cash').click(); await page.getByText('Thanh toán thành công', { exact: true }).waitFor();
    outcomes.push('Cashier menu synchronization, order persistence across reload, and cash payment');
    const revenue = await page.evaluate(async () => {
      const result = await API.get('/orders'); return result.filter(bill => bill.status === 'paid').reduce((sum, bill) => sum + Number(bill.finalAmount), 0);
    });
    assert.equal(revenue, 25000);
    const points = await page.evaluate(async () => (await API.get('/customers/by-phone/0908888888')).points);
    assert.equal(points, 2);
    outcomes.push('Cashier customer creation and persisted loyalty earnings');
    await page.locator('#modal-home').click(); await page.waitForURL('**/pos/index.html');
    await page.locator('[data-table="T1"]').first().click();
    await page.getByText('Test Coffee', { exact: true }).click();
    await page.locator('#btn-pay').click(); await page.waitForURL('**/payment.html?bill=*');
    await page.locator('#method-transfer').click(); await page.waitForURL('**/payment-transfer.html?bill=*');
    await page.locator('#qr-memo').filter({ hasText: /^HD/ }).waitFor();
    assert.equal(await page.locator('#btn-simulate-webhook').count(), 0);
    const billCode = await page.locator('#qr-memo').textContent();
    const receipt = { billCode, amount: 30000, reference: 'E2E-BANK-RECEIPT', timestamp: Math.floor(Date.now() / 1000) };
    const signature = createHmac('sha256', 'chainpoint-test-only-webhook-secret').update(`${receipt.billCode}\n${receipt.amount}\n${receipt.reference}\n${receipt.timestamp}`).digest('hex');
    const confirmation = await context.request.post(base + '/api/v1/payment/provider-confirmation', { headers: { 'X-Payment-Signature': signature }, data: receipt });
    assert.equal(confirmation.status(), 200);
    await page.getByText('Thanh toán thành công', { exact: true }).waitFor();
    outcomes.push('Persisted transfer preparation and polling after a signed test-provider receipt');
    const denied = await page.goto(base + '/Frontend/pages/owner/dashboard.html'); assert.equal(denied.status(), 403);
    outcomes.push('Backend denied cashier direct Owner URL');
    await page.goto(base + '/Frontend/pos/index.html');
    for (const size of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size); await page.waitForTimeout(150);
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
      assert.ok(fits, `POS horizontal overflow at ${size.width}`);
    }
    outcomes.push('POS tablet/mobile layouts fit viewport');
    await page.goto(base + '/Frontend/pages/employee/customers.html');
    await page.evaluate(() => LoyaltyStore.ready);
    await page.route('**/api/v1/orders*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'E2E simulated API outage' }) }));
    await page.goto(base + '/Frontend/pages/employee/orders.html');
    await page.locator('#cp-api-error').filter({ hasText: 'E2E simulated API outage' }).waitFor();
    outcomes.push('API error state surfaced without reporting a successful action');
    await page.unroute('**/api/v1/orders*');
    await page.goto(base + '/Frontend/pos/index.html');
    assert.deepEqual(errors, [], 'Browser JavaScript errors');
    fs.mkdirSync('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/pos-mobile.png', fullPage: true });
    fs.writeFileSync('test-results/browser-results.json', JSON.stringify({ passed: outcomes, javascriptErrors: errors }, null, 2));
    console.log(`Browser workflows passed: ${outcomes.length}; JavaScript errors: ${errors.length}`);
  } catch (error) {
    fs.mkdirSync('test-results', { recursive: true });
    if (page && !page.isClosed()) {
      await page.screenshot({ path: 'test-results/browser-failure.png', fullPage: true });
      console.error('Browser failure at', page.url());
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    if (server.exitCode == null) {
      if (process.platform === 'win32') { try { execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); } catch {} }
      else server.kill();
    }
    server.stdout.destroy(); server.stderr.destroy(); server.unref();
    fs.mkdirSync('test-results', { recursive: true }); fs.writeFileSync('test-results/browser-server.log', log);
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
