var usernames = {};

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

module.exports = function(io) {

	io.sockets.on('connection', function(socket) {
	
		var loggedIn = false;
		if (loggedIn) {
			// if logged in
			socket.registered = true;
		} else {
			// guest, assign username
			socket.registered = false;
			// TODO: assign username that isn't in use
			socket.username = "guest";
		}
		
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
		socket.on('sendMessage', function(message, channel) {
			if (true) { // check if user is on the channel
				socket.join(channel);
				socket.emit('messageDelivered', channel);
				socket.broadcast.to(channel).emit('chatMessage', getUser(socket), message);
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