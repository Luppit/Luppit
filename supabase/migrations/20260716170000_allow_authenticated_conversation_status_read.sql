create policy conversation_status_select_authenticated
on public.conversation_status
for select
to authenticated
using (true);

notify pgrst, 'reload schema';
