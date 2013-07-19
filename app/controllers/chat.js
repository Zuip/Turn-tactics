var pages = pages || {};
pages["chat"] = pages["chat"] || {};
pages["chat"].init = function() {
	window.chatInstance = window.chatInstance || new Chat();
	window.chatInstance.init();
}