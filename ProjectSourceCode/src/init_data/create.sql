CREATE TABLE 
    IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(200) NOT NULL
);

CREATE TABLE 
    IF NOT EXISTS notes (
        note_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(100) NOT NULL,
        body TEXT NOT NULL,
        time_made TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(user_id)

);
CREATE TABLE 
    IF NOT EXISTS tags (
        tag_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(7) NOT NULL, --should be a hex color input like #33ddff
        CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(user_id),
        CONSTRAINT unique_user_tag UNIQUE (user_id, name)
);

CREATE TABLE
    IF NOT EXISTS note_to_tag (
        note_id INT NOT NULL,
        tag_id INT NOT NULL,
        PRIMARY KEY (note_id,tag_id),
        CONSTRAINT fk_ntt_note FOREIGN KEY (note_id) REFERENCES notes(note_id) ON DELETE CASCADE,
        CONSTRAINT fk_ntt_tag FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
);

CREATE TABLE
    IF NOT EXISTS tasks (
        task_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        body VARCHAR(200) NOT NULL,
        time_made TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        due_at TIMESTAMP NOT NULL,
        will_remind BOOLEAN DEFAULT FALSE,
        CONSTRAINT reminder_needs_duedate CHECK (
            NOT will_remind
            OR due_at IS NOT NULL
        ),
        CONSTRAINT fk_tasks_user_id FOREIGN KEY (user_id) REFERENCES users (user_id)
    );

CREATE TABLE
    IF NOT EXISTS note_to_task (
    note_id INT NOT NULL,
    task_id INT UNIQUE NOT NULL,
    PRIMARY KEY (note_id, task_id),
    FOREIGN KEY (note_id) REFERENCES notes(note_id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
);
-- User: test pwd: test
INSERT INTO users (username, password) VALUES --default user
('test', '$2a$10$U4PAZogU0ClBWhLzm4EirOF6KATKp6rTGqo7l2g0tW96j60NvEZkW');

-- test notes
INSERT INTO notes (user_id, title, body) VALUES
(1, 'Test Note 1', 'This is the body of our first test note 1.'),
(1, 'Test Note 2', 'This is the body of our second test note, but im gonna make this one just a little bit longer, if thats ok with you. Ok. what should i talk about. Do you guys like dogs?.'),
(1, 'Lorem Ipsum', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.');

-- Users own the tags they create. Notes are linked to the tag.
INSERT INTO tags (user_id, name, color) VALUES
-- assign first user, pink tag
(1, 'Test Tag pink', '#FFC0CB'),
-- assing firs user blue tag,
(1, 'Test Tag blue', '#ADD8E6'),
(1, 'Test Tag green', '#90EE90');

-- Insert into the first note, the first tag
INSERT INTO note_to_tag (note_id, tag_id) VALUES 
(1,1);
-- Insert into the first note, the second tag
INSERT INTO note_to_tag (note_id, tag_id) VALUES
(1,2);
-- Insert into the second note, the third tag
INSERT INTO note_to_tag (note_id, tag_id) VALUES
(2,3);