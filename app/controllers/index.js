var pages = pages || {};
pages["index"] = pages["index"] || {};

pages["index"].getData = function() {
	return {};
};

var handler = function() {
	alert('asd.');
};

pages["index"].init = function() {
	$(document).on('click', '#main', handler);
};

pages["index"].clean = function() {
	$(document).off('click', '#main', handler);
};