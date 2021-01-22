'use strict';
const axios = require('axios');
const AWS = require("aws-sdk");

const lambda = new AWS.Lambda({
  region: "eu-central-1"
});

const { ROOM_ID, MAP_ID, API_KEY, DOOR_IMAGES, DOOR_POS, PASSWORD } = require("./config");

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

const replaceItem = (mapData, normal, highlighted) => {
  let newMapData = mapData;
  // Find the door object and change its image and store the old object
  for (let idx = 0; idx < mapData.objects.length; idx++) {
    const object = mapData.objects[idx];
    if (object.x === DOOR_POS.x && object.y === DOOR_POS.y) {
      newMapData.objects[idx].normal = normal;
      newMapData.objects[idx].highlighted = highlighted;
    }
  }
  return newMapData;
}

const setImpassableTile = (mapData, active) => {
  let newMapData = mapData;
  const buf = Uint8Array.from(Buffer.from(mapData.collisions, 'base64'));
  buf[DOOR_POS.y * mapData.dimensions[0] + DOOR_POS.x] = active ? 0x01 : 0x00;
  mapData.collisions = Buffer.from(buf).toString('base64');
  return newMapData;
}

module.exports.submit_password = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const body = JSON.parse(event.body);
  console.log(body.password);

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

  if (body.password !== PASSWORD) {
    sendResponse('Wrong password!', 403);
    return;
  }

  getMap().then((currentMap) => {
    currentMap = replaceItem(currentMap, DOOR_IMAGES.open, DOOR_IMAGES.open);
    currentMap = setImpassableTile(currentMap, false);
    setMap(currentMap).then((response) => {
      console.log(response);

      //invoke other function to close door after 5 seconds
      const params = {
        FunctionName: "gather-api-dev-closeDoor",
        InvocationType: "Event",
        Payload: JSON.stringify({"change": true})
      };

      lambda.invoke(params, function(error, data) {
        if (error) {
          console.error(JSON.stringify(error));
          return new Error(`Error printing messages: ${JSON.stringify(error)}`);
        } else if (data) {
          console.log(data);
        }
      });
      sendResponse('Opened!');
    });
  });
};

module.exports.close_door = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  setTimeout(() => {
    getMap().then((currentMap) => {
      currentMap = replaceItem(currentMap, DOOR_IMAGES.closed, DOOR_IMAGES.closed_highlight);
      currentMap = setImpassableTile(currentMap, true);
      setMap(currentMap).then((response) => {
        console.log(response);
        callback(null, response);
      });
    });
  }, 5000);
};