var usernames = {};
var cookie = require('cookie');

getUser = function(socket) {
	var data = {username: socket.username, registered: socket.registered};
	return data;
}

getUserList = function(io, channel) {
	var clients = io.sockets.clients(channel);
	var userList = [];
	
	io.sockets.clients().forEach(function (socket) { 
		userList.push(getUser(socket));
	});
	return userList;
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
				socket.join(channel);
				socket.emit('channelJoinSuccessful', channel);
				socket.emit('userList', channel, getUserList(io, channel));
			} else {
				// Tell user that they can't join on this channel
				socket.emit('cannotJoinChannel', channel);
			}
		});
		socket.on('leaveChannel', function(channel) {
			socket.leave(channel);
		});
		socket.on('sendMessage', function(channel, message) {
			if (true) { // check if user is on the channel
				socket.join(channel);
				socket.emit('messageDelivered', channel);
				socket.broadcast.to(channel).emit('chatMessage', channel, getUser(socket), message);
			} else {
				// not on channel
				socket.emit('notOnChannel', { channel: channel });
			}
		});
		socket.on('disconnect', function() {
		
		});
	});
	return io;

};