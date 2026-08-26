// utils/budget.ts

// რიცხვის უსაფრთხო ამოღება — ახალ numeric სვეტებზეც და ძველ string budget-ზეც მუშაობს
export function parseBudgetNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  const match = String(value).match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

// სორტისთვის: max-ს ვანიჭებთ პრიორიტეტს, fallback → min → ძველი string budget.
export function getSortableBudget(job: any): number | null {
  const max = parseBudgetNumber(job?.max_budget);
  if (max !== null) return max;
  const min = parseBudgetNumber(job?.min_budget);
  if (min !== null) return min;
  return parseBudgetNumber(job?.budget); // ძველი ჩანაწერების fallback
}

// კომპარატორი — "შეთანხმებით" (null) ყოველთვის ბოლოში, მიმართულების მიუხედავად
export function compareBudget(a: any, b: any, dir: 'asc' | 'desc'): number {
  const av = getSortableBudget(a);
  const bv = getSortableBudget(b);
  if (av === null && bv === null) return 0;
  if (av === null) return 1;   // a → ბოლოში
  if (bv === null) return -1;  // b → ბოლოში
  return dir === 'asc' ? av - bv : bv - av;
}

// ჩვენებისთვის ლამაზი ტექსტი (100 – 200 ₾ / 100 ₾-დან / შეთანხმებით)
export function formatBudgetRange(job: any, negotiableLabel = 'შეთანხმებით'): string {
  const min = parseBudgetNumber(job?.min_budget);
  const max = parseBudgetNumber(job?.max_budget);

  if (min !== null && max !== null) {
    return min === max ? `${min} ₾` : `${min} – ${max} ₾`;
  }
  if (min !== null) return `${min} ₾-დან`;
  if (max !== null) return `${max} ₾-მდე`;

  // ახალ სვეტებში ცარიელია — ვცადოთ ძველი string budget
  const legacy = job?.budget;
  if (legacy && String(legacy).trim() && String(legacy) !== 'შეთანხმებით') {
    const s = String(legacy).trim();
    return s.includes('₾') ? s : `${s} ₾`;
  }
  return negotiableLabel;
}