// This is better than nothing, the key must be changed when the game is really used.
var crypto = require('crypto');
var key = 'jokuavain';
var hash;

// Function that gives the time in YYYY:MM:DD:HH:MM syntax
function getDateTime() {
    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min;
}

// Generates a random string
function generateRandomString(length) {
	var chars = "1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM";
	var word = "";
	var random = "";
	for(var i = 0; i < length; i++) {
		random = Math.floor(Math.random() * chars.length);
		word += chars.charAt(random);
	}
	return word;
}

var succeeded = false;

// Check password and if it is ok, update sessionID.
function checkPassword(req, res, data, connection, sessionid) {
	succeed = false;
	hash = crypto.createHmac('sha1', key).update(req.body.pword).digest('hex');
	connection.query('SELECT password AS password FROM users WHERE user = \'' + req.body.uname + '\'',
		function(err, rows, fields) {
			if (err) throw err; 
			var password = rows[0].password.toString('hex');
			console.log(password);
			
			if(password == hash) {
				updateSessionID(req, res, data, connection, sessionid);
			}
		});
}

// Update session ID to new one.
function updateSessionID(req, res, data, connection, sessionid) {
	console.log('ooo');
	connection.query('UPDATE users SET sessionid = \''
		+ sessionid + '\' WHERE user = \'' + req.body.uname + '\'',
		function(err, rows, fields) { if (err) throw err; });
}

// Handle login post
exports.handleLoginPost = function(req, res, data, pool) {
	var sessionid = generateRandomString(25);
	res.cookie('player', req.body.uname, { maxAge: 900000, httpOnly: false});
	res.cookie('session', sessionid, { maxAge: 900000, httpOnly: false});

	pool.getConnection(function(err, connection) {
		checkPassword(req, res, data, connection, sessionid);
	});
}

// Handle registering post
exports.handleRegisterPost = function(req, res, data, pool) {
	
	// Add session cookies
	var sessionid = generateRandomString(25);
	res.cookie('player', req.body.uname, { maxAge: 900000, httpOnly: false});
	res.cookie('session', sessionid, { maxAge: 900000, httpOnly: false});
	
	if(req.body.pword == req.body.repword) {
		pool.getConnection(function(err, connection) {

			hash = crypto.createHmac('sha1', key).update(req.body.pword).digest('hex');

			// Add user to SQL-database
			connection.query('INSERT INTO users VALUES (\''
				+ req.body.uname + '\', UNHEX(\''
				+ hash + '\'), \''
				+ req.connection.remoteAddress + '\', \''
				+ getDateTime() + '\', \''
				+ sessionid + '\')',
				function(err, rows, fields) { if (err) throw err; });
		
			//cookieParser();
			//console.log(req.cookies.player);
		});
	} else {
		console.log('eri salasanat');
	}
}