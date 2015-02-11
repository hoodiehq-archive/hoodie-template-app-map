/*****
  App Interactions
*****/

// initialize Hoodie
var hoodie  = new Hoodie();

// initialize new Leaflet map
var hoodieMap = L.map('hoodie-map');

// Check the Store for an existing currentLocation and creates the map with that, otherwise grab currentLocation to create the map.
hoodie.store.find('position', 1)
  .done(createMap)
  .fail(getCurrentPosition);

// When a new currentPosition is added or updated then create a map.
hoodie.store.on('position:add position:update', createMap);

// If a user is already signed in, then fill the map with their markers.
if(hoodie.account.username) {
  fillMap();
}

// When a user signs in, signs up, and reauthenticates, fill the map with their markers.
hoodie.account.on('signin signup reauthenticated', fillMap);

// When the user signs out, clear the map of all the users markers.
hoodie.account.on('signout', clearMap);

// When the map is clicked, create a marker in the store and place it on the map and marker list.
hoodieMap.on('click', createMarker);

// When the remove-marker X is clicked, remove the marker from the store and the map.
$('.marker-list').on('click', '[data-action=remove-marker]', deleteMarker);

/****
  App Functions
****/

// Using the GeoLocation API to get your current location.
function getCurrentPosition() {
  window.navigator.geolocation.getCurrentPosition(positionSuccess, alert);
}

// On the success of the current location, add the position to the store.
function positionSuccess(position){
  var longitude = position.coords.longitude,
      latitude = position.coords.latitude,
      storeOptions = {
        'id': 1,
        'lat': latitude,
        'lng': longitude
      };

  hoodie.store.add('position', storeOptions)
    .done(function(position){
      console.log('Position successfully stored:', position);
    })
    .fail(alert);
}

// Create the initial map and assign it to the hoodieMap variable, creates the current location marker and location message.
function createMap(position) {
  hoodieMap.setView([position.lat, position.lng], 18, {animate: true});
  L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(hoodieMap);
  L.marker([position.lat, position.lng]).bindPopup('<p>Your Current Location:</p><p>'+position.lat+' / '+position.lng+'</p>').addTo(hoodieMap);
  $('.location-message').text('Current Location: '+position.lat+' / '+position.lng);
}

// Utility function for adding markers to the store.
function createMarker(e) {
  var lat = e.latlng.lat,
      lng = e.latlng.lng;

  var marker = new L.marker(e.latlng);

  hoodie.store.add('marker', {
    'id': L.stamp(marker),
    '_leaflet_id': L.stamp(marker),
    'lat': lat,
    'lng': lng
  })
  .done(placeMarker)
  .fail(alert);
}

// Utility function for deleting markers from the store.
function deleteMarker(e) {
  var marker = $(e.target).parent();
  var markerID = marker.data("id");

  hoodie.store.remove('marker', markerID)
    .done(removeMarker)
    .fail(alert);
}

// Utility function for placing markers on the map and marker list.
function placeMarker(marker) {
  var lat = marker.lat;
  var lng = marker.lng;
  var mark = new L.marker([lat, lng]);
  var listItem = '<li class="marker" data-id="'+marker.id+'">Marker '+marker.id+' at '+lat+'/'+lng+' <span class="glyphicon glyphicon-remove" data-action="remove-marker"></span></li>';

  mark._leaflet_id = +marker.id; // change the marker's private Leaflet id to the coerced item id from Hoodie store.
  mark.type = 'stored'; // add a custom 'type' property to target when removing these markers from the map later.
  mark.bindPopup('<p>A new marker '+marker.id+' at:</p><p>'+lat+' / '+lng+'</p>');

  hoodieMap.addLayer(mark);
  $('.marker-list').append(listItem);
}

// Utility function for filling the map with a user's stored markers.
function fillMap() {
  hoodie.store.findAll('marker')
    .done(function(markers){
      $('.marker-list').empty();
      markers.forEach(placeMarker);
    })
    .fail(alert);
}

// Utility function for removing markers from the map and marker list.
function removeMarker(marker) {
  var markerID = marker.id;
  hoodieMap.removeLayer(hoodieMap._layers[markerID]);

  $('[data-id='+markerID+']').remove();
}

// Utility function for clearing the map of all the stored markers.
function clearMap(e) {
  for( var layerID in hoodieMap._layers) {
    var layer = hoodieMap._layers[layerID];
    var marker = layer.type === 'stored' ? layer : null;
    if(marker) {
      hoodieMap.removeLayer(marker);
    }
  }
  $('.marker-list').empty();
}

/***

NOTES:
Layers can be accessed and worked upon with Leaflet class methods by passing in an object with a property of '_leaflet_id' containing a number.
Using the _leaflet_id, which is accessible through the hoodie item id or L.stamp, layers can be removed from the map by first locating it in the map._layers array.

i.e. hoodieMap.removeLayer(hoodieMap._layers[id]);

***/
