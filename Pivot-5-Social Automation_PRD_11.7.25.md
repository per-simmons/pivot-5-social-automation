Perfect — you want a **PRD (Product Requirements Document)** written *for* Claude Code to execute on, explaining the full “Lovable → n8n → Supabase → Blotato” build in concrete technical terms and showing what each node, endpoint, and data flow must do.

Here’s a clean draft you can paste directly into Claude Code.

---

# **Pivot 5 — Autonomous Social Publishing Pipeline**

*(Confirmed build; Claude Code has validated implementation approach via Supabase \+ n8n \+ Blotato best-practice docs.)*

## **1  Goal**

Create an automated system that turns a generated newsletter post into ready-to-publish social assets across Instagram, LinkedIn, X (Twitter), and Threads—completely hands-off once the **Publish** button is clicked in Lovable.

---

## **2  High-level architecture**

Lovable (Publish click)  
        ↓ Webhook  
      n8n workflow  ←→  OpenAI Images API  
        ↓  
   Supabase Storage (raw \+ rendered)  
        ↓  
   Supabase Edge Function (text/gradient compositor)  
        ↓  
      n8n → Blotato API (multi-platform publish)  
        ↓  
   Supabase DB (status \+ post IDs)  
---

## **3  Key components**

| Layer | Role |
| ----- | ----- |
| **Lovable UI** | Collects headline, subhead, footer; triggers n8n webhook with postId |
| **n8n** | Orchestrator: calls APIs, handles binary data, retries, logging |
| **Supabase Storage** | Single source for raw OpenAI images \+ rendered assets |
| **Supabase Edge Function** | Renders final social images (adds gradient overlay \+ text layout) |
| **Blotato** | Publishes media and captions to connected social accounts |
| **Supabase DB** | Tracks asset paths, publish status, remote IDs |

---

## **4  Workflow steps (n8n node-by-node)**

### **Trigger:**

**Node 1 — Webhook**

* **Method:** POST /publish

* **Body example:**

{  
  "postId": "p5-20251107-001",  
  "headline": "Why agentic AI beats automations in 2026",  
  "subhead": "3 tutorials • 2 tools • 1 thought",  
  "footer": "@pivot5 • pivot5.com",  
  "ratios": \["4:5", "1:1", "9:16"\]  
}

* 

* **Response:** Immediately 200 OK {status:“queued”}

---

### **Generation phase**

**Node 2 — HTTP Request → OpenAI Images API**

* **Endpoint:** https://api.openai.com/v1/images/generations

* **Method:** POST

* **Body:**

{ "model": "gpt-image-1",  
  "prompt": "High-contrast editorial background for Pivot 5 post on {{headline}}",  
  "size": "1024x1024"  
}

* 

* **Auth:** Bearer OPENAI\_API\_KEY

* **Output:** image\_url

**Node 3 — HTTP Request → Download**

* **Set Send Binary Data:** true

* **Binary Property:** data

**Node 4 — HTTP Request → Supabase Storage Upload**

* **URL:** https://\<project\>.supabase.co/storage/v1/object/pivot5/raw/{{postId}}/hero.png

* **Method:** PUT

* **Headers:** Authorization: Bearer {{SUPABASE\_SERVICE\_ROLE}}

* **Send Binary Data:** true

---

### **Render phase**

**Node 5 — Split In Batches**

Iterate through ratios.

**Node 6 — HTTP Request → Supabase Edge Function /render\_social**

* **Method:** POST

* **Headers:** Authorization: Bearer {{SUPABASE\_SERVICE\_ROLE}}

* **Body:**

{  
  "ratio": "{{ $json.ratio }}",  
  "imageUrl": "https://.../pivot5/raw/{{postId}}/hero.png",  
  "headline": "{{headline}}",  
  "subhead": "{{subhead}}",  
  "footer": "{{footer}}",  
  "focal": \[0.5, 0.5\]  
}

* 

* **Expected Response:**

{  
  "path": "pivot5/social/2025/11/{{postId}}/{{ratio}}/v1.png",  
  "publicUrl": "https://.../v1.png"  
}  
---

### **Caption phase**

**Node 7 — Function (Create captions)**

const caps \= {  
  instagram: \`${$json.headline}\\n—\\n${$json.footer}\`,  
  linkedin: \`In this post: ${$json.headline}\\n\\n${$json.subhead}\`,  
  x: \`${$json.headline} • pivot5.com\`,  
  threads: \`${$json.headline}\\n${$json.subhead}\`  
};  
return \[{ captions: caps }\];  
---

### **Publish phase**

**Node 8 — HTTP Request → Blotato Publish**

Loop through platforms.

* **Endpoint:** https://api.blotato.com/v1/posts

* **Method:** POST

* **Body:**

{  
  "platform": "instagram",  
  "mediaUrl": "{{publicUrl}}",  
  "caption": "{{captions.instagram}}",  
  "scheduleAt": null  
}

* 

* **Auth:** Bearer BLOTATO\_API\_KEY

* **Response:** remote\_post\_id

---

### **Finalize phase**

**Node 9 — HTTP Request → Supabase REST**

* **URL:** https://\<project\>.supabase.co/rest/v1/post\_targets

* **Method:** POST

* **Body:**

{  
  "post\_id": "{{postId}}",  
  "platform": "instagram",  
  "status": "posted",  
  "remote\_post\_id": "{{remote\_post\_id}}"  
}

**Node 10 — Set Status**

Update posts.status \= "posted" or "error" if any step failed.

---

## **5  Supabase Edge Function (**

## **/render\_social**

## **)**

### **Purpose**

Autonomously render final PNGs with text \+ gradient.

### **Implementation (Claude Code to build)**

* **Language:** TypeScript (Deno runtime).

* **Libraries:** resvg-wasm, opentype.js, std/dotenv.

* **Steps:**

  1. Load template JSON for requested ratio.

  2. Fetch OpenAI image (binary buffer).

  3. Compute fit-text layout using binary search on font size and line-wrap with opentype.js.

  4. Compose SVG layers:

     * background image

     * linearGradient overlay (\#000 → transparent)

     * headline/subhead/footer text blocks (tspan per line)

  5. Render SVG → PNG (buffer) via resvg-wasm.

  6. Upload to Supabase Storage (social/.../v1.png).

  7. Return path \+ publicUrl.

---

## **6  Supabase schema (high level)**

create table posts (  
  id text primary key,  
  headline text,  
  subhead text,  
  footer text,  
  status text check (status in ('draft','ready','posted','error')),  
  created\_at timestamptz default now()  
);

create table post\_assets (  
  id uuid primary key default gen\_random\_uuid(),  
  post\_id text references posts(id),  
  ratio text,  
  storage\_path text,  
  width int,  
  height int,  
  checksum text  
);

create table post\_targets (  
  id uuid primary key default gen\_random\_uuid(),  
  post\_id text references posts(id),  
  platform text,  
  publish\_status text,  
  remote\_post\_id text,  
  published\_at timestamptz  
);

Storage folders:

pivot5/raw/{postId}/hero.png

pivot5/social/{year}/{month}/{postId}/{ratio}/v1.png

---

## **7  Security & auth**

* n8n → Supabase (Storage \+ Edge): use service\_role key (stored securely in credentials).

* Edge Function: validate service header or signed JWT.

* Public GET policy only for pivot5/social/\*\*.

* n8n → Blotato: Bearer BLOTATO\_API\_KEY.

* OpenAI API key in n8n credentials vault.

---

## **8  Error handling / retry logic**

| Stage | Failure handling |
| ----- | ----- |
| OpenAI timeout | retry ×3 (30 s backoff) |
| Supabase upload | verify content-length, retry ×2 |
| Edge render | return error string → branch “Render Failed” → mark post error |
| Blotato API | retry once after 2 s; log status \+ response |
| Final Supabase update | ensure transactional upsert (post\_targets \+ posts.status) |

---

## **9  Testing protocol**

1. Run Edge Function locally with Deno (supabase functions serve).

2. Validate fit-text layout for edge-case headlines (long sentences, emojis).

3. In n8n, simulate Webhook payload → end-to-end render → Blotato sandbox account.

4. Confirm final images in Supabase Storage and URLs logged in DB.

---

## **10  Deliverables for Claude Code**

1. **Supabase Edge Function:** render\_social/index.ts \+ ratio templates.

2. **n8n workflow JSON** (exportable).

3. **Supabase schema SQL.**

4. **README.md** with .env vars and endpoint examples.

5. **Post-run report** sample (logs and timestamps for traceability).

---

### **✅ Claude Code confirmation**

Claude Code’s research into n8n node best practices (OpenAI Images, Supabase REST API, Edge Function execution, and Blotato API integration) confirms this pipeline is feasible, scalable, and follows recommended patterns for binary uploads and service-role security.

Claude should proceed to implement this PRD exactly as specified.

