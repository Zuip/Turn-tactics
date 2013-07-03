var pages = pages || {};
pages["register"] = pages["register"] || {};

pages["register"].getData = function(pathname) {
	// currently registering can't be done with ajax
	var data = {regSuc: 0};
	return {data: data};
};

pages["register"].init = function(pathname) {

};

pages["register"].clean = function() {

};