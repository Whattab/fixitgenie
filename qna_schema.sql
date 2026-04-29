-- 1. Create Question & Answer Table
create table if not exists service_request_questions (
  id uuid default gen_random_uuid() primary key,
  request_id bigint references service_requests(id) on delete cascade not null,
  pro_id uuid references profiles(id) on delete cascade not null,
  question text not null,
  answer text,
  created_at timestamp with time zone default now(),
  answered_at timestamp with time zone
);

-- 2. Enable RLS
alter table service_request_questions enable row level security;

-- 3. RLS Policies

-- READ: Everyone can see Q&A for requests
create policy "Everyone_View_QnA" 
on service_request_questions for select 
using (true);

-- INSERT: Only Pros can ask questions (must be their own ID)
create policy "Pros_Ask_Questions" 
on service_request_questions for insert 
with check (
  auth.uid() = pro_id 
  -- Optionally add: AND exists(select 1 from profiles where id = auth.uid() and type = 'professional')
);

-- UPDATE: Only the Homeowner of the request can answer (update the row)
create policy "Homeowners_Answer_Questions" 
on service_request_questions for update 
using (
  auth.uid() in (
    select user_id from service_requests 
    where id = service_request_questions.request_id
  )
);

-- DELETE: Pros can delete their own unanswered questions, Homeowners can delete any on their request
create policy "Delete_Own_Questions" 
on service_request_questions for delete 
using (
  auth.uid() = pro_id 
  OR 
  auth.uid() in (
    select user_id from service_requests 
    where id = service_request_questions.request_id
  )
);
