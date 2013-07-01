var http = require('http');
var path = require('path');
var util = require('util');

var agol = require('./agol.js');

var cachedCities = null;
var cacheExpirationTime = new Date();

var cityBikesNetworksURL = "http://api.citybik.es/networks.json";

function cacheCities(callback) {
	if (cacheInvalid())
	{
		// Load the latest list of city services
		console.log("Caching Cities...");
		var added = 0;
		http.get(cityBikesNetworksURL, 
				 function(res)
		{
			console.log("Got response from citibik.es...");

			res.setEncoding('utf8');
			var citiesJSON = "";

			res.on('data', function(chunk) {
				citiesJSON = citiesJSON + chunk;
			});

			res.on('end', function() {
				console.log("Caching...");

				var cities = JSON.parse(citiesJSON);
				var cc = cachedCities = {};

				// update cache
				for (i=0; i<cities.length; i++)
				{
					var city = cities[i];
					if (!(city.name in cc))
					{
						cc[city.name] = {
							"citySvc": city, 
							"agsSvc": agol.getServiceJSONForServicesList(city.name),
							"bikes": { 
									lastReadTime: -1,
									cacheExpirationTime: new Date(),
									cachedBikes: []
								}
						};
						added++
					}
				}
				
				cacheExpirationTime = new Date();
				cacheExpirationTime.setTime(cacheExpirationTime.getTime() + 30*60000);
				console.log("Cached " + added + " new cities!");
				console.log("Cache expires at: " + cacheExpirationTime);
			
				callback(cachedCities);
			});
		});
	}
	else
	{
		callback(cachedCities);
	}
}

function bikesCacheInvalid(city) {
	var bikes = city.bikes;
	return (bikes.lastReadTime == -1 || bikes.cacheExpirationTime <= new Date());
}

function getBikes(city, callback) {
	if (bikesCacheInvalid(city))
	{
		var cityBikesUrl = city.citySvc.url;
		http.get(cityBikesUrl,
				 function (res) {
			res.setEncoding('utf8');
			var bikesJSON = "";
			
			res.on('data', function(chunk) {
				bikesJSON = bikesJSON + chunk;
			});

			res.on('end', function() {
				var bikes = JSON.parse(bikesJSON);

				city.bikes.cachedBikes = [];
				var minX = minY = maxX = maxY = 0;
				for (var i=0; i < bikes.length; i++)
				{
					var bike = bikes[i];
					var agolBike = { 
						"geometry": {},
						"attributes": {}
					};
					var x = bike.lng / 1000000;
					var y = bike.lat / 1000000;
					agolBike.geometry["x"] = x;
					agolBike.geometry["y"] = y;
					if (x < minX) minX = x;
					if (x > maxX) maxX = x;
					if (y < minY) minY = y;
					if (y > maxY) maxY = y;
					agolBike.attributes = JSON.parse(JSON.stringify(bike));
					delete agolBike.attributes["lat"];
					delete agolBike.attributes["lng"];
					delete agolBike.attributes["coordinates"];
					city.bikes.cachedBikes.push(agolBike);
				}
				city.bikes.extent = {
					"minX": minX, "minY": minY,
					"maxX": maxX, "maxY": maxY
				};
				city.bikes.lastReadTime = new Date();
				city.bikes.cacheExpirationTime =
					new Date(city.bikes.lastReadTime.getTime() + 3*60000);
					
				console.log(util.format('Cached %d bikes for %s at %s (expires %s)',
										bikes.length, city.citySvc.name,
										city.bikes.lastReadTime,
										city.bikes.cacheExpirationTime));
				
				callback(city.bikes.cachedBikes);
			});
		});
	}
	else
	{
		callback(city.bikes.cachedBikes);
	}
}

function cacheInvalid() {
	var now = new Date();
	return (cachedCities == null) || (now >= cacheExpirationTime);
}

exports.getCities = function(callback) {
	if (cacheInvalid())
	{
		cacheCities(callback);
	}
	else
	{
		callback(cachedCities);
	}
}

exports.getBikes = getBikes;

