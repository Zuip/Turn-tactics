// Game statuses
var GAME_CLOSED = 0;
var GAME_CREATOR = 1;
var GAME_INVITED = 2;
var GAME_JOINED = 3;

var PRIVATE_CHANNEL_SEPARATOR = "!";

exports.doesGameExist = function(users, creator, key) {
	var isValid = (users[creator].games[creator] != "undefined") 
				&& (getGameStatus(users[creator].games, creator, key) == GAME_CREATOR);
	return isValid;
}

exports.acceptChallenge = function(users, creator, key, socket) {
	if (typeof users[creator] != "undefined") {
		// Remove user from invited
		var index = users[creator].games[creator][key].invited.indexOf(socket.username);
		users[creator].games[creator][key].invited.splice(index, 1);
		// Update game information for creator
		users[creator].games[creator][key].status = GAME_CREATOR;
		users[creator].games[creator][key].participants[socket.username] = {accepted: false};
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
				&& (users[creator].id != socket.id);
	var status = getGameStatus(users[creator].games, creator, key)
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

exports.refuseChallenge = function(creator, key, socket) {
	users[creator].emit("challengeRefused", socket.username, key);
	// remove the user from the invited list
	var index = users[creator].games[creator][key].invited.indexOf(socket.username);
	users[creator].games[creator][key].invited.splice(index, 1);
	// remove status for the user
	delete users[socket.username].games[creator][key];
}

exports.createChallenge = function(users, socket, invited, key, channel) {
	socket.games[socket.username][key] = {status: GAME_CREATOR, invited: [],
										participants: {}};
	socket.numGames += 1;
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

exports.addInvite = function(users, creator, key, user) {
	if (typeof(users[user].games[creator]) == "undefined") {
		users[user].games[creator] = [];
	}
	users[creator].games[creator][key].invited.push(user);
	users[user].games[creator][key] = {id: key, status: GAME_INVITED};
	users[user].emit("newChallenge", channel, creator, key);
}

exports.closeGame = function(users, creator, key, confirm) {
	users[creator].numGames -= 1;
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

exports.cancelInvitation = function(socket, creator, key, username) {
	if (status == GAME_JOINED) {
		// remove the user from participants
		var index = users[socket.username].games[socket.username][key].participants.indexOf(invited);
		users[socket.username].games[socket.username][key].participants.splice(index, 1);
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