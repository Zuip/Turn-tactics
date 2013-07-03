chat = {
	socket: null,
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
		
		this.socket = io.connect("http://"+window.location.host);
		this.socket.on('connect', function(){
			self.chatInputText.attr("disabled", false);
			self.connected = true;
		});
	
		this.socket.on('messageDelivered', function(channel){
			self.messages[channel].push({sender: "Me", msg: self.chatInputText.val()});
			self.chatInputText.val("");
			self.chatInputText.attr("disabled", false);
			if (channel == self.currentChannel) {
				self.updateMessageList(channel);
			}
		});
		
		this.socket.on('channelJoinSuccessful', function(channel){
			self.joinCallBack(channel);
		});
		
		this.socket.on('userList', function(channel, userlist){
			self.users[channel] = userlist;
			self.updateUserList(channel);
		});
		
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
		
		this.updateTabs();
		if (this.currentChannel != "") {
			this.changeTab(this.currentChannel, true);
		}
		
	},
	
	joinChannel: function(channel) {
		if (this.channels.indexOf(channel) == -1) {
			//TODO: send connect message
			this.socket.emit('joinChannel', channel);
		}
	},
	
	joinCallBack: function(channel) {
	
		this.channels.push(channel);
	
		if (typeof this.messages[channel] == "undefined") {
			this.messages[channel] = new Array();
		}
		if (typeof this.users[channel] == "undefined") {
			this.users[channel] = new Array();
		}
		
		var channelTab = $('<a>', {
		id: 'chat-'+channel,
		class: 'chatTab',
		text: channel
		}).appendTo(this.tabs);
		channelTab.on('click', function() {
			alert(channel);
		});
		
		this.changeTab(channel);
	},
	
	changeTab: function(channel, init = false) {
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
		this.socket.emit('sendMessage', this.chatInputText.attr("value"), this.currentChannel);
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
					alert(ChannelName);
				});
			}
		}
	},
	
	updateUserList: function(channel) {
		//todo: sort users?
		$('#usersList').empty();
		if (typeof this.users[channel] != 'undefined') {
			for (var i=0; i<this.users[channel].length; ++i) {
				var user = $('<div>', {
				id: 'user-'+this.users[channel][i],
				text: this.users[channel][i].username
				}).appendTo(this.userList);
			}
		}
	},
	
	updateMessageList: function(channel) {
		$('#msgWindow').empty();
		if (typeof this.messages[channel] != 'undefined') {
			for (var i=0; i<this.messages[channel].length; ++i) {
				var message = $('<div>', {
				text: this.messages[channel][i].sender+": "+this.messages[channel][i].msg
				}).appendTo(this.msgWindow);
			}
		}
	}
	
}