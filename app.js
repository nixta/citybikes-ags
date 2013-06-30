var express = require("express");
var app = express();
var http = require("http");
var url = require("url");
var fs = require("fs");
var path = require("path");
var util = require("util");

var agol = require('./agol.js');
var citybikes = require("./citybikes.js");

var templateHeader = '<table width="100%" class="userTable"><tr><td class="titlecell">ArcGIS REST Services Directory</td></tr></table>';
var templateNav = '<table class="navTable" width="100%"><tbody><tr valign="top"><td class="breadcrumbs"><a href="/services">Home</a> > <a href="/services">services</a> </td><td align="right"><a href="?f=help" target="_blank">API Reference</a></td></tr></tbody></table>';
var templateAPIRef = '<table><tr><td class="apiref"><a href="?f=pjson" target="_blank">JSON</a></td></tr></table>';

var templateSvcDef = '<b>View In: </b>&nbsp;&nbsp;<a href="http://www.arcgis.com/home/webmap/viewer.html?url=http://services.arcgis.com/OfH668nDRN7tbJh0/ArcGIS/rest/services/centerln/FeatureServer&source=sd" target="_blank">ArcGIS.com Map</a>&nbsp;&nbsp;<a href="http://explorer.arcgis.com?url=http://services.arcgis.com/OfH668nDRN7tbJh0/ArcGIS/rest/services/centerln/FeatureServer&source=sd" target="_blank">ArcGIS Explorer Online</a><br/><br/><b>Service Description:</b> Passthrough service, translating <a href="http://api.citybik.es">CitiBikes API</a> output into ArcGIS Feature Service JSON<br/><br/><b>Has Versioned Data:</b> %s<br/><br/><b>Max Record Count:</b> %d<br/><br/><b>Supported query Formats:</b> %s<br/><br/><a href="/OfH668nDRN7tbJh0/ArcGIS/rest/services/centerln/FeatureServer/layers">All Layers and Tables</a><br/><br/><b>Layers:</b> <br/><ul><li><a href="%s/0">%s</a> (0)</li></ul><br/><b>Description:</b> %s<br/><br/><b>Copyright Text:</b> %s<br/><br/><b>Spatial Reference:</b> %d<br/><br/> <b>Initial Extent:</b> <br/> <ul> %s </ul> <b>Full Extent:</b> <br/> <ul> %s </ul> <b>Units:</b> %s<br/> <br/> <b>Supported Operations: </b> &nbsp;&nbsp;<a href="%s/query">Query</a> <br/><br/>';

var templatePoint = '{"x" : %d, "y" : %d, "spatialReference" : {"wkid" : 4326}}';


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
		console.log(outStr);
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
		console.log("Got cities!");
		var outStr = agol.serviceOutput(svcName, cities, format);
		var hf = (format=='html')?'text/html':'text/plain';
		response.writeHead(200, {'Content-Type': hf});
// 		console.log(outStr);
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
		console.log("Got cities!");
		var outStr = agol.layerOutput(svcName, layerId, cities, format);	
		var hf = (format=='html')?'text/html':'text/plain';
		response.writeHead(200, {'Content-Type': hf});
// 		response.write(JSON.stringify(thisLayerDef));
		response.end(outStr);
	});
});

function writeServiceDef(r, response, format, svcName, cities) {
	response.end();
}

app.listen(process.env.VCAP_APP_PORT || 1337);
