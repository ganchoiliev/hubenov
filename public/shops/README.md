# Shop logos

By default the grid shows a styled **branded wordmark** for each shop (name + brand
accent), so it looks designed with no image files at all.

To show a real logo for a shop, do BOTH:
1. Drop the image file here (e.g. `amazon.png`).
2. In `src/config/shops.ts`, set that shop's `logo` field, e.g. `logo: '/shops/amazon.png'`.

The grid then shows the image instead of the wordmark (and falls back to the
wordmark automatically if the file is ever missing). Use official brand/press-kit
assets — do NOT use AI-generated imitations of brand logos (inaccurate + infringing).

## Suggested filenames

Use PNG (transparent background preferred), roughly 240×120px, ~max 40px tall when shown:

- amazon.png
- ebay.png
- asos.png
- next.png
- argos.png
- ikea.png
- decathlon.png
- marks-and-spencer.png
- hm.png
- zalando.png
- boots.png
- sports-direct.png
- nike.png
- adidas.png
- tk-maxx.png
- currys.png
- jd-sports.png
- lidl.png
- asda.png
- apple.png

To add or remove a shop, edit `src/config/shops.ts` (name, logo path, url).

## Legal note

These are third-party trademarks. The grid shows a non-affiliation disclaimer.
Use official brand/press-kit assets where possible. Do NOT use AI-generated
imitations of brand logos — they are inaccurate and infringe the trademark.
