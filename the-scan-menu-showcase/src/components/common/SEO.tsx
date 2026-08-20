import React, { useEffect } from 'react';

interface SchemaOrgData {
  '@context': string;
  '@type'?: string;
  '@graph'?: any[];
  [key: string]: any;
}

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath?: string;
  ogType?: 'website' | 'article' | 'product';
  ogImage?: string;
  schema?: SchemaOrgData;
}

const BASE_URL = 'https://thescanmenu.com';
const DEFAULT_OG_IMAGE = 'https://thescanmenu.com/og-preview.png';

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  canonicalPath = '',
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  schema,
}) => {
  const canonicalUrl = `${BASE_URL}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;

  useEffect(() => {
    // 1. Update Title (<60 chars target)
    document.title = title;

    // Helper to update or create meta tags
    const setMeta = (attrName: string, attrVal: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrVal}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 2. Standard Meta Tags
    setMeta('name', 'description', description);
    if (keywords) {
      setMeta('name', 'keywords', keywords);
    }
    setMeta('name', 'author', 'Pixora Studios');
    setMeta('name', 'robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');

    // 3. Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // 4. Open Graph Tags
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:site_name', 'The Scan Menu by Pixora Studios');
    setMeta('property', 'og:locale', 'en_US');

    // 5. Twitter Card Tags
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', ogImage);
    setMeta('name', 'twitter:site', '@pixorastudios');
    setMeta('name', 'twitter:creator', '@pixorastudios');

    // 6. Structured Data (Schema.org JSON-LD)
    const existingSchemaScript = document.getElementById('schema-jsonld');
    if (existingSchemaScript) {
      existingSchemaScript.remove();
    }

    if (schema) {
      const script = document.createElement('script');
      script.id = 'schema-jsonld';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema, null, 2);
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup script tag on unmount if needed
      const currentScript = document.getElementById('schema-jsonld');
      if (currentScript) {
        currentScript.remove();
      }
    };
  }, [title, description, keywords, canonicalUrl, ogType, ogImage, schema]);

  return null;
};
