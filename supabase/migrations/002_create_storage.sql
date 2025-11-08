-- Pivot 5 Social Media Automation Storage Configuration
-- Migration: 002_create_storage.sql

-- Create storage bucket for Pivot 5 social media assets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pivot5',
  'pivot5',
  true, -- Public bucket for easy access to generated images
  10485760, -- 10MB limit per file
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Storage policies for pivot5 bucket
-- Policy 1: Allow service_role full access (for n8n and Edge Functions)
create policy "Service role has full access to pivot5 bucket"
on storage.objects for all
to service_role
using (bucket_id = 'pivot5')
with check (bucket_id = 'pivot5');

-- Policy 2: Public read access to social/ folder (final rendered images)
create policy "Public read access to social folder"
on storage.objects for select
to public
using (
  bucket_id = 'pivot5'
  and (storage.foldername(name))[1] = 'social'
);

-- Policy 3: Block public access to raw/ folder (OpenAI generated backgrounds)
-- No policy needed - by default, public has no access

-- Note: Upload access is restricted to service_role only
-- This ensures only n8n workflows and Edge Functions can write to storage

-- Comments for documentation
comment on table storage.buckets is 'Storage buckets configuration';
