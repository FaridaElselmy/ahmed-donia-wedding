import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { storage } from '../lib/b2.js';

const EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
  'video/x-m4v': 'm4v', 'video/3gpp': '3gp'
};
const MAX_BYTES = 150 * 1024 * 1024;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  try {
    const contentType = String(req.body?.contentType ?? '').toLowerCase().split(';')[0];
    const size = req.body?.size;
    if (!Object.hasOwn(EXT, contentType))
      return res.status(400).json({ error: 'Unsupported file type. Please choose JPEG, PNG or a common video format.' });
    if (!Number.isInteger(size) || size < 1 || size > MAX_BYTES)
      return res.status(400).json({ error: 'Files must be under 150 MB.' });
    const { client, bucket } = storage();
    const key = `wedding/${Date.now()}-${randomUUID()}.${EXT[contentType]}`;
    const uploadUrl = await getSignedUrl(client, new PutObjectCommand({
      Bucket: bucket, Key: key, ContentType: contentType, ContentLength: size
    }), { expiresIn: 10 * 60 });
    res.status(200).json({ key, uploadUrl, contentType });
  } catch (e) {
    console.error('upload-url error', e);
    res.status(500).json({ error: 'Storage connection is not ready. Please tell the couple.' });
  }
}
