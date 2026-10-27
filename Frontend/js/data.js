/* Dữ liệu mock — sau này thay bằng API Backend */

const AREAS = [
  { id: 'f1', name: 'Tầng 1' },
  { id: 'f2', name: 'Tầng 2' },
  { id: 'garden', name: 'Sân vườn' }
];

const TABLES = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: 'A' + (i + 1), name: 'Bàn ' + (i + 1), area: 'f1', seats: i % 3 === 0 ? 6 : 4 })),
  ...Array.from({ length: 8 }, (_, i) => ({ id: 'B' + (i + 1), name: 'Bàn 2.' + (i + 1), area: 'f2', seats: i % 2 === 0 ? 4 : 2 })),
  ...Array.from({ length: 6 }, (_, i) => ({ id: 'C' + (i + 1), name: 'Vườn ' + (i + 1), area: 'garden', seats: i % 2 === 0 ? 8 : 4 }))
];

const CATEGORIES = [
  { id: 'all', name: 'Tất cả', icon: '✨' },
  { id: 'hot', name: 'Món nóng', icon: '🔥' },
  { id: 'cold', name: 'Món lạnh', icon: '🥗' },
  { id: 'drink', name: 'Nước', icon: '🥤' },
  { id: 'dessert', name: 'Tráng miệng', icon: '🍰' },
  { id: 'other', name: 'Khác', icon: '🍚' }
];

const MENU = [
  { id: 'm01', cat: 'hot', name: 'Bò lúc lắc', price: 129000, emoji: '🥩' },
  { id: 'm02', cat: 'hot', name: 'Gà nướng mật ong', price: 119000, emoji: '🍗' },
  { id: 'm03', cat: 'hot', name: 'Cá hồi áp chảo', price: 169000, emoji: '🐟' },
  { id: 'm04', cat: 'hot', name: 'Mì Ý hải sản', price: 99000, emoji: '🍝' },
  { id: 'm05', cat: 'hot', name: 'Tôm rang muối', price: 139000, emoji: '🍤' },
  { id: 'm06', cat: 'hot', name: 'Lẩu thái hải sản', price: 289000, emoji: '🍲' },
  { id: 'm07', cat: 'cold', name: 'Salad Caesar', price: 69000, emoji: '🥗' },
  { id: 'm08', cat: 'cold', name: 'Gỏi cuốn tôm thịt', price: 55000, emoji: '🌯' },
  { id: 'm09', cat: 'cold', name: 'Gỏi ngó sen', price: 79000, emoji: '🥬' },
  { id: 'm10', cat: 'cold', name: 'Sashimi cá hồi', price: 159000, emoji: '🍣' },
  { id: 'm11', cat: 'drink', name: 'Coca-Cola', price: 20000, emoji: '🥤' },
  { id: 'm12', cat: 'drink', name: 'Trà đào cam sả', price: 45000, emoji: '🍑' },
  { id: 'm13', cat: 'drink', name: 'Cà phê sữa đá', price: 35000, emoji: '☕' },
  { id: 'm14', cat: 'drink', name: 'Nước ép cam', price: 42000, emoji: '🍊' },
  { id: 'm15', cat: 'drink', name: 'Sinh tố bơ', price: 48000, emoji: '🥑' },
  { id: 'm16', cat: 'drink', name: 'Bia Tiger', price: 30000, emoji: '🍺' },
  { id: 'm17', cat: 'dessert', name: 'Bánh flan caramel', price: 29000, emoji: '🍮' },
  { id: 'm18', cat: 'dessert', name: 'Kem 3 vị', price: 39000, emoji: '🍨' },
  { id: 'm19', cat: 'dessert', name: 'Tiramisu', price: 59000, emoji: '🍰' },
  { id: 'm20', cat: 'dessert', name: 'Trái cây theo mùa', price: 65000, emoji: '🍉' },
  { id: 'm21', cat: 'other', name: 'Cơm trắng', price: 10000, emoji: '🍚' },
  { id: 'm22', cat: 'other', name: 'Khoai tây chiên', price: 49000, emoji: '🍟' },
  { id: 'm23', cat: 'other', name: 'Bánh mì bơ tỏi', price: 35000, emoji: '🥖' },
  { id: 'm24', cat: 'other', name: 'Khăn lạnh', price: 3000, emoji: '🧻' }
];

const getMenuItem = (id) => MENU.find((m) => m.id === id);
const getTable = (id) => TABLES.find((t) => t.id === id);
