var PORT = 81;
var express		= require('express');
var querystring	= require('querystring');
var mysql		= require('mysql');
var registering	= require('./modules/registering');
var fs 			= require('fs');
var path		= require('path');

var app = express(),
http = require('http'),
server = http.createServer(app),
io = require('socket.io').listen(server);
app.set('view engine', 'ejs')
app.set('views', __dirname);
app.use(express.bodyParser());

// http url path
var APP_PATH = "";

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
app.handlePostQueries = function(req, data){
	if(typeof req.body.register != "undefined") {
		console.log('rekisterointi');
		registering.handleRegisterPost(req, data, connection);
	} else if(typeof req.body.login != "undefined") {
		console.log('kirjautuminen');
	}
}

// Returns the name of the page to be served.
// Detects any page in the templates folder
app.getPage = function(params) {

	var page = "index";
	var string = params.id;
	
	if(typeof string != "undefined" && string.match(/[a-zA-Z0-9]+/) ) { 
		if (fs.existsSync("app/templates/"+string+".ejs") == true) {
			page = string;
		}
	}
	return page;
}

app.renderPage = function(res, page, data) {

	var content = {};
	//TODO: get page related data
	
	var indexContent = { messages: languages[language].messages };
	app.render('./app/templates/' + page + ".ejs", indexContent, function(err, html) {
		content.content = html;
		res.render('views/index', {APP_PATH: APP_PATH,
									language: language, login: false, 
									messages: languages.en.messages,
									content: content.content});
	});
}

// sends a response to the user
app.sendPage = function(req, res, data) {
	var page = app.getPage(req.params);
	app.renderPage(res, page, data);
}

// Http
app.configure(function(){
	
	// Data container
	var data = {};
	data.regSuc = 'false';
	
	// Handle post requests
	app.post(APP_PATH+'/', function(req, res) {
		app.handlePostQueries(req, data);
		app.sendPage(req, res, data);
	});
	
	// Handle post requests
	app.post(APP_PATH+'/register', function(req, res) {
		data.regSuc = 'success';
		app.handlePostQueries(req, data);
		app.sendPage(req, res, data);
	});
	
	// Receive ajax post requests
	app.post(APP_PATH+'/ajax', function(req, res) {
		app.handlePostQueries(req, data);
		res.send(JSON.stringify(data));
	});
	// Respond to ajax queries
	app.get(APP_PATH+'/ajax', function(req, res){
		if (req.xhr) { // test if ajax call
			app.handlePostQueries(req, data);
			res.send(JSON.stringify(data));
		}
	});
	
	// Serve the layout and the page
	app.get(APP_PATH+'/', function(req, res){
		app.sendPage(req, res, data);
	});
	app.get(APP_PATH+'/:id', function(req, res){
		app.sendPage(req, res, data);
	});
	// serve images and css file directly
	app.use(APP_PATH+"/images", express.static(__dirname + '/images'));
	app.use(APP_PATH+"/app", express.static(__dirname + '/app'));
	// serve front-end js directly
	app.use(APP_PATH+"/app/js", express.static(__dirname + '/app/js'));
	// serve controllers directly
	app.use(APP_PATH+"/app/controllers", express.static(__dirname + '/app/controllers'));
	// serve view directly
	app.use(APP_PATH+"/app/views", express.static(__dirname + '/app/views'));
	
	//None of the other rules applied
	app.use(function(req, res, next) {
		res.render('views/404', { url: req.url });
	});

});
server.listen(PORT);