--get note by title query 
SELECT * FROM notes
WHERE title = $1 --name to search will be user inputted $1 is a positional parameter
ORDER BY time_made DESC;

--get note by a piece of the note body
SELECT * FROM notes
WHERE body ILIKE $1 --ILIKE is case-insensitive
ORDER BY time_made DESC;

--returns notes that have the user inputted tag + that tags info
SELECT notes.*, tags.* FROM notes
INNER JOIN note_to_tag ON notes.id = note_to_tag.note_id
INNER JOIN tags ON note_to_tag.note_id=tags.id
WHERE tags.name=$1
ORDER BY time_made DESC;


