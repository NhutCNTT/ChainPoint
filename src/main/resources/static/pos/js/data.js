/* Dữ liệu danh mục & nạp dữ liệu Bàn từ MySQL Database */

const AREAS = [
  { id: 'f1', name: 'Tầng 1' },
  { id: 'f2', name: 'Tầng 2' },
  { id: 'garden', name: 'Sân vườn' }
];

const CATEGORIES = [
  { id: 'all', name: 'Tất cả', icon: '✨' },
  { id: 'hot', name: 'Món nóng', icon: '🔥' },
  { id: 'cold', name: 'Món lạnh', icon: '🥗' },
  { id: 'drink', name: 'Nước', icon: '🥤' },
  { id: 'dessert', name: 'Tráng miệng', icon: '🍰' },
  { id: 'other', name: 'Khác', icon: '🍚' }
];

// Khởi tạo rỗng — Dữ liệu hoàn toàn phụ thuộc vào Cơ sở dữ liệu MySQL
let MENU = [];
let TABLES = [];

const POS_API_BASE = (typeof window !== 'undefined' && window.location.port && window.location.port !== '8080' && window.location.port !== '') 
  ? 'http://localhost:8080/api/v1' 
  : ((typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') ? `${window.location.origin}/api/v1` : 'http://localhost:8080/api/v1');

// Nạp danh sách món ăn từ Backend MySQL theo chi nhánh
async function fetchMenuFromDatabase() {
  try {
    const branchId = sessionStorage.getItem('cp_branch_id') || 1;
    const url = `${POS_API_BASE}/products?branchId=${branchId}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        MENU = data.map(p => ({
          id: p.code || ('m' + p.id),
          realId: p.id,
          cat: p.category || 'other',
          name: p.name,
          price: p.price,
          emoji: p.emoji || '🍽️'
        }));
      }
    }
  } catch (e) {
    console.warn('Không thể nạp thực đơn từ MySQL:', e);
  }
}

// Nạp danh sách bàn từ Backend MySQL theo chi nhánh
async function fetchTablesFromDatabase() {
  try {
    const branchId = sessionStorage.getItem('cp_branch_id') || 1;
    const url = `${POS_API_BASE}/tables?branchId=${branchId}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        TABLES = data.filter(t => t.status !== 'disabled').map(t => ({
          id: t.code,
          name: t.name || ('Bàn ' + t.code),
          area: t.area || 'f1',
          seats: parseInt(t.seats, 10) || 4
        }));
      }
    }
  } catch (e) {
    console.warn('Không thể nạp danh sách bàn từ MySQL:', e);
  }
}

fetchMenuFromDatabase();
fetchTablesFromDatabase();

const getMenuItem = (id) => MENU.find((m) => m.id === id);
const getTable = (id) => TABLES.find((t) => t.id === id);
