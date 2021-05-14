'use strict';
const axios = require('axios');
const AWS = require("aws-sdk");

const lambda = new AWS.Lambda({
  region: "eu-central-1"
});

const { ROOM_ID, MAP_ID, API_KEY } = require("./config");

const getMap = async () => {
  const response = await axios.get('https://gather.town/api/getMap', {
    params: {
      apiKey: API_KEY,
      spaceId: ROOM_ID,
      mapId: MAP_ID,
    }
  });
  return JSON.parse(JSON.stringify(response.data));
};

const setMap = async (mapData) => {
  const response = await axios.post('https://gather.town/api/setMap', {
    apiKey: API_KEY,
    spaceId: ROOM_ID,
    mapId: MAP_ID,
    mapContent: mapData
  });
  return response.data;
};

const replaceSoundSrc = (mapData, id, src, volume = 1, maxDistance = 5) => {
  let newMapData = mapData;
  // Find the door object and change its image and store the old object
  for (let idx = 0; idx < mapData.objects.length; idx++) {
    const object = mapData.objects[idx];
    if (object.properties.url && getQueryParams(object.properties.url).id[0] === id) {
      if (!newMapData.objects[idx].sound) {
        // create new sound property
        newMapData.objects[idx].sound = {
          loop: true,
          src,
          volume,
          maxDistance
        };
      } else {
        newMapData.objects[idx].sound.src = src;
        newMapData.objects[idx].sound.volume = volume;
        newMapData.objects[idx].sound.maxDistance = maxDistance;
      }
    }
  }
  return newMapData;
}

const getQueryParams = (str) => {
  var queryString = str || window.location.search || '';
  var keyValPairs = [];
  var params      = {};
  queryString     = queryString.replace(/.*?\?/,"");

  if (queryString.length)
  {
     keyValPairs = queryString.split('&');
     for (let pairNum in keyValPairs)
     {
        var key = keyValPairs[pairNum].split('=')[0];
        if (!key.length) continue;
        if (typeof params[key] === 'undefined')
        params[key] = [];
        params[key].push(keyValPairs[pairNum].split('=')[1]);
     }
  }
  return params;
}

module.exports.change_station = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const body = JSON.parse(event.body);
  console.log(body.id);
  console.log(body.src);

  const sendResponse = (message, status = 200) => {
    const response = {
      statusCode: status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message,
      }),
    };
    
    callback(null, response);
  };

  if (!body.id) {
    sendResponse('Jukebox id missing!', 403);
    return;
  }
  if (!body.src) {
    sendResponse('Url missing!', 403);
    return;
  }

  getMap().then((currentMap) => {
    currentMap = replaceSoundSrc(currentMap, body.id, body.src, body.volume, body.maxDistance);
    setMap(currentMap).then((response) => {
      console.log(response);

      sendResponse('Changed! May need browser reload to load properly.');
    });
  });
};