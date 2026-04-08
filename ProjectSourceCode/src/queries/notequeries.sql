--get note by title query 
SELECT * FROM notes
WHERE title = $1 --name to search will be user inputted $1 is a positional parameter
ORDER BY time_made DESC;

--get note by piece of title query 
SELECT * FROM notes
WHERE title ILIKE $1
ORDER BY time_made DESC;

--get note by a piece of the note body
SELECT * FROM notes
WHERE body ILIKE $1 --ILIKE is case-insensitive
ORDER BY time_made DESC;

--get notes of a specific user
SELECT notes.*, users.name

--returns notes that have the user inputted tag + that tags info
SELECT notes.*, tags.* FROM notes
INNER JOIN note_to_tag ON notes.id = note_to_tag.note_id
INNER JOIN tags ON note_to_tag.tag_id=tags.id
WHERE tags.name=$3
ORDER BY time_made DESC;

--get list of tasks ordered by due_at but will show nulls first
SELECT *
FROM tasks
ORDER BY due_at ASC NULLS FIRST;

--return task from due date
SELECT * FROM tasks
WHERE DATE due_at::date =$1--input must be a date or string in "yyyy-mm-dd" form
ORDER BY due_at DESC;

--return task from piece of body
SELECT * FROM tasks
WHERE user_id=$1
 AND body ILIKE $1 --add % to parameter value like $1=%value%
ORDER BY time_made DESC;

--get all tasks for a user
SELECT * FROM tasks
WHERE user_id=$1
ORDER BY time_made DESC;

--get tasks due within the next X number of days
SELECT * FROM tasks
WHERE user_id=$1
 AND due_at BETWEEN NOW() AND (NOW()+ $2::INTERVAL)--$2 should be a string like '1 day','7 day'
ORDER BY due_at DESC;

--get overdue tasks
SELECT * FROM tasks
WHERE user_id=$1
 AND due_at<NOW()
ORDER BY due_at ASC;

--get num current tasks and overdue tasks
SELECT COUNT(*) FILTER (WHERE due_at>NOW()) AS current_tasks,  COUNT(*) FILTER (WHERE due_at<NOW() ) AS overdue_tasks
FROM tasks
WHERE user_id=$1;