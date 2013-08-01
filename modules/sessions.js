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

// Gets the needed data and handles page request using it
// returns the data associated with the page
exports.handlePage = function(req, res, pool, data, callback) {
	var sessionid = req.cookies.session;
	
	// Set default values for variables if not set in POST handling 
	if (typeof data.status == "undefined") {
		data.status = 0;
	}
	if (typeof data.login == "undefined") {
		data.login = false;
	}
	if (typeof data.regSuc == "undefined") {
		data.regSuc = 0;
	}
	if (typeof data.logSuc == "undefined") {
		data.logSuc = 0;
	}
	
	pool.getConnection(function(err, connection) {
		if (err) {
			data.username = "";
			data.login = false;
			if (err.code == 'ECONNREFUSED') {
				console.log("refused");
				data.status = 1;
				updateUserData(req, res, connection, data, function() {
					callback(data);
					return;
				});
			} else {
				data.status = 1;
				callback(data);
			}
		} else {
			if (data.login == false) {
				getUsername(connection, sessionid, data, function() {
					updateUserData(req, res, connection, data, function() {
						callback(data);
					});
				});
			} else { // user has just logged in or registered
				updateUserData(req, res, connection, data, function() {
					callback(data);
				});
			}
			connection.end();
		}
	});
}

// Check password and if it is ok, update sessionID.
function checkPassword(req, res, data, connection, callback) {
	succeed = false;
	var hash = crypto.createHmac('sha1', key).update(req.body.pword).digest('hex');
	connection.query('SELECT password AS password FROM users WHERE user = ?', [req.body.uname],
		function(err, rows, fields) {
			if (err) throw err;
			
			if (typeof rows[0] != "undefined") {
				var password = rows[0].password.toString('utf-8');
				if(password == hash) {
					data.logSuc = 1;
					data.login = true;
					data.username = req.body.uname;
					updateSessionID(req, res, connection, data.username, function() {
						callback();
					});
				} else {
					data.logSuc = 2;
					callback();
				}
			} else {
				//user not found
				data.logSuc = 2;
				callback();
			}
		});
}

// Handle login post
exports.handleLoginPost = function(req, res, data, pool, callback) {

	pool.getConnection(function(err, connection) {
		if (err) {
			data.logSuc = 0;
			callback();
			return;
		} else {
			checkPassword(req, res, data, connection, function() {
				callback();
			});
		}
		connection.end();
	});
}

	// Add user to SQL-database
function addUser(req, res, data, connection, hash, callback) {
	var sessionid = generateRandomString(25);
	var query = connection.query('INSERT INTO users (user, password, ip, sessionid) VALUES (?, \'' + hash + '\', ?, ?)',
		[req.body.uname, req.connection.remoteAddress, sessionid],
		function(err, rows, fields) { 
			if (err) {
				data.regSuc = 0;
				callback();
			} else {
				// Add session cookies
				res.cookie('session', sessionid, { maxAge: autoLogOffTime, httpOnly: false});
				
				// Adding the user succeeded
				data.regSuc = 1;
				data.login = true;
				data.username = req.body.uname;
				callback();
			}
		});
}

// Handle registering post
exports.handleRegisterPost = function(req, res, data, pool, callback) {
	
	if(req.body.pword == req.body.repword) {
		pool.getConnection(function(err, connection) {
			if (err) {
				data.regSuc = 0;
				callback();
				return;
			}
			var hash = crypto.createHmac('sha1', key).update(req.body.pword).digest('hex');
			
			// Check that password is long enough. Short one is good for testing.
			if(req.body.pword.length < 3) {
				data.regSuc = 4;
				callback();
				return;
			}
			
			// Check that password is short enough.
			if(req.body.pword.length > 20) {
				data.regSuc = 5;
				callback();
				return;
			}
			
			// Check that username is long enough.
			if(req.body.pword.length < 3) {
				data.regSuc = 6;
				callback();
				return;
			}
			
			// Check that username is short enough.
			if(req.body.pword.length > 20) {
				data.regSuc = 7;
				callback();
				return;
			}

			connection.query('SELECT user FROM users WHERE user = ?', [req.body.uname],
				function(err, rows, fields) {
					if (err) throw err;
			
					if (typeof rows[0] == "undefined") {
						addUser(req, res, data, connection, hash, function() {
							callback();
						});
					} else {
						// There is already a user with the same name
						data.regSuc = 3;
						callback();
					}
				});
				
			connection.end();
		});
	} else {
		// different passwords
		data.regSuc = 2;
		callback();
	}
}

// Gets username with session ID string
function getUsername(connection, sessionid, data, callback) {

		connection.query('SELECT user FROM users WHERE sessionid = ? AND (TIMESTAMPDIFF(MINUTE, `last_used`, NOW()) < 15)', [sessionid],
		function(err, rows, fields) {
			if (err) throw err;
			if (typeof rows[0] != "undefined") {
				data.username = rows[0].user;
				data.login = true;
			} else {
				data.login = false;
			}
			callback();
		});
}

function updateUserData(req, res, connection, data, callback) {

	if (data.login == true) {
		
		if(req.params.id != "logout") {
			// Make new session ID and give the session more time.
			updateSessionID(req, res, connection, data.username, function() {
				callback();
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
			callback();
		}
	} else {
		callback();
	}

}

// Update session ID to new one.
function updateSessionID(req, res, connection, username, callback) {
	var sessionid = generateRandomString(25);
	var query = connection.query('UPDATE users SET sessionid = ? WHERE user = ?',
		[sessionid, username],
		function(err, rows, fields) { 
			if (err) throw err;
			res.cookie('session', sessionid, { maxAge: autoLogOffTime, httpOnly: false});
			callback();
		});
}