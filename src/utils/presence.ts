// ონლაინად ითვლება, თუ სტატუსი 'online'-ია და ბოლო აქტივობა ბოლო 2 წუთშია
const ONLINE_WINDOW_MS = 2 * 60 * 1000; // 2 წუთი

export function isUserOnline(user: { user_status?: string | null; last_seen?: string | null } | null | undefined): boolean {
  if (!user) return false;
  if (user.user_status !== 'online') return false;
  if (!user.last_seen) return false;

  const last = new Date(user.last_seen).getTime();
  if (isNaN(last)) return false;

  return Date.now() - last < ONLINE_WINDOW_MS;
}