# Pivot 5 - Autonomous Social Publishing Pipeline

**Status:** ✅ Complete - Ready for Deployment

An automated system that transforms newsletter posts into ready-to-publish social assets across Instagram, LinkedIn, X (Twitter), and Threads—completely hands-off once the **Publish** button is clicked in Lovable.

---

## Architecture Overview

```
Lovable (Publish click)
        ↓ Webhook
      n8n workflow  ←→  OpenAI Images API
        ↓
   Supabase Storage (raw + rendered)
        ↓
   Supabase Edge Function (text/gradient compositor)
        ↓
      n8n → Blotato API (multi-platform publish)
        ↓
   Supabase DB (status + post IDs)
```

---

## Quick Start

### Prerequisites
- Supabase project (free tier works)
- n8n instance (self-hosted or cloud)
- OpenAI API account (GPT-4 Images)
- Blotato account (social publishing)

### 1. Supabase Setup

#### Database Migrations
```bash
# Run migrations in order
psql $SUPABASE_DB_URL -f supabase/migrations/001_create_schema.sql
psql $SUPABASE_DB_URL -f supabase/migrations/002_create_storage.sql
```

#### Deploy Edge Function
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Copy ratio templates to Edge Function directory
cp -r templates/ratios supabase/functions/render_social/templates/

# Deploy the render_social function
supabase functions deploy render_social
```

### 2. n8n Setup

#### Import Workflow
1. Open n8n
2. Go to **Workflows** → **Import from File**
3. Select `n8n/pivot5-social-automation.json`
4. Click **Import**

#### Configure Credentials

##### OpenAI API
1. Go to **Credentials** → **Add Credential**
2. Select **OpenAI API**
3. Enter your OpenAI API Key
4. Save as `openAiApi`

##### Environment Variables
Add these to your n8n instance:

```bash
# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Blotato
BLOTATO_API_KEY=your_blotato_api_key_here
```

**For Docker:**
```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -e SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=your_key \
  -e BLOTATO_API_KEY=your_key \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**For n8n Cloud:**
- Go to **Settings** → **Environments**
- Add each variable

### 3. Activate Workflow
1. Open the imported workflow
2. Click the toggle in the top-right to **Active**
3. Copy the webhook URL (will be like `https://your-n8n.com/webhook/pivot5-publish`)

---

## Usage

### Trigger Publication

Send a POST request to the webhook URL:

```bash
curl -X POST https://your-n8n.com/webhook/pivot5-publish \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "p5-20251107-001",
    "headline": "Why agentic AI beats automations in 2026",
    "subhead": "3 tutorials • 2 tools • 1 thought",
    "footer": "@pivot5 • pivot5.com",
    "ratios": ["4:5", "1:1", "9:16"]
  }'
```

**Response:**
```json
{
  "status": "queued"
}
```

### Check Status

Query Supabase:
```sql
SELECT * FROM posts WHERE id = 'p5-20251107-001';
SELECT * FROM post_targets WHERE post_id = 'p5-20251107-001';
```

---

## Project Structure

```
pivot-5-social-media-automation/
├── supabase/
│   ├── functions/
│   │   └── render_social/
│   │       ├── index.ts              # Edge Function (image compositor)
│   │       └── templates/            # (copy from templates/ratios/)
│   └── migrations/
│       ├── 001_create_schema.sql     # Database tables
│       └── 002_create_storage.sql    # Storage buckets + RLS
├── n8n/
│   └── pivot5-social-automation.json # n8n workflow (import this)
├── templates/
│   └── ratios/
│       ├── 4-5.json                  # Instagram portrait (1080x1350)
│       ├── 1-1.json                  # Square (1080x1080)
│       └── 9-16.json                 # Story/Reels (1080x1920)
├── README.md                         # This file
└── Pivot-5-Social Automation_PRD_11.7.25.md
```

---

## Workflow Breakdown

### Node-by-Node Flow

| # | Node | Type | Purpose |
|---|------|------|---------|
| 1 | **Webhook Trigger** | Trigger | Receives POST /publish from Lovable |
| 2 | **Generate OpenAI Image** | HTTP Request | Calls OpenAI DALL-E 3 for background |
| 3 | **Download Image Binary** | HTTP Request | Fetches generated image as binary |
| 4 | **Upload to Supabase Storage** | HTTP Request | Stores raw image in `pivot5/raw/` |
| 5 | **Prepare Ratios** | Code | Creates array of ratios to process |
| 6 | **Split Ratios** | Split In Batches | Iterates through [4:5, 1:1, 9:16] |
| 7 | **Render Social Image** | HTTP Request | Calls Edge Function to composite |
| 8 | **Generate Captions** | Code | Creates platform-specific captions |
| 9 | **Publish to Blotato** | HTTP Request | Publishes to social platforms |
| 10 | **Update Database** | HTTP Request | Records post_targets status |
| 11 | **Mark Post Complete** | HTTP Request | Updates posts.status = 'posted' |

### Execution Time
- **Avg:** 45-60 seconds (single post, all platforms)
- **OpenAI:** 15-25s (image generation)
- **Rendering:** 5-10s per ratio (15-30s total)
- **Publishing:** 5-10s per platform

---

## Storage Structure

```
pivot5/
├── raw/
│   └── {postId}/
│       └── hero.png                  # OpenAI generated background
└── social/
    └── {year}/
        └── {month}/
            └── {postId}/
                ├── 4:5/
                │   └── v1.png        # Instagram portrait
                ├── 1:1/
                │   └── v1.png        # Square
                └── 9:16/
                    └── v1.png        # Story/Reels
```

**Public URLs:**
```
https://YOUR_PROJECT.supabase.co/storage/v1/object/public/pivot5/social/2025/11/p5-20251107-001/4:5/v1.png
```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (not anon) | `eyJhbGci...` |
| `BLOTATO_API_KEY` | Blotato API key | `btk_live_...` |
| `OPENAI_API_KEY` | OpenAI API key (in n8n credentials) | `sk-proj-...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_MODEL` | Image model | `dall-e-3` |
| `OPENAI_SIZE` | Image dimensions | `1024x1024` |

---

## Testing

### Local Edge Function Testing
```bash
# Start Supabase locally
supabase start

# Test Edge Function
supabase functions serve render_social

# Send test request
curl -X POST http://localhost:54321/functions/v1/render_social \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "ratio": "4:5",
    "imageUrl": "https://example.com/test.png",
    "headline": "Test Headline",
    "subhead": "Test subhead",
    "footer": "@pivot5",
    "postId": "test-001"
  }'
```

### n8n Workflow Testing
1. Open workflow in n8n
2. Click **Test Workflow**
3. Send webhook request via curl or Postman
4. Monitor execution in n8n UI

---

## Troubleshooting

### Common Issues

#### 1. "Unauthorized" from Edge Function
**Cause:** Missing/incorrect `SUPABASE_SERVICE_ROLE_KEY`
**Fix:** Verify env var in n8n matches your Supabase service role key

#### 2. OpenAI API Timeout
**Cause:** Network latency or rate limits
**Fix:** Workflow has 60s timeout + 3 retries built-in

#### 3. Storage Upload Failed
**Cause:** Bucket doesn't exist or wrong permissions
**Fix:** Re-run `002_create_storage.sql` migration

#### 4. Templates Not Found
**Cause:** Edge Function can't read ratio templates
**Fix:** Ensure templates are in `supabase/functions/render_social/templates/ratios/`

### Debug Logging

**n8n:**
- Check execution logs in n8n UI
- Enable debug mode: Settings → Log Level → Debug

**Supabase Edge Functions:**
```bash
# View logs
supabase functions logs render_social

# Stream logs
supabase functions logs render_social --follow
```

**Supabase Database:**
```sql
-- Check post status
SELECT * FROM posts ORDER BY created_at DESC LIMIT 10;

-- Check failed publishes
SELECT * FROM post_targets WHERE publish_status = 'error';
```

---

## Security

### Best Practices
- ✅ Use `service_role` key only in n8n and Edge Functions
- ✅ Never expose `service_role` in client-side code
- ✅ RLS policies restrict public access to `raw/` folder
- ✅ Public can only read `social/` folder
- ✅ Webhook has no auth (relies on obscurity) - add auth if needed

### Adding Webhook Authentication (Optional)
```javascript
// In Webhook Trigger node, add this to settings:
{
  "options": {
    "authentication": {
      "type": "header",
      "name": "X-API-Key",
      "value": "your-secret-key"
    }
  }
}
```

---

## Performance

### Benchmarks (Single Post)
- **Image Generation:** 15-25s
- **3 Ratio Renders:** 15-30s
- **Publishing (4 platforms):** 10-20s
- **Total:** 45-75s

### Optimization Tips
- Use Supabase Edge Functions regions close to n8n
- Enable n8n worker mode for concurrent executions
- Consider caching OpenAI images if reusing backgrounds

---

## API Reference

### Webhook Endpoint

**POST** `/webhook/pivot5-publish`

**Request:**
```json
{
  "postId": "string (required)",
  "headline": "string (required)",
  "subhead": "string (optional)",
  "footer": "string (optional)",
  "ratios": ["4:5", "1:1", "9:16"]
}
```

**Response:**
```json
{
  "status": "queued"
}
```

### Edge Function

**POST** `{SUPABASE_URL}/functions/v1/render_social`

**Headers:**
```
Authorization: Bearer {SERVICE_ROLE_KEY}
Content-Type: application/json
```

**Request:**
```json
{
  "ratio": "4:5 | 1:1 | 9:16",
  "imageUrl": "string",
  "headline": "string",
  "subhead": "string",
  "footer": "string",
  "focal": [0.5, 0.5],
  "postId": "string"
}
```

**Response:**
```json
{
  "path": "pivot5/social/2025/11/p5-001/4:5/v1.png",
  "publicUrl": "https://...",
  "width": 1080,
  "height": 1350
}
```

---

## Roadmap

### Planned Features
- [ ] Video support (Reels/TikTok)
- [ ] A/B testing variants
- [ ] Scheduled publishing
- [ ] Analytics dashboard
- [ ] Auto-reply to comments

---

## Support

### Resources
- **Supabase Docs:** https://supabase.com/docs
- **n8n Docs:** https://docs.n8n.io
- **OpenAI Images:** https://platform.openai.com/docs/guides/images

### Issues
Report bugs or request features:
📧 support@pivot5.com

---

## License

Proprietary - Pivot 5, LLC © 2025

---

**Built with:**
- [n8n](https://n8n.io) - Workflow automation
- [Supabase](https://supabase.com) - Backend & storage
- [OpenAI DALL-E 3](https://openai.com) - Image generation
- [Blotato](https://blotato.com) - Social publishing
- [svg2png-wasm](https://github.com/ssssota/svg2png-wasm) - SVG rendering
