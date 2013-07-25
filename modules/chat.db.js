// Game statuses
var GAME_CLOSED = 0;
var GAME_CREATOR = 1;
var GAME_INVITED = 2;
var GAME_JOINED = 3;

exports.doesGameExist = function(contype, resource, creator, key) {
	// user isn't in chat, we can't use memory
	getCon(contype, resource, function(connection) {
		if (err) throw err;
		connection.query('SELECT 1 FROM users_challenges WHERE username = ? AND challenger = ? AND gamekey = ?'
		[creator, creator, key],
		function(err, rows, fields) {
			if (err) throw err;
			if (typeof rows[0] != "undefined") {
				callback(true);
			} else {
				callback(false);
			}
		});
	});
}

exports.acceptChallenge = function(contype, resource, creator, key, socket, callback) {
	getCon(contype, resource, function(connection) {
		connection.query('UPDATE users_challenges SET status = ? WHERE username = ? AND challenger = ? AND gamekey = ?', 
							[GAME_JOINED, socket.username, creator, key],
							function(err, rows, fields) {
			if (err) throw err;
			callback();
		});
	});
}

exports.getChallengeData = function(contype, resource, creator, key, status, callback) {
	getCon(contype, resource, function(connection) {
		var query = connection.query('SELECT username, userlevel, status FROM users_challenges LEFT OUTER JOIN users ON users_challenges.username = users.user WHERE challenger = ? AND gamekey = ? AND username NOT IN (?)',
		[creator, key, creator],
		function(err, rows, fields) {
			var participantList = {};
			var inviteList = [];
			if (err) throw err;
			if (typeof rows != "undefined") {
				for (var id=0; id<rows.length; id++) {
					var data = exports.getUserData(rows[id]);
					if (rows[id].status == GAME_JOINED) {
						participantList[rows[id].username] = data;
					} else if (rows[id].status == GAME_INVITED) {
						data.username = rows[id].username;
						inviteList.push(data);
					}
				}
			}
			callback(creator, key, status, {participants: participantList, invited: inviteList});
		});
	});
}

// Assumptions: users_challenges row and outer left join on users
exports.getUserData = function(row) {
	return { userlevel: row.userlevel };
}

exports.doesParticipantExist = function(contype, resource, creator, key, username) {
	getCon(contype, resource, function(connection) {
		if (err) throw err;
		connection.query('SELECT status FROM users_challenges WHERE username = ? AND challenger = ? AND gamekey = ?'
		[username, creator, key],
		function(err, rows, fields) {
			if (err) throw err;
			if (typeof rows[0] != "undefined") {
				callback(true, rows[0].status);
			} else {
				callback(false);
			}
		});
	});
}

exports.acceptInvitation = function(contype, resource, creator, key, user, callback) {
	getCon(contype, resource, function(connection) {
		connection.query('UPDATE user SET status = ? WHERE username = ? AND challenger = ? AND gamekey = ?', 
					[GAME_JOINED, creator, key],
					function(err, rows, fields) {
			if (err) {
				throw err;
			}
			if (rows.affectedRows == 1) {
				callback();
			} else {
				connection.end();
			}
		});
	});
}

exports.sendChallengeAccept = function(contype, resource, users, creator, key, socket, callback) {
	// TODO: get the participants from db and send accept message to everyone who is online
	getCon(contype, resource, function(connection) {
		connection.query('SELECT username FROM users_challenges WHERE challenger = ? AND gamekey = ? WHERE username NOT IN (?, ?)', 
		[creator, key, socket.username, creator], function(err, rows, fields) {
			for (var i=0; i<rows.length; i++) {
				users[rows[i].username].emit("challengeAccepted", creator, key, socket.username);
			}
			callback();
		});
	});
}

exports.refuseChallenge = function(contype, resource, creator, key, socket, callback) {
	getCon(contype, resource, function() {
		connection.query('DELETE FROM users_challenges WHERE creator = ? AND gamekey = ? AND username = ?', 
		[creator, key, socket.username], function(err, rows, fields) {
			callback();
		});
	});
}

exports.createChallenge = function(contype, resource, socket, invited, callback) {
	getCon(contype, resource, function(connection) {
		// Check that the user exists
		connection.query('SELECT user from users WHERE user = ?', 
		[invited],
		function(err, rows, fields) {
			if (typeof rows != "undefined" && typeof rows[0] != "undefined") {
				connection.query('SELECT MAX(gamekey) AS lastkey FROM users_challenges WHERE username = ? AND challenger = ?',
				[socket.username, socket.username], function(err, rows, fields) {
					if (err) throw err;
					// if no entries exist, the id will be 0
					var id = 0;
					if (typeof rows != "undefined" && typeof rows[0] != "undefined") {
						id = rows[0].lastkey + 1;
					}
					connection.query('INSERT INTO users_challenges (username, challenger, gamekey, status) VALUES (?, ?, ?, ?), (?, ?, ?, ?)', 
					[socket.username, socket.username, id, GAME_CREATOR, invited, socket.username, id, GAME_INVITED],
					function(err, rows, fields) {
						if (err) throw err;
						callback(id);
					});
				});
			} else {
				connection.end();
			}
		});
	});
}

exports.addInvite = function(contype, resource, creator, key, username, callback) {
	// check that the user exists
	getCon(contype, resource, function(connection) {
		connection.query('SELECT username from users WHERE username = ?', 
						[user], function(err, rows, fields) {
			if (typeof rows != "undefined" && typeof rows[0] != "undefined") {
				connection.query('INSERT INTO users_challenges (username, challenger, gamekey, status) VALUES (?, ?, ?, ?)', 
								[username, creator, key, GAME_INVITED],
								function(err, rows, fields) {
					callback();
						
				});
			} else {
				connection.end();
			}
		});
	});
}

exports.closeGame = function(contype, resource, creator, key, callback) {
	getCon(contype, resource, function(connection) {
		connection.query('DELETE FROM users_challenges WHERE challenger = ? AND gamekey = ?', 
		[creator, key],
		function(err, rows, fields) {
			callback();
		});
	});
}

exports.cancelInvitation = function(contype, resource, socket, creator, key, username, callback) {
	getCon(contype, resource, function(connection) {
		connection.query('DELETE FROM users_challenges WHERE username = ? AND challenger = ? AND gamekey = ?', 
		[username, socket.username, key],
		function(err, rows, fields) {
			callback();
		});
	});
}

exports.cancelParticipation = function(contype, resource, users, creator, key, username, callback) {
	getCon(contype, resource, function(connection) {
		connection.query('SELECT username FROM users_challenges WHERE challenger = ? AND gamekey = ? WHERE username NOT IN (?, ?)', 
		[creator, key, socket.username, creator], function(err, rows, fields) {
			for (var i=0; i<rows.length; i++) {
				users[rows[i].username].emit("challengeCancelled", creator, key, username);
			}
			callback();
		});
	});
}

// User leaves a game they had already joined
// delete data from db
exports.deleteParticipationEntry = function(contype, resource, creator, key, username, callback) {
	getCon(contype, resource, function (connection) {
		connection.query('DELETE FROM users_challenges WHERE creator = ? AND gamekey = ? AND username = ?', 
					[creator, key, username], function(err, rows, fields) {
			callback();
		});
	});
}

exports.sendPending = function(contype, resource, socket, callback) {
	getCon(contype, resource, function(connection) {
		connection.query('SELECT challenger, gamekey, status FROM users_challenges WHERE username = ?', 
		[socket.username],
		function(err, rows, fields) {
			if (err) throw err;
			if (typeof rows != "undefined" && typeof rows[0] != "undefined") {
				for (var i=0; i<rows.length; i++) {
					if (rows[i].status == GAME_INVITED) {
						exports.getChallengeData(contype, resource, rows[i].challenger, rows[i].gamekey, rows[i].status, function(creator, key, status, data) {
							socket.emit("pendingChallenge", {creator: creator, 
																key: key,
																participants: data.participants});
							if (typeof (socket.games[creator]) == "undefined") {
								socket.games[creator] = [];
							}
							socket.games[creator][key] = {status: GAME_INVITED};
						});
					} else if (rows[i].status == GAME_JOINED
							|| rows[i].status == GAME_CREATOR) {
						exports.getChallengeData(contype, resource, rows[i].challenger, rows[i].gamekey, rows[i].status, function(creator, key, status, data) {	
							if (typeof (socket.games[socket.username]) == "undefined") {
								socket.games[socket.username] = [];
							}
							socket.games[socket.username][key] = {participants: data.participants};
							if (status == GAME_CREATOR) {
								socket.games[socket.username][key].status = GAME_CREATOR;
								socket.games[socket.username][key].invited = data.invited;
							} else {
								socket.games[socket.username][key].status = GAME_INVITED;
							}
							
							socket.join(getGameRoomName(creator, key));
							socket.channels[getGameRoomName(creator, key)] = true;
							
							data.creator = creator;
							data.key = key;
							socket.emit("ongoingChallenge", data);
							callback();
						});
					}
				}
			} else {
				connection.end();
			}
		});
	});
}

// function that forwards resouce as mysql connection
// closes the connection after doing original callback
getCon = function(contype, resource, callback) {
	if (contype == "pool") {
		resource.getConnection(function(err, con) {
			if (err && err.code == 'ECONNREFUSED') {
				// do not continue after this
			} else if (err) {
				throw err;
			} else {
				callback(con);
			}
		});
	} else {
		// it is a connection already
		callback(resource);
	}
}
exports.getCon = getCon;