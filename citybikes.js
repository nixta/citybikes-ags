var http = require('http');
var path = require('path');

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

			res.on('readable', function() {
				var chunk = res.read();
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
							"agsSvc": agol.getServiceJSON(city.name)
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
