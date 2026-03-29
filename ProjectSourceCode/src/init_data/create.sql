CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    pwd VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id INT,
    title VARCHAR(100) NOT NULL,
    body VARCHAR(200) NOT NULL,
    time_made DATETIME NOT NULL DEFAULT(GETDATE()),
    CONSTRAINT user_id FOREIGN KEY (user_id) REFERENCES users(id)

);
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL --should be a hex color input like #33ddff
    CONSTRAINT user_id FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS note_to_tag (
note_id INT NOT NULL,
tag_id INT NOT NULL,
note_to_tag_key PRIMARY KEY (note_id,tag_id)--composite key
);