const gardenDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
});
const eventDateFormat = new Intl.DateTimeFormat('en-KE', { dateStyle: 'long', timeZone: 'UTC' });

export function gardenToday() {
  return gardenDate.format(new Date());
}

export function eventDateLabel(date) {
  const day = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid event date: ${date}`);
  }
  return eventDateFormat.format(day);
}
