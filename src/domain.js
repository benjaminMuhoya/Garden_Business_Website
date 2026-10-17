export function money(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}
export function sanitizeCart(raw, menu) {
  const safe = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return safe;
  for (const item of menu) {
    const qty = raw[item.id];
    if (Number.isInteger(qty) && qty > 0 && qty <= 20) safe[item.id] = qty;
  }
  return safe;
}
export function cartSummary(cart, menu) {
  const clean = sanitizeCart(cart, menu);
  const lines = menu.filter(item => clean[item.id]).map(item => ({ ...item, quantity: clean[item.id], total: item.price * clean[item.id] }));
  return { lines, count: lines.reduce((n, item) => n + item.quantity, 0), total: lines.reduce((n, item) => n + item.total, 0) };
}
export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function dateNumber(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return NaN;
  const result = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(result) && new Date(result).toISOString().slice(0,10) === value ? result : NaN;
}
export function stayQuote(input, content, today = localToday()) {
  const room = content.rooms.find(r => r.id === input.room);
  const guests = Number(input.guests);
  if (!room || ![1,2].includes(guests) || !['bed','breakfast'].includes(input.board)) return { error: 'Choose a room, one or two guests, and a board option.' };
  const arrival = dateNumber(input.arrival), departure = dateNumber(input.departure);
  if (!Number.isFinite(arrival) || !Number.isFinite(departure)) return { error: 'Choose your arrival and departure dates to see a total.' };
  const nights = (departure - arrival) / 86400000;
  if (input.arrival < today) return { error: 'Arrival must be today or a future date.' };
  if (nights < 1 || nights > 30) return { error: 'Choose a stay of 1 to 30 nights, with departure after arrival.' };
  const rate = guests === 1 ? room.single : room.double;
  const roomTotal = rate * nights;
  const breakfast = input.board === 'breakfast' ? content.meals.breakfast * guests * nights : 0;
  const lunch = input.lunch ? content.meals.lunch * guests * nights : 0;
  const dinner = input.dinner ? content.meals.dinner * guests * nights : 0;
  return { room: room.name, guests, nights, rate, roomTotal, breakfast, lunch, dinner, total: roomTotal + breakfast + lunch + dinner };
}
