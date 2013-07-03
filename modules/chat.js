var usernames = {};

getUser = function(socket) {
	var data = {registered: socket.registered};
	return data;
}

module.exports = function(io) {

	io.sockets.on('connection', function(socket) {
	
		boolean loggedIn = false;
		if (loggedIn) {
			// if logged in
			socket.registered = true;
		} else {
			// guest, assign username
			socket.registered = false;
		}
		
		socket.on('joinChannel', function(channel) {
			if (true) { // check if user can join this channel
				socket.join(channel);
				socket.emit('channelJoinSuccessful', channel);
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