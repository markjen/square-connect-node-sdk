/*
Copyright 2014 Mark Jen

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var https = require('https'),
    url = require('url'),
    util = require('util'),
    SQUARE_CONNECT_HOST = 'connect.squareup.com',
    SQUARE_CONNECT_VERSION = 'v1';

Square = function(accessToken, logger) {
  this.accessToken = accessToken;
  this.logger = logger || console;
};

Square.prototype.api = function() {
  var logger = this.logger,
      args = Array.prototype.slice.call(arguments),
      path = args.shift(),
      next = args.shift(),
      method, params, cb, headers, req;

  while (next) {
    var type = typeof next;
    if (type === 'string' && !method) {
      method = next.toLowerCase();
    } else if (type === 'function' && !cb) {
      cb = next;
    } else if (type === 'object' && !params) {
      params = next;
    } else {
      handleError(new Error('Invalid argument passed to api(): ' + util.inspect(next)), cb, logger);
      return false;
    }
    next = args.shift();
  }

  if (typeof path !== 'string') {
    handleError(new Error('Invalid path passed to api(): ' + util.inspect(path)), cb, logger);
    return false;
  }

  method = method && method.toUpperCase() || 'GET';

  if (path[0] !== '/') {
    path = '/' + path;
  }
  path = '/' + SQUARE_CONNECT_VERSION + path;
  if (params && method === 'GET') {
    path += '?' + querystring.stringify(params);
  }

  headers = {Authorization: 'Bearer ' + this.accessToken};
  if (method === 'POST' || method === 'PUT') {
    headers['Content-Type'] = 'application/json';
  }

  req = https.request(
      {
        hostname: SQUARE_CONNECT_HOST,
        port: 443,
        path: path,
        method: method,
        headers: headers
      },
      function(res) {
        res.on('error', function(e) {
          handleError(e, cb, logger);
        });
        
        var chunks = [];
        res.on('data', function(d) {
          chunks.push(d);
        });
        
        res.on('end', function() {
          cb(undefined, {
            statusCode: res.statusCode,
            headers: res.headers,
            data: JSON.parse(chunks.join())
          });
        });
      });

  if (params && method !== 'GET') {
    req.write(JSON.stringify(params));
  }

  req.end();

  req.on('error', function(e) {
    handleError(e, cb, logger);
  });

  return true;
};

function handleError(err, cb, logger) {
  logger.error(err);
  if (cb) {
    cb(err);
  } else {
    throw err;
  }
}

module.exports = Square;
