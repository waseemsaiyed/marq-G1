/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "0424571fafaab94cd8e9fd8fb9f53a7b"
  }, {
    "url": "pwa-512x512.png",
    "revision": "0424571fafaab94cd8e9fd8fb9f53a7b"
  }, {
    "url": "pwa-192x192.png",
    "revision": "06ac45a73ff478ac42b47b1cc0647371"
  }, {
    "url": "marq-logo.svg",
    "revision": "4964a1d78a7e5eb3864c5ffd1fa68d3a"
  }, {
    "url": "logo marq.png",
    "revision": "2f962ca41aea7aa137e8f2e077600e83"
  }, {
    "url": "index.html",
    "revision": "036d9619cc6dfa202e74fd86ea9ff2ff"
  }, {
    "url": "icon.svg",
    "revision": "a1b0f8c160ff2b178c01bd18458560c7"
  }, {
    "url": "favicon.ico",
    "revision": "03ab56006134e82db8cbc76d8ac259d5"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "d70e8c3dec325977f56d2196ecf11c01"
  }, {
    "url": "assets/workbox-window.prod.es5-BBnX5xw4.js",
    "revision": null
  }, {
    "url": "assets/web-v_WCA85X.js",
    "revision": null
  }, {
    "url": "assets/web-BT5Jwn9q.js",
    "revision": null
  }, {
    "url": "assets/virtual_pwa-register-C-t7OmAr.js",
    "revision": null
  }, {
    "url": "assets/index-DGVhjjIz.css",
    "revision": null
  }, {
    "url": "assets/index-C-Kdh5UQ.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "d70e8c3dec325977f56d2196ecf11c01"
  }, {
    "url": "favicon.ico",
    "revision": "03ab56006134e82db8cbc76d8ac259d5"
  }, {
    "url": "icon.svg",
    "revision": "a1b0f8c160ff2b178c01bd18458560c7"
  }, {
    "url": "pwa-192x192.png",
    "revision": "06ac45a73ff478ac42b47b1cc0647371"
  }, {
    "url": "pwa-512x512.png",
    "revision": "0424571fafaab94cd8e9fd8fb9f53a7b"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "0424571fafaab94cd8e9fd8fb9f53a7b"
  }, {
    "url": "manifest.webmanifest",
    "revision": "b9d9236bac68f53b04cfa87eeb0c8b74"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
