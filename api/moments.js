import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { isWeddingKey, storage, viewUrl } from '../lib/b2.js';

const MAX_NAME = 40, MAX_TEXT = 500, MAX_SIZE = 150 * 1024 * 1024;

function database() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_ANON_KEY || '';
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) || !key)
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY.');
  return { url, headers: {
    apikey: key,
    ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {})
  } };
}

function legacyUrl(url, key) {
  if (!key || typeof key !== 'string' || key.startsWith('/') || key.includes('..')) return null;
  return `${url}/storage/v1/object/public/moments/${key.split('/').map(encodeURIComponent).join('/')}`;
}

async function validateFile(client, bucket, key) {
  try {
    const meta = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (!Number.isSafeInteger(meta.ContentLength) || meta.ContentLength < 1 || meta.ContentLength > MAX_SIZE)
      throw new Error('Upload file is missing or too large.');
  } catch (e) {
    if (e.message === 'Upload file is missing or too large.') throw e;
    throw new Error('Upload is not yet available. Please try posting again.');
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method))
    return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const db = database();
    const { client, bucket } = storage();
    if (req.method === 'GET') {
      const result = await fetch(`${db.url}/rest/v1/moments?select=*&order=created_at.desc&limit=400`, { headers: db.headers });
      if (!result.ok) throw new Error(`Database read failed (${result.status}): ${await result.text()}`);
      const entries = await result.json();
      const urls = await Promise.all(entries.map(async entry => {
        const read = key => key && (isWeddingKey(key) ? viewUrl(client, bucket, key) : legacyUrl(db.url, key));
        const [url, thumbUrl] = await Promise.all([read(entry.path), read(entry.thumb)]);
        return { ...entry, url: url || null, thumbUrl: thumbUrl || null };
      }));
      return res.status(200).json(urls);
    }

    const input = req.body || {};
    const kind = input.kind;
    const name = String(input.name || 'A guest').trim().slice(0, MAX_NAME) || 'A guest';
    const text = String(input.text || '').trim().slice(0, MAX_TEXT);
    if (!['note', 'photo', 'video'].includes(kind))
      return res.status(400).json({ error: 'Unknown moment type.' });
    if (kind === 'note' && !text)
      return res.status(400).json({ error: 'Please write a note first.' });
    if (kind !== 'note') {
      if (!isWeddingKey(input.path)) return res.status(400).json({ error: 'Invalid photo/video upload reference.' });
      if (input.thumb && !isWeddingKey(input.thumb)) return res.status(400).json({ error: 'Invalid thumbnail reference.' });
      await validateFile(client, bucket, input.path);
      if (input.thumb) await validateFile(client, bucket, input.thumb);
    }
    const payload = {
      name, text, kind,
      path: kind === 'note' ? null : input.path,
      thumb: kind === 'note' ? null : (input.thumb || null),
      ratio: kind === 'note' ? null : (typeof input.ratio === 'number' && Number.isFinite(input.ratio)
        ? Math.max(.1, Math.min(10, input.ratio)) : null)
    };
    const result = await fetch(`${db.url}/rest/v1/moments`, {
      method: 'POST', headers: {
        ...db.headers,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      }, body: JSON.stringify(payload)
    });
    if (!result.ok) throw new Error(`Database write failed (${result.status}): ${await result.text()}`);
    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error('moments error', e);
    res.status(e.message?.startsWith('Upload ') ? 400 : 500)
      .json({ error: e.message?.startsWith('Upload ') ? e.message : 'Could not reach the wedding album. Please try again shortly.' });
  }
}
