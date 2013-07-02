// Function that gives the time in YYYY:MM:DD:HH:MM syntax
function getDateTime() {
    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min;
}

// complete POST actions and
// modify JSON data to be passed to front-end according to POST data
exports.handleRegisterPost = function(req, data, connection){
	
	// This is better than nothing, the key must be changed when the game is really used.
	var crypto = require('crypto');
	var key = 'jokuavain';
	var hash;
	
	if(req.body.pword == req.body.repword) {
		connection.connect();

		hash = crypto.createHmac('sha1', key).update(req.body.pword).digest('hex');

		// Add user to SQL-database
		connection.query('INSERT INTO users VALUES (\''
			+ req.body.uname
			+ '\', UNHEX(\'' + hash + '\'), \''
			+ req.connection.remoteAddress + '\', \''
			+ getDateTime() + '\');',
			function(err, rows, fields) { if (err) throw err; });
			
		connection.end();
	} else {
		console.log('eri salasanat');
	}
}