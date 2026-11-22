// URL หน้านักแสดง: /people/{tmdbPersonId}-{ชื่อ-ภาษาอังกฤษ} เช่น /people/1245-scarlett-johansson
export function personPath(id: number, name = '') {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `/people/${id}${slug ? `-${slug}` : ''}`;
}
