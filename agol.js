var path = require('path');
var util = require('util');
var fs = require('fs');

var infoJSON = JSON.parse(fs.readFileSync('templates/info.json', 'utf8'));
var servicesJSON = JSON.parse(fs.readFileSync('templates/services.json', 'utf8'));
var serviceJSON = JSON.parse(fs.readFileSync('templates/featureService.json', 'utf8'));
var layerJSON = JSON.parse(fs.readFileSync('templates/featureLayer.json', 'utf8'));
var featureSetJSON = JSON.parse(fs.readFileSync('templates/featureSet.json', 'utf8'));

var queryCountJSON = JSON.parse(fs.readFileSync('templates/queryCount.json', 'utf8'));
var queryIdsJSON = JSON.parse(fs.readFileSync('templates/queryIds.json', 'utf8'));


var serviceFields = JSON.parse(fs.readFileSync('templates/fields.json', 'utf8'));
layerJSON["fields"] = serviceFields;
featureSetJSON["fields"] = serviceFields;


var agolVersion = 10.1;
var agolFullVersion = "10.1";
infoJSON.currentVersion = layerJSON.currentVersion = serviceJSON.currentVersion = agolVersion;
infoJSON.fullVersion = agolFullVersion;


var servicesHTML = fs.readFileSync('templates/services.html', 'utf8');
var serviceHTML = fs.readFileSync('templates/featureService.html', 'utf8');
var layerHTML = fs.readFileSync('templates/featureLayer.html', 'utf8');
var infoHTML = fs.readFileSync('templates/info.html', 'utf8');

var servicesUrl = path.sep + path.join('rest', 'services');
var infoUrl = path.sep + path.join('rest', 'info');
var serviceUrlTemplate = path.join(servicesUrl,'%s','FeatureServer');
var layersUrlTemplate = path.join(serviceUrlTemplate,'layers');
var layerUrlTemplate = path.join(serviceUrlTemplate,'%s');
var queryUrlTemplate = path.join(layerUrlTemplate,'query');

var envelopeHTMLTemplate = '<ul>XMin: %d<br/> YMin: %d<br/> ' +
					   	   'XMax: %d<br/> YMax: %d<br/> ' + 
					   	   'Spatial Reference: %d<br/></ul>';
var fieldHTMLTemplate = '<li>%s <i>(type: %s, alias: %s, nullable: %s, editable: %s)</i></li>\n';

var pointJSONTemplate = '{"x" : %d, "y" : %d, "spatialReference" : {"wkid" : 4326}}';

// URLs
var getServicesUrl = function() {
	return servicesUrl;
};

var getInfoUrl = function() {
	return infoUrl;
};

var getServiceUrl = function(cityName) {
	return util.format(serviceUrlTemplate, cityName);
};

var getLayersUrl = function(cityName) {
	return util.format(layersUrlTemplate, cityName);
};
	
var getLayerUrl = function(cityName, layerId) {
	return util.format(layerUrlTemplate, cityName, layerId);
};

var getLayerQueryUrl = function(cityName, layerId) {
	return util.format(queryUrlTemplate, cityName, layerId);
};






var getServiceJSONForServicesList = function(cityName) {
	return {
		"name": cityName,
		"type": "FeatureServer",
		"url": exports.getServiceUrl(cityName)
	};
};

// Breadcrumb addition
// > <a href=".../neighborhoods/FeatureServer">neighborhoods (FeatureServer)</a> 

function htmlStringForEnvelope(env) {
	return util.format(envelopeHTMLTemplate, 
						env.xmin, env.ymin, 
						env.xmax, env.ymax,
						env.spatialReference.wkid);
}

function normalizeFormat(format) {
	return (format || 'html').toLowerCase();
}

function formatIsJSON(format) {
	var f = normalizeFormat(format);
	return f == 'json' || f == 'pjson';
}

function contentTypeForFormat(format) {
	var f = normalizeFormat(format);
	switch (f)
	{
		case 'json':
		case 'pjson':
			return 'text/plain';
		default:
			return 'text/html';
	}
};

function getHtmlForServicesLayerEntry(citySvc) {
	var servicesLayerEntryHtmlTemplate = '<li><a href="%s">%s</a> (%s)</li>\n';
	return util.format(servicesLayerEntryHtmlTemplate,
						citySvc.url,
						citySvc.name,
						citySvc.type);
}

var infoOutput = function(format) {
	if (formatIsJSON(format))
	{
		return infoJSON;
	}
	else
	{
		return util.format(infoHTML, infoJSON.currentVersion, infoJSON.fullVersion);
	}
};

var servicesOutput = function(cities, format) {
	var outStr = "";
	
	var outJSON = JSON.parse(JSON.stringify(servicesJSON));
	
	var sortedCityNames = [];
	
	for (var cityName in cities)
	{
		sortedCityNames.push(cityName);
	}
	
	sortedCityNames.sort();
	
	for (var i=0; i<sortedCityNames.length; i++)
	{
		var cityName = sortedCityNames[i];
		var city = cities[cityName];
		outJSON.services.push(city.agsSvc);
	}

	if (formatIsJSON(format))
	{
		outStr = outJSON;
	}
	else
	{
		var layersHTML = "";
		for (var i=0; i < outJSON.services.length; i++)
		{
			layersHTML = layersHTML + getHtmlForServicesLayerEntry(outJSON.services[i]);
		}
		outStr = util.format(servicesHTML,
			servicesUrl, servicesUrl,
			outJSON.currentVersion,
			layersHTML);
	}
	return outStr;
};

var serviceOutput = function(svcName, cities, format) {
	var outStr = "";

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

	if (formatIsJSON(format))
	{
		outStr = thisSvcDef;
	}
	else
	{	
		var layerHTML = util.format('<li><a href="%s">%s</a> (%d)</li>',
									getLayerUrl(svcName, 0), svcName, 0);

		outStr = util.format(serviceHTML,
			svcName, "Feature Server",
			servicesUrl, servicesUrl, "",
			svcName, "Feature Server",
			thisSvcDef.hasVersionedData,
			thisSvcDef.maxRecordCount,
			thisSvcDef.supportedQueryFormats,
			getLayersUrl(svcName),
			layerHTML,
			thisSvcDef.description,
			thisSvcDef.copyrightText,
			thisSvcDef.spatialReference.wkid,
			htmlStringForEnvelope(thisSvcDef.initialExtent),
			htmlStringForEnvelope(thisSvcDef.fullExtent),
			thisSvcDef.units,
			"FSQueryURL"
		);
	}
	
	return outStr;
};

function getHtmlForFields(fields) {
	var outStr = "";
	for (var i=0; i < fields.length; i++)
	{
		var field = fields[i];
		outStr = outStr + util.format(fieldHTMLTemplate,
										field.name,
										field.type,
										field.alias,
										field.nullable,
										false);
	}
	return outStr;
};

var layerOutput = function(layerName, layerId, cities, format) {
	var outStr = "";

	var thisLayerDef = JSON.parse(JSON.stringify(layerJSON));
	thisLayerDef.name = layerName;
	
	var city = cities[layerName].citySvc;
	var x = city.lng;
	var y = city.lat;
	var w = 0.5, h = 0.5;
	thisLayerDef.extent.xmin = x - (w/2);
	thisLayerDef.extent.xmax = x + (w/2);
	thisLayerDef.extent.ymin = y - (h/2);
	thisLayerDef.extent.ymax = y + (h/2);

	if (formatIsJSON(format))
	{
		outStr = thisLayerDef;
	}
	else
	{
		outStr = util.format(layerHTML,
								layerName, layerId,
								servicesUrl, servicesUrl,
								getServiceUrl(layerName), layerName, thisLayerDef.type,
								getLayerUrl(layerName, layerId), layerName,
								layerName, layerId,
								layerName,
								thisLayerDef.displayField,
								thisLayerDef.description,
								thisLayerDef.copyrightText,
								thisLayerDef.minScale,
								thisLayerDef.maxScale,
								thisLayerDef.maxRecordCount,
								htmlStringForEnvelope(thisLayerDef.extent),
								getHtmlForFields(thisLayerDef.fields),
								getLayerQueryUrl(layerName, layerId));
	}
	
	return outStr;
};

var queryOutput = function(layerName, layerId, bikes, format, countOnly, idsOnly, outSR) {
	countOnly = countOnly || false;
	idsOnly = idsOnly || false;
	outSR = outSR || 4326;
	
	var outStr = "";

	if (formatIsJSON(format))
	{
		if (countOnly)
		{
			outStr = queryCountOutput(layerName, layerId, bikes);
		}
		else if (idsOnly)
		{
			outStr = queryIdsOutput(layerName, layerId, bikes);
		}
		else
		{
			var featureSet = JSON.parse(JSON.stringify(featureSetJSON));
			
			if (outSR == 102100)
			{
				var projectedBikes = [];
				
				for (var i=0; i<bikes.length; i++)
				{
					var bike = JSON.parse(JSON.stringify(bikes[i]));
					bike.geometry = coordToMercator(bike.geometry);
					projectedBikes.push(bike);
				}

				featureSet.features = projectedBikes;
				featureSet.spatialReference.wkid = 102100;
			}
			else
			{
				featureSet.features = bikes;
			}

			outStr = featureSet;
		}
	}
	else
	{
		outStr = "Format must be json or pjson";
	}
	
	return outStr;
};

/*
This code is shamelessly stolen from the Terraformer project.
https://github.com/Esri/Terraformer/blob/master/src/terraformer.js#L324
*/
var EarthRadius = 6378137,
	RadiansPerDegree =  0.017453292519943;

function degToRad(deg) {
	return deg * RadiansPerDegree;
}

function coordToMercator(coord) {
	var x = coord.x;
	var y = Math.max(Math.min(coord.y, 89.99999), -89.99999);
	return {
		"x": degToRad(x) * EarthRadius,
		"y": EarthRadius/2.0 * Math.log( (1.0 + Math.sin(degToRad(y))) / (1.0 - Math.sin(degToRad(y))) ),
		"spatialReference": {"wkid": 102100}
	};
}


var queryCountOutput = function(layerName, layerId, bikes) {
	var outputJSON = JSON.parse(JSON.stringify(queryCountJSON));
	
	outputJSON.layers[0].count = bikes.length;
	
	return outputJSON;
};

var queryIdsOutput = function(layerName, layerId, bikes) {
	var outputJSON = JSON.parse(JSON.stringify(queryIdsJSON));

	var objectIds = outputJSON.layers[0].objectIds;

	for (var i=0; i<bikes.length; i++)
	{
		var bike = bikes[i];
		objectIds.push(bike.attributes.id);
	}

	return outputJSON;
};


// Module Exports
exports.getServicesUrl = getServicesUrl;
exports.getInfoUrl = getInfoUrl;
exports.getServiceUrl = getServiceUrl;
exports.getLayerUrl = getLayerUrl;
exports.getLayerQueryUrl = getLayerQueryUrl;

exports.servicesOutput = servicesOutput;
exports.infoOutput = infoOutput;
exports.serviceOutput = serviceOutput;
exports.layerOutput = layerOutput;
exports.queryOutput = queryOutput;
exports.contentTypeForFormat = contentTypeForFormat;

exports.getServiceJSONForServicesList = getServiceJSONForServicesList;
