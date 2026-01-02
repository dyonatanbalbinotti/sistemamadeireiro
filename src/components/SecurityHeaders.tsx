/**
 * Security Headers Component
 * Adds meta tags for security in SPAs
 * Note: Real security headers should be set server-side (Netlify, Vercel, etc.)
 */
import { useEffect } from 'react';

export function SecurityHeaders() {
  useEffect(() => {
    // Add referrer policy
    const referrerMeta = document.querySelector('meta[name="referrer"]');
    if (!referrerMeta) {
      const meta = document.createElement('meta');
      meta.name = 'referrer';
      meta.content = 'strict-origin-when-cross-origin';
      document.head.appendChild(meta);
    }

    // Prevent clickjacking via X-Frame-Options meta (limited support)
    // Real X-Frame-Options must be set via HTTP header
    
    // Content Security Policy meta tag
    const existingCsp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!existingCsp) {
      const cspMeta = document.createElement('meta');
      cspMeta.httpEquiv = 'Content-Security-Policy';
      cspMeta.content = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com",
        "frame-ancestors 'self'",
        "form-action 'self'",
        "base-uri 'self'"
      ].join('; ');
      document.head.appendChild(cspMeta);
    }

    // Disable browser features that could be exploited
    const permissionsMeta = document.querySelector('meta[name="permissions-policy"]');
    if (!permissionsMeta) {
      const meta = document.createElement('meta');
      meta.name = 'permissions-policy';
      meta.content = 'camera=(), microphone=(), geolocation=(), payment=()';
      document.head.appendChild(meta);
    }
  }, []);

  return null;
}

/**
 * Netlify/Vercel headers configuration
 * Add this to netlify.toml or vercel.json for production
 */
export const securityHeadersConfig = {
  netlify: `
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), payment=()"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
`,
  vercel: {
    headers: [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }
        ]
      }
    ]
  }
};
