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
