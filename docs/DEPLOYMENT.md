# MUETY STORE — DEPLOYMENT GUIDE

## Deployment Overview

MUETYSTORE is packaged as a Single Page Application (SPA). It can be deployed to modern edge hosting platforms such as Vercel, Netlify, Firebase Hosting, or AWS CloudFront/S3.

## Production Build Step

```bash
npm run build
```

This generates optimized static production assets in the `dist/` directory.

## Client-Side Routing Configuration

Ensure single-page application rewrite rules are configured so all sub-paths fallback to `index.html`.

### Vercel (`vercel.json`)
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Netlify (`_redirects`)
```
/*    /index.html   200
```

### Firebase Hosting (`firebase.json`)
```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```
