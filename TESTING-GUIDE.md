# Testing Guide - Pivot 5 Social Media Automation

## Quick Start

This guide will help you test the complete end-to-end workflow with a simple button click.

### What This Tests

- ✅ Random text generation (short, medium, long headlines)
- ✅ Text wrapping and layout with varying lengths
- ✅ All 3 aspect ratios (4:5, 1:1, 9:16)
- ✅ Gradient overlays
- ✅ Logo positioning
- ✅ Image composition and PNG conversion
- ✅ Complete N8N → Edge Function → Storage workflow

---

## Step 1: Deploy Edge Function to Supabase

First, deploy the render_social Edge Function:

```bash
cd supabase
supabase functions deploy render_social
```

Make sure you have your Supabase environment variables set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2: Set Up N8N Workflow

### Option A: Import Workflow (Recommended)

1. Open your N8N instance
2. Click **"Import from File"**
3. Select `n8n-workflow.json` from this directory
4. The workflow will be imported with all nodes configured

### Option B: Manual Setup

Create a new workflow with these nodes:

1. **Webhook Trigger** (POST)
   - Path: `test-social`
   - Response mode: Using 'Respond to Webhook' node

2. **Extract Data** (Set node)
   - Extract: category, headline, imageUrl, postId from webhook body

3. **Create Ratios** (Set node)
   - Create 3 items with ratios: "4:5", "1:1", "9:16"

4. **Render Image** (HTTP Request node)
   - URL: `{{ $env.SUPABASE_URL }}/functions/v1/render_social`
   - Method: POST
   - Headers: `Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}`
   - Body:
     ```json
     {
       "ratio": "{{ $json.ratio }}",
       "imageUrl": "{{ $('Extract Data').item.json.imageUrl }}",
       "category": "{{ $('Extract Data').item.json.category }}",
       "headline": "{{ $('Extract Data').item.json.headline }}",
       "footer": "",
       "postId": "{{ $('Extract Data').item.json.postId }}"
     }
     ```

5. **Aggregate Results** (Aggregate node)
   - Mode: Combine all items

6. **Format Response** (Set node)
   - Format the final response with success message and images array

7. **Respond to Webhook** (Respond to Webhook node)
   - Return the formatted response

### Configure Environment Variables in N8N

Set these in your N8N environment:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Step 3: Start Test Frontend

Run the local server:

```bash
node server.js
```

This will start a server at `http://localhost:3000`

---

## Step 4: Run Tests

1. **Open the frontend**: Navigate to `http://localhost:3000` in your browser

2. **Enter N8N Webhook URL**:
   - Copy your webhook URL from N8N (should look like: `https://your-n8n.com/webhook/test-social`)
   - Paste it in the input field
   - It will be saved automatically for future use

3. **Click "Generate Test Images"**:
   - Uses a fixed test case with medium-length headline
   - Good for initial testing

4. **Click "Generate Random Variation"**:
   - Randomly selects from different categories (TOOLS, INSIGHTS, TRENDS, UPDATES)
   - Randomly selects headline length (short, medium, long)
   - Randomly selects background image
   - **This is what you want to test multiple times!**

---

## What to Look For

### ✅ Successful Test Should Show:

1. **Loading state**: Blue status box with spinner
2. **Success message**: Green box showing "Success! Generated 3 images"
3. **Preview grid**: 3 images displayed (4:5, 1:1, 9:16)
4. **Image quality**:
   - Logo visible in top-right
   - Category label visible
   - Headline text properly wrapped
   - No text cutoff or overlap
   - Smooth gradient overlay

### 🎲 Random Variation Testing

Click "Generate Random Variation" multiple times and verify:

- **Short headlines**: Single line, good spacing
- **Medium headlines**: 2-3 lines, proper wrapping
- **Long headlines**: 3-4 lines, no cutoff
- **Different categories**: TOOLS, INSIGHTS, TRENDS, UPDATES all render correctly
- **Different images**: Various backgrounds all work well with gradient

---

## Expected Output

Each test generates 3 PNG images:
- **4:5** (1080x1350) - Instagram Portrait
- **1:1** (1080x1080) - LinkedIn/Instagram Square
- **9:16** (1080x1920) - Instagram Stories/Reels

Images are stored in Supabase Storage:
```
pivot5/social/{year}/{month}/{postId}/{ratio}/v1.png
```

---

## Troubleshooting

### Webhook URL Not Working
- Make sure your N8N workflow is active
- Check that the webhook path matches: `/webhook/test-social`
- Verify N8N environment variables are set

### Images Not Generating
- Check Supabase Edge Function logs: `supabase functions logs render_social`
- Verify service role key has Storage permissions
- Ensure logo file exists: `supabase/functions/render_social/templates/ratios/pivot-5-logo.png`

### Text Cutoff Issues
- This is what we're testing for!
- Try different headline lengths
- Check the spacing in ratio templates (4-5.json, 1-1.json, 9-16.json)

### CORS Errors
- If testing from a different domain, you may need to enable CORS in N8N webhook settings

---

## Next Steps

Once all tests pass:

1. ✅ Text wrapping works for all headline lengths
2. ✅ Logo positioning is correct
3. ✅ Gradient overlays look good
4. ✅ All 3 ratios generate successfully

Then you can:
- Integrate with AI content generation
- Add to production workflow
- Set up automated posting schedules
- Connect to social media APIs
