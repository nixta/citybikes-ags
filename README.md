citybike-ags-js
===============

A node.js "ArcGIS Server" to provide an AGS bridge to api.citybik.es

Live version available [here](http://citybikes-ags.aws.af.cm/rest/services) (hosted by AppFog).

This node.js project handles a subset of ArcGIS Server requests to describe services and return query results.

It makes use of the two api calls availanble at [CityBik.es](http://api.citybik.es) to request up-to-date bike 
share information for bike share systems around the world, and present them as Feature Services on an ArcGIS Server.

dublin and citibikenyc are good examples with actual bike stations available (some services return no results from citybik.es).

###Known Limitations
* Only spatial references 4326 and 102100 are supported
* Queries only work against the layer end point. Feature Server queries are declared as a capability but not yet implemented.

###Note
This ReadMe is incomplete. Just a placeholder.
