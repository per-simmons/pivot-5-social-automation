-- Pivot 5 Social Media Automation Database Schema
-- Migration: 001_create_schema.sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Posts table: stores the main post data
create table if not exists posts (
  id text primary key,
  headline text not null,
  subhead text,
  footer text,
  status text not null check (status in ('draft', 'ready', 'posted', 'error')) default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Post assets table: stores information about generated images
create table if not exists post_assets (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references posts(id) on delete cascade,
  ratio text not null check (ratio in ('4:5', '1:1', '9:16')),
  storage_path text not null,
  width integer not null,
  height integer not null,
  checksum text,
  created_at timestamptz not null default now()
);

-- Post targets table: tracks publishing status per platform
create table if not exists post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references posts(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'linkedin', 'x', 'threads')),
  publish_status text not null check (publish_status in ('pending', 'posted', 'error')) default 'pending',
  remote_post_id text,
  published_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for faster queries
create index if not exists idx_posts_status on posts(status);
create index if not exists idx_posts_created_at on posts(created_at desc);
create index if not exists idx_post_assets_post_id on post_assets(post_id);
create index if not exists idx_post_targets_post_id on post_targets(post_id);
create index if not exists idx_post_targets_platform on post_targets(platform);

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at trigger to posts table
create trigger update_posts_updated_at
  before update on posts
  for each row
  execute function update_updated_at_column();

-- Apply updated_at trigger to post_targets table
create trigger update_post_targets_updated_at
  before update on post_targets
  for each row
  execute function update_updated_at_column();

-- Comments for documentation
comment on table posts is 'Main table storing social media post content and metadata';
comment on table post_assets is 'Stores generated image assets for each post with different aspect ratios';
comment on table post_targets is 'Tracks publication status across different social media platforms';

comment on column posts.status is 'Workflow status: draft (initial), ready (after image gen), posted (published), error (failed)';
comment on column post_assets.ratio is 'Aspect ratio: 4:5 (Instagram), 1:1 (Square), 9:16 (Story/Reels)';
comment on column post_targets.platform is 'Target social platform: instagram, linkedin, x (Twitter), threads';
