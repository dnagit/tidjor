// ความยินยอมคุกกี้ (PDPA): 'all' = ยอมรับคุกกี้วิเคราะห์ (Google Analytics), 'necessary' = เฉพาะที่จำเป็น
// null = ยังไม่ได้เลือก → แสดงแถบขอความยินยอม
export type Consent = 'all' | 'necessary' | null;
const KEY = 'tj_consent';

export function useConsent() {
  const consent = useState<Consent>('consent', () => null);
  const ready = useState('consent-ready', () => false); // อ่านค่าจาก browser แล้วหรือยัง (กันแถบกระพริบตอน SSR)

  function set(value: Exclude<Consent, null>) {
    consent.value = value;
    try { localStorage.setItem(KEY, value); } catch { /* private mode */ }
    if (value === 'necessary') clearGaCookies();
  }
  function reset() {
    consent.value = null;
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }
  return { consent, ready, set, reset, KEY };
}

// ถอนความยินยอม → ลบคุกกี้ของ Google Analytics (_ga, _ga_XXXX)
function clearGaCookies() {
  if (!import.meta.client) return;
  const host = location.hostname.replace(/^www\./, '');
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0].trim();
    if (!name.startsWith('_ga')) continue;
    for (const domain of ['', `; domain=${host}`, `; domain=.${host}`]) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
}
