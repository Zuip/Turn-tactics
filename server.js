var PORT = 81;
var express		= require('express');
var querystring	= require('querystring');
var sessions	= require('./modules/sessions');
var fs 			= require('fs');
var path		= require('path');
var pool 		= require('./modules/database');

var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var chat = require('./modules/chat')(io, pool);

app.set('view engine', 'ejs')
app.set('views', __dirname);
app.use(express.bodyParser());
app.use(express.cookieParser());

// http url path
var APP_PATH = "";
var routes = require('./routes')(app, pool, sessions, APP_PATH);

// load languages
var languages = { en: require('./app/language/en.js') };		
var language = "en";

/** 
 * completes POST actions and uses the result data in result page
 */
app.handlePostQueries = function(req, res){
	var data = {status: 0};
	if (typeof req.body.register != "undefined") {
		sessions.handleRegisterPost(req, res, data, pool, function() {
			sessions.handlePage(req, res, pool, data, function(ndata) {
				app.renderPage(res, "register", ndata);
			});
		});
	} else if(typeof req.body.login != "undefined") {
		sessions.handleLoginPost(req, res, data, pool, function() {
			sessions.handlePage(req, res, pool, data, function(ndata) {
				app.renderPage(res, "login", ndata);
			});
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
app.sendPageContent = function(req, res, data, ajaxdataonly) {
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
app.configure(routes.configure);
server.listen(PORT);