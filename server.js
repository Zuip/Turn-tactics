var PORT = 81;
var express		= require('express');
var querystring	= require('querystring');
var mysql		= require('mysql');
var sessions	= require('./modules/sessions');
var fs 			= require('fs');
var path		= require('path');

var app = express(),
http = require('http'),
server = http.createServer(app),
io = require('socket.io').listen(server);

app.set('view engine', 'ejs')
app.set('views', __dirname);
app.use(express.bodyParser());
app.use(express.cookieParser());
// app.use(express.session(session 'secret'));
// app.use(app.route);

// http url path
var APP_PATH = "";

// load languages
var languages = { en: require('./app/language/en.js') };		
var language = "en";

// These can be changed later
var pool = mysql.createPool({
  host     : 'localhost',
  user     : 'sqluser',
  password : 'ufo789',
  database : 'project',
});

chat = require('./modules/chat')(io, pool);

// complete POST actions and
// modify JSON data to be passed to front-end according to POST data
app.handlePostQueries = function(req, res, data){
	if(typeof req.body.register != "undefined") {
		sessions.handleRegisterPost(req, res, data, pool, function() {
			app.renderPage(res, "register", data);
		});
	} else if(typeof req.body.login != "undefined") {
		sessions.handleLoginPost(req, res, data, pool, function() {
			app.renderPage(res, "login", data);
		});
	}
}

// Returns the name of the page to be served.
// Detects any page in the templates folder
app.getPage = function(params) {

	var page = "index";
	var exclude = ["logininfo", "navigation", "status"];
	var string = params.id;
	
	if(typeof string != "undefined" && string.match(/[a-zA-Z0-9]+/) ) { 
		if (exclude.indexOf(string) == -1) {
			if (fs.existsSync("app/templates/"+string+".ejs") == true) {
				page = string;
			}
		}
	}
	return page;
}

app.renderPage = function(res, page, data) {

	var content = {};
	var indexContent = { messages: languages[language].messages,
						data: data };
	
	app.render('./app/templates/status.ejs', {messages: languages.en.messages, data: data}, function(err, status) {	
		app.render('./app/templates/logininfo.ejs', {messages: languages.en.messages, data: data}, function(err, logininfo) {
		if (err) throw err;
			app.render('./app/templates/navigation.ejs', {messages: languages.en.messages, data: data}, function(err, navigation) {
				if (err) throw err;
				app.render('./app/templates/' + page + ".ejs", indexContent, function(err, html) {
					if (err) throw err;
					content.content = html;
					res.render('views/index', {APP_PATH: APP_PATH,
												logininfo: logininfo,
												navigation: navigation,
												status: status,
												language: language, 
												messages: languages.en.messages,
												data: data,
												content: content.content});
				});
			});
		});
	});
}

// handles normal requests and ajax requests
function sendPageContent(req, res, data, ajaxdataonly) {
	if (ajaxdataonly) {
		res.header("Content-Type", "application/json");
		res.send(JSON.stringify(data));
	} else {
		app.sendPage(req, res, data);
	}
}

// sends a response to the user
app.sendPage = function(req, res, data) {
	var page = app.getPage(req.params);
	app.renderPage(res, page, data);
}

// Serves files with correct mime types
// Express.js static did not set mime types correctly
app.serveFiles = function(req, res, directory) {
	fs.readFile(directory + "/" + req.params.file, function(err, data) {
		if(err) {
			res.status(404);
			res.render('views/404', { url: req.url });
		} else {
			// set the content type based on the file
			res.contentType(req.params.file);
			res.send(data);
		}   
		res.end();
	}); 
}

// Http
app.configure(function(){
	
	// Data container
	var data = {status: 0};
	
	// Handle post requests
	app.post(APP_PATH+'/', function(req, res) {
		app.handlePostQueries(req, res, data);
	});
	
	// Handle registering
	app.post(APP_PATH+'/register', function(req, res) {
		app.handlePostQueries(req, res, data);
	});
	
	// Handle logins
	app.post(APP_PATH+'/login', function(req, res) {
		app.handlePostQueries(req, res, data);
	});
	
	// Receive ajax post requests
	app.post(APP_PATH+'/ajax', function(req, res) {
		app.handlePostQueries(req, res, data);
		res.send(JSON.stringify(data));
	});
	// Respond to ajax queries
	app.get(APP_PATH+'/ajax/:id', function(req, res){
		if (req.xhr) { // test if ajax call
			sessions.handlePage(req, res, pool, data, function() {
				//last param tells to send ajax data
				sendPageContent(req, res, data, true);
			});
		}
	});
	
	// Serve the layout and the page
	app.get(APP_PATH+'/', function(req, res){
		app.sendPage(req, res, data);
	});
	app.get(APP_PATH+'/:id', function(req, res, next){
		/* Do not process user data when getting favicon.ico
		 * Some browsers try to get favicon.ico even with every ajax request */
		if (req.params.id != "favicon.ico") {
			// regular page
			sessions.handlePage(req, res, pool, data, function() {
				//last param tells to send ajax data
				sendPageContent(req, res, data, false);
			});
		} else {
			next();
		}
	});
	// serve images
	app.get(APP_PATH+"/images/:file", function(req, res) {
		app.serveFiles(req, res, "images");
	});
	// style.css
	app.get(APP_PATH+"/app/:file", function(req, res) {
		app.serveFiles(req, res, "app");
	});
	// serve front-end js directly
	app.get(APP_PATH+"/app/js/:file", function(req, res) {
		app.serveFiles(req, res, "app/js");
	});
	app.get(APP_PATH+"/app/templates/:file", function(req, res) {
		app.serveFiles(req, res, "app/templates");
	});
	// serve controllers directly
	app.get(APP_PATH+"/app/controllers/:file", function(req, res) {
		app.serveFiles(req, res, "app/controllers");
	});
	// serve language files directly
	app.get(APP_PATH+"/app/language/:file", function(req, res) {
		app.serveFiles(req, res, "app/language");
	});
	// serve view directly
	app.get(APP_PATH+"/app/views/:file", function(req, res) {
		app.serveFiles(req, res, "app/views");
	});
	
	//None of the other rules applied
	app.use(function(req, res, next) {
		res.status(404);
		res.render('views/404', { url: req.url });
	});

});
server.listen(PORT);