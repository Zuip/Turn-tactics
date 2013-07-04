var usernames = {};
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
		
		socket.on('joinChannel', function(channel) {
			if (true) { // check if user can join this channel
				socket.broadcast.to(channel).emit('userJoin', channel, getUser(socket));
				socket.join(channel);
				socket.emit('username', socket.username);
				console.log("JOIN "+socket.username);
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
				socket.emit('messageDelivered', channel);
				socket.broadcast.to(channel).emit('chatMessage', channel, getUser(socket), message);
			} else {
				// not on channel
				socket.emit('notOnChannel', { channel: channel });
			}
		});
		socket.on('disconnect', function() {
			for (channel in socket.channels) {
				socket.leave(channel);
				socket.broadcast.to(channel).emit('userDisconnect', channel, getUser(socket));
			}
		});
	});
	return io;

};