'use strict';

localStorage.ROUTE_SCHEMA = 'id,match,savePath';
localStorage.SERVER_SCHEMA = 'id,url';

if (!localStorage.routes) {
    // First run after installation
    localStorage.routes = JSON.stringify([{
        id: '0',
        match: '^file://[^/]*/',
        savePath: '/'
    }]);
    localStorage.servers = JSON.stringify([{
        id: '0',
        url: 'http://127.0.0.1:9104'
    }]);
} else if (!localStorage.servers) {
    // First run after updating to version 1.x
    (function migrateRules() {
        var routes = JSON.parse(localStorage.routes);
        var endsWithSave = /\/save$/;
        var servers = [];
        var serversSet = {};
        var id = 0;
        for (var i = 0, ii = routes.length; i < ii; i++) {
            var route = routes[i];
            var updatedTo = route.to.replace(endsWithSave, '');
            if (serversSet.hasOwnProperty(updatedTo)) {
                route.id = serversSet[updatedTo];
            } else {
                serversSet[updatedTo] = route.id = id.toString();
                servers.push({url: updatedTo, id: id.toString()});
                id++;
            }
            delete route.stylesheet;
            delete route.script;
            delete route.document;
            delete route.to;
        }
        localStorage.servers = JSON.stringify(servers);
        localStorage.routes = JSON.stringify(routes);
    })();
}

/**
 * @nosideeffects
 * @return Array
 */
function getRoutes() {
    var json = localStorage.routes;
    if (!json) {
        return [];
    }
    var requiredFields = localStorage.ROUTE_SCHEMA.split(',');
    var routes = JSON.parse(json);
    OUTER: for (var i = routes.length; i--;) {
        var route = routes[i];
        for (var j = requiredFields.length; j--;) {
            if (!route[requiredFields[j]]) {
                routes.splice(i, 1);
                continue OUTER;
            }
        }
        route.match = new RegExp(route.match);
    }
    return routes;
}

/**
 * @nosideeffects
 * @return Array
 */
function getServers() {
    return localStorage.servers ? JSON.parse(localStorage.servers) : [];
}

/**
 * @param {Object} request
 * @nosideeffects
 * @return Object
 */
function getBackend(request) {
    var routes = getRoutes();
    for (var i = 0; i < routes.length; i++) {
        var route = routes[i];
        if (!route.match.test(request.url)) {
            continue;
        }
        var servers = getServers();
        for (i = 0; i < servers.length; i++) {
            if (servers[i].id === route.id) {
                return {
                    serverURL: servers[i].url,
                    savePath: urlToPath(request.url.replace(route.match, route.savePath))
                };
            }
        }
    }
    return null;
}

/**
 * @param {string} url
 * @nosideeffects
 * @return {string}
 */
function urlToPath(url) {
    var queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
        url = url.slice(0, queryIndex);
    }
    if (/^\/[C-Z]:\//.test(url)) {
        // Oh, Windows.
        url = url.slice(1);
    }
    return decodeURIComponent(url);
}