var md5 = require("md5");
var express = require('express');
var router = express.Router();
var mysql = require("mysql");

var connection = mysql.createConnection({
	host: process.env.MYSQL_HOST || 'localhost',
	user: process.env.MYSQL_USER || 'user',
	password: process.env.MYSQL_PASSWORD || 'pass',
	database: process.env.MYSQL_DB || 'datatable',
	multipleStatements: true
});

connection.connect();


function isLoggedIn(req, res, next) {
	if (req.session && req.session.user) {
		return next();
	}

	return res.redirect("/login");
}

/* GET home page. */
router.get('/login', function(req, res, next) {
	if (req.session.user) {
		return res.redirect("/");
	}
	res.render('login', {
		title: 'Faculty Staff'
	});
});

router.post('/login', function(req, res, next) {
	if (req.body.user) {
		req.session.user = req.body.user;
		return res.redirect("/");
	}
	return res.redirect("/login");
});

router.get('/logout', function(req, res, next) {
	delete req.session.user;
	res.redirect("/login");
});

router.get('/', isLoggedIn, function(req, res, next) {
	var userId = md5(req.session.user);
	var status = req.query.status || "new";
	connection.query("SELECT * FROM list WHERE id= ?;", [userId], function(err, rows, fields) {
		res.render('index', {
			title: 'Faculty Staff',
			list: rows,
			status: status
		});
	});
});

router.post('/', isLoggedIn, function(req, res, next) {
	if(!req.body.id){
		return res.redirect("/");
	}
	var body = req.body
	var records;

	var fields = ["id", "phone_local", "academic_unit_primery", "about_he", "about_en", "academic_unit_secondary", "email_local", "building", "reception_hours", "web_page", "room"];

	if(! Array.isArray(body.id)){
		records = [
			fields.reduce(function(prev, val){
				prev[val] = body[val];
				return prev;
			}, {})
		]
	}else {
		records = body.id.map(function(value, index){
			return fields.reduce(function(prev, value){
				prev[value] = body[value][index];
				return prev;
			}, {});
		});
	}
	



	var queries = records.map(function(record){
		var query = "UPDATE list SET ? WHERE ? AND ?  AND ? ";
		var data =  [Object.keys(record).filter(function(field){
			return  ["id", "academic_unit_primery", "academic_unit_secondary"].indexOf(field) === -1;
		}).reduce(function(dat, next){
			dat[next] = record[next];
			return dat;
		}, {})];
		data.push({id: record.id});
		data.push({academic_unit_primery: record.academic_unit_primery});
		data.push({academic_unit_secondary: record.academic_unit_secondary});
		return {query: [query], data: data};
	}).reduce(function(total, next){
		total.query.push(next.query);
		total.data = total.data.concat(next.data);
		return total;
	}, {query: [], data: []});

	console.log(queries);
	
	connection.query(queries.query.join(";"), queries.data, function(err, result){
		if(err){
			return res.redirect("/?status=failure");
		}

		res.redirect("/?status=success");
	});
	
});

module.exports = router;




