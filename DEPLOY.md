# Deployment Guide

## Deploy to Vercel

### Quick Deploy

1. Go to https://vercel.com/new
2. Import from GitHub: `per-simmons/pivot-5-social-automation`
3. Click "Deploy"
4. Done! Your frontend will be live at `https://your-project.vercel.app`

### Using Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

---

## What Happens When You Click the Button

1. **Frontend** (index.html on Vercel)
   - Button click sends POST request to N8N webhook
   - Data: `{ category, headline, imageUrl, postId }`

2. **N8N Workflow** (n8n-workflow.json)
   - Receives webhook data
   - Creates 3 items (one for each ratio: 4:5, 1:1, 9:16)
   - Calls Edge Function 3 times in parallel

3. **Edge Function** (supabase/functions/render_social)
   - Fetches background image from Unsplash URL
   - Loads Pivot 5 logo
   - Generates SVG with:
     - Background image
     - Gradient overlay
     - Logo (top-right)
     - Category label (e.g., "TOOLS")
     - Headline text (wrapped)
   - Converts SVG to PNG
   - Uploads to Supabase Storage

4. **Response**
   - N8N aggregates all 3 images
   - Returns URLs to frontend
   - Frontend displays preview images

---

## The Image Source

The background image is currently pulled from **Unsplash**:
```
https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80
```

This is just for testing. In production, you'll:
- Store images in Supabase Storage
- Or pull from your own image library
- Or generate with AI (DALL-E, Midjourney, etc.)

---

## Testing Flow

1. Deploy frontend to Vercel ✅
2. Import N8N workflow
3. Set N8N environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Copy N8N webhook URL
5. Paste into frontend
6. Click button
7. See 3 generated images!
