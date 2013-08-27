/**
 * Sanep 2013
 */
 
Chat = function() {
	"use strict";
	
	this.Events = new Chat.Events(this);
	this.ContextMenus = new Chat.ContextMenus(this);
	this.Games = new Chat.Games(this);
	this.Messages = new Chat.Messages(this);
	this.Tabs = new Chat.Tabs(this);
	
	this.socket = null;
	this.firstConnect = true;
	this.username = "Me";
	this.connected = false;
	this.msgWindow = null;
	this.userList = null;
	this.chatInput = null;
	this.chatInputText = null;
	this.chatInputButton = null;
	// Option to use tabs for challenges instead of pop-up windows
	this.GAMETABS = false;
	// list of channels the user is currently on
	this.channels = [];
	// userlists on each channel
	this.users = [];
	
	this.init = function() {
		this.Events.init();
	};
	
	// Create the graphic elements of the chat
	this.createChatUI = function() {
		var self = this;
		
		var chatDiv = $('#chat');
		$('#chat').empty();
		
		this.Tabs.tabs = $('<div>', {
		id: 'tabs',
		}).appendTo(chatDiv);
		
		this.leftColumn = $('<div>', {
		id: 'chatLeft',
		}).appendTo(chatDiv);
		
		this.gameWindow = $('<div>', {
		id: 'gameWindow',
		}).appendTo(this.leftColumn);
		
		this.msgWindow = $('<div>', {
		id: 'msgWindow',
		}).appendTo(this.leftColumn);
		
		this.userList = $('<div>', {
		id: 'userList',
		}).appendTo(chatDiv);
		
		this.chatInput = $('<div>', {
		id: 'chatInput',
		}).appendTo(chatDiv);
		this.chatInput.hide();
		
		this.chatInputText = $('<input>', { type: 'text',
		id: 'chatInputText'
		}).appendTo(this.chatInput);
		
		this.chatInputText.bind("enterKey",function(e){
			self.Messages.sendMessage(self.chatInputText);
		});
		this.chatInputText.keyup(function(e) {
			if (e.keyCode == 13) {
				$(this).trigger("enterKey");
			}
		});
		if (self.connected == false) {
			self.chatInputText.attr("disabled", true);
		}
		
		this.chatInputButton = $('<input>', { type: 'button',
		id: 'chatInputButton',
		value: 'Send'
		}).appendTo(this.chatInput);
		this.chatInputButton.on("click", function() {
			self.Messages.sendMessage(self.chatInputText);
		});
		
		this.setInteraction(false);
		this.Tabs.updateTabs();
		this.Tabs.changeToCurrentTab();
	};
	
	this.setInteraction = function(status) {
		if (status) {
			this.Tabs.tabs.show();
			this.gameWindow.show();
			this.userList.show();
		} else {
			this.Tabs.tabs.hide();
			this.gameWindow.hide();
			this.userList.hide();
		}
	};
	
	this.joinChannel = function(channel) {
		if (this.channels.indexOf(channel) == -1) {
			this.socket.emit('joinChannel', channel);
		}
	};

	this.executeCommand = function(element) {
		var words = element.val().split(" ");
		var command = words[0].substr(1).toLowerCase();
		if (command == "help") {
			this.Messages.addMessage({type: "current"}, {time: new Date(), type: "notice", 
			msg: "The commands are: help, pubgame, join, leave, cancel, close"});
			this.Tabs.updateCurrentTab();
			element.val("");
		} else if (command == "join") {
			if (words.length == 2) {
				if (this.channels.indexOf(words[1]) == -1) {
					this.joinChannel(words[1]);
					element.val("");
				}
			}
		} else if (command == "leave") {
			if (this.Tabs.currentTab != null &&
			this.Tabs.currentTab.type == this.Tabs.TAB_CHANNEL) {
				this.socket.emit("leaveChannel", this.Tabs.currentTab.channel);
				this.Tabs.deleteCurrentTab();
				element.val("");
			}
		} else if (command == "pubgame") {
			if (this.Tabs.currentTab.type == this.Tabs.TAB_CHANNEL) {
				this.socket.emit('createChallenge', this.Tabs.currentTab.channel, true);
				element.val("");
			}
		} else if (command == "cancel") {
			if (this.Tabs.currentTab.type == this.Tabs.TAB_GAME) {
				if (this.Tabs.currentTab.creator != this.username) {
					this.socket.emit("cancelChallenge", this.Tabs.currentTab.creator, 
					this.Tabs.currentTab.key);
					delete this.games[this.Tabs.currentTab.creator][this.Tabs.currentTab.key];
					this.Tabs.deleteCurrentTab();
					element.val("");
				}
			}
		} else if (command == "close") {
			if (this.Tabs.currentTab.type == this.Tabs.TAB_GAME) {
				if (this.Tabs.currentTab.creator == this.username) {
					this.Games.closeGame(this.currentTab.key);
					this.Tabs.deleteCurrentTab();
					element.val("");
				}
			}
		}
	};
	
	this.userEntryExists = function(channel, user) {
		return typeof this.users[channel][user] != "undefined";
	};
	
	this.getUser = function(channel, user) {
		return this.users[channel][user];
	};
	
	this.createUser = function(channel, user, userdata) {
		this.users[channel][user] = userdata;
	};
	
	this.deleteUser = function(channel, username) {
		delete this.users[channel][user];
	};
	
	this.createUserEntry = function(channel) {
		if (typeof this.users[channel] == "undefined") {
			this.users[channel] = new Array();
		}
	};
	
};