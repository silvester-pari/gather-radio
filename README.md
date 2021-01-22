# Gather API tests

Based on https://github.com/gathertown/door-by-api

## Setup

```bash
npm install -g serverless
```

## Invoke the function locally

```bash
serverless invoke local --function currentTime
```

## Deploy

In order to deploy the endpoint, simply run:

```bash
serverless deploy
```
For the frontend in `client/dist` (uploaded to S3), run:
```bash
serverless client deploy
```

## Config
You need to set a `config.js` in the root folder:

```bash
module.exports = {
  ROOM_ID: 'space\\id',
  MAP_ID: 'room-name',
  API_KEY: 'api-key',
  DOOR_IMAGES: {
    open: 'open-url',
    closed: 'close-url',
    closed_highlight: 'close-highlight-url',
  },
  DOOR_POS: {
    x: x-pos,
    y: y-pos
  },
  PASSWORD: 'password',
};
```
...and a `hint.js` in client/dist:

```bash
const passwordHint = '12345';
```