create extension if not exists pgcrypto;

create table if not exists overview_subproblems (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists research_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists business_models (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  revenue_model text,
  customer_relationship text,
  product_type text,
  scale_profile text,
  stage_sensitivity text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists business_model_types (
  id uuid primary key default gen_random_uuid(),
  business_model_id uuid not null references business_models(id) on delete cascade,
  name text not null,
  unique (business_model_id, name)
);

create table if not exists strategies (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  strategy_category text,
  stage text,
  primary_metric text,
  channel_mechanism text,
  evidence_quality text,
  landmark_example text,
  failure_conditions text,
  key_variables text,
  dark_secrets text,
  created_at timestamptz not null default now()
);

create table if not exists strategy_business_models (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references strategies(id) on delete cascade,
  business_model_id uuid not null references business_models(id) on delete cascade,
  unique (strategy_id, business_model_id)
);

create table if not exists atomic_processes (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  related_strategy_id uuid references strategies(id) on delete set null,
  pain_frequency integer not null default 1 check (pain_frequency between 0 and 10),
  software_replaceability integer not null default 1 check (software_replaceability between 0 and 10),
  willingness_to_pay integer not null default 1 check (willingness_to_pay between 0 and 10),
  composability integer not null default 1 check (composability between 0 and 10),
  total_score integer generated always as (pain_frequency + software_replaceability + willingness_to_pay + composability) stored,
  input_text text,
  action_text text,
  output_text text,
  software_ownable text,
  product_brief text,
  shortlisted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists atomic_process_business_models (
  id uuid primary key default gen_random_uuid(),
  atomic_process_id uuid not null references atomic_processes(id) on delete cascade,
  business_model_id uuid not null references business_models(id) on delete cascade,
  unique (atomic_process_id, business_model_id)
);

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;

alter table overview_subproblems enable row level security;
alter table research_sources enable row level security;
alter table business_models enable row level security;
alter table business_model_types enable row level security;
alter table strategies enable row level security;
alter table strategy_business_models enable row level security;
alter table atomic_processes enable row level security;
alter table atomic_process_business_models enable row level security;

drop policy if exists "public full access" on overview_subproblems;
create policy "public full access"
on overview_subproblems
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public full access" on research_sources;
create policy "public full access"
on research_sources
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public full access" on business_models;
create policy "public full access"
on business_models
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public full access" on business_model_types;
create policy "public full access"
on business_model_types
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public full access" on strategies;
create policy "public full access"
on strategies
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public full access" on strategy_business_models;
create policy "public full access"
on strategy_business_models
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public full access" on atomic_processes;
create policy "public full access"
on atomic_processes
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public full access" on atomic_process_business_models;
create policy "public full access"
on atomic_process_business_models
for all
to anon, authenticated
using (true)
with check (true);
