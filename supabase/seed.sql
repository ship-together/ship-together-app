-- Optional idempotent starter seed for Supabase PostgreSQL deployments
-- Seeds starter collaboration opportunities under the earliest registered profile
-- without creating duplicates if run multiple times.

do $$
declare
  v_owner_id uuid;
begin
  select id into v_owner_id
  from public.profiles
  order by created_at asc
  limit 1;

  if v_owner_id is null then
    raise notice 'No profiles found yet; skipping starter collaboration seed.';
    return;
  end if;

  insert into public.collaboration_requests (
    owner_id,
    title,
    description,
    skills_needed,
    project_name,
    project_url,
    collaboration_type,
    status
  )
  select
    v_owner_id,
    seed.title,
    seed.description,
    seed.skills_needed,
    seed.project_name,
    seed.project_url,
    seed.collaboration_type,
    seed.status
  from (
    values
      (
        'Looking for a frontend collaborator for open-source CLI UI',
        'Building a minimal web companion for terminal build logs and diff snapshots. Looking for help polishing keyboard navigation, responsive spacing, and log filtering.',
        array['TypeScript', 'UI Design'],
        'Community Builds',
        'https://github.com/ship-together/community-builds',
        'Open Source',
        'Open'
      ),
      (
        'Weekend pair for UI flow review & usability testing',
        'Wrapping up an offline-first changelog editor this weekend. Looking for a builder to walk through onboarding flows, catch mobile edge cases, and pair on UI polish.',
        array['React', 'Tailwind CSS', 'UI/UX'],
        'RelayNotes',
        'https://github.com/ship-together/relay-notes',
        'Side Project',
        'Open'
      ),
      (
        'Solidity & Next.js smart contract study build',
        'Practicing EVM contract testing and wallet signature flows around an active security scanner build. Two short async check-ins per week plus PR walkthroughs.',
        array['Solidity', 'Next.js', 'TypeScript'],
        'SolGuard Lab',
        'https://github.com/ship-together/solguard-lab',
        'Learning Together',
        'Open'
      ),
      (
        'Backend partner for webhook retries & Postgres queue',
        'Early developer tool for reliable webhook delivery, signature checks, and dead-letter inspection. Looking for someone to benchmark Postgres worker throughput.',
        array['Node.js', 'PostgreSQL', 'TypeScript'],
        'HookPipe',
        'https://github.com/ship-together/hookpipe',
        'Startup',
        'Open'
      ),
      (
        'Docs contributor for CLI quickstart & environment guide',
        'Role filled — restructured installation commands, environment variable templates, and local setup instructions.',
        array['Markdown', 'CLI', 'Documentation'],
        'ShipKit Docs',
        'https://github.com/ship-together/shipkit-docs',
        'Open Source',
        'Closed'
      )
  ) as seed(title, description, skills_needed, project_name, project_url, collaboration_type, status)
  where not exists (
    select 1
    from public.collaboration_requests cr
    where lower(trim(cr.title)) = lower(trim(seed.title))
  );
end $$;
