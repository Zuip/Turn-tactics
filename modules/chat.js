var users = {};
var cookie = require('cookie');

getUser = function(socket) {
	var data = {username: socket.username};
	return data;
}

getUserList = function(io, channel) {
	var userList = {};
	io.sockets.clients(channel).forEach(function (socket) {
		var user = getUser(socket);
		userList[user.username] = user;
	});
	return userList;
}

isUserOnChannel = function(io, user, channel) {
	io.sockets.clients(channel).forEach(function (socket) { 
		if (socket.id == user.id) {
			return true;
		}
	});
	return false;
}

getGameStatus = function(games, user, key) {
	if (typeof(games[user]) != "undefined") {
		if (typeof(games[user][key]) != "undefined") {
			return games[user][key].status;
		}
	}
	return 0;
}

// Game statuses
var GAME_CLOSED = 0;
var GAME_FIRSTINVITE = 1;
var GAME_INVITING = 2;
var GAME_INVITED = 3;
var GAME_JOINED = 4;

module.exports = function(io, pool) {

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

	io.sockets.on('connection', function(socket) {
		socket.username = socket.handshake.username;
		socket.games = {};
		users[socket.username] = socket;
		socket.emit('username', socket.username);
		
		socket.on('joinChannel', function(channel) {
			if (true) { // todo: check if user can join this channel
				socket.broadcast.to(channel).emit('userJoin', channel, getUser(socket));
				socket.join(channel);
				socket.emit('channelJoinSuccessful', channel, socket.username);
				socket.emit('userList', channel, getUserList(io, channel));
				socket.channels = {};
				socket.channels[channel] = true;
			} else {
				// Tell user that they can't join on this channel
				socket.emit('cannotJoinChannel', channel);
			}
		});
		socket.on('leaveChannel', function(channel) {
			if (isUserOnChannel(io, socket, channel)) {
				socket.emit('channelLeft', channel);
				socket.leave(channel);
				socket.broadcast.to(channel).emit('userLeave', channel, getUser(socket));
				socket.channels[channel] = false;
			}
		});
		socket.on('sendMessage', function(channel, message) {
			if (true) { // check if user is on the channel
				if (channel == "") {
					// not allowed
					socket.emit('messageDelivered', channel, false);
				} else {
					socket.emit('messageDelivered', channel, true);
					socket.broadcast.to(channel).emit('chatMessage', channel, getUser(socket), message);
				}
			} else {
				// not on channel
				socket.emit('notOnChannel', { channel: channel });
			}
		});
		socket.on('createChallenge', function(channel, invited) {
			//Todo: check that the user is actually on the channel the challenge was sent from
			// also check if the challenge has already been sent
			if (typeof users[invited] != "undefined" && users[invited].id != socket.id) {
				if (typeof (socket.games[socket.username]) == "undefined") {
					socket.games[socket.username] = [];
				}
				socket.games[socket.username].push({status: GAME_FIRSTINVITE, participants: []});
				var key = socket.games[socket.username].length - 1;
				if (typeof (users[invited].games[socket.username]) == "undefined") {
					users[invited].games[socket.username] = [];
				}
				users[invited].games[socket.username][key] = {status: GAME_INVITED};
				socket.emit('challengeCreated', invited, key);
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
				users[creator].emit("challengeAccepted", socket.username, key);
				socket.emit("chooseChallengeOptions", users[creator].username, key);
				// Update game information for creator
				users[creator].games[creator][key].status = GAME_INVITING;
				users[creator].games[creator][key].participants.push(socket.username);
				// Update participant status
				socket.games[creator][key].status = GAME_JOINED;
			}
		});
		socket.on('refuseChallenge', function(creator, key) {
			// Check that the challenged existed to prevent refuse spam
			if (typeof users[creator] != "undefined" && users[creator].id != socket.id
			&& getGameStatus(socket.games, creator, key) == GAME_INVITED
			&& (getGameStatus(users[creator].games, creator, key) == GAME_FIRSTINVITE 
				|| getGameStatus(users[creator].games, creator, key) == GAME_INVITING)) {
				users[creator].emit("challengeRefused", socket.username, key);
			}
		});
		// Game creator cancelled invitation for one user
		socket.on('cancelInvitation', function(invited, key) {
			if (typeof users[invited] != "undefined" && users[invited].id != socket.id
			&& (getGameStatus(users[invited].games, socket.username, key) == GAME_INVITED
				|| getGameStatus(users[invited].games, socket.username, key) == GAME_JOINED)
			&& (getGameStatus(socket.games, socket.username, key) == GAME_FIRSTINVITE 
				|| getGameStatus(socket.games, socket.username, key) == GAME_INVITING)) {
				// remove the user from participants
				var index = users[socket.username].games[socket.username][key].participants.indexOf(invited);
				users[socket.username].games[socket.username][key].participants.splice(index, 1);
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
				// send information to author
				users[creator].emit("challengeCancelled", socket.username, key);
				// remove the user from participants
				var index = users[creator].games[creator][key].participants.indexOf(socket.username);
				users[creator].games[creator][key].participants.splice(index, 1);
				// send confirmation to the participant
				socket.games[creator].status = GAME_CLOSED;
				socket.emit("cancelSuccessful", creator, key);
			}
		});
		// Game creator closed the game
		socket.on('closeChallenge', function(key) {
			// Send cancel message to all participants
			for (user in socket.games[socket.username][key].participants) {
				users[socket.games[socket.username][key].participants[user]].emit("challengeClosed", socket.username, key);
			}
			delete socket.games[socket.username][key];
			socket.emit("challengeCloseSuccessful", key);
		});
		
		socket.on('disconnect', function() {
			for (channel in socket.channels) {
				socket.leave(channel);
				socket.broadcast.to(channel).emit('userDisconnect', channel, getUser(socket));
			}
			delete users[socket.username];
		});
	});
	return io;

};