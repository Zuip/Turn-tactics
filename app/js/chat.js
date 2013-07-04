chat = {
	socket: null,
	firstConnect: true,
	username: "Me",
	connected: false,
	tabs: null,
	msgWindow: null,
	userList: null,
	chatInput: null,
	chatInputText: null,
	
	currentChannel: "",
	channels: [],
	messages: [],
	users: [],
	
	init: function() {
		var self = this;
		if (this.connected == false) {
			this.socket = io.connect("http://"+window.location.host);
			this.connected = true;
			
			this.socket.on('connect', function() {
				self.chatInputText.attr("disabled", false);
			});
			
			this.socket.on('disconnect', function(){
				self.socket.disconnect();
				self.socket.removeAllListeners();
				self.socket.socket.removeAllListeners();
			});
			
			this.socket.on('error', function() {
				self.addMessage(self.currentChannel, "", "Login to enter chat");
				self.updateMessageList(self.currentChannel);
			});
			
			this.socket.on('username', function(username) {
				this.username = username;
			});
		
			this.socket.on('messageDelivered', function(channel){
				self.messages[channel].push({sender: this.username, msg: self.chatInputText.val()});
				self.chatInputText.val("");
				self.chatInputText.attr("disabled", false);
				if (channel == self.currentChannel) {
					self.updateMessageList(channel);
				}
			});
			
			this.socket.on('chatMessage', function(channel, user, message) {
				self.addMessage(channel, user.username, message);
				if (channel == self.currentChannel) {
					self.updateMessageList(channel);
				}
			});
			
			this.socket.on('channelJoinSuccessful', function(channel, username) {
				self.channels.push(channel);
			
				if (typeof self.messages[channel] == "undefined") {
					self.messages[channel] = new Array();
				}
				if (typeof self.users[channel] == "undefined") {
					self.users[channel] = new Array();
				}
				
				var channelTab = $('<a>', {
				id: 'chat-'+channel,
				class: 'chatTab',
				text: channel
				}).appendTo(self.tabs);
				channelTab.on('click', function() {
					//todo: changetab
				});
				
				self.changeTab(channel, false);
			});
			
			this.socket.on('userJoin', function(channel, user){
				self.addMessage(self.currentChannel, "", "User " + user.username + " joined the channel");
				if (channel == self.currentChannel) {
					self.updateMessageList(channel);
				}
				self.users[channel][user.username] = user;
				self.updateUserList(channel);
			});
			this.socket.on('userLeave', function(channel, user){
				self.addMessage(self.currentChannel, "", "User " + user.username + " left the channel");
				if (channel == self.currentChannel) {
					self.updateMessageList(channel);
				}
				delete self.users[channel][user.username];
				self.updateUserList(channel);
			});
			this.socket.on('userDisconnect', function(channel, user){
				self.addMessage(self.currentChannel, "", "User " + user.username + " left the chat");
				if (channel == self.currentChannel) {
					self.updateMessageList(channel);
				}
				delete self.users[channel][user.username];
				self.updateUserList(channel);
			});
			
			this.socket.on('userList', function(channel, userlist){
				self.users[channel] = {};
				self.users[channel] = userlist;
				self.updateUserList(channel);
			});
		
		}
		
		var chatDiv = $('#chat');
		$('#chat').empty();
		
		this.tabs = $('<div>', {
		id: 'tabs',
		}).appendTo(chatDiv);
		
		this.msgWindow = $('<div>', {
		id: 'msgWindow',
		}).appendTo(chatDiv);
		
		this.userList = $('<div>', {
		id: 'userList',
		}).appendTo(chatDiv);
		
		this.chatInput = $('<div>', {
		id: 'chatInput',
		}).appendTo(chatDiv);
		
		this.chatInputText = $('<input>', { type: 'text',
		id: 'chatInputText'
		}).appendTo(this.chatInput);
		
		this.chatInputText.bind("enterKey",function(e){
			self.sendMessage();
		});
		this.chatInputText.keyup(function(e) {
			if (e.keyCode == 13) {
				$(this).trigger("enterKey");
			}
		});
		if (self.connected == false) {
			self.chatInputText.attr("disabled", true);
		}
		
		if (this.currentChannel != "") {
			this.changeTab(this.currentChannel, true);
		} else {
			this.updateUserList(this.currentChannel);
			this.updateMessageList(this.currentChannel);
		}
		
	},
	
	joinChannel: function(channel) {
		if (this.channels.indexOf(channel) == -1) {
			this.socket.emit('joinChannel', channel);
		}
	},
	
	addMessage: function(channel, sender, message) {
		if (typeof this.messages[channel] == "undefined") {
			this.messages[channel] = new Array();
		}
		this.messages[this.currentChannel].push({sender: sender, msg: message});
	},
	
	isScrollOnBottom: function(element) {
		if (element.prop("scrollHeight") - element.scrollTop() == element.height()) {
			return true;
		}
		return false;
	},
	
	scrollToBottom: function(element) {
		element.scrollTop(element.prop("scrollHeight"));
	},
	
	changeTab: function(channel, init) {
		if (channel != this.currentChannel || init == true) {
			if (this.currentChannel != "") {
				$("chat-"+this.currentChannel).removeClass("tabSelected");
			}
			this.updateMessageList(channel);
			this.updateUserList(channel);
			$("#chat-"+channel).addClass("chatTabSelected");
			this.currentChannel = channel;
		}
	},
	
	sendMessage: function() {
		this.socket.emit('sendMessage', this.currentChannel, this.chatInputText.val());
		this.chatInputText.attr("disabled", true);
	},
	
	updateTabs: function() {
		$('#tabs').empty();
		for (var i=0; i<this.channels.length; ++i) {
			var channel = $('.chat-'+this.channels[i]);
			if (!channel.length) {
				var channelTab = $('<a>', {
				id: 'chat-'+this.channels[i],
				class: 'chatTab',
				text: this.channels[i]
				}).appendTo(this.tabs);
				var channelName = this.channels[i];
				channelTab.on('click', function() {
					//todo: changetab
				});
			}
		}
	},
	
	updateUserList: function(channel) {
		//todo: sort users?
		
		this.userList.html("");
		this.userList.children().remove();
		
		if (typeof this.users[channel] != 'undefined') {
			for (user in this.users[channel]) {
				var userEntry = $('<div>', {
				id: 'user-'+this.users[channel][user].username,
				text: this.users[channel][user].username
				}).appendTo(this.userList);
			}
		}
	},
	
	updateMessageList: function(channel) {
	
		var onBottom = this.isScrollOnBottom(this.msgWindow);
		
		$('#msgWindow').empty();
		if (typeof this.messages[channel] != 'undefined') {
			for (var i=0; i<this.messages[channel].length; ++i) {
				var message = $('<div>', {
				text: this.messages[channel][i].sender+": "+this.messages[channel][i].msg
				}).appendTo(this.msgWindow);
			}
		}
		
		if (onBottom == true) {
			this.scrollToBottom(this.msgWindow);
		}
	}
	
}