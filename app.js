var express = require("express");
var app = express();
var http = require("http");
var url = require("url");
var fs = require("fs");
var path = require("path");
var util = require("util");

var agol = require('./agol.js');
var citybikes = require("./citybikes.js");

var citiesCached = false;

String.prototype.bool = function() {
    return (/^true$/i).test(this);
};

var useCallback = function(request) {
	var q = url.parse(request.url, true).query;
	return q.hasOwnProperty('callback');
};

app.configure(function() {
	app.enable("jsonp callback");

	app.use(express.methodOverride());
	app.use(express.bodyParser());
 
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
	
	citybikes.getCities(function(cities) {
		citiesCached = true;
		console.log("Cities Cached");
	});

	console.log('App Configured');
});

app.all('/', function onRequest(request, response) {
	response.writeHead(301, {Location: agol.getServicesUrl()});
	response.end();
});

app.all('/services', function onRequest(request, response) {
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

//POST
var servicesHandler = function onRequest(request, response) {
	var format = request.method==="POST"?request.body["f"]:request.query["f"];

	console.log("SERVICES");
	
	citybikes.getCities(function(cities) {
		var output = agol.servicesOutput(cities, format);
		useCallback(request)?response.jsonp(200,output):response.send(200,output);
	});
};

app.get(agol.getServicesUrl(), servicesHandler);
app.post(agol.getServicesUrl(), servicesHandler);

// POST
var featureServiceHandler = function onRequest(request, response) {
	var format = request.method==="POST"?request.body["f"]:request.query["f"];

	var svcName = request.params.serviceName;

	console.log("FEATURESERVER");

	citybikes.getCities(function(cities) {
		var output = agol.serviceOutput(svcName, cities, format);
		useCallback(request)?response.jsonp(200,output):response.send(200,output);
	});
};

app.get(agol.getServiceUrl(':serviceName'), featureServiceHandler);
app.post(agol.getServiceUrl(':serviceName'), featureServiceHandler);

var featureLayerHandler = function onRequest(request, response) {
	var format = request.method==="POST"?request.body["f"]:request.query["f"];
	
	var svcName = request.params.serviceName;
	var layerId = request.params.layerId;

	console.log("LAYER");

	citybikes.getCities(function(cities) {
		var output = agol.layerOutput(svcName, layerId, cities, format);
		useCallback(request)?response.jsonp(200,output):response.send(200,output);
	});
};

app.get(agol.getLayerUrl(':serviceName',':layerId'), featureLayerHandler);
app.post(agol.getLayerUrl(':serviceName',':layerId'), featureLayerHandler);

var layerQueryHandler = function onRequest(request, response) {
	console.log("FLHandler");
	var p = request.method==="POST";
	var format = p?request.body["f"]:request.query["f"];
	var returnCountOnly = ((p?request.body["returnCountOnly"]:request.query["returnCountOnly"]) || "false").bool();
	var returnIdsOnly = ((p?request.body["returnIdsOnly"]:request.query["returnIdsOnly"]) || "false").bool();
	var outSR = p?request.body["outSR"]:request.query["outSR"];
	
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
}

app.get(agol.getLayerQueryUrl(':serviceName',':layerId'), layerQueryHandler);
app.post(agol.getLayerQueryUrl(':serviceName',':layerId'), layerQueryHandler);

app.listen(process.env.VCAP_APP_PORT || 1337);
