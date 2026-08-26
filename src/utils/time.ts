// ჩათის შეტყობინებების დროის ფორმატირება — web-ის lib/time.ts-ის ეკვივალენტი

const DAY_MS = 24 * 60 * 60 * 1000;

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ორ ზედიზედ შეტყობინებას შორის დროის გამყოფი (თარიღის ბადჯი) გჭირდება თუ არა
export function needsSeparator(prevCreatedAt?: string | null, currentCreatedAt?: string): boolean {
  if (!currentCreatedAt) return false;
  if (!prevCreatedAt) return true;
  const prev = new Date(prevCreatedAt);
  const curr = new Date(currentCreatedAt);
  if (!isSameDay(prev, curr)) return true;
  // იგივე დღეს, მაგრამ 20+ წუთის შემდეგ — მაინც გამოვაჩინოთ დროის ბადჯი
  return curr.getTime() - prev.getTime() > 20 * 60 * 1000;
}

const MONTHS_KA = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

export function msgTimeLabel(createdAt: string): string {
  const d = new Date(createdAt);
  const now = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;

  if (isSameDay(d, now)) return time;

  const yesterday = new Date(now.getTime() - DAY_MS);
  if (isSameDay(d, yesterday)) return `გუშინ, ${time}`;

  const sameYear = d.getFullYear() === now.getFullYear();
  const dateStr = sameYear
    ? `${d.getDate()} ${MONTHS_KA[d.getMonth()]}`
    : `${d.getDate()} ${MONTHS_KA[d.getMonth()]} ${d.getFullYear()}`;
  return `${dateStr}, ${time}`;
}