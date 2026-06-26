// @pdf-lib/fontkit ships no bundled types; pdf-lib's registerFontkit accepts it.
declare module '@pdf-lib/fontkit' {
  const fontkit: unknown;
  export default fontkit;
}
