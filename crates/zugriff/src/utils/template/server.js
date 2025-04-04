import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as net from 'node:net';
import * as util from 'node:util';
import * as process from 'node:process';
import { AsyncLocalStorage } from 'node:async_hooks';
import { sha3_384_b64 } from '<sha3.min.js>';

globalThis.AsyncLocalStorage = AsyncLocalStorage;
globalThis.self = globalThis;

const debug = '<DEBUG>' == 'true' ? true : false;
const basedir = '<BASEDIR>';
const dotZugriff = '<DOT_ZUGRIFF>';
const address = '<ADDRESS>';

// * Read configuration file

let config = {};

try {
  const readFile = util.promisify(fs.readFile);
  const content = await readFile(path.join(dotZugriff, 'config.json'));
  config = JSON.parse(content.toString());
  if (debug) {
    console.debug(config);
  }
} catch (error) {
  if (debug) {
    console.error(error);
  }
  process.exit(-1);
}

if (
  ('puppets' in config && typeof config.puppets == 'object') ||
  ('preprocessors' in config && 'puppets' in config.preprocessors)
) {
  let temp = {};

  for (let [from, to] of Object.entries(
    config.puppets || config.preprocessors.puppets
  )) {
    from = from.replace(/\/$/g, '');
    temp[from] = to;
  }

  if ('puppets' in config) {
    delete config['puppets'];
    config.preprocessors = {
      puppets: temp,
    };
  } else {
    config.preprocessors.puppets = temp;
  }
}

if (
  ('redirects' in config && Array.isArray(config.redirects)) ||
  ('preprocessors' in config &&
    'redirects' in config.preprocessors &&
    Array.isArray(config.preprocessors.redirects))
) {
  let redirects = config.redirects || config.preprocessors.redirects;

  let temp = redirects.map((item) => {
    item.path = item.path.replace(/\/$/g, '');
    return item;
  });

  if ('redirects' in config) {
    delete config['redirects'];
  }

  if (!('preprocessors' in config)) {
    config.preprocessors = {};
  }

  config.preprocessors.redirects = temp;
}

let callbacks = {};
let callback;

globalThis.addEventListener = (event, cb) => {
  if (event == 'fetch') {
    callback = cb;
  } else {
    console.warn('Unable to attach handler because of unrecognised event');
  }
};

// * Check for port to listen on

let port = 3000;

let portResolver;
let portPromise = new Promise((resolve) => (portResolver = resolve));

const _server = net.createServer();
_server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    if (debug) {
      console.debug('Port "' + port + '" in use');
    }
    _server.close();
    port += 1;
    _server.listen(port, address);
  }
});
_server.once('listening', () => {
  _server.close();
  portResolver(true);
});
_server.listen(port, address);

await portPromise;

// * create port

const server = http.createServer(async (req, res) => {
  if (debug) console.debug('Received request');

  let tempPath = req.url
    .replace(/\/*$/, '')
    .replace(/(\?.*)$/, '')
    .replace(/(#.*)$/, '');

  let guards = config.guards || config.preprocessors?.guards || [];
  if (guards.length > 0) {
    let auth_required = false;
    let guarded = false;

    function extractCredentials(authorization) {
      if (
        !authorization ||
        authorization.length === 0 ||
        !authorization.startsWith('Basic ')
      ) {
        return undefined;
      } else {
        authorization = authorization.slice('Basic '.length);
        authorization = Buffer.from(authorization, 'base64').toString();
        let [username, password] = authorization.split(':');

        return {
          username: sha3_384_b64(username),
          password:
            password && password.length !== 0
              ? sha3_384_b64(password)
              : undefined,
        };
      }
    }
    let authorization = extractCredentials(req.headers.authorization);

    for (let guard of config.guards || config.preprocessors?.guards || []) {
      for (let pattern of guard.patterns) {
        if (matchPattern(pattern, tempPath)) {
          auth_required = true;
          guarded =
            guard.credentials.username == authorization?.username &&
            guard.credentials.password == (authorization?.password || null);
          if (guarded) {
            break;
          }
        }
      }

      if (guarded) {
        break;
      }
    }

    if (auth_required && !guarded) {
      res.writeHead(401, {
        'WWW-Authenticate': 'Basic',
      });
      res.end();
      return;
    }
  }

  // * Handle static content

  if (
    req.method === 'GET' ||
    req.method === 'HEAD' ||
    (req.method === 'OPTIONS' && req.url)
  ) {
    if (req.method === 'GET') {
      for (let redirect of config.preprocessors?.redirects || []) {
        if (redirect.path == tempPath) {
          if (debug)
            console.debug(
              'Found redirect "' +
                redirect.location +
                '" for path "' +
                tempPath +
                '"' +
                'with status ' +
                redirect.status
            );

          res.writeHead(redirect.status, {
            location: redirect.location,
            'X-Zugriff-Static': true,
          });
          res.end();
          return;
        }
      }
    }

    let puppet = config.preprocessors?.puppets[tempPath];
    if (puppet) {
      if (debug)
        console.debug(
          'Using puppet "' + puppet + '" for path "' + tempPath + '"'
        );
      tempPath = puppet;
    }

    let filePath = path.join(dotZugriff, 'assets', tempPath);

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME[extname] || 'application/octet-stream';

    if (await doesFileExist(filePath)) {
      if (debug) console.debug('Returning file "' + filePath + '"');
      fs.readFile(filePath, (err, content) => {
        if (err) {
          console.error(err);
          res.writeHead(500);
          res.end();
        } else {
          function toHex(value) {
            return Buffer.from(value.toString(), 'utf8').toString('hex');
          }

          let stats = fs.statSync(filePath, { bigint: true });
          let etag =
            '"' +
            toHex(stats.ino) +
            ':' +
            toHex(stats.size) +
            ':' +
            toHex(stats.mtimeMs / BigInt(1000)) +
            ':' +
            toHex(stats.mtimeNs - stats.mtimeMs * BigInt(1000000)) +
            '"';

          let cacheControl = 'max-age=604800';
          if (
            filePath.endsWith('.html') ||
            filePath.endsWith('.htm') ||
            filePath.endsWith('.xhtml')
          ) {
            cacheControl = 'no-cache';
          }

          for (let entry of config.assets) {
            if (typeof entry != 'string') {
              if ('cacheControl' in entry && entry.path === tempPath) {
                cacheControl = entry.cacheControl;
              }
            }
          }

          let headers = {
            'Content-Type': contentType,
            'X-Zugriff-Static': true,
            ETag: etag,
            Date: new Date().toUTCString(),
            'Last-Modified': stats.mtime.toUTCString(),
            'Cache-Control': cacheControl,
            'Content-Length': content.length,
            'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
            'Accept-Ranges': 'bytes',
          };

          if (req.method === 'GET' || req.method === 'HEAD') {
            if (
              (req.headers['if-none-match'] &&
                req.headers['if-none-match']
                  .split(',')
                  .map((h) => h.trim())
                  .includes(etag)) ||
              (req.headers['if-modified-since'] &&
                stats.mtime < new Date(req.headers['if-modified-since']))
            ) {
              res.writeHead(304, headers);
              res.end();
              return;
            }

            if (
              req.headers['if-match'] &&
              req.headers['if-match']
                .split(',')
                .map((h) => h.trim())
                .includes(etag)
            ) {
              res.writeHead(412, headers);
              res.end();
              return;
            }
          }

          if (req.method == 'GET') {
            res.writeHead(200, headers);

            let ranges = [];

            if (req.headers.range) {
              for (let part of req.headers.range
                .slice('bytes='.length)
                .split(',')) {
                part = part.trim();
                if (part.startsWith('-')) {
                  part = part.slice(1);
                  ranges.push(content.buffer.slice(0, Number(part)));
                } else if (part.endsWith('-')) {
                  ranges.push(content.buffer.slice(Number(part)));
                } else {
                  let [start, end] = part.split('-');
                  ranges.push(content.buffer.slice(Number(start), Number(end)));
                }
              }
            } else {
              ranges.push(content);
            }

            res.end(Buffer.concat(ranges));
          } else {
            res.writeHead(200, headers);
            res.end();
          }
        }
      });
      return;
    }
  }

  // * Dynamic content
  if (!tempPath.endsWith('/')) {
    tempPath += '/';
  }

  let route;
  // Check for any but default match
  for (let { path, pattern } of config.functions.filter(
    (r) => r.pattern != '*'
  )) {
    if (matchPattern(pattern, tempPath)) {
      route = path;
      break;
    }
  }

  // Include default match
  if (!route) {
    for (let { path, pattern } of config.functions) {
      if (matchPattern(pattern, tempPath)) {
        route = path;
        break;
      }
    }
  }

  if (!route) {
    if (debug)
      console.debug(
        'Did not find function route match for path "' + tempPath + '"'
      );

    if (await intercept(req.method, 404, res)) {
      return;
    }

    res.statusCode = 404;
    res.end();
    return;
  }

  if (debug)
    console.debug('Using function "' + route + '" for path "' + req.url + '"');

  route = route.replace(/^\//, '');
  let routePath = path.join(dotZugriff, 'functions', route);

  if (/^[Cc]\:/.test(routePath)) {
    routePath = routePath.replace(/\\/g, '/').replace(/^[Cc]\:/, '');
  }

  globalThis.addEventListener('fetch', (event) => {
    event.respondWith(new Response(null, { status: 404 }));
  });

  if (await doesFileExist(routePath)) {
    let module = await import(routePath);

    let handler = extractHandler(module);
    if (handler) {
      globalThis.addEventListener('fetch', (event) =>
        event.respondWith(handler(event))
      );
    } else {
      if (route in callbacks) {
        globalThis.addEventListener('fetch', callbacks[route]);
      } else {
        callbacks[route] = callback;
      }
    }
  }

  let _req = new Request('http://' + req.headers.host + req.url, {
    body:
      req.method === 'GET' || req.method === 'HEAD'
        ? null
        : new ReadableStream({
            start(controller) {
              req.on('data', (data) => {
                controller.enqueue(data);
              });
              req.on('end', () => {
                controller.close();
              });
              req.on('error', (error) => {
                controller.error(error);
              });
            },
          }),
    method: req.method,
    headers: req.headers,
  });

  let resolver;

  let promise = new Promise((resolve) => {
    resolver = resolve;
  });

  _req.respondWith = (re) => {
    resolver(re);
  };

  promise.then(async (_res) => {
    let statusCode = _res.statusCode || _res.status || 200;
    if (await intercept(req.method, statusCode, res)) {
      return;
    }

    res.setHeader('X-Zugriff-Static', false);
    res.statusCode = statusCode;

    _res.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    if (_res.body instanceof ReadableStream) {
      const reader = _res.body.getReader();
      reader.read().then(function processText({ done, value }) {
        if (done) {
          return res.end(value);
        }
        res.write(value);
        return reader.read().then(processText);
      });
    } else {
      res.end(_res.body);
    }
  });

  if (callback) {
    callback(_req);
  } else {
    if (await intercept(req.method, 404, res)) {
      return;
    }

    res.statusCode = 404;
    res.end();
  }
});

server.listen(port, address, () => {
  console.log(`Listening at http://${address}:${port}/`);
});

async function intercept(method, code, res) {
  if (
    Array.isArray(config.interceptors) ||
    Array.isArray(config.postprocessors?.interceptors)
  ) {
    let interceptors =
      config.interceptors || config.postprocessors?.interceptors || [];
    let interceptor = interceptors.find(
      (i) => i.method == method && i.status == code
    );
    if (!interceptor) return false;

    let filePath = path.join(
      dotZugriff,
      'assets',
      interceptor.path.replace(/(\?.*)$/, '').replace(/(#.*)$/, '')
    );
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME[extname] || 'application/octet-stream';

    if (await doesFileExist(filePath)) {
      if (debug) console.debug('Returning file "' + filePath + '"');
      fs.readFile(filePath, (err, content) => {
        if (err) {
          console.error(err);
          res.writeHead(500);
          res.end();
          return true;
        } else {
          res.writeHead(code, {
            'Content-Type': contentType,
            'X-Zugriff-Static': false,
          });
          res.end(content);
          return;
        }
      });
      return true;
    }
  }

  return false;
}

// Most common MIME types
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
const MIME = {
  '.aac': 'audio/aac',
  '.abw': 'application/x-abiword',
  '.arc': 'application/x-freearc',
  '.avif': 'image/avif',
  '.avi': 'video/x-msvideo',
  '.azw': 'application/vnd.amazon.ebook',
  '.bmp': 'image/bmp',
  '.bz': 'application/x-bzip',
  '.bz2': 'application/x-bzip2',
  '.cda': 'application/x-cdf',
  '.csh': 'application/x-csh',
  '.css': 'text/css',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.eot': 'application/vnd.ms-fontobject',
  '.epub': 'application/epub+zip',
  '.gz': 'application/gzip',
  '.gif': 'image/gif',
  '.htm': 'text/html',
  '.html': 'text/html',
  '.ico': 'image/vnd.microsoft.icon',
  '.ics': 'text/calendar',
  '.jar': 'application/java-archive',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.jsonld': 'application/ld+json',
  '.mid': 'audio/midi',
  '.midi': 'audio/x-midi',
  '.mjs': 'text/javascript',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.mpeg': 'video/mpeg',
  '.mpkg': 'application/vnd.apple.installer+xml',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.oga': 'audio/ogg',
  '.ogv': 'video/ogg',
  '.ogx': 'application/ogg',
  '.opus': 'audio/opus',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.php': 'application/x-httpd-php',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.rar': 'application/vnd.rar',
  '.rtf': 'application/rtf',
  '.sh': 'application/x-sh',
  '.svg': 'image/svg+xml',
  '.tar': 'application/x-tar',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.ts': 'video/mp2t',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.vsd': 'application/vnd.visio',
  '.wav': 'audio/wav',
  '.weba': 'audio/webm',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xhtml': 'application/xhtml+xml',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xml': 'application/xml',
  '.xul': 'application/vnd.mozilla.xul+xml',
  '.zip': 'application/zip',
  '.3gp': 'video/3gpp',
  '.3gp2': 'video/3gpp2',
  '.7z': 'application/x-7z-compressed',
  '.wasm': 'application/wasm',
};

async function doesFileExist(location) {
  let resolver;
  let exists = new Promise((resolve) => (resolver = resolve));
  fs.lstat(location, (err, stats) => {
    if (err || !stats.isFile()) {
      return resolver(false);
    }
    resolver(true);
  });

  return await exists;
}

function extractHandler(module) {
  for (let key in module) {
    let value = module[key];
    if (typeof value == 'function') {
      return module[key];
    }

    if (typeof value == 'object') {
      let handler = extractHandler(value);
      if (handler) {
        return handler;
      }
    }
  }
}

function matchPattern(pattern, path) {
  if (!path.endsWith('/')) path += '/';
  pattern = pattern.replace(
    /([\!\@\#\$\%\^\&\)\(\+\=\.\<\>\{\}\[\]\:\;\'\"\|\~\`\_\-\/])/g,
    '\\$1'
  );
  let regexp = new RegExp('^' + pattern.replace(/\*/g, '.*?') + '$');
  return regexp.test(path);
}
