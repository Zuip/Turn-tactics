var PORT = 81;
var express = require('express');
var querystring = require('querystring');
var mysql      = require('mysql');

var app = express(),
http = require('http'),
server = http.createServer(app),
io = require('socket.io').listen(server);
var fs = require('fs');
app.set('view engine', 'ejs')
app.set('views', __dirname);
app.use(express.bodyParser());

// load languages
var languages = { en: require('./app/language/en.js')
				};		
var language = "en";


var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'sqluser',
  password : 'ufo789',
  database : 'project',
});

connection.connect();

connection.query('SELECT * FROM testi', function(err, rows, fields) {
  if (err) throw err;

for (var i=0; i<rows.length; i++) {
  console.log('testituloste: ', rows[i].testi);
  }
});

connection.end();


// complete POST actions and
// modify JSON data to be passed to front-end according to POST data
app.handlePostQueries = function(postdata, data){

}

// Detects any page in the templates folder
app.getPage = function(query) {

	var page = "index";
	var string = querystring.stringify(query, ';', ':');
	
	if(string != "" && string.match(/[a-zA-Z0-9]+:/) ) { 
		if (fs.existsSync("app/templates/"+string.substr(0, string.length-1)+".ejs") == true) {
			page = string.substr(0, string.length-1);
		}
	}

	return page;
}

app.getPageContent = function(page, data, content) {

	app.render('./app/templates/' + page + ".ejs", data, function(err, html) {
		content.content = html;
	});
}

// Http
app.configure(function(){
	
	// Data containers
	var data = {};
	var content = {};
	
	io.sockets.on('connection', function(socket) {
		socket.emit('news', { msg: 'Welcome'});
	});
	
	// Handle post requests
	app.post('/', function(req, res) {
		app.handlePostQueries(req.body, data);
	});
	// Receive ajax post requests
	app.post('/ajax', function(req, res) {
		app.handlePostQueries(req.body, data);
		res.send(JSON.stringify(data));
	});
	// Respond to ajax queries
	app.get('/ajax', function(req, res){
		if (req.xhr) { // test if ajax call
			app.handlePostQueries(req.body, data);
			res.send(JSON.stringify(data));
		}
	});
	
	// Serve the layout and the page
	app.get('/', function(req, res){
		var page = app.getPage(req.query);
		data.messages = languages.en.messages;
		app.getPageContent(page, data, content);
		res.render('views/index', {language: language, login: false, 
									messages: languages.en.messages, 
									content: content.content});
	});
	app.get('/index', function(req, res) {
		var page = app.getPage(req.query);
		data.messages = languages.en.messages;
		app.getPageContent(page, data, content);				
		res.render('views/index', {language: language, login: false, 
									messages: languages.en.messages,
									content: content.content});
	});
	
	//app.use("/sockettesti.html", express.static(__dirname + '/sockettesti.html'));
	app.use("/", express.static(__dirname));
	//app.use("/socket.io", express.static(__dirname) + '/socket.io');

	// serve images directly
	app.use("/images", express.static(__dirname + '/images'));
	app.use("/app", express.static(__dirname + '/app'));
	// serve front-end js directly
	app.use("/app/js", express.static(__dirname + '/app/js'));
	// serve controllers directly
	app.use("/app/controllers", express.static(__dirname + '/app/controllers'));
	// serve view directly
	app.use("/app/views", express.static(__dirname + '/app/views'));
	
	//None of the other rules applied
	app.use(function(req, res, next) {
		res.render('views/404', { url: req.url });
	});

	
});
server.listen(PORT);