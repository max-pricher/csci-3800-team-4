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

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

// TODO - Include your API routes here
// route 1, get, login, render home page,

app.get('/', (req, res) => {
    res.redirect('/login'); //this will call the /login route in the API
});

app.get('/login', (req, res) => {
    //do something
    res.render('pages/login');
});

// route 2, /register
app.get('/register', (req, res) => {
    res.render('pages/register'); // we dont need to pass any json data to register
});

// route 3, register async
app.post('/register', async (req, res) => {
    // hash password
    const hash = await bcrypt.hash(req.body.password, 10);
    // insert user and hash passwrod to users
    const query = `INSERT INTO users (username, password) VALUES ($1, $2)`;
    // if data succesfully entered, redirec to login
    try {
        await db.none(query, [req.body.username, hash])
        res.redirect('/login');
    } catch (error) { // if fail, redirect to get register
        console.error('ERROR:', error.message || error);
        res.redirect('/register');
    }
});


// route for login post
app.post('/login', async (req, res) => {
    // get username ans pass from body.
    const query = `SELECT * FROM users WHERE username = $1`; // only grab entry where username matches, 
    try {
        const user = await db.one(query, [req.body.username]);  // tried to get username
        const passwordMatch = await bcrypt.compare(req.body.password, user.password); // compare hash password
        if (passwordMatch) { // successful login
            req.session.user = user;
            req.session.save();
            res.redirect('/home'); // redirect to home page after successful login
        } else {
            res.render('pages/login', { message: 'Invalid username or password', error: true });

        }
    } catch (error) { // user not found
        console.error('ERROR:', error.message || error);
        res.redirect('/register'); // redirect to register page
    }

}); // will fail if username isnt found or password is wrong.


// Authentication Middleware.
const auth = (req, res, next) => {
    if (!req.session.user) {
        // Default to login page.
        return res.redirect('/login');
    }
    next();
};

// home routes
app.get('/home', auth, (req, res) => {
    res.render('pages/home', { username: req.session.user.username });
});


app.get('/logout', auth, (req, res) => {
    // 1. Destroy the session
    req.session.destroy();

    // 2. Render the logout page with a success message
    res.render('pages/logout', {
        message: 'Logged out Successfully',
        error: false
    });
});

// Create routes for making notes

app.get('/create', auth, (req, res) => {
    // load the create note page,
});

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');