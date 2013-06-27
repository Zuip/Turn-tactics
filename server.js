var PORT = 81;
var express		= require('express');
var querystring	= require('querystring');
var mysql		= require('mysql');
var registering	= require('./modules/registering');
var fs 			= require('fs');

var app = express(),
http = require('http'),
server = http.createServer(app),
io = require('socket.io').listen(server);
app.set('view engine', 'ejs')
app.set('views', __dirname);
app.use(express.bodyParser());

// load languages
var languages = { en: require('./app/language/en.js') };		
var language = "en";

// These can be changed later
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'sqluser',
  password : 'ufo789',
  database : 'project',
});

// complete POST actions and
// modify JSON data to be passed to front-end according to POST data
app.handlePostQueries = function(postdata, data){
	if(typeof postdata.register != "undefined") {
		//registering.handleRegisterPost(req.body, data);
	}
}

// Returns the name of the page to be served.
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

app.renderPage = function(res, page, data) {

	var content = {};
	//TODO: get page related data
	app.render('./app/templates/' + page + ".ejs", data, function(err, html) {
		content.content = html;
		res.render('views/index', {language: language, login: false, 
									messages: languages.en.messages,
									content: content.content});
	});
}

// sends a response to the user
app.sendPage = function(req, res, data) {
	var page = app.getPage(req.query);
	data.messages = languages.en.messages;
	app.renderPage(res, page, data);
}

// Http
app.configure(function(){
	
	// Data container
	var data = {};
	
	// Handle post requests
	app.post('/', function(req, res) {
		app.handlePostQueries(req.body, data);
		app.sendPage(req, res, data);
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
		app.sendPage(req, res, data);
	});
	app.get('/index', function(req, res) {
		app.sendPage(req, res, data);
	});

	// serve images and css file directly
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