// This is better than nothing, the key must be changed when the game is really used.
var crypto = require('crypto');
var key = 'jokuavain';
var autoLogOffTime = 900000;

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

// Check password and if it is ok, update sessionID.
function checkPassword(app, req, res, data, connection) {
	succeed = false;
	var hash = crypto.createHmac('sha1', key).update(req.body.pword).digest('hex');
	connection.query('SELECT password AS password FROM users WHERE user = ?', [req.body.uname],
		function(err, rows, fields) {
			if (err) throw err;
			
			if (typeof rows[0] != "undefined") {
				var password = rows[0].password.toString('utf-8');
				if(password == hash) {
					updateSessionID(app, req, res, data, connection);
				} else {
					data.logSuc = 2;
					app.renderPage(res, "login", data);
				}
			} else {
				//user not found
				data.logSuc = 2;
				app.renderPage(res, "login", data);
			}
		});
}

// Update session ID to new one.
function updateSessionID(app, req, res, data, connection) {
	var sessionid = generateRandomString(25);
	var query = connection.query('UPDATE users SET sessionid = ? WHERE user = ?',
		[sessionid, req.body.uname],
		function(err, rows, fields) { 
			if (err) throw err;
			res.cookie('session', sessionid, { maxAge: autoLogOffTime, httpOnly: false});
			data.logSuc = 1;
			data.login = true;
			data.username = req.body.uname;
			app.renderPage(res, "login", data);
		});
}

// Handle login post
exports.handleLoginPost = function(app, req, res, data, pool) {

	pool.getConnection(function(err, connection) {
		if (err) throw err;
		checkPassword(app, req, res, data, connection);
		connection.end();
	});
}

	// Add user to SQL-database
function addUser(req, res, data, app, connection, hash) {
	var sessionid = generateRandomString(25);
	var query = connection.query('INSERT INTO users (user, password, ip, sessionid) VALUES (?, \'' + hash + '\', ?, ?)',
		[req.body.uname, req.connection.remoteAddress, sessionid],
		function(err, rows, fields) { 
			if (err) throw err;
			// Add session cookies
			res.cookie('session', sessionid, { maxAge: autoLogOffTime, httpOnly: false});
			
			// Adding the user succeeded
			data.regSuc = 1;
			app.renderPage(res, "register", data);
		});
}

// Handle registering post
exports.handleRegisterPost = function(app, req, res, data, pool) {
	
	if(req.body.pword == req.body.repword) {
		pool.getConnection(function(err, connection) {
		
			if (err) throw err;

			var hash = crypto.createHmac('sha1', key).update(req.body.pword).digest('hex');
			
			// Check that password is long enough. Short one is good for testing.
			if(req.body.pword.length < 3) {
				data.regSuc = 4;
				app.renderPage(res, "register", data);
				return;
			}
			
			// Check that password is short enough.
			if(req.body.pword.length > 20) {
				data.regSuc = 5;
				app.renderPage(res, "register", data);
				return;
			}
			
			// Check that username is long enough.
			if(req.body.pword.length < 3) {
				data.regSuc = 6;
				app.renderPage(res, "register", data);
				return;
			}
			
			// Check that username is short enough.
			if(req.body.pword.length > 20) {
				data.regSuc = 7;
				app.renderPage(res, "register", data);
				return;
			}

			connection.query('SELECT user FROM users WHERE user = ?', [req.body.uname],
				function(err, rows, fields) {
					if (err) throw err;
			
					if (typeof rows[0] == "undefined") {
						addUser(req, res, data, app, connection, hash);
					} else {
						// There is already a user with the same name
						data.regSuc = 3;
						app.renderPage(res, "register", data);
					}
				});
				
			connection.end();
		});
	} else {
		// different passwords
		data.regSuc = 2;
		app.renderPage(res, "register", data);
	}
}

function sendPageContent(ajaxdataonly, req, res, data, app) {
	if (ajaxdataonly) {
		res.header("Content-Type", "application/json");
		res.send(JSON.stringify(data));
	} else {
		app.sendPage(req, res, data);
	}
}

// Gets username with session ID string
exports.getUsername = function(req, res, app, pool, data, ajaxdataonly) {
	var sessionid = req.cookies.session;
	data.username = "";
	data.login = false;
	
	pool.getConnection(function(err, connection) {
		if (err) throw err;
		connection.query('SELECT user FROM users WHERE sessionid = ? AND (TIMESTAMPDIFF(MINUTE, `last_used`, NOW()) < 15)', [sessionid],
		function(err, rows, fields) {
			if (err) throw err;
			
			if (typeof rows[0] != "undefined") {
				data.username = rows[0].user;
				data.login = true;
				
				if(req.params.id != "logout") {
				
					// Make new session ID and give the session more time.
					var sessionid = generateRandomString(25);
					var query = connection.query('UPDATE users SET sessionid = ? WHERE sessionid = ?',
												[sessionid, req.cookies.session],
						function(err, rows, fields) { 
							if (err) throw err;
							res.cookie('session', sessionid, { maxAge: autoLogOffTime, httpOnly: false});
							sendPageContent(ajaxdataonly, req, res, data, app);
						});
				}
			
				if (req.params.id == "register") {
					data.regSuc = 8;
				}
				else if (req.params.id == "login") {
					data.logSuc = 3;
				}
				else if (req.params.id == "logout") {
					res.clearCookie('session');
					data.login = false;
					sendPageContent(ajaxdataonly, req, res, data, app);
				}
			} else {
				data.regSuc = 0;
				data.logSuc = 0;
				sendPageContent(ajaxdataonly, req, res, data, app);
			}
		});
		connection.end();
	});
}