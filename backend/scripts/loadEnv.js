// โหลด .env จากโฟลเดอร์ backend เสมอ (ไม่ขึ้นกับ cwd ที่รันคำสั่ง)
// ต้อง import ไฟล์นี้ "เป็นอันดับแรก" ก่อน module อื่น ๆ ที่อ่าน process.env ตอน load
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(dir, '../.env') });
