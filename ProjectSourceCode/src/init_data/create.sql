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
        CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(user_id)
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
        due_at TIMESTAMP,
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