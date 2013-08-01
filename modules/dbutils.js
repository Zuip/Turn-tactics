// function that forwards resouce as mysql connection
exports.getCon = function(contype, resource, callback) {
	if (contype == "pool") {
		resource.getConnection(function(err, con) {
			callback(con, err);
		});
	} else {
		// it is a connection already
		callback(resource, false);
	}
}