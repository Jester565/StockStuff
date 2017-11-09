'use strict';

var httpPort = 80;
var localAddress = "0.0.0.0";

var http = require('http');

var https = require('https');

var express = require('express');
var app = express();

app.use('/', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow_Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});
app.use(express.static(__dirname + '/public'));

var httpServer = http.createServer(app);

httpServer.listen(httpPort, localAddress, function () {
	console.log("HTTPS Running");
});
