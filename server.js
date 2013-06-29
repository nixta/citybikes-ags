var http = require('http');
var url = require("url");
var fs = require("fs");
var path = require("path");
var util = require("util");

var cachedCities = {};

var templateHeader = '<table width="100%" class="userTable"><tr><td class="titlecell">ArcGIS REST Services Directory</td></tr></table>';
var templateNav = '<table class="navTable" width="100%"><tbody><tr valign="top"><td class="breadcrumbs"><a href="/services">Home</a> > <a href="/services">services</a> </td><td align="right"><a href="?f=help" target="_blank">API Reference</a></td></tr></tbody></table>';
var templateAPIRef = '<table><tr><td class="apiref"><a href="?f=pjson" target="_blank">JSON</a></td></tr></table>';

var templateSvcDef = '<b>View In: </b>&nbsp;&nbsp;<a href="http://www.arcgis.com/home/webmap/viewer.html?url=http://services.arcgis.com/OfH668nDRN7tbJh0/ArcGIS/rest/services/centerln/FeatureServer&source=sd" target="_blank">ArcGIS.com Map</a>&nbsp;&nbsp;<a href="http://explorer.arcgis.com?url=http://services.arcgis.com/OfH668nDRN7tbJh0/ArcGIS/rest/services/centerln/FeatureServer&source=sd" target="_blank">ArcGIS Explorer Online</a><br/><br/><b>Service Description:</b> Passthrough service, translating <a href="http://api.citybik.es">CitiBikes API</a> output into ArcGIS Feature Service JSON<br/><br/><b>Has Versioned Data:</b> %s<br/><br/><b>Max Record Count:</b> %d<br/><br/><b>Supported query Formats:</b> %s<br/><br/><a href="/OfH668nDRN7tbJh0/ArcGIS/rest/services/centerln/FeatureServer/layers">All Layers and Tables</a><br/><br/><b>Layers:</b> <br/><ul><li><a href="%s/0">%s</a> (0)</li></ul><br/><b>Description:</b> %s<br/><br/><b>Copyright Text:</b> %s<br/><br/><b>Spatial Reference:</b> %d<br/><br/> <b>Initial Extent:</b> <br/> <ul> %s </ul> <b>Full Extent:</b> <br/> <ul> %s </ul> <b>Units:</b> %s<br/> <br/> <b>Supported Operations: </b> &nbsp;&nbsp;<a href="%s/query">Query</a> <br/><br/>';

var templateEnvelope = 'XMin: %d<br/> YMin: %d<br/> XMax: %d<br/> YMax: %d<br/> Spatial Reference: %d<br/>';

var templatePoint = '{"x" : %d, "y" : %d, "spatialReference" : {"wkid" : 4326}}';

var serviceDef = {
	"currentVersion": 10.11,
	"serviceDescription": "",
	"hasVersionedData": false,
	"supportsDisconnectedEditing": false,
	"supportedQueryFormats": "JSON",
	"maxRecordCount": 2000,
	"hasStaticData": true,
	"capabilities": "Query",
	"description": "",
	"copyrightText": "",
	"spatialReference": {
		"wkid": 4326,
		"latestWkid": 4326
	},
	"initialExtent": {
		"xmin": -180,
		"ymin": -90,
		"xmax": 180,
		"ymax": 90,
		"spatialReference": {
			"wkid": 4326,
			"latestWkid": 4326
		}
	},
	"fullExtent": {
		"xmin": -180,
		"ymin": -90,
		"xmax": 180,
		"ymax": 90,
		"spatialReference": {
			"wkid": 4326,
			"latestWkid": 4326
		}
	},
	"allowGeometryUpdates": false,
	"units": "esriDecimalDegrees",
	"syncEnabled": false,
	"layers": [],
	"tables": []
};

var layerDef = {
"currentVersion": 10.11,
"id" : 0,
"name" : "Not Set",
"type" : "Feature Layer",
"displayField" : "name",
"description" : "Bikes",
"copyrightText" : "citybik.es",
"defaultVisibility": true,
"relationships": [],

"syncCanReturnChanges": false,
"isDataVersioned": false,
"supportsRollbackOnFailureParameter": false,
"supportsStatistics": false,
"supportsAdvancedQueries":false,

"geometryType" : "esriGeometryPoint",
"minScale" : 0,
"maxScale" : 0,
"extent" :  {
	"xmin": -180,
	"ymin": -90,
	"xmax": 180,
	"ymax": 90,
	"spatialReference": {
	"wkid": 4326,
	"latestWkid": 4326
	}
},

"hasM":  false, 
"hasZ":  false,
"allowGeometryUpdates": false,

"hasAttachments" : false,

"htmlPopupType" : "esriServerHTMLPopupTypeNone",

"objectIdField" : "id",
"globalIdField" : "",
"typeIdField" : "",
"fields" : [
  {"name" : "id", "type" : "esriFieldTypeInteger", "alias" : "ID", "nullable" : "true", "domain" : null},
  {"name" : "idx", "type" : "esriFieldTypeInteger", "alias" : "IDX", "nullable" : "true", "domain" : null},
  {"name" : "name", "type" : "esriFieldTypeString", "alias" : "Name", "length" : "255", "nullable" : "true", "domain" : null},
  {"name" : "number", "type" : "esriFieldTypeInteger", "alias" : "Number", "nullable" : "true", "domain" : null},
  {"name" : "free", "type" : "esriFieldTypeInteger", "alias" : "Free", "nullable" : "true", "domain" : null},
  {"name" : "bikes", "type" : "esriFieldTypeInteger", "alias" : "Bikes", "nullable" : "true", "domain" : null},
  {"name" : "address", "type" : "esriFieldTypeString", "alias" : "Address", "length" : "255", "nullable" : "true", "domain" : null},
  {"name" : "timestamp", "type" : "esriFieldTypeString", "alias" : "Timestamp", "length" : "255", "nullable" : "true", "domain" : null}
],
"types" : [],
"templates" : [],
"maxRecordCount": 2000,
"supportedQueryFormats": "JSON",
"hasStaticData" : true,
"capabilities" : "Query"
};

function start() {
	
	function cacheCities(r, callback) {
		// Load the latest list of city services
		console.log("Caching Cities...");
		var added = 0;
		http.get("http://api.citybik.es/networks.json", 
				 function(res)
		{
			console.log("Got response from citibik.es...");
			res.setEncoding('utf8');
			var citiesJSON = "";
			res.on('readable', function() {
				var chunk = res.read();
				citiesJSON = citiesJSON + chunk;
			});
			res.on('end', function() {
				console.log("Caching...");
				var cities = JSON.parse(citiesJSON);
				// update cache
				for (i=0; i<cities.length; i++)
				{
					var city = cities[i];
					if (!(city.name in cachedCities))
					{
						cachedCities[city.name] = {"citySvc": city, "agsSvc": serviceFromCitibike(r, city)};
						added++
					}
				}
				console.log("Cached " + added + " new cities!");
				
				callback();
			});
		});
	}

	function serviceFromCitibike(urlDetails, citibikeSvc) {
		var svcType = "FeatureServer";
		return {
				 "name": citibikeSvc.name,
				 "type": svcType,
				 "url": "/services" + path.sep + citibikeSvc.name + path.sep + svcType
				};
	}
	
	function extStrForExt(ext) {
		return util.format(templateEnvelope, 
							ext.xmin, ext.ymin, 
							ext.xmax, ext.ymax,
							ext.spatialReference.wkid);
	}
	
	function writeServiceDef(r, response, format, svcName) {
		var agolDef = cachedCities[svcName].agsSvc;
		var cityDef = cachedCities[svcName].citySvc;
		
		var thisSvcDef = JSON.parse(JSON.stringify(serviceDef));

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


	function onRequest(request, response) {

		var r = url.parse(request.url, true);
		var pathParts = r.pathname.toLowerCase().replace(/\/+$/,"").split(path.sep);
		var lastPathPart = pathParts[pathParts.length-1];
		console.log(r);
// 		console.log(pathParts);
// 		console.log(lastPathPart);

		if (lastPathPart == 'favicon.ico')
		{
			response.end();
		}
		else if (/\.css$/.test(lastPathPart))
		{
			fs.readFile(__dirname + r.path, 
						{encoding: 'utf8'}, 
						function(err, data) {
							if (err) throw err;
							response.writeHead(200, {'Content-Type': 'text/css'});
							response.write(data, 'utf8');
							response.end();
						});
		}
		else
		{
			var format = (r.query.f || "html").toLowerCase();
			if (format == "pjson") { format = "json"; }
			if (format == "json" || format == "html")
			{
				if (lastPathPart == "services")
				{
					console.log("SERVICES");
					
					cacheCities(r, function() {
						var output = {
										"currentVersion": 10.11,
										"services": []
									 };

						for (var key in cachedCities)
						{
							if (cachedCities.hasOwnProperty(key))
							{
								var city = cachedCities[key].agsSvc;
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
					
							response.write('<html><head>');
							response.write("  <link href='/ESRI.ArcGIS.SDS.REST.css' rel='stylesheet' type='text/css'>");
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
				} 
				else if (pathParts.length >= 4)
				{
					if (lastPathPart == "featureserver" &&
						pathParts[pathParts.length - 3] == "services")
					{
						// Service Definition
						console.log("FEATURESERVER");
						var svcName = pathParts[2];
						if (cachedCities.hasOwnProperty(svcName))
						{
							writeServiceDef(r, response, format, svcName);
						}
						else
						{
							cacheCities(r, function() {
								writeServiceDef(r, response, format, svcName);
							});
						}
					}
					else if (lastPathPart == "0" &&
							 pathParts.length >= 5 &&
							 pathParts[pathParts.length - 2] == "featureserver" &&
							 pathParts[pathParts.length - 4] == "services")
					 {
					 	// Layer
					 	console.log("LAYER");
					 	var cityName = pathParts[pathParts.length - 3];
					 	var city = cachedCities[cityName];
					 	
					 	var thisLayerDef = JSON.parse(JSON.stringify(layerDef));
					 	thisLayerDef.name = cityName;
						response.writeHead(200, {'Content-Type': 'text/plain'});
					 	response.write(JSON.stringify(thisLayerDef));
					 	response.end();
					 }
					else if (lastPathPart == "query" &&
							 pathParts.length >= 6 &&
							 pathParts[pathParts.length - 2] == "0" &&
							 pathParts[pathParts.length - 3] == "featureserver" &&
							 pathParts[pathParts.length - 5] == "services")
					{
						// Query
						console.log("QUERY");
						response.end();
					}
					else
					{
						response.end();
					}
				}
				else
				{
					response.end();
				}
			}
			else
			{
				response.end();
			}
		}
	}
  
  	http.createServer(onRequest).listen(1337);
  	console.log("Server has started");
}

exports.start = start;
