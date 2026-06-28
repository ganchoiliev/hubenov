# Shop logos

Drop the shop logo image files here. The grid (`src/components/shared/ShopLogos.tsx`)
reads the list from `src/config/shops.ts`. If a file is missing, the grid shows the
shop **name** as text instead — so the site never looks broken before logos are added.

## Expected files (exact names)

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
