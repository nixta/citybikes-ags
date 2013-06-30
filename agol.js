var path = require('path');
var util = require('util');
var fs = require('fs');

var servicesJSON = JSON.parse(fs.readFileSync('templates/services.json', 'utf8'));
var serviceJSON = JSON.parse(fs.readFileSync('templates/featureService.json', 'utf8'));
var layerJSON = JSON.parse(fs.readFileSync('templates/featureLayer.json', 'utf8'));
var featureSetJSON = JSON.parse(fs.readFileSync('templates/featureSet.json', 'utf8'));

var serviceFields = JSON.parse(fs.readFileSync('templates/fields.json', 'utf8'));
layerJSON["fields"] = serviceFields;


var servicesHTML = fs.readFileSync('templates/services.html', 'utf8');
var serviceHTML = fs.readFileSync('templates/featureService.html', 'utf8');
var layerHTML = fs.readFileSync('templates/featureLayer.html', 'utf8');

var servicesUrl = path.sep + path.join('rest', 'services');
var serviceUrlTemplate = path.join(servicesUrl,'%s','FeatureServer');
var layersUrlTemplate = path.join(serviceUrlTemplate,'layers');
var layerUrlTemplate = path.join(serviceUrlTemplate,'%s');


var templatePoint = '{"x" : %d, "y" : %d, "spatialReference" : {"wkid" : 4326}}';


var getServiceUrl = function(cityName) {
	return util.format(serviceUrlTemplate, cityName);
};

var getLayersUrl = function(cityName) {
	return util.format(layersUrlTemplate, cityName);
};
	
var getLayerUrl = function(cityName, layerId) {
	return util.format(layerUrlTemplate, cityName, layerId);
};

exports.getServicesUrl = function() {
	return servicesUrl;
};

exports.getServiceUrl = getServiceUrl;

exports.getLayerUrl = getLayerUrl;

var getServiceJSONForServicesList = function(cityName) {
	return {
		"name": cityName,
		"type": "FeatureServer",
		"url": exports.getServiceUrl(cityName)
	};
};

exports.getServiceJSONForServicesList = getServiceJSONForServicesList;

// Breadcrumb addition
// > <a href=".../neighborhoods/FeatureServer">neighborhoods (FeatureServer)</a> 

function htmlStringForEnvelope(env) {
	var templateEnvelope = '<ul>XMin: %d<br/> YMin: %d<br/> ' +
						   'XMax: %d<br/> YMax: %d<br/> ' + 
						   'Spatial Reference: %d<br/></ul>';
	
	return util.format(templateEnvelope, 
						env.xmin, env.ymin, 
						env.xmax, env.ymax,
						env.spatialReference.wkid);
}

function formatIsJSON(format) {
	var f = format.toLowerCase();
	return f == "json" || f == "pjson";
}

function getHtmlForServicesLayerEntry(citySvc) {
	var servicesLayerEntryHtmlTemplate = '<li><a href="%s">%s</a> (%s)</li>\n';
	return util.format(servicesLayerEntryHtmlTemplate,
						citySvc.url,
						citySvc.name,
						citySvc.type);
}

exports.servicesOutput = function(cities, format) {
	var outStr = ""
	
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
		outStr = JSON.stringify(outJSON);
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

exports.serviceOutput = function(svcName, cities, format) {
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
		outStr = JSON.stringify(thisSvcDef);
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

var fieldHTMLTemplate = '<li>%s <i>(type: %s, alias: %s, nullable: %s, editable: %s)</i></li>\n';
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

exports.layerOutput = function(layerName, layerId, cities, format) {
	var outStr = "";

	var thisLayerDef = JSON.parse(JSON.stringify(layerJSON));
	thisLayerDef.name = layerName;

	if (formatIsJSON(format))
	{
		outStr = JSON.stringify(thisLayerDef);
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
								"./query");
	}
	
	return outStr;
};
