# Ahmed & Donia — updated original-style WhatsApp preview

The new 1200 x 630 preview is a screenshot of the wedding website's *original envelope design*, using its existing elegant Pinyon Script font, flowers, gold lace and wax seal. It says "WE WOULD LIKE TO INVITE YOU" instead of "A LOVE LETTER FROM". The WhatsApp caption now says "We Would Like to Invite You — Ahmed & Donia". No website layout, animation or gallery functionality was changed for this preview.

This ZIP contains the full Backblaze B2 update overlay, based on your latest site. Make a GitHub backup / use a branch before applying. It is NOT an independent complete site: keep the original assets/ folder, especially the floral asset, fonts and camera.js.

IMPORTANT: The `npm run cors` success you showed used https://ahmed-donia-wedding.vercel.app but the WhatsApp screenshot links https://ahmed-donia-wedding2.vercel.app. If the second URL is your live site, edit `SITE_URL=` in local `.env.local` to https://ahmed-donia-wedding2.vercel.app and rerun `npm run cors` to allow that actual origin (before deleting the temporary CORS admin key). Then set the matching SITE_URL in Vercel and redeploy. If using a different live URL, use that one everywhere.

To deploy: upload the entire overlay's contents to your existing GitHub repo root, NOT the ZIP itself or its parent folder. Do not delete existing assets/. Configure Vercel environment variables as in the previous README, ensure `npm run build` and Output Directory `public`, and redeploy. Do NOT upload .env.local or any application key. Share site URL with ?preview=2026 to force WhatsApp to request a new page preview. OG image uses a versioned filename og-invite-2026.jpg.

Venue text is "Shorta Avenue, Lotus Hall" with a Google Maps search link (not a confirmed pin).
