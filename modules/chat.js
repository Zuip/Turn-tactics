var users = {};
var cookie = require('cookie');

// Private channel prefix
var PRIVATE_CHANNEL = true;
var PRIVATE_CHANNEL_SEPARATOR = "!";

// Game statuses
var GAME_CLOSED = 0;
var GAME_FIRSTINVITE = 1;
var GAME_INVITING = 2;
var GAME_INVITED = 3;
var GAME_JOINED = 4;

getUser = function(socket) {
	var data = {username: socket.username};
	return data;
}

getUserList = function(io, channel) {
	var userList = {};
	io.clients(channel).forEach(function (socket) {
		var user = getUser(socket);
		userList[user.username] = user;
	});
	return userList;
}

getGameUserList = function(creator, key) {
	return users[creator].games[creator][key].participants;
}

isUserOnChannel = function(socket, channel) {
	if (typeof socket.channels[channel] != "undefined"
		&& socket.channels[channel] == true) {
		return true;
	}
	return false;
}

// Creates unique name for game room to avoid name collisions
getGameRoomName = function(creator, key) {
	return PRIVATE_CHANNEL_SEPARATOR + creator + PRIVATE_CHANNEL_SEPARATOR + key;
}

// Closes games and informs all participants and invited
closeGame = function(creator, key, confirm) {
	// Send cancel message to all participants
	for (user in users[creator].games[creator][key].participants) {
		users[users[creator].games[creator][key].participants[user]].emit("challengeClosed", creator, key);
		delete users[users[creator].games[creator][key].participants[user]].games[creator][key];
	}
	// Also send cancel message to people who were being invited
	for (user in users[creator].games[creator][key].invited) {
		users[users[creator].games[creator][key].invited[user]].emit("invitationCancelled", creator, key);
		delete users[users[creator].games[creator][key].invited[user]].games[creator][key];
	}
	delete users[creator].games[creator][key];
	if (confirm == true) {
		users[creator].emit("challengeCloseSuccessful", key);
	}
}

// Removes an user from a game that they already joined
cancelParticipation = function(creator, key, username, confirmation) {
	// send information to game creator and other participants
	users[creator].emit("challengeCancelled", creator, key, username);
	for (user in users[creator].games[creator][key].participants) {
		if (users[creator].games[creator][key].participants[user] != username) {
			users[users[creator].games[creator][key].participants[user]].emit("challengeCancelled", creator, key, username);
		}
	}
	// remove the user from participants
	var index = users[creator].games[creator][key].participants.indexOf(username);
	users[creator].games[creator][key].participants.splice(index, 1);
	// delete status for user
	delete users[username].games[creator][key];
	// send confirmation to the participant
	if (confirmation == true) {
		users[username].emit("cancelSuccessful", creator, key);
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

module.exports = function(io, pool) {

	var chat = io.of('/chat');

	io.set('authorization', function (handshakeData, accept) {
	
		if (typeof handshakeData.headers.cookie != "undefined") {
			handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);
			if (typeof handshakeData.cookie.session != "undefined") {
				pool.getConnection(function(err, connection) {
					if (err) throw err;
					connection.query('SELECT user FROM users WHERE sessionid = ?', 
					[handshakeData.cookie.session],
					function(err, rows, fields) {
						if (err) throw err;
						if (typeof rows[0] != "undefined") {
							handshakeData.username = rows[0].user;
							return accept(null, true);
						}
					});
					connection.end();
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
		socket.games = {};
		socket.channels = {};
		users[socket.username] = socket;
		socket.emit('username', socket.username);
		
		socket.on('joinChannel', function(channel) {
			if (channel != "" && channel.substr(0, 1) != PRIVATE_CHANNEL_SEPARATOR
			&& !isUserOnChannel(socket, channel)) { // there could be other channels too to check
				socket.broadcast.to(channel).emit('userJoin', channel, getUser(socket));
				socket.join(channel);
				socket.emit('channelJoinSuccessful', channel);
				socket.emit('userList', channel, getUserList(chat, channel));
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
					socket.broadcast.to(channel).emit('chatMessage', channel, getUser(socket), message);
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
				socket.broadcast.to(channel).emit('gameMessage', creator, key, getUser(socket), message);
			}
		});
		
		socket.on('createChallenge', function(channel, invited) {
			//Todo: check that the user is actually on the channel the challenge was sent from
			// also check if the challenge has already been sent
			if (typeof users[invited] != "undefined" && users[invited].id != socket.id) {
				if (typeof (socket.games[socket.username]) == "undefined") {
					socket.games[socket.username] = [];
				}
				socket.games[socket.username].push({status: GAME_FIRSTINVITE, invited: [],
													participants: []});
				var key = socket.games[socket.username].length - 1;
				if (typeof (users[invited].games[socket.username]) == "undefined") {
					users[invited].games[socket.username] = [];
				}
				users[socket.username].games[socket.username][key].invited.push(invited);
				users[invited].games[socket.username][key] = {status: GAME_INVITED};
				socket.emit('challengeCreated', invited, key);
				var gameChannel = getGameRoomName(socket.username, key);
				socket.join(gameChannel);
				socket.channels[gameChannel] = true;
				users[invited].emit("newChallenge", channel, socket.username, key);
			}
		});
		socket.on('inviteToExistingChallenge', function(channel, user, key) {
			//Todo: check that the user is actually on the channel the challenge was sent from
			// also check if the challenge has already been sent
			if (typeof users[user] != "undefined" && users[user].id != socket.id) {
				if (typeof(users[user].games[socket.username]) == "undefined") {
					users[user].games[socket.username] = [];
				}
				users[socket.username].games[socket.username][key].invited.push(user);
				users[user].games[socket.username][key] = {id: key, status: GAME_INVITED};
				users[user].emit("newChallenge", channel, socket.username, key);
			}
		});
		socket.on('acceptChallenge', function(creator, key) {
			// Check that the challenge has actually been sent in order to prevent faking accept
			if (typeof users[creator] != "undefined" && users[creator].id != socket.id
			&& getGameStatus(socket.games, creator, key) == GAME_INVITED 
			&& (getGameStatus(users[creator].games, creator, key) == GAME_FIRSTINVITE 
				|| getGameStatus(users[creator].games, creator, key) == GAME_INVITING)) {
				// Inform creator and all existing participants
				users[creator].emit("challengeAccepted", creator, key, socket.username);
				for (user in users[creator].games[creator][key].participants) {
					users[users[creator].games[creator][key].participants[user]].emit("challengeAccepted", creator, key, socket.username);
				}
				// Remove user from invited
				var index = users[creator].games[creator][key].invited.indexOf(socket.username);
				users[creator].games[creator][key].invited.splice(index, 1);
				// Update game information for creator
				users[creator].games[creator][key].status = GAME_INVITING;
				users[creator].games[creator][key].participants.push(socket.username);
				// Update participant status
				socket.games[creator][key].status = GAME_JOINED;
				// Join game's chatroom
				socket.join(getGameRoomName(creator, key));
				socket.channels[getGameRoomName(creator, key)] = true;
				// Send challenge data to user who joined
				var data = { participants: getGameUserList(creator, key) }
				socket.emit("challengeData", users[creator].username, key, data);
			}
		});
		socket.on('refuseChallenge', function(creator, key) {
			// Check that the challenged existed to prevent refuse spam
			if (typeof users[creator] != "undefined" && users[creator].id != socket.id
			&& getGameStatus(socket.games, creator, key) == GAME_INVITED
			&& (getGameStatus(users[creator].games, creator, key) == GAME_FIRSTINVITE 
				|| getGameStatus(users[creator].games, creator, key) == GAME_INVITING)) {
				users[creator].emit("challengeRefused", socket.username, key);
				// remove the user from the invited list
				var index = users[creator].games[creator][key].invited.indexOf(socket.username);
				users[creator].games[creator][key].invited.splice(index, 1);
				// remove status for the user
				delete users[socket.username].games[creator][key];
			}
		});
		// Game creator cancelled invitation for one user
		socket.on('cancelInvitation', function(invited, key) {
			if (typeof users[invited] != "undefined" && users[invited].id != socket.id
			&& (getGameStatus(users[invited].games, socket.username, key) == GAME_INVITED
				|| getGameStatus(users[invited].games, socket.username, key) == GAME_JOINED)
			&& (getGameStatus(socket.games, socket.username, key) == GAME_FIRSTINVITE 
				|| getGameStatus(socket.games, socket.username, key) == GAME_INVITING)) {
				if (getGameStatus(users[invited].games, socket.username, key) == GAME_JOINED) {
					// remove the user from participants
					var index = users[socket.username].games[socket.username][key].participants.indexOf(invited);
					users[socket.username].games[socket.username][key].participants.splice(index, 1);
					// leave game chatroom
					users[socket.username].leave(getGameRoomName(socket.username, key));
					users[socket.username].channels[getGameRoomName(socket.username, key)] = false;
				} else if (getGameStatus(users[invited].games, socket.username, key) == GAME_INVITED) {
					// remove the user from the invited list
					var index = users[socket.username].games[socket.username][key].invited.indexOf(invited);
					users[socket.username].games[socket.username][key].invited.splice(index, 1);
				}
				// remove the status for invited user
				delete users[invited].games[socket.username][key];
				users[invited].emit("invitationCancelled", socket.username, key);
			}
		});
		// One of the participants cancelled
		socket.on('cancelChallenge', function(creator, key) {
			// Check that the challenge exists to prevent cancel spam
			if (typeof users[creator] != "undefined" && users[creator].id != socket.id
			&& getGameStatus(users[creator].games, creator, key) == GAME_INVITING
			&& getGameStatus(socket.games, creator, key) == GAME_JOINED) {
				cancelParticipation(creator, key, socket.username, true);
				users[socket.username].leave(getGameRoomName(creator, key));
				users[socket.username].channels[getGameRoomName(creator, key)] = false;
			}
		});
		// Game creator closed the game
		socket.on('closeChallenge', function(key) {
			if (typeof socket.games[socket.username] != "undefined" 
			&& typeof socket.games[socket.username][key] != "undefined") {
				closeGame(socket.username, key, true);
			}
		});
		
		socket.on('disconnect', function() {
			// close all created games
			for (game in socket.games[socket.username]) {
				closeGame(socket.username, game, false);
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
			delete socket.games;
			// send disconnect message to all channels
			for (channel in socket.channels) {
				socket.leave(channel);
				socket.broadcast.to(channel).emit('userDisconnect', channel, getUser(socket));
			}
			delete users[socket.username];
		});
	});
	return io;

};