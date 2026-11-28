import Anthropic from '@anthropic-ai/sdk';

// ============================================================
// ตัวช่วยเรียก Claude ที่ใช้ร่วมกัน (รีวิว AI + ข่าว AI)
// ============================================================

export const client = new Anthropic();

export const isHaiku = (m) => m.startsWith('claude-haiku');
// ถ้าโมเดลปฏิเสธคำขอ ให้ API ส่งต่อไปโมเดลสำรองให้อัตโนมัติ
// (Haiku ไม่มี server-side fallback — ห้ามส่ง fallbacks ไป)
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };
export const fallbackFor = (m) => (isHaiku(m) ? {} : FALLBACK);
// web search รุ่น dynamic filtering (20260209) ใช้ได้กับ Sonnet/Opus — Haiku ใช้รุ่นพื้นฐาน
const searchToolFor = (m) => (isHaiku(m) ? 'web_search_20250305' : 'web_search_20260209');

// ค้นเว็บแล้วสรุปเป็นโน้ต — วนต่อเมื่อเจอ pause_turn (server-side loop ครบรอบ)
// คืน { notes, sources: Map<url, {name, url}> } หรือ null ถ้าโมเดลปฏิเสธ
export async function webResearch(prompt, { model, maxSearches = 5 }) {
  const messages = [{ role: 'user', content: prompt }];
  let response;

  for (let i = 0; i < 4; i++) {
    response = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      ...fallbackFor(model),
      output_config: { effort: 'medium' },
      tools: [{ type: searchToolFor(model), name: 'web_search', max_uses: maxSearches }],
      messages,
    });
    if (response.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: response.content });
  }
  if (response.stop_reason === 'refusal') return null;

  // web search รุ่นใหม่อ่านผลผ่าน code execution → ข้อความไม่มี citations แนบมา
  // จึงเก็บ URL จากผลค้นหาทุกรอบไว้ แล้วให้ขั้นเขียนเลือกเฉพาะที่ใช้จริง
  const sources = new Map();
  for (const turn of [...messages.slice(1).map((m) => m.content), response.content]) {
    for (const block of turn) {
      if (block.type !== 'web_search_tool_result' || !Array.isArray(block.content)) continue;
      for (const r of block.content) {
        if (r.url && !sources.has(r.url)) sources.set(r.url, { name: r.title || new URL(r.url).hostname, url: r.url });
      }
    }
  }
  const notes = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { notes, sources };
}

// ขอคำตอบเป็น JSON ตาม schema — คืน null ถ้าโมเดลไม่ได้ตอบจบ (refusal / max_tokens)
export async function writeJson({ model, system, prompt, schema, effort = 'medium' }) {
  const response = await client.beta.messages.create({
    model,
    max_tokens: 16000,
    ...fallbackFor(model),
    output_config: { effort, format: { type: 'json_schema', schema } },
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  if (response.stop_reason !== 'end_turn') return null;
  const text = response.content.find((b) => b.type === 'text')?.text;
  return text ? JSON.parse(text) : null;
}
