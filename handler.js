'use strict';
const axios = require('axios');

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

const replaceSoundSrc = (mapData, id, src, volume = 0.5, maxDistance = 5) => {
  let newMapData = mapData;
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

const getSoundObject = (mapData, id) => {
  let soundObject;
  for (let idx = 0; idx < mapData.objects.length; idx++) {
    const object = mapData.objects[idx];
    if (object.properties.url && getQueryParams(object.properties.url).id[0] === id) {
      soundObject = mapData.objects[idx].sound;
    }
  }
  return soundObject;
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

module.exports.stream_url = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const body = JSON.parse(event.body);
  const parameters = event.queryStringParameters;

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

  if (event.httpMethod === 'GET') {
    if (!parameters.id) {
      sendResponse('Jukebox id missing!', 403);
      return;
    }
    getMap().then((currentMap) => {
      const soundObject = getSoundObject(currentMap, parameters.id);
      sendResponse(soundObject);
    });
    return;
  }
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