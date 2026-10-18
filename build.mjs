import fs from 'node:fs';
import path from 'node:path';

const origin = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
).replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(origin))
  throw new Error('Set SITE_URL in Vercel to your full public HTTPS URL (without a trailing slash), e.g. https://your-project.vercel.app');

fs.rmSync('public', {recursive: true, force: true});
fs.mkdirSync('public/album', {recursive: true});
fs.cpSync('assets', 'public/assets', { recursive: true });
for (const [input,output,url,image] of [
  ['index.html','public/index.html',`${origin}/`,`${origin}/og-invite-2026.jpg`],
  ['album/index.html','public/album/index.html',`${origin}/album/`,`${origin}/album-og.jpg`]
]) {
  let html = fs.readFileSync(input, 'utf8');
  for (const [name,value] of [['og:url',url],['og:image',image]]) {
    const regex = new RegExp(`(<meta\\s+property="${name}"\\s+content=")[^"]*(")`, 'i');
    if (!regex.test(html)) throw new Error(`Missing ${name} tag in ${input}`);
    html = html.replace(regex, (_, start, end) => start+value+end);
  }
  fs.writeFileSync(output, html, 'utf8');
}
for (const pic of ['og.jpg','album-og.jpg','og-invite-2026.jpg']) fs.copyFileSync(pic, path.join('public',pic));
if (fs.existsSync('couple.jpg')) fs.copyFileSync('couple.jpg','public/couple.jpg');
console.log(`Website ready; WhatsApp previews point to ${origin}/og-invite-2026.jpg and ${origin}/album-og.jpg`);
