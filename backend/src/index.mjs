import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');
const projectRoot = path.join(backendRoot, '..');

const PORT = Number(process.env.PORT) || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

function resolveDbName() {
  const envDb = (process.env.MONGODB_DB_NAME || '').trim();
  if (envDb) return envDb;
  try {
    if (!MONGODB_URI) return 'fondly';
    const parsed = new URL(MONGODB_URI);
    const dbFromPath = parsed.pathname.replace(/^\//, '').trim();
    return dbFromPath || 'fondly';
  } catch {
    return 'fondly';
  }
}

const DB_NAME = resolveDbName();
const COUPON_VALID_UNTIL_ISO = '2026-04-19T01:00:00+05:30';
const COUPON_VALID_UNTIL = new Date(COUPON_VALID_UNTIL_ISO);
const COUPON_EXPIRED_MESSAGE = 'Coupon validity ended on 19-04-2026, 01:00 AM.';
const DEFAULT_WHEEL_IMAGE_SIZE = 28;

if (!MONGODB_URI) {
  console.error(
    'Missing MONGODB_URI. For production (e.g. Render), add MONGODB_URI in the service Environment tab. For local dev, set it in backend/.env (see backend/.env.example).',
  );
  process.exit(1);
}

const app = express();
app.use(cors({ origin: true }));
// Reward image uploads use base64 data URLs, so keep JSON payload limit above default.
app.use(express.json({ limit: '10mb' }));

/** @type {MongoClient | null} */
let client = null;

async function getDb() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client.db(DB_NAME);
}

function iso(d) {
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

async function getCouponPolicy(db) {
  const settings = await db.collection('campaign_settings').findOne({});
  const rawUntil = settings?.coupon_valid_until;
  const until = rawUntil ? new Date(rawUntil) : COUPON_VALID_UNTIL;
  const message =
    typeof settings?.coupon_validity_text === 'string' && settings.coupon_validity_text.trim()
      ? settings.coupon_validity_text.trim()
      : COUPON_EXPIRED_MESSAGE;
  return { until, message };
}

function readCampaignCouponCodes() {
  const candidateFiles = [
    path.join(projectRoot, 'frontend', 'data', 'custom_coupon_lines.txt'),
    path.join(projectRoot, 'data', 'custom_coupon_lines.txt'),
  ];
  const target = candidateFiles.find((p) => fs.existsSync(p));
  if (!target) return [];
  return fs
    .readFileSync(target, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim().toUpperCase())
    .filter(Boolean);
}

async function ensureIndexes(db) {
  await db.collection('coupon_codes').createIndex({ code: 1 }, { unique: true });
  await db.collection('user_submissions').createIndex({ phone: 1 }, { unique: true });
  await db.collection('user_submissions').createIndex({ coupon_code: 1 }, { unique: true, sparse: true });
}

async function ensureSeed(db) {
  const settingsColl = db.collection('campaign_settings');
  if ((await settingsColl.countDocuments()) === 0) {
    await settingsColl.insertOne({
      id: randomUUID(),
      spin_enabled: true,
      whatsapp_number: '919999999999',
      whatsapp_message: 'Hi, I received the Fondly reward.',
      coupon_valid_until: COUPON_VALID_UNTIL,
      coupon_validity_text: COUPON_EXPIRED_MESSAGE,
      wheel_image_size: DEFAULT_WHEEL_IMAGE_SIZE,
      updated_at: new Date().toISOString(),
    });
  }

  const rewardsColl = db.collection('rewards');
  if ((await rewardsColl.countDocuments()) === 0) {
    const now = new Date().toISOString();
    const rows = [
      ['Premium Dates Experience', '100g curated dates selection', 5, 10, 1],
      ['Daily Wellness Mix', '75g premium dry fruits blend', 10, 20, 2],
      ['Pure Honey Sample', '50g raw organic honey', 10, 30, 3],
      ['Founder Offer', 'Exclusive founding discount', 15, 50, 4],
      ['Wellness Offer', 'Welcome wellness discount', 20, 100, 5],
      ['Founding Member Access', 'Early access to new launches', 15, 50, 6],
      ['Private Event Invite', 'Exclusive tasting event', 10, 20, 7],
      ['Try Again', 'Better luck next time', 15, 999, 8],
    ];
    await rewardsColl.insertMany(
      rows.map(([title, description, probability, stock, sort_order]) => ({
        id: randomUUID(),
        title,
        description,
        content: null,
        sub_content: null,
        image_url: null,
        probability,
        stock,
        enabled: true,
        sort_order,
        created_at: now,
        updated_at: now,
      })),
    );
  }

  const nowIso = new Date().toISOString();

  await rewardsColl.updateMany(
    { title: '20% Founder Offer' },
    { $set: { title: 'Founder Offer', updated_at: nowIso } },
  );
  await rewardsColl.updateMany(
    { title: '10% Wellness Offer' },
    { $set: { title: 'Wellness Offer', updated_at: nowIso } },
  );
}

async function activateCampaignCoupons(db) {
  const couponCodes = readCampaignCouponCodes();
  if (!couponCodes.length) return;

  const now = new Date();
  const ops = couponCodes.map((code) => ({
    updateOne: {
      filter: { code },
      update: {
        $set: {
          code,
          used: false,
          used_at: null,
        },
        $setOnInsert: {
          id: randomUUID(),
          created_at: now,
          updated_at: now,
        },
      },
      upsert: true,
    },
  }));
  await db.collection('coupon_codes').bulkWrite(ops, { ordered: false });
}

/** Bump when coupons are added or unused rows are removed from the admin tools. */
async function touchCouponInventorySavedAt(db) {
  const row = await db.collection('campaign_settings').findOne({});
  if (!row) return;
  const nowIso = new Date().toISOString();
  await db.collection('campaign_settings').updateOne(
    { id: row.id },
    { $set: { coupon_inventory_saved_at: nowIso, updated_at: nowIso } },
  );
}

function parseBool(v) {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return Boolean(v);
}

// --- Routes ---

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: DB_NAME });
});

app.get('/api/rewards', async (req, res) => {
  try {
    const db = await getDb();
    const scope = req.query.scope === 'admin' ? 'admin' : 'public';
    const q =
      scope === 'public'
        ? { enabled: true, stock: { $gt: 0 } }
        : {};
    const list = await db
      .collection('rewards')
      .find(q)
      .sort({ sort_order: 1 })
      .toArray();
    res.json(
      list.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description ?? null,
        content: r.content ?? null,
        sub_content: r.sub_content ?? null,
        image_url: r.image_url ?? null,
        probability: r.probability,
        stock: r.stock,
        enabled: r.enabled,
        sort_order: r.sort_order,
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.patch('/api/rewards/:id', async (req, res) => {
  try {
    const db = await getDb();
    const allowed = [
      'title',
      'description',
      'content',
      'sub_content',
      'image_url',
      'probability',
      'stock',
      'enabled',
      'sort_order',
    ];
    const $set = { updated_at: new Date().toISOString() };
    for (const k of allowed) {
      if (k in req.body) {
        let v = req.body[k];
        if (k === 'enabled') v = parseBool(v);
        if (k === 'probability' || k === 'stock' || k === 'sort_order') v = Number(v);
        $set[k] = v;
      }
    }
    const r = await db.collection('rewards').updateOne({ id: req.params.id }, { $set });
    if (r.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.get('/api/campaign-settings', async (_req, res) => {
  try {
    const db = await getDb();
    const row = await db.collection('campaign_settings').findOne({});
    if (!row) return res.status(404).json({ error: 'No campaign settings' });
    res.json({
      id: row.id,
      spin_enabled: row.spin_enabled,
      whatsapp_number: row.whatsapp_number ?? null,
      whatsapp_message: row.whatsapp_message ?? null,
      coupon_inventory_saved_at: row.coupon_inventory_saved_at ? iso(row.coupon_inventory_saved_at) : null,
      coupon_valid_until: row.coupon_valid_until ? iso(row.coupon_valid_until) : COUPON_VALID_UNTIL_ISO,
      coupon_validity_text: row.coupon_validity_text ?? COUPON_EXPIRED_MESSAGE,
      wheel_image_size:
        typeof row.wheel_image_size === 'number' && Number.isFinite(row.wheel_image_size)
          ? row.wheel_image_size
          : DEFAULT_WHEEL_IMAGE_SIZE,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.patch('/api/campaign-settings/:id', async (req, res) => {
  try {
    const db = await getDb();
    const $set = { updated_at: new Date().toISOString() };
    if ('spin_enabled' in req.body) $set.spin_enabled = parseBool(req.body.spin_enabled);
    if ('whatsapp_number' in req.body) $set.whatsapp_number = req.body.whatsapp_number;
    if ('whatsapp_message' in req.body) $set.whatsapp_message = req.body.whatsapp_message;
    if ('coupon_validity_text' in req.body) $set.coupon_validity_text = req.body.coupon_validity_text;
    if ('coupon_valid_until' in req.body) {
      const raw = req.body.coupon_valid_until;
      const dt = raw ? new Date(raw) : null;
      if (dt && Number.isNaN(dt.getTime())) {
        return res.status(400).json({ error: 'Invalid coupon_valid_until datetime.' });
      }
      $set.coupon_valid_until = dt;
    }
    if ('wheel_image_size' in req.body) {
      const n = Number(req.body.wheel_image_size);
      if (!Number.isFinite(n) || n < 12 || n > 96) {
        return res.status(400).json({ error: 'wheel_image_size must be a number between 12 and 96.' });
      }
      $set.wheel_image_size = Math.round(n);
    }
    const r = await db.collection('campaign_settings').updateOne({ id: req.params.id }, { $set });
    if (r.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.get('/api/coupons/:code', async (req, res) => {
  try {
    const db = await getDb();
    const policy = await getCouponPolicy(db);
    if (Date.now() > policy.until.getTime()) return res.status(410).json({ error: policy.message });
    const code = String(req.params.code || '')
      .trim()
      .toUpperCase();
    if (!code) return res.status(400).json({ error: 'Invalid code' });
    const row = await db.collection('coupon_codes').findOne({ code });
    if (!row) return res.status(404).json({ error: 'Invalid coupon code.' });
    res.json({ code: row.code, used: Boolean(row.used) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.get('/api/coupon-codes', async (_req, res) => {
  try {
    const db = await getDb();
    const list = await db.collection('coupon_codes').find({}).sort({ code: 1 }).toArray();
    res.json(
      list.map((c) => ({
        id: c.id,
        code: c.code,
        used: Boolean(c.used),
        used_at: c.used_at ? iso(c.used_at) : null,
        created_at: iso(c.created_at),
        updated_at: c.updated_at ? iso(c.updated_at) : c.created_at ? iso(c.created_at) : null,
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.get('/api/coupon-codes/codes-only', async (req, res) => {
  try {
    const offset = Math.max(0, parseInt(String(req.query.offset || '0'), 10) || 0);
    const limit = Math.min(5000, Math.max(1, parseInt(String(req.query.limit || '1000'), 10) || 1000));
    const db = await getDb();
    const rows = await db
      .collection('coupon_codes')
      .find({}, { projection: { code: 1, _id: 0 } })
      .sort({ code: 1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    res.json({ codes: rows.map((d) => d.code) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.post('/api/coupon-codes/bulk', async (req, res) => {
  try {
    const codes = Array.isArray(req.body?.codes) ? req.body.codes.map((c) => String(c).trim().toUpperCase()).filter(Boolean) : [];
    if (!codes.length) return res.json({ inserted: 0 });
    const db = await getDb();
    let inserted = 0;
    const now = new Date();
    for (const code of codes) {
      try {
        await db.collection('coupon_codes').insertOne({
          id: randomUUID(),
          code,
          used: false,
          used_at: null,
          created_at: now,
          updated_at: now,
        });
        inserted++;
      } catch (e) {
        if (e && typeof e === 'object' && 'code' in e && e.code === 11000) continue;
        throw e;
      }
    }
    if (inserted > 0) await touchCouponInventorySavedAt(db);
    res.json({ inserted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

/**
 * Delete coupon rows by exact codes or by code prefix.
 * Default: unused only (`includeUsed` false). Set `includeUsed: true` to remove redeemed rows too.
 */
app.post('/api/coupon-codes/delete-unused', async (req, res) => {
  try {
    const rawCodes = Array.isArray(req.body?.codes) ? req.body.codes : [];
    const codes = rawCodes.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
    const prefixRaw = req.body?.prefix != null ? String(req.body.prefix).trim().toUpperCase() : '';
    const prefix = /^[A-Z0-9]+$/.test(prefixRaw) ? prefixRaw : '';
    const includeUsed = parseBool(req.body?.includeUsed);

    const db = await getDb();
    let filter;
    if (codes.length) {
      const codeFilter = { $in: codes };
      filter = includeUsed ? { code: codeFilter } : { used: false, code: codeFilter };
    } else if (prefix.length) {
      const re = new RegExp(`^${prefix.replace(/[^A-Z0-9]/g, '')}`);
      filter = includeUsed ? { code: re } : { used: false, code: re };
    } else {
      return res.status(400).json({
        error: 'Send { codes: [...] } or { prefix: "FND" } (prefix: letters and digits only).',
      });
    }

    const r = await db.collection('coupon_codes').deleteMany(filter);
    if (r.deletedCount > 0) await touchCouponInventorySavedAt(db);
    res.json({ deleted: r.deletedCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.get('/api/user-submissions', async (_req, res) => {
  try {
    const db = await getDb();
    const list = await db
      .collection('user_submissions')
      .find({})
      .sort({ created_at: -1 })
      .toArray();
    res.json(
      list.map((s) => ({
        id: s.id,
        phone: s.phone,
        coupon_code: s.coupon_code ?? null,
        pin_code: s.pin_code ?? null,
        otp_verified: Boolean(s.otp_verified),
        name: s.name ?? null,
        address: s.address ?? null,
        city: s.city ?? null,
        source: s.source ?? null,
        reward_title: s.reward_title ?? null,
        created_at: iso(s.created_at),
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.get('/api/user-submissions/check-phone/:phone', async (req, res) => {
  try {
    const phone = String(req.params.phone || '').replace(/\D/g, '');
    if (phone.length !== 10) return res.status(400).json({ error: 'Invalid phone' });
    const db = await getDb();
    const row = await db.collection('user_submissions').findOne({ phone });
    res.json({ exists: Boolean(row) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.post('/api/user-submissions', async (req, res) => {
  try {
    const db = await getDb();
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    if (phone.length !== 10) return res.status(400).json({ error: 'Invalid phone' });
    const id = randomUUID();
    const now = new Date();
    try {
      await db.collection('user_submissions').insertOne({
        id,
        phone,
        otp_code: req.body?.otp_code ?? null,
        otp_expires_at: req.body?.otp_expires_at ? new Date(req.body.otp_expires_at) : null,
        otp_verified: false,
        reward_id: req.body?.reward_id ?? null,
        reward_title: req.body?.reward_title ?? null,
        name: null,
        address: null,
        city: null,
        pin_code: null,
        source: null,
        coupon_code: null,
        created_at: now,
        updated_at: now,
      });
    } catch (e) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 11000) {
        return res.status(409).json({ error: 'Duplicate phone' });
      }
      throw e;
    }
    res.json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.get('/api/user-submissions/:id/otp', async (req, res) => {
  try {
    const db = await getDb();
    const row = await db.collection('user_submissions').findOne(
      { id: req.params.id },
      { projection: { otp_code: 1, otp_expires_at: 1, _id: 0 } },
    );
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({
      otp_code: row.otp_code ?? null,
      otp_expires_at: row.otp_expires_at ? iso(row.otp_expires_at) : null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.patch('/api/user-submissions/:id', async (req, res) => {
  try {
    const db = await getDb();
    const allowed = [
      'name',
      'address',
      'city',
      'pin_code',
      'source',
      'otp_verified',
      'otp_code',
      'otp_expires_at',
    ];
    const $set = { updated_at: new Date().toISOString() };
    for (const k of allowed) {
      if (k in req.body) {
        let v = req.body[k];
        if (k === 'otp_verified') v = parseBool(v);
        if (k === 'otp_expires_at' && v) v = new Date(v);
        $set[k] = v;
      }
    }
    const r = await db.collection('user_submissions').updateOne({ id: req.params.id }, { $set });
    if (r.matchedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

app.post('/api/spin/complete', async (req, res) => {
  const db = await getDb();
  const policy = await getCouponPolicy(db);
  if (Date.now() > policy.until.getTime()) {
    return res.status(410).json({ error: policy.message });
  }
  const phone = String(req.body?.phone || '').replace(/\D/g, '');
  const couponCode = String(req.body?.couponCode || '')
    .trim()
    .toUpperCase();
  const rewardId = String(req.body?.rewardId || '');
  const rewardTitle = String(req.body?.rewardTitle || '');

  if (phone.length !== 10 || !couponCode || !rewardId) {
    return res.status(400).json({ error: 'Missing phone, coupon, or reward' });
  }

  try {
    const mongo = /** @type {MongoClient} */ (client);
    const session = mongo.startSession();
    const submissionId = randomUUID();

    try {
      await session.withTransaction(async () => {
        const reward = await db
          .collection('rewards')
          .findOne({ id: rewardId, enabled: true, stock: { $gt: 0 } }, { session });
        if (!reward) {
          throw Object.assign(new Error('Reward unavailable'), { code: 'REWARD' });
        }

        const dupPhone = await db.collection('user_submissions').findOne({ phone }, { session });
        if (dupPhone) {
          throw Object.assign(new Error('Phone already used'), { code: 'PHONE' });
        }

        const coupon = await db.collection('coupon_codes').findOne({ code: couponCode }, { session });
        if (!coupon || coupon.used) {
          throw Object.assign(new Error('Invalid or used coupon'), { code: 'COUPON' });
        }

        const st = await db.collection('rewards').updateOne(
          { id: rewardId, enabled: true, stock: { $gt: 0 } },
          { $inc: { stock: -1 }, $set: { updated_at: new Date().toISOString() } },
          { session },
        );
        if (st.modifiedCount !== 1) {
          throw Object.assign(new Error('Reward unavailable'), { code: 'REWARD' });
        }

        const now = new Date();
        try {
          await db.collection('user_submissions').insertOne(
            {
              id: submissionId,
              phone,
              coupon_code: couponCode,
              reward_id: rewardId,
              reward_title: rewardTitle,
              otp_verified: true,
              name: null,
              address: null,
              city: null,
              pin_code: null,
              source: null,
              otp_code: null,
              otp_expires_at: null,
              created_at: now,
              updated_at: now,
            },
            { session },
          );
        } catch (e) {
          if (e && typeof e === 'object' && 'code' in e && e.code === 11000) {
            throw Object.assign(new Error('Coupon or phone already used'), { code: 'DUP' });
          }
          throw e;
        }

        const cu = await db.collection('coupon_codes').updateOne(
          { code: couponCode, used: false },
          { $set: { used: true, used_at: now, updated_at: now } },
          { session },
        );
        if (cu.modifiedCount !== 1) {
          throw Object.assign(new Error('Coupon could not be marked used'), { code: 'COUPON' });
        }
      });

      res.json({ id: submissionId });
    } finally {
      await session.endSession();
    }
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? e.code : '';
    if (code === 'DUP') return res.status(409).json({ error: 'This coupon was already used.' });
    if (code === 'COUPON') return res.status(400).json({ error: 'This coupon is no longer valid for a spin.' });
    if (code === 'PHONE') return res.status(409).json({ error: 'This phone number has already been used.' });
    if (code === 'REWARD') return res.status(400).json({ error: 'This reward is no longer available.' });
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
});

// --- Static (production): serve Vite build + SPA fallback ---

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(projectRoot, 'frontend', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(dist, 'index.html'));
    });
  }
}

async function main() {
  console.log(`Connecting to MongoDB (db name: ${DB_NAME})…`);
  const db = await getDb();
  console.log('Ensuring indexes…');
  await ensureIndexes(db);
  console.log('Ensuring seed data…');
  await ensureSeed(db);
  console.log('Activating campaign coupons (if configured)…');
  await activateCampaignCoupons(db);
  const host = '0.0.0.0';
  app.listen(PORT, host, () => {
    console.log(`API listening on http://${host}:${PORT} (database: ${DB_NAME})`);
  });
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error('Startup failed:', msg);
  if (e instanceof Error && e.stack) console.error(e.stack);
  else console.error(e);
  process.exit(1);
});
