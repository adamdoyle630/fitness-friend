import express from 'express';
import minimist from 'minimist';
import Database from 'better-sqlite3';
import path from 'path';
import {fileURLToPath} from 'url';
import { allowedNodeEnvironmentFlags } from 'process';

// Args
const args = minimist(process.argv.slice(2));

// Set port
const port = args.port || 5000;

// Create database
const db = new Database('data.db');
db.pragma('journal_mode = WAL');

// Initialize app
const app = express();

// link stylesheet to the right folder
app.use(express.static("public"))
app.set('view engine', 'ejs');
app.set('views', path.join(path.dirname(fileURLToPath(import.meta.url)), 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database tables
try {
    db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, user VARCHAR, pass VARCHAR);`);
} catch (error) {
    console.log(error)
}

try {
    db.exec(`CREATE TABLE IF NOT EXISTS finess (id INTEGER PRIMARY KEY AUTOINCREMENT, user VARCHAR, duration VARCHAR, type VARCHAR, date VARCHAR, time VARCHAR);`);
} catch (error) {
    console.log(error)
}

try {
    db.exec(`CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY AUTOINCREMENT, user VARCHAR, type VARCHAR, date VARCHAR);`);
} catch (error) {
    console.log(error)
}

// Endpoints For Rendering Pages and Buttons - Refer to documentation
app.get('/', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    res.render('login')
});

app.get('/home', (req, res) => {
    res.render('home', {currentUser: req.app.get('user')});
});

 app.post('/new-workout', (req, res) => {
    res.render('new-workout');
});

app.post('/new-account', (req, res) => {
    res.render('create-account');
})

// Validate user login
app.post('/enterLogin', (req, res) => {
    // Get username and password
    const user = req.body.username;
    const pass = req.body.password;

    // Validate username and password
    if (user === '' || pass === '') {
        res.render('login', {message: 'All fields are required!'});
    } else {
        const prepData = db.prepare(`SELECT * FROM users WHERE user = '${user}' and pass = '${pass}'`);
        let temp = prepData.get();
    
        if (temp === undefined) {
            res.render('login', {message: 'Username or password incorrect!'});
        }
        else {
            req.app.set('user', user);

            // Add login time to log
            const time = new Date(Date.now());
            db.exec(`INSERT INTO log (user, type, date) VALUES ('${user}', 'Login', '${time}');`);
            res.redirect('/home');
        };
    }
});

// Validate account creation
app.post('/createAccount', (req, res) => {
    const user = req.body.username;
    const pass = req.body.password;
    const passConfirm = req.body.passwordConfirm;
    if (user === '' || pass === '' || passConfirm === '') {
        res.render('create-account', {message: 'All fields are required!'});
    } else {
        const prepData = db.prepare(`SELECT * FROM users WHERE user = '${user}'`);
        let temp = prepData.get();
    
        if (temp === undefined) {
            if (pass === passConfirm) {
                // Add account to database and log in
                db.exec(`INSERT INTO users (user, pass) VALUES ('${user}', '${pass}')`);
                const time = new Date(Date.now());
                db.exec(`INSERT INTO log (user, type, date) VALUES ('${user}', 'Login', '${time}');`);
                res.redirect('/home');
            }
            else {
                res.render('create-account', {message: 'Passwords must match!'});
            }
        }
        else {res.render('create-account', {message: 'Username already exists!'})};
    }
 });

// Add workout to database
app.post('/enterWorkout', (req, res) => {
    const duration = req.body.duration;
    const type = req.body.type;
    const date = req.body.date;
    const timeLogged = new Date(Date.now()); // Store when the entry was logged
    let userName = req.app.get('user');
    db.exec(`INSERT INTO finess (user, duration, type, date, time) VALUES ('${userName}', '${duration}', '${type}', '${date}', '${timeLogged}')`);
    res.render('entry-success');
});

app.post('/returnHome', (req, res) => {
    res.redirect('/home')
});

app.post('/delete-account', (req, res) => {
    const user = req.app.get('user');
    db.exec(`DELETE FROM finess WHERE user = '${user}'`);
    db.exec(`DELETE FROM users WHERE user = '${user}'`);
    db.exec(`DELETE FROM log WHERE user = ${user}`);
    res.render('delete-account');
});

app.post('/view-logs', (req, res) => {
    const stmt = db.prepare(`SELECT * FROM log ORDER BY date DESC`);
    let all = stmt.all();
    res.render('user-logs', {log: all});
});

app.post('/view-fitness-log', (req, res) => {
    let userName = req.app.get('user');
    const stmt = db.prepare(`SELECT * FROM finess WHERE user = '${userName}' ORDER BY date DESC`);
    let all = stmt.all();
    res.render('fitness-logs', {finess: all});
})

// Post 404 if no endpoint found
app.get('*', (req, res) => {
    res.status(404).send('404 NOT FOUND')
})

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});