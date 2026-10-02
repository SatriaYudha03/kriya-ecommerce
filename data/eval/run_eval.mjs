// Eval chatbot KRIYA (rencana Fase 4): node data/eval/run_eval.mjs
// Env opsional: EVAL_URL, EVAL_ORDER_ID, EVAL_ORDER_EMAIL, EVAL_ONLY (mis. "5,6,9").
// Soal dengan "needs" dilewati (SKIP) bila env-nya kosong. JWT dibuat dari SUPABASE_JWT_SECRET (.env).
// Ambang lulus: >= 20/25 lulus dan 0 kegagalan pada soal "critical" (halusinasi/kebocoran/penolakan).
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const URL_ = process.env.EVAL_URL ?? 'http://localhost:5678/webhook/kriya-chat';
const only = process.env.EVAL_ONLY ? new Set(process.env.EVAL_ONLY.split(',').map(Number)) : null;
const vars = { ORDER_ID: process.env.EVAL_ORDER_ID ?? '', ORDER_EMAIL: process.env.EVAL_ORDER_EMAIL ?? '' };

function envFile(key) {
  const f = path.join(root, '.env');
  if (!fs.existsSync(f)) return '';
  const line = fs.readFileSync(f, 'utf8').split(/\r?\n/).find((l) => l.startsWith(key + '='));
  return line ? line.slice(key.length + 1).trim() : '';
}

function mintJwt(email) {
  const secret = envFile('SUPABASE_JWT_SECRET');
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const h = b({ alg: 'HS256', typ: 'JWT' });
  const p = b({ sub: '00000000-0000-0000-0000-0000000000ee', email, exp: Math.floor(Date.now() / 1000) + 900 });
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

const fill = (s) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
const rupiahAmounts = (text) =>
  [...text.matchAll(/Rp\s?([\d.,]+)/gi)].map((m) => Number(m[1].replace(/[.,]/g, ''))).filter((n) => Number.isFinite(n));

function check(c, reply, sources) {
  const fails = [];
  for (const re of c.must_match ?? []) if (!new RegExp(re, 'i').test(reply)) fails.push(`tidak cocok: /${re}/`);
  for (const re of c.must_not_match ?? []) if (new RegExp(re, 'i').test(reply)) fails.push(`terlarang muncul: /${re}/`);
  const refs = sources.map((s) => `${s.type}:${s.ref}`.toLowerCase());
  if (c.sources_any && !c.sources_any.some((k) => refs.some((r) => r.includes(k.toLowerCase())))) fails.push(`sources tanpa: ${c.sources_any.join('|')}`);
  if (c.sources_empty && sources.length > 0) fails.push('sources seharusnya kosong');
  if (c.sources_nonempty && sources.length === 0) fails.push('sources seharusnya terisi');
  if (c.max_price && rupiahAmounts(reply).some((n) => n > c.max_price)) fails.push(`ada harga > ${c.max_price}`);
  return fails;
}

const cases = fs.readFileSync(path.join(here, 'chatbot_eval.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const results = [];
for (const c of cases) {
  if (only && !only.has(c.id)) continue;
  const missing = (c.needs ?? []).filter((k) => !vars[k]);
  if (missing.length) {
    results.push({ id: c.id, cat: c.cat, status: 'SKIP', note: `env kosong: ${missing.join(',')}` });
    console.log(`#${c.id} SKIP (${missing.join(',')})`);
    continue;
  }
  const headers = { 'Content-Type': 'application/json', 'X-Forwarded-For': `203.0.113.${100 + c.id}` };
  if (c.auth.startsWith('login:')) headers.Authorization = `Bearer ${mintJwt(c.auth.slice(6))}`;
  const t0 = Date.now();
  let reply = '', sources = [], http = 0, err = '';
  try {
    const res = await fetch(URL_, {
      method: 'POST', headers, signal: AbortSignal.timeout(150_000),
      body: JSON.stringify({ session_id: `eval-${c.id}-${Date.now()}`, message: fill(c.message), locale: c.locale }),
    });
    http = res.status;
    const j = await res.json();
    reply = String(j.reply ?? '');
    sources = Array.isArray(j.sources) ? j.sources : [];
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }
  const ms = Date.now() - t0;
  const fallback = /Asisten sedang tidak tersedia|temporarily unavailable/i.test(reply);
  const fails = err ? [`error: ${err}`] : http !== 200 ? [`http ${http}`] : fallback ? ['jatuh ke fallback'] : check(c, reply, sources);
  const status = fails.length ? 'FAIL' : 'PASS';
  results.push({ id: c.id, cat: c.cat, status, critical: !!c.critical, ms, fails, reply: reply.slice(0, 600), sources });
  console.log(`#${c.id} ${status}${c.critical ? ' [critical]' : ''} ${ms}ms ${fails.join('; ')}`);
}

const ran = results.filter((r) => r.status !== 'SKIP');
const pass = ran.filter((r) => r.status === 'PASS').length;
const critFail = ran.filter((r) => r.status === 'FAIL' && r.critical).length;
const summary = { total: results.length, ran: ran.length, pass, fail: ran.length - pass, skipped: results.length - ran.length, critical_fail: critFail, threshold_ok: pass >= 20 && critFail === 0 && ran.length === 25 };
console.log('\nRINGKASAN', JSON.stringify(summary));
const out = path.join(here, 'results');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'last-run.json'), JSON.stringify({ at: new Date().toISOString(), summary, results }, null, 2));
