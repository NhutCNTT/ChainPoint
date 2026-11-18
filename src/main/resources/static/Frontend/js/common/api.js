// Shared authenticated client for every portal and the POS.
window.API = (() => {
  const BASE_URL = `${location.origin}/api/v1`;
  const nativeFetch = window.fetch.bind(window);
  const getToken = () => sessionStorage.getItem('cp_token') || localStorage.getItem('cp_token') || '';
  const get = key => sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  function clearToken() {
    for (const storage of [sessionStorage, localStorage]) {
      for (const key of Object.keys(storage)) {
        if (key.startsWith('cp_') || key.startsWith('pos_loyalty_')) storage.removeItem(key);
      }
    }
  }
  function loginUrl() {
    return location.pathname.includes('/owner/') ? '/Frontend/pages/auth/owner-login.html' : '/Frontend/pages/auth/pos-login.html';
  }
  async function authenticatedFetch(url, options = {}) {
    const target = new URL(url, location.origin);
    if (target.origin !== location.origin || !target.pathname.startsWith('/api/v1/')) {
      throw new Error('API requests must use the application origin');
    }
    const headers = new Headers(options.headers || {});
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');
    const response = await nativeFetch(target, { ...options, headers });
    if (response.status === 401 && !target.pathname.startsWith('/api/v1/auth/')) {
      clearToken();
      location.replace(loginUrl());
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    return response;
  }
  async function request(endpoint, options = {}) {
    const response = await authenticatedFetch(`${BASE_URL}${endpoint}`, options);
    if (response.status === 204) return null;
    const data = response.headers.get('content-type')?.includes('json') ? await response.json() : await response.text();
    if (!response.ok) throw new Error(data?.message || `Lỗi ${response.status}`);
    return data;
  }
  const json = (method, endpoint, body) => request(endpoint, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const path = location.pathname;
  if (/^\/(?:pos\/|Frontend\/pages\/(?:owner|branch|admin|employee)\/)/.test(path)) {
    if (!getToken()) location.replace(loginUrl());
    else {
      const role = get('cp_role');
      if (path.includes('/owner/') && role !== 'owner') location.replace('/pos/index.html');
      if (path.includes('/branch/') && role === 'cashier') location.replace('/pos/index.html');
      if (role === 'owner') {
        const params = new URLSearchParams(location.search);
        if (params.get('branchId')) sessionStorage.setItem('cp_branch_id', params.get('branchId'));
        if (params.get('branch')) sessionStorage.setItem('cp_branch', params.get('branch'));
      }
    }
  }
  return {
    BASE_URL, getToken, clearToken, fetch: authenticatedFetch,
    get: endpoint => request(endpoint),
    post: (endpoint, body) => json('POST', endpoint, body),
    put: (endpoint, body) => json('PUT', endpoint, body),
    patch: (endpoint, body) => json('PATCH', endpoint, body),
    delete: endpoint => request(endpoint, { method: 'DELETE' }),
    setToken: token => sessionStorage.setItem('cp_token', token)
  };
})();
