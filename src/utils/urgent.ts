const URGENT_LIFETIME_MS = 48 * 60 * 60 * 1000; // 48 საათი

// ვადაგასული urgent ვაკანსიაა? (მხოლოდ urgent-ს ეხება)
export function isExpiredUrgent(job: any): boolean {
  if (!job?.is_urgent) return false;
  // 'expired' სტატუსი — cron-მა უკვე მონიშნა
  if (job?.status === 'expired') return true;
  if (!job?.created_at) return false; // mock/სატესტო — ასაკი უცნობია, არ ვმალავთ
  const created = new Date(job.created_at).getTime();
  if (isNaN(created)) return false;
  return Date.now() - created >= URGENT_LIFETIME_MS;
}