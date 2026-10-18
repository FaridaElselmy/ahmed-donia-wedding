// One-time LOCAL command. Requires an unrestricted key with writeBuckets permission.
// NEVER put B2_CORS_KEY_ID or B2_CORS_KEY into Vercel or GitHub.
import { PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { storage } from '../lib/b2.js';
const site = (process.env.SITE_URL || '').replace(/\/+$/, '');
if (!/^https:\/\/[-a-z0-9.]+$/i.test(site)) throw new Error('SITE_URL must be your exact https://... domain.');
const { client, bucket } = storage({ forCors: true });
await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: {
  CORSRules: [{
    AllowedOrigins: [site], AllowedMethods: ['PUT', 'GET', 'HEAD'],
    AllowedHeaders: ['*'], ExposeHeaders: ['ETag'], MaxAgeSeconds: 3600
  }]
} }));
console.log(`CORS configured successfully for ${site} in the bucket ${bucket}.`);
