var path = require('path');
var util = require('util');

var servicesUrl = path.sep + path.join('rest', 'services');
var serviceUrlTemplate = path.join(servicesUrl,'%s','FeatureServer');

var layerUrlTemplate = path.join(serviceUrlTemplate,'%s');

var getServiceUrl = function(cityName) {
	return util.format(serviceUrlTemplate, cityName);
};

var getLayerUrl = function(cityName, layerId) {
	return util.format(layerUrlTemplate, cityName, layerId);
};
	
exports.getServicesUrl = function() {
	return servicesUrl;
};

exports.getServiceUrl = getServiceUrl;

exports.getLayerUrl = getLayerUrl;

exports.getServiceJSON = function(cityName) {
	return {
		"name": cityName,
		"type": "FeatureServer",
		"url": exports.getServiceUrl(cityName)
	};
};
