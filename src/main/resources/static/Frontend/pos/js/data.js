/* Dữ liệu danh mục, khu vực, thực đơn & bàn ăn nạp từ MySQL Database */

const CATEGORY_META = {
  all: { name: 'Tất cả', icon: '✨' },
  hot: { name: 'Món nóng', icon: '🔥' },
  cold: { name: 'Món lạnh', icon: '🥗' },
  drink: { name: 'Nước', icon: '🥤' },
  dessert: { name: 'Tráng miệng', icon: '🍰' },
  other: { name: 'Khác', icon: '🍚' }
};

let AREAS = [];
let CATEGORIES = [
  { id: 'all', name: 'Tất cả', icon: '✨' },
  { id: 'hot', name: 'Món nóng', icon: '🔥' },
  { id: 'cold', name: 'Món lạnh', icon: '🥗' },
  { id: 'drink', name: 'Nước', icon: '🥤' },
  { id: 'dessert', name: 'Tráng miệng', icon: '🍰' },
  { id: 'other', name: 'Khác', icon: '🍚' }
];
let MENU = [];
let TABLES = [];

const POS_API_BASE = (typeof window !== 'undefined' && window.location.port && window.location.port !== '8080' && window.location.port !== '')
  ? 'http://localhost:8080/api/v1'
  : ((typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') ? `${window.location.origin}/api/v1` : 'http://localhost:8080/api/v1');

async function resolveActiveBranchId() {
  let branchId = sessionStorage.getItem('cp_branch_id') || localStorage.getItem('cp_branch_id') || '';
  if (branchId) return branchId;
  try {
    const res = await fetch(`${POS_API_BASE}/branches`);
    if (res.ok) {
      const branches = await res.json();
      if (Array.isArray(branches) && branches.length > 0) {
        const branchName = sessionStorage.getItem('cp_branch') || localStorage.getItem('cp_branch') || '';
        const matched = (branchName && branches.find(b => b.name === branchName)) || branches[0];
        branchId = matched.id;
        sessionStorage.setItem('cp_branch_id', branchId);
        if (!branchName && matched.name) {
          sessionStorage.setItem('cp_branch', matched.name);
        }
      }
    }
  } catch (ignored) {}
  return branchId;
}

// Nạp danh mục thực đơn từ Backend MySQL (nếu có endpoint /categories)
async function fetchCategoriesFromDatabase() {
  try {
    const res = await fetch(`${POS_API_BASE}/categories`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        CATEGORIES = [
          { id: 'all', name: 'Tất cả', icon: '✨' },
          ...data.map(c => ({
            id: c.code,
            name: c.name,
            icon: c.icon || (CATEGORY_META[c.code]?.icon) || '🍽️'
          }))
        ];
      }
    }
  } catch (ignored) {}
}

// Nạp danh sách món ăn từ Backend MySQL theo chi nhánh
async function fetchMenuFromDatabase() {
  try {
    const branchId = await resolveActiveBranchId();
    const url = branchId ? `${POS_API_BASE}/products?branchId=${branchId}` : `${POS_API_BASE}/products`;
    const res = await fetch(url);
    if (res.ok) {
      let data = await res.json();
      // Nếu chi nhánh hiện tại chưa có món riêng, tải toàn bộ sản phẩm trong DB
      if (Array.isArray(data) && data.length === 0 && branchId) {
        const fallbackRes = await fetch(`${POS_API_BASE}/products`);
        if (fallbackRes.ok) {
          data = await fallbackRes.json();
        }
      }
      if (Array.isArray(data)) {
        MENU = data
          .filter(p => p.status !== 'out_of_stock')
          .map(p => ({
            id: p.code || ('m' + p.id),
            realId: p.id,
            cat: p.category || 'other',
            name: p.name,
            price: Number(p.price || 0),
            emoji: p.emoji || '🍽️'
          }));

        // Bổ sung các danh mục phát sinh từ sản phẩm trong DB
        const existingCatIds = new Set(CATEGORIES.map(c => c.id));
        MENU.forEach(item => {
          if (item.cat && !existingCatIds.has(item.cat)) {
            existingCatIds.add(item.cat);
            const meta = CATEGORY_META[item.cat] || { name: item.cat, icon: '🍽️' };
            CATEGORIES.push({ id: item.cat, name: meta.name, icon: meta.icon });
          }
        });
      }
    }
  } catch (e) {
    console.warn('Không thể nạp thực đơn từ MySQL:', e);
  }
}

// Nạp danh sách bàn & khu vực từ Backend MySQL theo chi nhánh
async function fetchTablesFromDatabase() {
  try {
    const branchId = await resolveActiveBranchId();
    const url = branchId ? `${POS_API_BASE}/tables?branchId=${branchId}` : `${POS_API_BASE}/tables`;
    const res = await fetch(url);
    if (res.ok) {
      let data = await res.json();
      if (Array.isArray(data) && data.length === 0 && branchId) {
        const fallbackRes = await fetch(`${POS_API_BASE}/tables`);
        if (fallbackRes.ok) {
          data = await fallbackRes.json();
        }
      }
      if (Array.isArray(data)) {
        TABLES = data.filter(t => t.status !== 'disabled').map(t => ({
          id: t.code,
          realId: t.id,
          name: t.name || ('Bàn ' + t.code),
          area: t.area || 'Tầng 1',
          seats: parseInt(t.seats, 10) || 4
        }));

        // Đồng bộ khu vực động từ bàn thực tế trong MySQL
        const uniqueAreaNames = [...new Set(TABLES.map(t => t.area).filter(Boolean))];
        AREAS = uniqueAreaNames.map(a => ({ id: a, name: a }));
      }
    }
  } catch (e) {
    console.warn('Không thể nạp danh sách bàn từ MySQL:', e);
  }
}

window.POS_DATA_READY = Promise.all([
  fetchCategoriesFromDatabase(),
  fetchMenuFromDatabase(),
  fetchTablesFromDatabase()
]);

window.refreshPosData = () => {
  window.POS_DATA_READY = Promise.all([
    fetchCategoriesFromDatabase(),
    fetchMenuFromDatabase(),
    fetchTablesFromDatabase()
  ]);
  return window.POS_DATA_READY;
};

const getMenuItem = (id) => MENU.find((m) => m.id === id);
const getTable = (id) => TABLES.find((t) => t.id === id);
