/**
 * Format milliseconds as mm:ss timestamp
 */
export function formatTimestamp(ms: number): string {
  if (!ms || ms < 0 || isNaN(ms)) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}
