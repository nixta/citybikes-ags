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

app.get('/', function onRequest(request, response) {
	response.writeHead(301, {Location: agol.getServicesUrl()});
	response.end();
});

app.all(agol.getInfoUrl(), 
		function onRequest(request, response) {
	var format = url.parse(request.url, true).query["f"];

	console.log("INFO");
	
	var outStr = agol.infoOutput(format);
	response.writeHead(200, {'Content-Type': agol.contentTypeForFormat(format)});
	response.end(outStr);
});

app.get(agol.getServicesUrl(), 
		function onRequest(request, response) {
	var format = url.parse(request.url, true).query["f"];

	console.log("SERVICES");
	
	citybikes.getCities(function(cities) {
		var outStr = agol.servicesOutput(cities, format);
		response.writeHead(200, {'Content-Type': agol.contentTypeForFormat(format)});
		response.end(outStr);
	});
});

app.get(agol.getServiceUrl(':serviceName'), 
		function onRequest(request, response) {
	var format = url.parse(request.url, true).query["f"];

	var svcName = request.params.serviceName;

	console.log("FEATURESERVER");

	citybikes.getCities(function(cities) {
		var outStr = agol.serviceOutput(svcName, cities, format);
		response.writeHead(200, {'Content-Type': agol.contentTypeForFormat(format)});
		response.end(outStr);
	});
});

app.get(agol.getLayerUrl(':serviceName',':layerId'), 
		function onRequest(request, response) {
	var format = url.parse(request.url, true).query["f"];
	
	var svcName = request.params.serviceName;
	var layerId = request.params.layerId;

	console.log("LAYER");

	citybikes.getCities(function(cities) {
		var outStr = agol.layerOutput(svcName, layerId, cities, format);
		response.writeHead(200, {'Content-Type': agol.contentTypeForFormat(format)});
		response.end(outStr);
	});
});

app.get(agol.getLayerQueryUrl(':serviceName',':layerId'), 
		function onRequest(request, response) {
	var query = url.parse(request.url, true).query;
	var format = query["f"];
	var returnCountOnly = query["returnCountOnly"] || false;
	var returnIdsOnly = query["returnIdsOnly"] || false;
	
	var svcName = request.params.serviceName;
	var layerId = request.params.layerId;

	console.log("QUERY");

	citybikes.getCities(function(cities) {
		var city = cities[svcName];
		citybikes.getBikes(city, function(bikes) {
			response.writeHead(200, {'Content-Type': agol.contentTypeForFormat(format)});
			var outStr = agol.queryOutput(svcName, layerId, bikes, format, returnCountOnly, returnIdsOnly);
			response.end(outStr);
		});
	});
});

app.listen(process.env.VCAP_APP_PORT || 1337);
