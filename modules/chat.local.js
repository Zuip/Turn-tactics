// Game statuses
var GAME_CLOSED = 0;
var GAME_CREATOR = 1;
var GAME_INVITED = 2;
var GAME_JOINED = 3;

var PRIVATE_CHANNEL_SEPARATOR = "!";

exports.doesGameExist = function(users, creator, key) {
	var isValid = (users[creator].games[creator] != "undefined") 
				&& (getGameStatus(users[creator].games, creator, key) == GAME_CREATOR);
	var isPublic = false;
	var numPlayers = 0;
	
	if (isValid) {
		isPublic = users[creator].games[creator][key].isPublic;
		numPlayers = 1;
		numPlayers = numPlayers + Object.keys(users[creator].games[creator][key].participants).length;
	}
	
	var result = {success: isValid, isPublic: isPublic, numPlayers: numPlayers};
	return result;
}

exports.acceptChallenge = function(users, creator, key, socket) {
	if (typeof users[creator] != "undefined") {
		// If user is in invite list, delete entry
		var index = users[creator].games[creator][key].invited.indexOf(socket.username);
		if (index != -1) {
			users[creator].games[creator][key].invited.splice(index, 1);
		}
		// Update game information for creator
		users[creator].games[creator][key].status = GAME_CREATOR;
		users[creator].games[creator][key].participants[socket.username] = {accepted: false};
	}
	// If user joins a public game, these entries won't exist beforehand
	if (typeof socket.games[creator] == "undefined") {
		socket.games[creator] = {};
	}
	if (typeof socket.games[creator][key] == "undefined") {
		socket.games[creator][key] = {};
	}
	// Update participant status
	socket.games[creator][key].status = GAME_JOINED;
	// Join game's chatroom
	socket.join(getGameRoomName(creator, key));
	socket.channels[getGameRoomName(creator, key)] = true;
}

exports.getChallengeData = function(users, creator, key) {
	return {participants: exports.getGameUserList(users, creator, key)};
}

exports.doesParticipantExist = function(users, creator, key, username, callback) {
	// if the user is in chat, db connection isn't needed
	var isValid = (users[username].games[creator] != "undefined") 
				&& (creator != username);
	var status = getGameStatus(users[username].games, creator, key);
	callback(isValid, status);
}

exports.sendChallengeAccept = function(users, creator, key, socket) {
	// Inform creator and all existing participants
	users[creator].emit("challengeAccepted", creator, key, socket.username);
	for (user in users[creator].games[creator][key].participants) {
		if (socket.username != user) {
			users[user].emit("challengeAccepted", creator, key, socket.username);
		}
	}
}

exports.refuseChallenge = function(users, creator, key, socket) {
	users[creator].emit("challengeRefused", socket.username, key);
	// remove the user from the invited list
	var index = users[creator].games[creator][key].invited.indexOf(socket.username);
	users[creator].games[creator][key].invited.splice(index, 1);
	// remove status for the user
	delete users[socket.username].games[creator][key];
}

exports.createChallenge = function(users, games, socket, invited, key, channel, isPublic) {
	socket.games[socket.username][key] = {status: GAME_CREATOR, invited: [],
										participants: {}, isPublic: isPublic};
	if (isPublic) {
		exports.createPublicGame(users, games, channel, socket.username, key);
		socket.games[socket.username][key].channel = channel;
		socket.emit('challengeCreated', null, key);
	} else if (typeof (users[invited].games[socket.username]) == "undefined"
	|| typeof (users[invited].games[socket.username][key]) == "undefined") {
		users[invited].games[socket.username] = [];
		users[socket.username].games[socket.username][key].invited.push(invited);
		users[invited].games[socket.username][key] = {status: GAME_INVITED};
		socket.emit('challengeCreated', invited, key);
		users[invited].emit("newChallenge", channel, socket.username, key);
	}
	socket.numGames += 1;
	
	var gameChannel = getGameRoomName(socket.username, key);
	socket.join(gameChannel);
	socket.channels[gameChannel] = true;
}

exports.setGameType = function(users, channel, creator, key, isPublic) {
	users[creator].games[creator][key].isPublic = isPublic;
	if (isPublic) {
		newPublicGame(users, channel, creator, key);
	} else {
		publicGameClosed(users, channel, creator, key);
	}
}

exports.createPublicGame = function(users, games, channel, creator, key) {
	if (typeof games[channel] == "undefined") {
		games[channel] = {};
	}
	if (typeof games[channel][creator] == "undefined") {
		games[channel][creator] = {};
	}
	games[channel][creator][key] = true;
	exports.newPublicGame(users, channel, creator, key);
}

exports.newPublicGame = function(users, channel, creator, key) {
	users[creator].broadcast.to(channel).emit('newPublicChallenge', channel, creator, key);
}

exports.publicGameClosed = function(users, channel, creator, key) {
	users[creator].broadcast.to(channel).emit('publicChallengeClosed', channel, creator, key);
}

exports.addInvite = function(users, channel, creator, key, user) {
	if (typeof(users[user].games[creator]) == "undefined") {
		users[user].games[creator] = [];
	}
	users[creator].games[creator][key].invited.push(user);
	users[user].games[creator][key] = {id: key, status: GAME_INVITED};
	users[user].emit("newChallenge", channel, creator, key);
}

exports.closeGame = function(users, games, creator, key, confirm) {
	users[creator].numGames -= 1;
	// If the game is a public game, send cancel message
	// also remove the game from public game list
	if (users[creator].games[creator][key].isPublic) {
		var channel = users[creator].games[creator][key].channel;
		exports.publicGameClosed(users, channel, creator, key);
		delete games[channel][creator][key];
	}
	
	// Send cancel message to all participants
	for (user in users[creator].games[creator][key].participants) {
		if (typeof users[user] != "undefined") {
			users[user].emit("challengeClosed", creator, key);
			if (typeof users[user].games[creator] != "undefined"
			&& delete users[user].games[creator][key] != "undefined") {
				delete users[user].games[creator][key];
			}
		}
	}
	// Also send cancel message to people who were being invited
	for (user in users[creator].games[creator][key].invited) {
		var invuser = users[creator].games[creator][key].invited[user];
		if (typeof users[invuser] != "undefined") {
			users[invuser].emit("invitationCancelled", creator, key);
			delete users[invuser].games[creator][key];
		}
	}
	delete users[creator].games[creator][key];
	if (confirm == true) {
		users[creator].emit("challengeCloseSuccessful", key);
	}
}

exports.cancelInvitation = function(users, socket, key, invited, status) {
	if (status == GAME_JOINED) {
		// remove the user from participants
		delete users[socket.username].games[socket.username][key].participants[invited];
		if (typeof users[invited] != "undefined") {
			// leave game chatroom
			users[invited].leave(getGameRoomName(socket.username, key));
			users[invited].channels[getGameRoomName(socket.username, key)] = false;
		}
	} else if (status == GAME_INVITED) {
		// remove the user from the invited list
		var index = users[socket.username].games[socket.username][key].invited.indexOf(invited);
		users[socket.username].games[socket.username][key].invited.splice(index, 1);
	}
	if (typeof users[invited] != "undefined") {
		// remove the status for invited user
		delete users[invited].games[socket.username][key];
		users[invited].emit("invitationCancelled", socket.username, key);
	}
}

// Removes an user from a game that they already joined
exports.cancelParticipation = function(users, creator, key, username, confirmation) {
	if (typeof users[creator] != "undefined") {
		// send cancel message to creator if online
		users[creator].emit("challengeCancelled", creator, key, username);
		for (user in users[creator].games[creator][key].participants) {
			if (user != username) {
				users[user].emit("challengeCancelled", creator, key, username);
			}
		}
		// remove the user from participants
		delete users[creator].games[creator][key].participants[username];
		// delete status for user
		delete users[username].games[creator][key];
	}
	// send confirmation to the participant
	if (confirmation == true) {
		users[username].emit("cancelSuccessful", creator, key);
	}
	users[username].leave(getGameRoomName(creator, key));
	users[username].channels[getGameRoomName(creator, key)] = false;
}

exports.getUserList = function(io, channel) {
	var userList = {};
	io.clients(channel).forEach(function (socket) {
		var user = exports.getUser(socket);
		userList[user.username] = user;
	});
	return userList;
}

exports.getUser = function(socket) {
	var data = {username: socket.username, userlevel: socket.userlevel };
	return data;
}

exports.getGameUserList = function(users, creator, key) {
	return users[creator].games[creator][key].participants;
}