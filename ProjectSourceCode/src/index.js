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
        secret: process.env.SESSION_SECRET,
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

app.get('/', (req, res) => {
    res.redirect('/login'); //this will call the /login route in the API
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
        res.status(200).json({ message: 'Success' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Invalid input' });
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
app.get('/home', auth, (req, res) => {

    const currentTime = new Date().getHours();
    let greeting;

    if (currentTime < 12) {
        greeting = 'Good Morning';
    } else if (currentTime < 18) {
        greeting = 'Good Afternoon';
    } else {
        greeting = 'Good Evening';
    }

    res.render('pages/home', {
        username: req.session.user.username,
        greeting: greeting
    }); // what we pass in to the render, can be used in a handlebars template. 
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
        const note = await db.one(query, [user_id, title, body]);

        if (note) {
            res.redirect('/home');
        }
    } catch (error) {
        next(error);
    }
});

// Note Routes to view our notes
app.get('/notes', auth, async (req, res, next) => {
    const user_id = req.session.user.user_id;
    const query = `SELECT * FROM notes WHERE user_id = $1;`;

    try {
        const notes = await db.any(query, [user_id]);
        const formattedNotes = notes.map(note => ({ // easy way to change the time format, can modify other fields.
            ...note, // keep the note the same
            time_made: new Date(note.time_made).toLocaleString('en-US', { // change the time
                timeZone: 'America/Denver',
                dateStyle: 'medium',
                timeStyle: 'short'
            })
        }));
        res.render('pages/notes', { notes: formattedNotes });
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
    const note_id = req.params.id;
    const user_id = req.session.user.user_id;
    const query = `DELETE FROM notes WHERE note_id = $1 AND user_id = $2 RETURNING *;`; // returning allows us to delete the note but save it to check if it was succesfully deleted.

    try {
        const deletedNote = await db.oneOrNone(query, [note_id, user_id]);
        res.redirect('/notes');
    } catch (error) {
        next(error); // This sends the error to the Global Handler automatically
    }
});

// bonuses
// error. catch handler to reduce redundancy.
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


// testingggg(lab10)
app.get('/welcome', (req, res) => {
    res.json({ status: 'success', message: 'Welcome!' });
});

app.get('/test', (req, res) => {
    res.redirect('/login');
});

// *****************************************************
// <!-- Final : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');