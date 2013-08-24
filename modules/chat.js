/* Sanep 2013 */

var users = {};
var cookie = require('cookie');

// load submodules
var local = require('./chat.local');
var db = require('./chat.db');
var dbutils = require('./dbutils');

/* Should challenges and participants persist in database so that
 * the challenges, invited and participants remain although users disconnect? 
 * This doesn't have effect on ready games db entries, which are always created */
var PERSIST_DATA = false;
// Should the user be online when they are invited to a game?
var REQUIRE_INVITED_ONLINE = true;
var MAX_USERS_PER_GAME = 4;
var MAX_GAMES_CREATED_PER_USER = 2;

// Private channel prefix
var PRIVATE_CHANNEL = true;
var PRIVATE_CHANNEL_SEPARATOR = "!";

// Game statuses
var GAME_CLOSED = 0;
var GAME_CREATOR = 1;
var GAME_INVITED = 2;
var GAME_JOINED = 3;

// gets all challenge data
getChallengeData = function(contype, resource, creator, key, callback) {
	if (typeof users[creator] != "undefined") {
		var data = local.getChallengeData(users, creator, key);
		callback(data);
	} else if (PERSIST_DATA) {
		db.getChallengeData(contype, resource, creator, key, function(data) {
			callback(data);
		});
	}
}

isUserOnChannel = function(socket, channel) {
	if (typeof socket.channels[channel] != "undefined"
		&& socket.channels[channel] == true) {
		return true;
	}
	return false;
}

doesGameExist = function(contype, resource, creator, key, callback) {
	if (typeof users[creator] != "undefined") {
		var result = local.doesGameExist(users, creator, key);
		callback(result);
	} else if (PERSIST_DATA) {
		db.doesGameExist(contype, resource, creator, key, function(result) {
			callback(result);
		});
	} else {
		callback(false);
	}
}

doesParticipantExist = function(contype, resource, socket, creator, key, username, callback) {
	if (typeof users[username] != "undefined") {
		local.doesParticipantExist(users, creator, key, username, function(isValid, status) {
			callback(isValid, status);
		});
	} else if (PERSIST_DATA) {
		db.doesParticipantExist(contype, resource, creator, key, username, function(result, status) {
			callback(result, status);
		});
	} else {
		callback(false);
	}
}

sendChallengeAccept = function(contype, resource, creator, key, socket, callback) {
	if (typeof users[creator] != "undefined") {
		local.sendChallengeAccept(users, creator, key, socket);
		callback();
	} else if (PERSIST_DATA) {
		db.sendChallengeAccept(contype, resource, users, creator, key, socket, function() {
			callback();
		});
	} else if (contype != "pool") {
		resource.end();
	}
}

sendChallengeData = function(contype, resource, creator, key, socket) {
	// Send challenge data to user who joined
	getChallengeData(contype, resource, creator, key, function(data) {
		socket.emit("challengeData", creator, key, data);
	});
}

// Closes games and informs all participants and invited
closeGame = function(contype, resource, creator, key, confirm) {
	if (PERSIST_DATA) {
		db.closeGame(contype, resource, creator, key, function() {
			local.closeGame(users, creator, key, confirm);
		});
	} else {
		local.closeGame(users, creator, key, confirm);
	}
}

// Removes an user from a game that they already joined
cancelParticipation = function(contype, resource, creator, key, username, confirmation) {
	if (typeof users[creator] != "undefined") {
		local.cancelParticipation(users, creator, key, username, confirmation);
	} else if (PERSIST_DATA) {
		db.cancelParticipation(contype, resource, users, creator, key, username, function() {
			local.cancelParticipation(users, creator, key, username, confirmation);
		});
	}
}

refuseChallenge = function(contype, resource, socket, creator, key) {
	if (PERSIST_DATA) {
		db.refuseChallenge(contype, resource, creator, key, socket, function() {
			if (typeof users[creator] != "undefined") {
				local.refuseChallenge(creator, key, socket);
			}
		});
	} else {
		local.refuseChallenge(creator, key, socket);
	}
}

acceptChallenge = function(contype, resource, creator, key, socket, callback) {
	if (PERSIST_DATA) {
		db.acceptChallenge(contype, resource, creator, key, socket, function() {
			local.acceptChallenge(users, creator, key, socket);
			callback();
		});
	} else {
		local.acceptChallenge(users, creator, key, socket);
		callback();
	}
}

// helper function to check game status for a player
getGameStatus = function(games, user, key) {
	if (typeof(games[user]) != "undefined") {
		if (typeof(games[user][key]) != "undefined") {
			return games[user][key].status;
		}
	}
	return 0;
}

// Creates unique name for game room to avoid name collisions
getGameRoomName = function(creator, key) {
	return PRIVATE_CHANNEL_SEPARATOR + creator + PRIVATE_CHANNEL_SEPARATOR + key;
}

module.exports = function(io, pool) {

	var chat = io.of('/chat');
	io.set('authorization', function (handshakeData, accept) {
	
		if (typeof handshakeData.headers.cookie != "undefined") {
			handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);
			if (typeof handshakeData.cookie.session != "undefined") {
				pool.getConnection(function(err, connection) {
					if (err && err.code == 'ECONNREFUSED') {
						return accept(null, false);
					} else if (err) {
						throw err;
					} else {
						connection.query('SELECT user, userlevel FROM users WHERE sessionid = ?', 
						[handshakeData.cookie.session],
						function(err, rows, fields) {
							if (err) throw err;
							if (typeof rows != "undefiend" && typeof rows[0] != "undefined") {
								handshakeData.username = rows[0].user;
								handshakeData.userlevel = rows[0].userlevel;
								return accept(null, true);
							}
						});
						connection.end();
					}
				});
			} else {
				return accept('Not logged in', false);
			}
		} else {
			return accept('Not logged in', false);
		}
	});

	chat.on('connection', function(socket) {
		socket.username = socket.handshake.username;
		socket.userlevel = socket.handshake.userlevel;
		socket.games = {};
		socket.channels = {};
		socket.numGames = 0;
		socket.emit('serverinfo', {username: socket.username, userlevel: socket.userlevel, 
						game_playermax: MAX_USERS_PER_GAME, 
						user_maxgamescreated: MAX_GAMES_CREATED_PER_USER, 
						persist: PERSIST_DATA});
		
		socket.on('joinChannel', function(channel) {
			if (channel != "" && channel.substr(0, 1) != PRIVATE_CHANNEL_SEPARATOR
			&& !isUserOnChannel(socket, channel)) { // there could be other channels too to check
				socket.broadcast.to(channel).emit('userJoin', channel, local.getUser(socket));
				socket.join(channel);
				socket.emit('channelJoinSuccessful', channel);
				socket.emit('userList', channel, local.getUserList(chat, channel));
				socket.channels[channel] = true;
			} else {
				// Tell user that they can't join on this channel
				socket.emit('cannotJoinChannel', channel);
			}
		});
		
		socket.on('leaveChannel', function(channel) {
			if (isUserOnChannel(socket, channel)) {
				socket.emit('channelLeft', channel);
				socket.leave(channel);
				socket.broadcast.to(channel).emit('userLeave', channel, getUser(socket));
				socket.channels[channel] = false;
			}
		});
		
		socket.on('sendMessage', function(channel, message) {
			var hasPrivateChannelPrefix = (channel.substr(0, 1) == PRIVATE_CHANNEL_SEPARATOR);
			if (!hasPrivateChannelPrefix && isUserOnChannel(socket, channel)) {
				if (channel == "") {
					// not allowed
					socket.emit('messageDelivered', channel, false);
				} else {
					socket.emit('messageDelivered', channel, true);
					socket.broadcast.to(channel).emit('chatMessage', channel, local.getUser(socket), message);
				}
			} else {
				// not on channel
				socket.emit('notOnChannel', channel);
			}
		});
		
		socket.on('gameMessage', function(creator, key, message) {
			var channel = getGameRoomName(creator, key);
			if (isUserOnChannel(socket, channel)) {
				socket.emit('gameMessageDelivered', creator, key);
				socket.broadcast.to(channel).emit('gameMessage', creator, key, local.getUser(socket), message);
			}
		});
		
		socket.on('createChallenge', function(channel, invited) {
			//Todo: check that the user is actually on the channel the challenge was sent from
			// also check if the challenge has already been sent
			
			if (typeof (socket.games[socket.username]) == "undefined") {
				socket.games[socket.username] = [];
			}
			if (socket.numGames < MAX_GAMES_CREATED_PER_USER
			&& invited != socket.username) {
				if (PERSIST_DATA) {
					dbutils.getCon("pool", pool, function(connection) {
						db.createChallenge("con", connection, socket, invited, function(id) {
							local.createChallenge(users, socket, invited, id);
							connection.end();
						});
					});
				} else if (typeof users[invited] != "undefined") {
					// if the challenge is not saved to db, the user has to be online
					var id = socket.games[socket.username].length;
					local.createChallenge(users, socket, invited, id, channel);
				}
			}
		});
		
		socket.on('inviteToExistingChallenge', function(channel, user, key) {
			var isOnline = typeof users[user] != "undefined";
			var playerAmount = socket.games[socket.username][key].invited.length +
								Object.keys(socket.games[socket.username][key].participants).length + 1;
			if (playerAmount < MAX_USERS_PER_GAME) {
				if (REQUIRE_INVITED_ONLINE && isOnline) {
					if (isOnline && user != socket.username) {
						if (PERSIST_DATA) {
							dbutils.getCon("pool", pool, function(connection) {
								db.addInvite("con", connection, socket.username, key, user, function() {
									local.addInvite(users, channel, socket.username, key, user);
									socket.emit("inviteStatus", user, key, true);
									connection.end();
								});
							});
						} else {
							local.addInvite(users, channel, socket.username, key, user);
							socket.emit("inviteStatus", user, key, true);
						}
					}
				} else if (!REQUIRE_INVITED_ONLINE && !isOnline && PERSIST_DATA) {
					dbutils.getCon("pool", pool, function(connection) {
						db.addInvite("con", connection, socket.username, key, user, function() {
							users[socket.username].games[socket.username][key].invited.push(user);
							socket.emit("inviteStatus", user, key, true);
							connection.end();
						});
					});
				}
			}
		});
		
		socket.on('acceptChallenge', function(creator, key) {
			dbutils.getCon("pool", pool, function(connection) {
				doesGameExist("con", connection, creator, key, function(success) {
					// Check that the challenge has actually been sent in order to prevent faking accept
					if (success && getGameStatus(socket.games, creator, key) == GAME_INVITED) {
						acceptChallenge("con", connection, creator, key, socket, function() {
							sendChallengeAccept("con", connection, creator, key, socket, function() {
								sendChallengeData("con", connection, creator, key, socket);
								connection.end();
							});
						});
					}
				});
			});
		});
		
		socket.on('refuseChallenge', function(creator, key) {
			dbutils.getCon("pool", pool, function(connection) {
				doesGameExist("con", connection, creator, key, function(success) {
					if (success == true && getGameStatus(socket.games, creator, key) == GAME_INVITED) {
						refuseChallenge("con", connection, socket, creator, key);
						connection.end();
					}
				});
			});
		});
		
		// Game creator cancelled invitation for one user
		socket.on('cancelInvitation', function(invited, key) {
			var creator = socket.username;
			dbutils.getCon("pool", pool, function(connection) {
				doesGameExist("con", connection, creator, key, function(gameExists) {
					if (gameExists) {
						doesParticipantExist("con", connection, socket, creator, key, invited, function(success, status) {
							if (success) {
								if (PERSIST_DATA) {
									db.cancelInvitation("con", connection, socket, creator, key, invited, function() {
										local.cancelInvitation(users, socket, key, invited, status);
										connection.end();
									});
								} else {
									local.cancelInvitation(users, socket, key, invited, status);
								}
							}
						});
					}
				});
			});
		});
		
		// One of the participants cancelled
		socket.on('cancelChallenge', function(creator, key) {
			dbutils.getCon("pool", pool, function(connection) {
				doesGameExist("con", connection, creator, key, function(gameExists) {
					if (gameExists) {
						if (getGameStatus(socket.games, creator, key) == GAME_JOINED) {
							cancelParticipation("con", connection, creator, key, socket.username, true);
							connection.end();
						}
					}
				});
			});
		});
		
		// Game creator closed the game
		socket.on('closeChallenge', function(key) {
			if (typeof socket.games[socket.username] != "undefined" 
			&& typeof socket.games[socket.username][key] != "undefined") {
				if (PERSIST_DATA) {
					dbutils.getCon("pool", pool, function(connection) {
						closeGame("con", connection, socket.username, key, true);
						connection.end();
					});
				} else {
					closeGame(null, null, socket.username, key, true);
				}
			}
		});
		
		socket.on('disconnect', function() {
			if (!PERSIST_DATA) {
				// close all created games
				for (game in socket.games[socket.username]) {
					closeGame(null, null, socket.username, game, false);
				}
			
				delete socket.games[socket.username];
				// send cancel message to all games joined
				for (username in socket.games) {
					if (username != socket.username) {
						for (key in socket.games[username]) {
							if (getGameStatus(socket.games, username, key) == GAME_JOINED) {
								cancelParticipation(username, key, socket.username, true);
							} else if (getGameStatus(socket.games, username, key) == GAME_INVITED) {
								// Remove user from invited list
								var index = users[username].games[username][key].invited.indexOf(socket.username);
								users[username].games[username][key].invited.splice(index, 1);
								// Inform the game creator
								users[username].emit("challengeRefused", socket.username, key);
							}
						}
					}
				}
			} else {
				//TODO: send challengeinfo update?
			}
			delete socket.games;
			
			// send disconnect message to all channels
			for (channel in socket.channels) {
				socket.leave(channel);
				socket.broadcast.to(channel).emit('userDisconnect', channel, local.getUser(socket));
			}
			delete users[socket.username];
		});
		
		/* initialize this variable here to minimize the chances of scenario where 
		 * a user gets challenge data that has already expired */
		users[socket.username] = socket;
		// on beginning of connection, send the pending invites/challenges if persist mode is enabled
		if (PERSIST_DATA) {
			dbutils.getCon("pool", pool, function(connection) {
				db.sendPending("con", connection, socket, function() {
					connection.end();
				});
			});
		}
	});
	return io;

};