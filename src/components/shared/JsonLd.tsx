/**
 * Injects a schema.org JSON-LD block into the DOM for the current route.
 * Used for page-specific structured data (e.g. FAQPage on /faq); the site-wide
 * LocalBusiness + WebSite graph is static in index.html. JSON is serialised via
 * dangerouslySetInnerHTML because React escapes text children, which would
 * corrupt the JSON inside a <script>.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
