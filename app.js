var express = require("express");
var app = express();
var http = require("http");
var url = require("url");
var fs = require("fs");
var path = require("path");
var util = require("util");

var agol = require('./agol.js');
var citybikes = require("./citybikes.js");

app.configure(function() {
	app.use(app.router);
	app.use(express.static(__dirname, {maxAge: 31557600000}));

	console.log('App Configured');
});

app.get(agol.getServicesUrl(), 
		function onRequest(request, response) {
	var r = url.parse(request.url, true);
	var format = r.query["f"] || 'html';

	console.log("SERVICES");
	
	citybikes.getCities(function(cities) {
		var outStr = agol.servicesOutput(cities, format);
		var hf = (format=='html')?'text/html':'text/plain';
		response.writeHead(200, {'Content-Type': hf});
		response.end(outStr);
	});
});

app.get(agol.getServiceUrl(':serviceName'), 
		function onRequest(request, response) {
	var r = url.parse(request.url, true);
	var format = r.query["f"] || 'html';

	var svcName = request.params.serviceName;

	// Service Definition
	console.log("FEATURESERVER");

	citybikes.getCities(function(cities) {
		var outStr = agol.serviceOutput(svcName, cities, format);
		var hf = (format=='html')?'text/html':'text/plain';
		response.writeHead(200, {'Content-Type': hf});
		response.end(outStr);
	});
});

app.get(agol.getLayerUrl(':serviceName',':layerId'), 
		function onRequest(request, response) {
	var r = url.parse(request.url, true);
	var format = r.query["f"] || 'html';
	
	var svcName = request.params.serviceName;
	var layerId = request.params.layerId;

	// Layer
	console.log("LAYER");

	citybikes.getCities(function(cities) {
		var outStr = agol.layerOutput(svcName, layerId, cities, format);	
		var hf = (format=='html')?'text/html':'text/plain';
		response.writeHead(200, {'Content-Type': hf});
		response.end(outStr);
	});
});

app.listen(process.env.VCAP_APP_PORT || 1337);
