var express = require("express");
var app = express();
var http = require("http");
var url = require("url");
var fs = require("fs");
var path = require("path");
var util = require("util");

var agol = require('./agol.js');
var citybikes = require("./citybikes.js");

var useCallback = function(request) {
	var q = url.parse(request.url, true).query;
	return q.hasOwnProperty('callback');
};

app.configure(function() {
	app.enable("jsonp callback");

	app.use(express.methodOverride());
 
	// ## CORS middleware
	//
	// see: http://stackoverflow.com/questions/7067966/how-to-allow-cors-in-express-nodejs
	var allowCrossDomain = function(req, res, next) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
		res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
		// intercept OPTIONS method
		if ('OPTIONS' == req.method) {
			res.send(200);
		}
		else {
			next();
		}
	};
	app.use(allowCrossDomain);
	app.use(function(req,res,next) {
		console.log(req.url);
		next();
	});

	app.use(app.router);
	app.use(express.static(__dirname, {maxAge: 31557600000}));

	console.log('App Configured');
});

app.get('/', function onRequest(request, response) {
	response.writeHead(301, {Location: agol.getServicesUrl()});
	response.end();
});

app.get(agol.getInfoUrl(), 
		function onRequest(request, response) {
	var format = url.parse(request.url, true).query["f"];

	console.log("INFO");
	
	var output = agol.infoOutput(format);
	useCallback(request)?response.jsonp(200,output):response.send(200,output);
});

app.get(agol.getServicesUrl(), 
		function onRequest(request, response) {
	var format = url.parse(request.url, true).query["f"];

	console.log("SERVICES");
	
	citybikes.getCities(function(cities) {
		var output = agol.servicesOutput(cities, format);
		useCallback(request)?response.jsonp(200,output):response.send(200,output);
	});
});

app.get(agol.getServiceUrl(':serviceName'), 
		function onRequest(request, response) {
	var format = url.parse(request.url, true).query["f"];

	var svcName = request.params.serviceName;

	console.log("FEATURESERVER");

	citybikes.getCities(function(cities) {
		var output = agol.serviceOutput(svcName, cities, format);
		useCallback(request)?response.jsonp(200,output):response.send(200,output);
	});
});

app.get(agol.getLayerUrl(':serviceName',':layerId'), 
		function onRequest(request, response) {
	var query = url.parse(request.url, true).query;
	var format = query["f"];
	var callback = query["callback"] || null;
	
	var svcName = request.params.serviceName;
	var layerId = request.params.layerId;

	console.log("LAYER");

	citybikes.getCities(function(cities) {
		var output = agol.layerOutput(svcName, layerId, cities, format);
		useCallback(request)?response.jsonp(200,output):response.send(200,output);
	});
});

app.get(agol.getLayerQueryUrl(':serviceName',':layerId'), 
		function onRequest(request, response) {
	var query = url.parse(request.url, true).query;
	var format = query["f"];
	var returnCountOnly = query["returnCountOnly"];
	var returnIdsOnly = query["returnIdsOnly"];
	var outSR = query["outSR"];
	
	var svcName = request.params.serviceName;
	var layerId = request.params.layerId;

	console.log("QUERY");

	citybikes.getCities(function(cities) {
		var city = cities[svcName];
		citybikes.getBikes(city, function(bikes) {
			var output = agol.queryOutput(svcName, layerId, bikes, format, returnCountOnly, returnIdsOnly, outSR);
			useCallback(request)?response.jsonp(200,output):response.send(200,output);
		});
	});
});

app.listen(process.env.VCAP_APP_PORT || 1337);
