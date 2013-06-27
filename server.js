var http = require('http');
var url = require("url");
var fs = require("fs");
var path = require("path");
var util = require("util");

var cachedCities = {};

var templateHeader = '<table width="100%" class="userTable"><tr><td class="titlecell">ArcGIS REST Services Directory</td></tr></table>';
var templateNav = '<table class="navTable" width="100%"><tbody><tr valign="top"><td class="breadcrumbs"><a href="/services">Home</a> > <a href="/services">services</a> </td><td align="right"><a href="?f=help" target="_blank">API Reference</a></td></tr></tbody></table>';
var templateAPIRef = '<table><tr><td class="apiref"><a href="?f=pjson" target="_blank">JSON</a></td></tr></table>';


var templateSvcDevLayer = '';

var templateSvcDef = '<b>View In: </b>&nbsp;&nbsp;<a href="http://www.arcgis.com/home/webmap/viewer.html?url=http://services.arcgis.com/OfH668nDRN7tbJh0/ArcGIS/rest/services/centerln/FeatureServer&source=sd" target="_blank">ArcGIS.com Map</a>&nbsp;&nbsp;<a href="http://explorer.arcgis.com?url=http://services.arcgis.com/OfH668nDRN7tbJh0/ArcGIS/rest/services/centerln/FeatureServer&source=sd" target="_blank">ArcGIS Explorer Online</a><br/><br/><b>Service Description:</b> Passthrough service, translating <a href="http://api.citybik.es">CitiBikes API</a> output into ArcGIS Feature Service JSON<br/><br/><b>Has Versioned Data:</b> %s<br/><br/><b>Max Record Count:</b> %d<br/><br/><b>Supported query Formats:</b> %s<br/><br/><a href="/OfH668nDRN7tbJh0/ArcGIS/rest/services/centerln/FeatureServer/layers">All Layers and Tables</a><br/><br/><b>Layers:</b> <br/><ul><li><a href="%s/0">%s</a> (0)</li></ul><br/><b>Description:</b> %s<br/><br/><b>Copyright Text:</b> %s<br/><br/><b>Spatial Reference:</b> %d<br/><br/> <b>Initial Extent:</b> <br/> <ul> XMin: -8266226.09782051<br/> YMin: 4938432.22174575<br/> XMax: -8204160.52197109<br/> YMax: 4999832.71327076<br/> Spatial Reference: 102100<br/> </ul> <b>Full Extent:</b> <br/> <ul> XMin: -8266226.09782051<br/> YMin: 4938432.22174575<br/> XMax: -8204160.52197109<br/> YMax: 4999832.71327076<br/> Spatial Reference: 102100<br/> </ul> <b>Units:</b> esriMeters<br/> <br/> <b>Supported Operations: </b> &nbsp;&nbsp;<a href="%s/query">Query</a> <br/><br/>';

var serviceDef = {
	"currentVersion": 10.11,
	"serviceDescription": "",
	"hasVersionedData": false,
	"supportsDisconnectedEditing": false,
	"hasStaticData": true,
	"maxRecordCount": 2000,
	"supportedQueryFormats": "JSON",
	"capabilities": "Query",
	"description": "",
	"copyrightText": "",
	"spatialReference": {
	"wkid": 102100,
	"latestWkid": 3857
	},
	"initialExtent": {
		"xmin": -8265256.72632696,
		"ymin": 4939635.1307387,
		"xmax": -8205149.95759848,
		"ymax": 4998866.91035783,
		"spatialReference": {
			"wkid": 102100,
			"latestWkid": 3857
		}
	},
	"fullExtent": {
		"xmin": -8265256.72632696,
		"ymin": 4939635.1307387,
		"xmax": -8205149.95759848,
		"ymax": 4998866.91035783,
		"spatialReference": {
			"wkid": 102100,
			"latestWkid": 3857
		}
	},
	"allowGeometryUpdates": true,
	"units": "esriMeters",
	"syncEnabled": false,
	"editorTrackingInfo": {
		"enableEditorTracking": false,
		"enableOwnershipAccessControl": false,
		"allowOthersToUpdate": true,
		"allowOthersToDelete": false
	},
	"xssPreventionInfo": {
		"xssPreventionEnabled": true,
		"xssPreventionRule": "InputOnly",
		"xssInputRule": "rejectInvalid"
	},
	"layers": [],
	"tables": []
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

		console.log(format);

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
									   r.pathname);

			response.write(restBody);
			response.write('</div>');
			response.write('</body></html>');
		}
		response.end();
	}


	function onRequest(request, response) {

		var r = url.parse(request.url, true);
		if (r.path != '/favicon.ico')
		{
			console.log(request.url);
 		}

		if (/\.css$/.test(r.pathname))
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
				if (r.pathname.toLowerCase().replace(/\/+$/,"") == "/services")
				{
					console.log("Services directory requested");
					
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
				else
				{
					var pathParts = r.path.split(path.sep);
					console.log(pathParts);

					if (pathParts.length == 4)
					{
						console.log("Service Endpoint");
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
					else
					{
						console.log("Unknown request");
						response.end();
					}
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
