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

var templateEnvelope = 'XMin: %d<br/> YMin: %d<br/> XMax: %d<br/> YMax: %d<br/> Spatial Reference: %d<br/>';

var templatePoint = '{"x" : %d, "y" : %d, "spatialReference" : {"wkid" : 4326}}';

var serviceFields;
var servicesJSON, serviceJSON, layerJSON, featureSetJSON;

var servicesUrl = agol.getServicesUrl();
var serviceUrl = agol.getServiceUrl(':serviceName');
var layerUrl = agol.getLayerUrl(':serviceName',':layerId');

app.configure(function() {
	app.use(app.router);
	app.use(express.static(__dirname, {maxAge: 31557600000}));

	servicesJSON = JSON.parse(fs.readFileSync('templates/servicesList.json', 'utf8'));
	serviceJSON = JSON.parse(fs.readFileSync('templates/serviceDefinition.json', 'utf8'));
	layerJSON = JSON.parse(fs.readFileSync('templates/layerDefinition.json', 'utf8'));
	serviceFields = JSON.parse(fs.readFileSync('templates/fields.json', 'utf8'));
	layerJSON["fields"] = serviceFields;
	
	console.log('App Configured');
});

app.get(servicesUrl, 
		function onRequest(request, response) {
	var r = url.parse(request.url, true);
	var format = r.query["f"] || 'html';
	if (format == "pjson") { format = "json"; }

	console.log("SERVICES");
	
	citybikes.getCities(function(cc) {
		var output = {
			"currentVersion": 10.11,
			"services": []
		};

		for (var key in cc)
		{
			if (cc.hasOwnProperty(key))
			{
				var city = cc[key].agsSvc;
				output.services.push(city);
			}
		}

		if (format == "json")
		{
			response.writeHead(200, {'Content-Type': 'text/plain'});

			var outputString = JSON.stringify(output);
			response.write(outputString, 'utf8');
		}
		else
		{
			response.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8'});
	
			response.write("<html><head>");
			response.write("<link href='/ESRI.ArcGIS.SDS.REST.css' rel='stylesheet' type='text/css'>");
			response.write('</head>');
			response.write('<body>');
			response.write(templateHeader);
			response.write(templateNav);
			response.write(templateAPIRef);
			response.write('<div class="restHeader">');
			response.write('<h2>Folder: /</h2>');
			response.write('</div>');
			response.write('<div class="restBody">');
			response.write('<b>Current Version:</b> ' + output.currentVersion + '<br><br>');
			response.write('<b>Services:</b><br><br>');
			response.write('<ul id="servicesList">');
			for (i=0; i<output.services.length; i++)
			{
				var svc = output.services[i];
				response.write('<li><a href="' + svc.url + '">' + svc.name + '</a> (' + svc.type + ')</li>');	
			}
			response.write('</ul><br>');
			response.write('</div>');
			response.write('</body></html>');
		}
		response.end();
		console.log("Written...");
	});
});

app.get(serviceUrl, 
		function onRequest(request, response) {
	var r = url.parse(request.url, true);
	var format = r.query["f"] || 'html';
	if (format == "pjson") { format = "json"; }

	var svcName = request.params.serviceName;

	// Service Definition
	console.log("FEATURESERVER");

	citybikes.getCities(function(cities) {
		writeServiceDef(r, response, format, svcName, cities);
	});
});

app.get(layerUrl, 
		function onRequest(request, response) {
	var r = url.parse(request.url, true);
	var format = r.query["f"] || 'html';
	if (format == "pjson") { format = "json"; }
	
	var svcName = request.params.serviceName;
	var layerId = request.params.layerId;

	// Layer
	console.log("LAYER");

	citybikes.getCities(function(cities) {
		var city = cities[svcName];
	
		var thisLayerDef = JSON.parse(JSON.stringify(layerJSON));
		thisLayerDef.name = svcName;
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.write(JSON.stringify(thisLayerDef));
		response.end();
	});
});

function extStrForExt(ext) {
	return util.format(templateEnvelope, 
						ext.xmin, ext.ymin, 
						ext.xmax, ext.ymax,
						ext.spatialReference.wkid);
}

function writeServiceDef(r, response, format, svcName, cities) {
	var cityDef = cities[svcName];
	var agolDef = cityDef.agsSvc;
	var cityDef = cityDef.citySvc;
	
	var thisSvcDef = JSON.parse(JSON.stringify(serviceJSON));

	thisSvcDef.layers.push({
		"id": 0,
		"name": svcName,
		"parentLayerId": -1,
		"defaultVisibility": true,
		"subLayerIds": null,
		"minScale": 0,
		"maxScale": 0
	});

// 		console.log(format);

	if (format == "json")
	{
		response.writeHead(200, {'Content-Type': 'text/plain'});

		var outputString = JSON.stringify(thisSvcDef);
		response.write(outputString, 'utf8');
	}
	else
	{	
		// Service Descriptor
		response.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8'});

		response.write('<html><head>');
		response.write("  <link href='/ESRI.ArcGIS.SDS.REST.css' rel='stylesheet' type='text/css'>");
		response.write('</head>');
		response.write('<body>');
		response.write(templateHeader);
		response.write(templateNav);
		response.write(templateAPIRef);
		response.write('<div class="restHeader">');
		response.write('<h2>' + svcName + ' (' + agolDef.type + ')</h2>');
		response.write('</div>');
		response.write('<div class="restBody">');

		var restBody = util.format(templateSvcDef,
								   thisSvcDef.hasVersionedData, 		
								   thisSvcDef.maxRecordCount, 
								   thisSvcDef.supportedQueryFormats,
								   r.pathname, svcName,
								   util.format("Sourced from <a href='%s'>%s</a>", cityDef.url, cityDef.url),
								   "Many thanks to <a href='http://api.citybik.es'>CityBikes</a> for the API!",
								   thisSvcDef.spatialReference.wkid, 
								   extStrForExt(thisSvcDef.initialExtent),
								   extStrForExt(thisSvcDef.fullExtent),
								   thisSvcDef.units);

		response.write(restBody);
		response.write('</div>');
		response.write('</body></html>');
	}
	response.end();
}

app.listen(process.env.VCAP_APP_PORT || 1337);
