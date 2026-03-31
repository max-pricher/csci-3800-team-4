--get note by title query 
SELECT * FROM notes
WHERE title = @name_to_search; --name to search will be user inputted