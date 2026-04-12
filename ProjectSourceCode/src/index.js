// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************
const express = require('express'); // To build an application server or API
const app = express();
app.use(express.static(__dirname + '/'));
const handlebars = require('express-handlebars'); //to enable express to work with handlebars
const Handlebars = require('handlebars'); // to include the templating engine responsible for compiling templates
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************
// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
    extname: 'hbs',
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials',
});

// database configuration
const dbConfig = {
    host: 'db', // the database server
    port: 5432, // the database port
    database: process.env.POSTGRES_DB, // the database name
    user: process.env.POSTGRES_USER, // the user account to connect with
    password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
    .then(obj => {
        console.log('Database connection successful'); // you can view this message in the docker compose logs
        obj.done(); // success, release the connection;
    })
    .catch(error => {
        console.log('ERROR:', error.message || error);
    });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'super_secret_key', //fall back if not found.
        saveUninitialized: false,
        resave: false,
    })
);

app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

// this line sets local variables so we dont need to pass them to every route
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************
// Helper to keep code dry
function formatNotes(notes) {
    return notes.map(note => ({
        ...note,
        time_made: new Date(note.time_made).toLocaleString('en-US', {
            timeZone: 'America/Denver',
            dateStyle: 'medium',
            timeStyle: 'short'
        })
    }));
}

app.get('/', (req, res) => {
    res.render('pages/login'); //this will call the /login route in the API
});

app.get('/login', (req, res) => {
    res.render('pages/login');
});

// route 2, /register
app.get('/register', (req, res) => {
    res.render('pages/register');
});

// route 3, register async
app.post('/register', async (req, res, next) => {
    // hash password
    const hash = await bcrypt.hash(req.body.password, 10);
    // insert user and hash passwrod to users
    const query = `INSERT INTO users (username, password) VALUES ($1, $2)`;
    // if data succesfully entered, redirec to login
    try {
        await db.none(query, [req.body.username, hash]);
        res.redirect('/login'); // success: go to login
    } catch (error) {
        if (error.code === '23505') {
            return res.render('pages/register', {
                message: 'Username already taken.',
                error: true
            });
        }
        next(error);
    }
});

// route for login post
app.post('/login', async (req, res, next) => {
    // get username ans pass from body.
    const query = `SELECT * FROM users WHERE username = $1`; // only grab entry where username matches, 
    try {
        const user = await db.oneOrNone(query, [req.body.username]);  // tried to get username
        if (!user) { // did user exist?
            return res.render('pages/register', {
                message: 'Username not found.',
                error: true
            });
        }
        const passwordMatch = await bcrypt.compare(req.body.password, user.password); // compare hash password
        if (passwordMatch) { // successful login
            req.session.user = user;
            req.session.save(() => {
                res.redirect('/home'); // redirect to home page after successful login
            });
        } else {
            res.render('pages/login', { message: 'Invalid password', error: true });
        }
    } catch (error) { // user not found
        next(error);
    }
}); // will fail if username isnt found or password is wrong.

// Authentication Middleware.
const auth = (req, res, next) => {
    if (!req.session.user) { // if user not stored locally
        // Default to login page.
        return res.redirect('/login');
    }
    next();
};

// home routes
app.get('/home', auth, async (req, res, next) => {

    const currentTime = new Date().getHours();
    let greeting;

    if (currentTime < 12) {
        greeting = 'Good Morning';
    } else if (currentTime < 18) {
        greeting = 'Good Afternoon';
    } else {
        greeting = 'Good Evening';
    }

    try {
        const user_id = req.session.user.user_id;
        const notes = await db.any(
            'SELECT * FROM notes WHERE user_id = $1 ORDER BY time_made DESC LIMIT 5',
            [user_id]
        );
        const formattedNotes = formatNotes(notes);
        res.render('pages/home', { greeting, notes: formattedNotes });
    } catch (error) {
        next(error);
    }
});

app.get('/logout', auth, (req, res) => {
    // 1. Destroy the session
    req.session.destroy(); // deletes local data

    // 2. Render the logout page with a success message
    res.render('pages/logout', {
        message: 'Logged out Successfully',
        error: false
    });
});

// Create routes for making notes
// must be signed in to use
app.get('/create', auth, (req, res) => {
    res.render('pages/create');
});

app.post('/create', auth, async (req, res, next) => {
    const { title, body } = req.body;
    const user_id = req.session.user.user_id;
    const query = `INSERT INTO notes (user_id, title, body) VALUES ($1, $2, $3) RETURNING *;`;

    try {
        await db.one(query, [user_id, title, body]);
        res.redirect('/home');
    } catch (error) {
        next(error);
    }
});

// Note Routes to view our notes
// currently modifying this function to parse the string first and interpret the full query.
app.get('/notes', auth, async (req, res, next) => {
    const user_id = req.session.user.user_id;
    // Support simple keyword search across note titles and bodies.
    const searchString = (req.query.search || '').trim(); // get user input

    if (!searchString) {
        try {
            const notes = await db.any(`SELECT * FROM notes WHERE user_id = $1 ORDER BY time_made DESC`, [user_id]);
            return res.render('pages/notes', { notes: formatNotes(notes), search: '' });
        } catch (error) {
            return next(error);
        }
    }

    // parsing logic.
    // users can use operators like & for AND, | for OR, and ! for NOT. 
    // to search notes for specific tags they assigned.

    // create placeholder arrays
    // REFINED Parsing Logic for Multi-word Tags
    const tokens = searchString.split(/(?=[&|!])/); // Split only when we hit an operator
    const keywords = [];
    const includeTags = [];
    const excludeTags = [];
    const orTags = [];

    tokens.forEach(token => {
        const cleanToken = token.trim();
        if (cleanToken.startsWith('!')) {
            excludeTags.push(cleanToken.substring(1).trim());
        } else if (cleanToken.startsWith('&')) {
            includeTags.push(cleanToken.substring(1).trim());
        } else if (cleanToken.startsWith('|')) {
            orTags.push(cleanToken.substring(1).trim());
        } else {
            // If it doesn't start with an operator, it's a keyword
            keywords.push(cleanToken);
        }
    });

    // --- Query BUILDING ---
    // get all distinct notes (distinct for notes with multiple tags)
    // prioritizing notes, join note to tag id.
    // connect tags to tag id.
    // filter by user id first, then apply keyword and tag filters.
    let query = `SELECT DISTINCT n.* FROM notes n  
                 LEFT JOIN note_to_tag ntt ON n.note_id = ntt.note_id
                 LEFT JOIN tags t ON ntt.tag_id = t.tag_id
                 WHERE n.user_id = $1`;
    const params = [user_id];

    // regular Keyword Filtering (Title/Body)
    if (keywords.length > 0) { // if keywords exist
        const keywordTerm = `%${keywords.join(' ')}%`; // recreate search term with all keywords
        params.push(keywordTerm);
        query += ` AND (n.title ILIKE $${params.length} OR n.body ILIKE $${params.length})`; // add keyword search to query.
    }

    // "NOT" Logic (!tag) 
    // similar to original flow but instead excluding tags.
    if (excludeTags.length > 0) {
        params.push(excludeTags);
        query += ` AND n.note_id NOT IN (
        SELECT note_id FROM note_to_tag ntt2 
        JOIN tags t2 ON ntt2.tag_id = t2.tag_id 
        WHERE t2.name = ANY($${params.length})
    )`;
    }

    if (includeTags.length > 0) {
        // Each included tag must match (true AND logic)
        includeTags.forEach(tag => {
            params.push(tag);
            query += ` AND n.note_id IN (
            SELECT ntt2.note_id FROM note_to_tag ntt2
            JOIN tags t2 ON ntt2.tag_id = t2.tag_id
            WHERE t2.name = $${params.length}
        )`;
        });
    }

    if (orTags.length > 0) {
        params.push(orTags);
        query += ` AND t.name = ANY($${params.length})`;
    }

    query += ` ORDER BY n.time_made DESC`; // finalize query with order

    try { // attempt to fetch notes based on search criteria, if the search string is malformed it may cause an error, so we catch it and send to global handler.
        const notes = await db.any(query, params);
        res.render('pages/notes', { notes: formatNotes(notes), search: searchString });
    } catch (error) {
        next(error);
    }
});

// edit routes
app.get('/edit/:id', auth, async (req, res, next) => {
    const note_id = req.params.id;
    const user_id = req.session.user.user_id;
    const query = `SELECT * FROM notes WHERE note_id = $1 AND user_id = $2;`;

    try { // if someone types a fake id into the url, they can trigger any of these, so we dont want a crash for an invalid id.
        const note = await db.oneOrNone(query, [note_id, user_id]);
        if (note) {
            res.render('pages/edit', { note }); // note found, render edit page with note data
        } else { // note not found or does not belong to user
            res.redirect('/notes');
        }
    } catch (error) {
        next(error);
    }
});

app.post('/edit/:id', auth, async (req, res, next) => {
    const note_id = req.params.id;
    const user_id = req.session.user.user_id;
    const { title, body } = req.body;
    const query = `UPDATE notes SET title = $1, body = $2 WHERE note_id = $3 AND user_id = $4 RETURNING *;`; // update the title and body if permission match.

    try {
        const updatedNote = await db.oneOrNone(query, [title, body, note_id, user_id]);
        if (updatedNote) {
            res.redirect('/notes');
        } else {
            res.render('pages/edit', {
                message: 'Could not update note. Please try again.',
                error: true,
                note: { note_id, title, body }
            });
        }
    } catch (error) {
        next(error);
    }
});

// delete routes
app.post('/delete/:id', auth, async (req, res, next) => {
    const note_id = req.params.id; // get id of note
    const user_id = req.session.user.user_id; // get logged in user
    const query = `DELETE FROM notes WHERE note_id = $1 AND user_id = $2 RETURNING *;`; // returning allows us to delete the note but save it to check if it was succesfully deleted.

    try {
        await db.oneOrNone(query, [note_id, user_id]);
        res.redirect('/notes');
    } catch (error) {
        next(error); // This sends the error to the Global Handler automatically
    }
});

// about routes
app.get('/about', (req, res) => {
    res.render('pages/about');
});
// bonuses
//Export routes
app.get('/export/:id', auth, async (req, res, next) => {
    const note_id = req.params.id;
    const user_id = req.session.user.user_id;
    const query = `SELECT * FROM notes WHERE note_id = $1 AND user_id = $2;`; // match this query to edit route

    try {
        const note = await db.oneOrNone(query, [note_id, user_id]);
        if (note) {
            const timestamp = new Date(note.time_made).getTime();
            const safeTitle = note.title.replace(/\s+/g, '_').toLowerCase(); // title conversion for wider support.
            const data = { // convert data to JSON
                title: note.title,
                body: note.body,
                time_made: note.time_made
                // add properties once added to db
            }
            res.attachment(`${safeTitle}_${timestamp}.json`); // set the file name for download
            res.json(data); // send the note data as JSON for download

        } else {
            throw new Error('Note not found or you do not have permission to export it.');
        }
    } catch (error) {
        next(error);
    }
});

// Tag routes (fetching, assigning, creating)

// GET tags belonging to a specific note
app.get('/api/tags/note/:id', auth, async (req, res) => {
    const note_id = req.params.id;
    const user_id = req.session.user.user_id;

    try {
        const tags = await db.any(
            `SELECT t.* FROM tags t
             JOIN note_to_tag ntt ON t.tag_id = ntt.tag_id
             WHERE ntt.note_id = $1 AND t.user_id = $2`,
            [note_id, user_id]
        );
        res.json({ tags });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// fetch all tags from a note (for assigning tag visualization)
//  GET route to fetch the Master List and Current Note Status as JSON
app.get('/api/tags/:id', auth, async (req, res) => {
    const note_id = req.params.id;
    const user_id = req.session.user.user_id;

    try {
        // masterList get every tag name the user owns
        const allTags = await db.any('SELECT * FROM tags WHERE user_id = $1', [user_id]);

        // make DB call, find all active tags for this note, return list of tag ids that are active for this note
        const tagIdsJson = await db.any('SELECT tag_id FROM note_to_tag WHERE note_id = $1', [note_id]);
        const currentTagIds = tagIdsJson.map(link => link.tag_id);

        res.json({ allTags, currentTagIds });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//  POST route to handle checkbox toggling and sync to DB
app.post('/api/tags/:id/toggle', auth, async (req, res) => {
    const note_id = req.params.id;
    const { tag_id, action } = req.body; // action is 'link' or 'unlink'

    try {
        if (action === 'link') {
            await db.none(
                'INSERT INTO note_to_tag (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [note_id, tag_id]
            );
        } else {
            await db.none(
                'DELETE FROM note_to_tag WHERE note_id = $1 AND tag_id = $2',
                [note_id, tag_id]
            );
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// post route to create new tag
app.post('/api/tags/:id/add', auth, async (req, res) => {
    const note_id = req.params.id;
    const user_id = req.session.user.user_id;
    const { tag_name, tag_color } = req.body;

    try {
        // Insert the tag (or find it if it exists, were updating the name just to recieve the id back)
        const tag = await db.one(
            `INSERT INTO tags (user_id, name, color) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name 
             RETURNING tag_id`,
            [user_id, tag_name, tag_color]
        );

        //  Link it to the note
        await db.none(
            'INSERT INTO note_to_tag (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [note_id, tag.tag_id]
        );

        res.json({ success: true, tag_id: tag.tag_id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create or link tag" });
    }
});
//task stuff ask jacob
function formatTask(task){
    return{
   ...task, //puts task properties in new object 
   due_at_formatted: task.due_at 
    ? new Date(task.due_at).toLocaleString():'no due date'
    };
}
app.get('/createTask', auth, (req,res)=>{ //req is user request res is response to send back
    res.render('pages/createTask');
});
app.post('/createTask', auth, async (req,res,next)=>{
    const { body, due_at, will_remind }=req.body;
    const user_id=req.session.user.user_id
    const remind=will_remind==='true';//converts to boolean
    const query='INSERT INTO tasks (user_id, body, due_at, will_remind) VALUES ($1, $2, $3, $4) RETURNING *;';
    //inserts positional parameters into next row of tasks that will be replaced with the next passed in values
    try{
        await db.one(query, [user_id, body, due_at, remind]);//executes query
        res.redirect('/tasks');//bring back to tasks page after 
    }
    catch(error){
        next(error);// when we pass an arg to next, it searches for an error handler.
    }
});
app.get('/tasks',auth, async (req, res, next) => {
    const user_id=req.session.user.user_id;
    const search=(req.query.search || '').trim();//reads search parameter in url, blank if undefined, trim removes extra whitespace
    //overdue tasks
    const overdueQuery= 
    `
    SELECT * FROM tasks
    WHERE user_id=$1
     AND due_at<NOW()
     AND ($2='' OR body ILIKE '%' || $2 || '%')
    ORDER BY due_at ASC;
    `;
    //tasks due within week
    const weekQuery=
    `
    SELECT * FROM tasks
    WHERE user_id=$1
     AND due_at BETWEEN NOW() AND (NOW()+ '7 days'::INTERVAL)
     AND ($2='' OR body ILIKE '%' || $2 || '%')
    ORDER BY due_at ASC;   
    `;
    //tasks due past one week
    const futureQuery=
    `
    SELECT * FROM tasks
    WHERE user_id=$1
     AND due_at > (NOW()+ '7 days'::INTERVAL)
     AND ($2='' OR body ILIKE '%' || $2 || '%')
    ORDER BY due_at ASC;
    `;
    //count of current and overdue taks
    const countQuery=
    `
    SELECT COUNT(*) FILTER (WHERE due_at>NOW()) AS current_tasks,  COUNT(*) FILTER (WHERE due_at<NOW() ) AS overdue_tasks
    FROM tasks
    WHERE user_id=$1;
    `;
    try{
       const [overdue, thisWeek,future, counts] = await Promise.all([
        db.any(overdueQuery,[user_id,search]),//db.any() for expecting multiple values, returns as an array
        db.any(weekQuery,[user_id,search]),
        db.any(futureQuery,[user_id,search]),
        db.one(countQuery,[user_id]),
       ]);
       res.render('pages/tasks',{
        overdue:overdue.map(formatTask),
        thisWeek:thisWeek.map(formatTask),
        future:future.map(formatTask),
        counts,
        search
       });
    }
    catch (error){
        next(error);
    }
});

// testingggg(lab10)
app.get('/welcome', (req, res) => {
    res.json({ status: 'success', message: 'Welcome!' });
});

app.get('/test', (req, res) => {
    res.redirect('/login');
});




// error. catch handler to reduce redundancy. Leave at bottom
app.use((err, req, res, next) => {
    console.error('GLOBAL ERROR:', err.stack);

    // If they are logged in, show it on the notes page
    const pageToRender = req.session.user ? 'pages/notes' : 'pages/login';

    res.status(500).render(pageToRender, {
        message: 'Something went wrong. Please try again.',
        error: true,
        notes: [] // pass blank note
    });
});

// <!-- Final : Start Server-->
// starting the server and keeping the connection open to listen for more requests

const server = app.listen(3000, () => {
    console.log('Server is listening on port 3000');
});

server.db = db;
module.exports = server;
