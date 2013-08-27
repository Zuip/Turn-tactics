// Game statuses
var GAME_CLOSED = 0;
var GAME_CREATOR = 1;
var GAME_INVITED = 2;
var GAME_JOINED = 3;

var dbutils = require('./dbutils');

exports.doesGameExist = function(contype, resource, creator, key, callback) {
	dbutils.getCon(contype, resource, function(connection, err) {
		if (err) {
			return;
			callback(false);
		}
		
		var query = connection.query('SELECT COUNT(*) AS numPlayers FROM users_challenges WHERE challenger = ? AND gamekey = ?',
		[creator, key],
		function(err, rows, fields) {
			if (err) throw err;
			if (typeof rows[0] != "undefined") {
				callback(true, rows[0].numPlayers);
			} else {
				callback(false, 0);
			}
		});
	});
}

exports.acceptChallenge = function(contype, resource, creator, key, socket, callback) {
	dbutils.getCon(contype, resource, function(connection, err) {
		if (err) {
			return;
		}
		connection.query('UPDATE users_challenges SET status = ? WHERE username = ? AND challenger = ? AND gamekey = ?', 
							[GAME_JOINED, socket.username, creator, key],
							function(err, rows, fields) {
			if (err) throw err;
			callback();
		});
	});
}

exports.getChallengeData = function(contype, resource, creator, key, status, callback) {
	dbutils.getCon(contype, resource, function(connection, err) {
		if (err) {
			return;
		}
		
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
	dbutils.getCon(contype, resource, function(connection, err) {
		if (err) {
			return;
		}
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
	dbutils.getCon(contype, resource, function(connection, error) {
		if (error) {
			return;
		}
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
	dbutils.getCon(contype, resource, function(connection, error) {
		if (error) {
			return;
		}
		
		connection.query('SELECT username FROM users_challenges WHERE challenger = ? AND gamekey = ? AND username NOT IN (?, ?)', 
		[creator, key, socket.username, creator], function(err, rows, fields) {
			if (err) throw err;
			for (var i=0; i<rows.length; i++) {
				users[rows[i].username].emit("challengeAccepted", creator, key, socket.username);
			}
			callback();
		});
	});
}

exports.refuseChallenge = function(contype, resource, creator, key, socket, callback) {
	dbutils.getCon(contype, resource, function(connection, error) {
		if (error) {
			return;
		}
		
		connection.query('DELETE FROM users_challenges WHERE creator = ? AND gamekey = ? AND username = ?', 
		[creator, key, socket.username], function(err, rows, fields) {
			callback();
		});
	});
}

exports.createChallenge = function(contype, resource, socket, invited, callback) {
	dbutils.getCon(contype, resource, function(connection, error) {
		if (error) {
			return;
		}
		
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
	dbutils.getCon(contype, resource, function(connection, error) {
		if (error) {
			return;
		}
		
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
	dbutils.getCon(contype, resource, function(connection, error) {
		if (error) {
			return;
		}
		var q = connection.query('DELETE FROM users_challenges WHERE challenger = ? AND gamekey = ?', 
		[creator, key],
		function(err, rows, fields) {
			callback();
		});
	});
}

exports.cancelInvitation = function(contype, resource, socket, creator, key, username, callback) {
	dbutils.getCon(contype, resource, function(connection, error) {
		if (error) {
			return;
		}
		connection.query('DELETE FROM users_challenges WHERE username = ? AND challenger = ? AND gamekey = ?', 
		[username, socket.username, key],
		function(err, rows, fields) {
			callback();
		});
	});
}

exports.cancelParticipation = function(contype, resource, users, creator, key, username, callback) {
	dbutils.getCon(contype, resource, function(connection, error) {
		if (error) {
			return;
		}
		connection.query('SELECT username FROM users_challenges WHERE challenger = ? AND gamekey = ? AND username NOT IN (?, ?)', 
		[creator, key, username, creator], function(err, rows, fields) {
			for (var i=0; i<rows.length; i++) {
				users[rows[i].username].emit("challengeCancelled", creator, key, username);
			}
			exports.deleteParticipationEntry("con", connection, creator, key, username, function() {
				callback();
			});
		});
	});
}

// User leaves a game they had already joined
// delete data from db
exports.deleteParticipationEntry = function(contype, resource, creator, key, username, callback) {
	dbutils.getCon(contype, resource, function (connection, error) {
		
		if (error) {
			return;
		}
		connection.query('DELETE FROM users_challenges WHERE challenger = ? AND gamekey = ? AND username = ?', 
					[creator, key, username], function(err, rows, fields) {
			callback();
		});
	});
}

exports.sendPending = function(contype, resource, socket, callback) {
	dbutils.getCon(contype, resource, function(connection, error) {
		if (error) {
			return;
		}
		
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
								socket.games[creator] = {};
							}
							socket.games[creator][key] = {status: GAME_INVITED};
						});
					} else if (rows[i].status == GAME_JOINED
							|| rows[i].status == GAME_CREATOR) {
						exports.getChallengeData(contype, resource, rows[i].challenger, rows[i].gamekey, rows[i].status, function(creator, key, status, data) {	
							if (typeof (socket.games[creator]) == "undefined") {
								socket.games[creator] = {};
							}
							socket.games[creator][key] = {participants: data.participants};
							
							if (status == GAME_CREATOR) {
								socket.games[creator][key].status = GAME_CREATOR;
								socket.games[creator][key].invited = data.invited;
							} else {
								socket.games[creator][key].status = GAME_INVITED;
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
