var mysql = require('mysql');

// These can be changed later
var pool = mysql.createPool({
  host     : 'localhost',
  user     : 'sqluser',
  password : 'ufo789',
  database : 'project',
});

module.exports = pool;