-- CRM hotfix: align students subject choices column and refresh PostgREST schema cache.
-- Run this in Supabase SQL Editor when CRM reports:
-- "Could not find the 'subject_choices' column of 'students' in the schema cache".

alter table if exists public.students
  add column if not exists subject_choices text[] not null default '{}';

do $$
begin
  if to_regclass('public.students') is null then
    return;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'subject_choices'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'second_subjects'
  ) then
    execute $sql$
      update public.students
      set subject_choices = second_subjects
      where coalesce(array_length(subject_choices, 1), 0) = 0
        and coalesce(array_length(second_subjects, 1), 0) > 0
    $sql$;
  end if;
end $$;

notify pgrst, 'reload schema';
