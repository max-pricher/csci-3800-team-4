CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    pwd VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
    note_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    body VARCHAR(200) NOT NULL,
    time_made TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_id FOREIGN KEY (id) REFERENCES users(id)

);
CREATE TABLE IF NOT EXISTS tags (
    tag_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL --should be a hex color input like #33ddff
    CONSTRAINT fk_user_id FOREIGN KEY (id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS note_to_tag (
note_id INT NOT NULL,
tag_id INT NOT NULL,
note_to_tag_key PRIMARY KEY (note_id,tag_id)--composite key
);