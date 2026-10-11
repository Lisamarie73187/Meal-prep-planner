-- Daily limits on the AI features (recipe reader and ingredient nutrition lookup), so one person can't run up the bill.
-- Counted per person and across everyone, per UTC day. Only the AI Edge Function can touch this (service role);
-- nobody can read or change the counts from the app.

create table ai_usage (
  scope text not null,                                        -- a user id, or 'global'
  day date not null default ((now() at time zone 'utc')::date),
  count int not null default 0 check (count >= 0),
  primary key (scope, day)
);
alter table ai_usage enable row level security;                -- no policies on purpose
revoke all on ai_usage from anon, authenticated;

-- Takes one use for this person and for everyone. Returns 'ok', 'user' (their own limit is reached) or 'global'
-- (everyone's combined limit is reached). The limits are passed in by the function, so they can change without a migration.
create or replace function ai_take(p_user uuid, p_user_limit int default 30, p_global_limit int default 300)
returns text
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'utc')::date;
  n int;
begin
  insert into ai_usage (scope, day, count) values ('global', today, 1)
    on conflict (scope, day) do update set count = ai_usage.count + 1 where ai_usage.count < p_global_limit
    returning count into n;
  if n is null then return 'global'; end if;

  insert into ai_usage (scope, day, count) values (p_user::text, today, 1)
    on conflict (scope, day) do update set count = ai_usage.count + 1 where ai_usage.count < p_user_limit
    returning count into n;
  if n is null then
    update ai_usage set count = count - 1 where scope = 'global' and day = today and count > 0;  -- give the shared use back
    return 'user';
  end if;

  if random() < 0.02 then delete from ai_usage where day < today - 30; end if;                   -- tidy up old days now and then
  return 'ok';
end $$;

-- Gives a use back when the AI call itself failed, so an outage doesn't eat someone's allowance.
create or replace function ai_refund(p_user uuid)
returns void
language sql security definer set search_path = public as $$
  update ai_usage set count = greatest(count - 1, 0)
  where day = ((now() at time zone 'utc')::date) and scope in ('global', p_user::text);
$$;

revoke all on function ai_take(uuid, int, int) from public, anon, authenticated;
revoke all on function ai_refund(uuid) from public, anon, authenticated;
grant execute on function ai_take(uuid, int, int) to service_role;
grant execute on function ai_refund(uuid) to service_role;
