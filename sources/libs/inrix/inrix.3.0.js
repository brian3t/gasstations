// ==ClosureCompiler==
// @compilation_level SIMPLE_OPTIMIZATIONS
// @output_file_name inrix.3.0.min.js
// ==/ClosureCompiler==

/**
 * @module InrixPlatform
 */

;(function()
{

    // Initial Setup
    // -------------

    // Save a reference to the global object (`window` in the browser, `global`
    // on the server).
    var root = this;

    // Error codes for processing platform errors
    var  kClientError = -1,
        kXmlParseError = -2,
        kNoAuthToken = -3,
        kNoNetwork = -4,
        kNetworkTimeout = -6,
        kInvalidRequest = -10,
        kInvalidResponse = -11,
        kRouteIsTooLong = -12,
        kInvalidParameters = -13,
        kUnsupportedFunction = -14,
        kJSONParseError = -15,
        kUnableToGetToken = -16;

    // Save the previous value of the `Inrix` variable, so that it can be
    // restored later on, if `noConflict` is used.
    var previousInrix = root.Inrix;

    // Require jQuery or some other DOM library, if we're on the server, and it's not already present.
    // For Inrix's purposes, jQuery, Zepto, or Ender owns the `$` variable.
    var $ = root.jQuery || root.Zepto || root.ender;
    if (!$ && (typeof require !== 'undefined')) $ = require('jquery');

    /**
     * Inrix platform
     *
     * @class Inrix
     */
    // The top-level namespace. All public Inrix classes and modules will
    // be attached to this. 
    root.Inrix = {
        /**
         * Current version of the library.
         *
         * @property  {String} VERSION
         */
        VERSION: '3.0',

        /**
         * Runs Inrix.js in *noConflict* mode, returning the `Inrix` variable
         * to its previous owner. Returns a reference to this Inrix object.
         *
         * @method noConflict
         * @return Inrix object
         */
        noConflict: function() {
            root.Inrix = previousInrix;
            return this;
        },

        // configuration values that control behavior of the platform library
        // applications can override the configuration values in their module definition
        configuration: {
            appVersion: this.VERSION,
            systemVersion: undefined,  // must be specified by the application
            deviceModel: undefined,    // must be specified by the application
            serverUrl: undefined,      // must be specified by the application
            vendorId: undefined,       // must be specified by the application
            vendorToken: undefined,    // must be specified by the application
            serverHandler: '/MobileGateway/Mobile.ashx',
            useProxy: false,
            proxyUrl: 'proxy.ashx',
            speedbucketId: '54135',
            comparativeSpeedBucketId: '764333297',
            coverage: {
                na: '255',
                eu: 8
            },
            DEFAULT_FRCLEVEL: '1,2',
            DEFAULT_TIMEOUT: 30000,
            DEFAULT_DATATYPE: 'xml',
            LONGITUDE_DIVIDER: -30
        },

        /**
         * @property  {Object} settings User-specific settings that can be changed and should be persisted.
         * Applications can extend the object to add extra settings that will be saved and loaded by the platform.
         *
         * @property  {String} settings.hardwareId Should be generated and persisted.
         * @property  {String} settings.consumerId Should be generated and persisted.
         */
        settings: {
            hardwareId: undefined,
            consumerId: undefined
        },

        _token: undefined,
        _tokenExpiry: '2010-01-01T00:00:000Z',
        _tokenUrls: undefined,
        _appVersion: '',

        _tokenRequest: undefined,
        _deviceAuthFailureCallback: undefined,
        _registrationRequest: undefined,

        /**
         * @class Inrix
         * @constructor
         * @param {Object} config
         */
        init: function(config) {
            this.updateConfiguration(config);
            this._loadSettings();
            this._currentLocation = {latitude: '0', longitude: '0'};
        },

        /**
         * Sets the version of the application using this library, so it can be used in subsequent requests.
         *
         * @method setAppVersion
         * @param {String} version Application version.
         */
        setAppVersion: function(version) {
            this._appVersion = version;
        },

        /**
         * Update current configuration settings with specified configuration.
         *
         * @method updateConfiguration
         * @param config Config data that current configuration should be extended/updated with.
         */
        updateConfiguration: function(config) {
            //            console.log('>>> Config before: ' + JSON.stringify(this.configuration));
            //            console.log('>>> Updating with: ' + JSON.stringify(config));
            $.extend(this.configuration, config);
            //            console.log('>>> Result: ' + JSON.stringify(this.configuration));
        },

        /**
         * Set the JavaScript library that will be used for DOM manipulation and
         * Ajax calls (a.k.a. the `$` variable). By default Inrix will use: jQuery,
         * Zepto, or Ender; but the `setDomLibrary()` method lets you inject an
         * alternate JavaScript library (or a mock library for testing your views
         * outside of a browser).
         *
         * @method setDomLibrary
         * @param lib Config data that current configuration should be extended/updated with.
         */
        setDomLibrary: function(lib) {
            $ = lib;
        },

        /**
         * @method _loadSettings
         * @private
         */
        _loadSettings : function() {
            var settings = (typeof this.settings.load === 'function') && this.settings.load();
            if (settings) {
                this.settings = $.extend(settings, {
                    load: this.settings.load,
                    save: this.settings.save});
            }
        },

        /**
         * Saves current settings if Save function is defined
         *
         * @method _saveSettings
         * @private
         */
        _saveSettings: function() {
            (typeof this.settings.save === 'function') && this.settings.save();
        },

        /**
         * Inrix.userLogin
         *
         * @method userLogin
         *
         * @description: Login the user using provided credentials
         *
         * @param options.userId user id for the user login
         *
         * @param options.password password for the user login
         *
         * @param options.success Callback invoked during successful login,
         *                        Returns consumerId for the login
         *
         * @param [options.error] Callback invoked during failed login attempt
         *                        TBD: error status
         */
        userLogin: function(options) {

            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.User.Login'
            });

            return this.deviceRegister(options);
        },

        /**
        * Inrix.deviceRegister
        * @method deviceRegister
        *
        * @description: Register the mobile device with the server for data access
         * Details on the Mobile.Device.Register API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/mobile.device.register/?api=mobile
        * @params {Object} options
        * @params {Function} options.succcess Callback invoked during successful login, returns consumerId for the login.
        * @params {Function} [options.error]   Callback invoked during failed login attempt. TBD: error status.
        */
        deviceRegister: function(options) {
            // only allow one registration request at a time
            if (this._registrationRequest) {
                return this._registrationRequest;
            }

            if (this.hasConsumerId() && !options.forceRegister) {
                // if we already have consumerId only trigger token request
                return this.getAuthTokenFromServer().done(options.success).fail(options.error);
            }

            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Device.Register'
            });

            options.url = this.configuration.serverUrl + this.configuration.serverHandler;
            options.appVersion = this.configuration.appVersion;
            options.systemVersion = this.configuration.systemVersion;
            options.deviceModel = this.configuration.deviceModel;
            options.hardwareId = this.getHardwareId();
            options.vendorId = this.configuration.vendorId;
            options.forceHttps= true;


            options.token = this.tokenizer([
                options.vendorId,
                options.hardwareId,
                options.appVersion,
                options.deviceModel,
                options.systemVersion,
                this.configuration.vendorToken
            ].join("|").toLowerCase());

            // resolve/reject the deferred only after token call is complete
            var dfd = $.Deferred();

            var originalSuccess = options.success;// parser subscription
            var originalError = options.error;
            var originalComplete = options.complete;
            var registerError = options.registerError;

            // make sure original callbacks are called only after auth is completed
            dfd.fail(options.error);
            delete options.success;
            delete options.error;
            delete options.complete;
            delete options.registerError;

            var self = this;
            this.callAPI(options)
                .done(function(results) {
                    self._registrationRequest = null;

                    var consumerId = $(results).find('Inrix > DeviceId').text();
                    self.settings.consumerId = consumerId;
                    self._saveSettings();

                    // Call original success callback.
                    originalSuccess && originalSuccess(results);

                    var callback = function() {
                        originalComplete && originalComplete();
                    };

                    self.getAuthTokenFromServer().done(dfd.resolve).done(callback).fail(dfd.reject);
                })
                .fail(function(jqXHR, textStatus, errorThrown) {
                    dfd.fail(registerError);
                    // don't retry registration, it will be retried on the next token request
                    self._registrationRequest = null;
                    var inrixErrorObject = self.parseErrorResults(jqXHR, textStatus, errorThrown);
                    dfd.reject(
                        jqXHR,
                        textStatus,
                        errorThrown,
                        inrixErrorObject);
                });

            this._registrationRequest = dfd.promise();
            return this._registrationRequest;
        },

        /**
         * @method getAuthTokenFromServer
         * @private
         */
        getAuthTokenFromServer: function () {
            // only allow one token request at a time
            if (this._tokenRequest) {
                return this._tokenRequest;
            }

            if (!this.hasConsumerId()) {
                return this.deviceRegister();
            }

            var options = {
                url: this.configuration.serverUrl + this.configuration.serverHandler,
                action: 'Mobile.Device.Auth',
                vendorId: this.configuration.vendorId,
                deviceId: this.getConsumerId()
            };

            // Add the app version if it's specified.
            if (this._appVersion) {
                options.appVersion = this._appVersion;
            }

            console.log('>>> Get AUTH from server: ' + JSON.stringify(options));

            options.token = this.tokenizer([
                options.vendorId,
                options.deviceId,
                this.getHardwareId()
            ].join("|").toLowerCase());

            this._tokenRequest = this.callAPI(options);

            var self = this;
            this._tokenRequest
                .done(function (result, successString, jqXHR) {
                    self._tokenRequest = null;

                    var $result = $(result);
                    if (self.isBadTokenCase($result, jqXHR)) {
                        if (self._deviceAuthFailureCallback) {
                            self._deviceAuthFailureCallback(jqXHR);
                        }
                        return;
                    }

                    self._token = $result.find('AuthToken').text();
                    self._tokenExpiry = $result.find('AuthToken').attr('expiry');

                    var urls = {};
                    $result.find('ServerPaths').find('ServerPath').each(function () {
                        var $this = $(this);
                        var type = $this.attr('type').toString().toLowerCase();
                        var region = $this.attr('region').toString().toLowerCase();
                        if (!urls[type])
                        {
                            urls[type] = {};
                        }
                        urls[type][region] = $this.text();
                    });
                    self._tokenUrls = urls;

                    $.publish && $.publish('Platform.AuthTokenChanged', self._token);
                })
                .fail(function (jqXHR) {
                    self._tokenRequest = null;
                    if (self.isBadTokenCase($(""), jqXHR)) {
                        self._deviceAuthFailureCallback && self._deviceAuthFailureCallback(jqXHR);
                    } else {
                        //trigger network error
                        $.publish && $.publish('platform:netError', jqXHR);
                    }
                    // don't retry token request, it will be triggered by the next network call
                });

            return this._tokenRequest;
        },

        /**
         * @method isBadTokenCase
         * @private
         */
        isBadTokenCase:function ($result, jqXHR) {
            var result = false;
            if (jqXHR.status === 400) {
                var $inrix = $result.find('Inrix');
                var statusId = $inrix.attr('statusId');
                var code = parseInt(statusId, 10);
                if (code === 42) {
                    result = true;
                }
            }
            return result;
        },

        /**
         * @method getAuthToken
         * @private
         */
        getAuthToken: function() {
            if (Inrix.Util.isEmpty(this._token)) {
                // token is empty
                return null;
            }

            var now = new Date();
            var tokenDate = new Date();
            tokenDate.parseISO8601(this._tokenExpiry);
            if (now >= tokenDate) {
                // token is expired
                return null;
            }

            return Inrix._token;
        },

        /**
         * @method apiUrl
         * @private
         */
        apiUrl: function (options) {
            // TODO: use user position to select region
            // if we can, give a hint to the API server to pick NA or EU
            var region = 'na',
                hint, c1, c2, TMCs, country;
            try {
                if (options && typeof options === 'object') {
                    hint = options["wp_1"] || options["center"] || options["point"];
                    if (options["corner1"] && options["corner2"]) {
                        c1 = options["corner1"].match(/[^|,]+$/);
                        c2 = options["corner2"].match(/[^|,]+$/);
                        hint = (parseFloat(c1) + parseFloat(c2)) / 2;
                    } else if (options["TMCs"]) {
                        TMCs = options["TMCs"];
                        if (TMCs.length > 0) {
                            country = TMCs[0][0];
                            if (country.match(/[1cC]/))
                                hint = Inrix.configuration.LONGITUDE_DIVIDER - 10;
                            else
                                hint = Inrix.configuration.LONGITUDE_DIVIDER + 10;
                            // fake a NA longitude to force NA servers for TMCS with country codes 1 or C (US or Canada)
                        }
                    }
                }
            } catch (err) {}

            if (hint) {
                // make sure we have not been sent a lat/long pair, if so, extract the longitude
                if (typeof hint === 'string') hint = hint.match(/[^|,]+$/);
                region = this.region(hint);
            }
            return this._tokenUrls.mobile[region];
        },

        /**
         * @method tileServerUrl
         * @private
         */
        tileServerUrl: function (region) {
            return this._tokenUrls.tts[region];
        },

        /**
         * @method trafficTileUrl
         * @private
         */
        trafficTileUrl: function (region, zoom, options) {
            var token = this.getAuthToken();
            if (!token) {
                // we can't build URL with token so return nothing
                return null;
            }

            var comparative = options.comparative || false;
            options = Inrix.Util.setDefaults(options, {
                action: "Mobile.Tile",
                token: token,
                coverage: Inrix.configuration.coverage[region],
                format: "png", // TODO: make it configurable
                layers: "T",  // just give us the traffic tile layer
                speedBucketId: comparative ? Inrix.configuration.comparativeSpeedBucketId : Inrix.configuration.speedbucketId,
                penWidth: this.penWidth(zoom),
                frcLevel: this.frcLevel(zoom)
            });
            return (this.tileServerUrl(region) + "?" + $.param(options));
        },

        /**
         * @method trafficTileUrlFromTileXY
         * @description: Fetch the TileUrl based on a tile coordinate (x, y) and zoom level to access to traffic flow information
         * Details on the Mobile.Tile API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/gettraffictile/?api=mobile
         * @param tilePoint coordinate of a tile.
         * @param zoom requested zoom level.
         * @params {Object} options
         */
        trafficTileUrlFromTileXY: function (tile, zoom, options) {
            var region = this.regionFromTile(tile.x, zoom);
            var quadKey = Inrix.Util.tileXYToQuadKey(tile.x, tile.y, zoom);
            options = Inrix.Util.setDefaults(options, { quadKey: quadKey });
            return this.trafficTileUrl(region, zoom, options);
        },

        /**
         * @method penWidth
         * @private
         */
        penWidth: function (zoom) {
            // make the pen width adjustable based on zoom
            return (((zoom || 12) / 4 * 3) + 1);
        },

        /**
         * @method frcLevel
         * @private
         */
        frcLevel: function (zoom) {
            // build frc level based on zoom level
            var frc = Inrix.configuration.DEFAULT_FRCLEVEL;
            if (zoom <= 8) {
                frc = '1';
            }
            else if (zoom <= 12) {
                frc = "1,2";
            }
            else if (zoom == 13) {
                frc = "1,2,3";
            }
            else if (zoom == 14) {
                frc =  "1,2,3,4";
            }
            else if (zoom == 15) {
                frc = "1,2,3,4,5";
            }
            return frc;
        },

        /**
         * @method regionFromTile
         * @private
         */
        regionFromTile: function (tileX, zoom) {
            if (zoom < 3) { return null; }
            return ((tileX < Math.floor(Math.pow(2, zoom - 1) - Math.pow(2, zoom - 4))) ? 'na' : 'eu');
        },

        /**
         * @method region
         * @private
         */
        region: function (longitude) {
            // make sure we have not been sent a lat/long pair, if so, extract the longitude
            if (typeof longitude == 'string') longitude = longitude.match(/[^|,]+$/);

            return (longitude && longitude > Inrix.configuration.LONGITUDE_DIVIDER) ? 'eu' : 'na';
        },

        /**
         * @method makeServerCall
         * @private
         */
        makeServerCall: function (options) {
            // get the Url to use
            var theUrl = options.url || this.apiUrl(options);

            if (options.action === 'Mobile.User.Login' && options.forceHttps) {
                theUrl = theUrl.replace(/^http:/, 'https:');
            }

            if (Inrix.configuration.useProxy) {
                theUrl = Inrix.configuration.proxyUrl;
            } else {
                delete options.url;
            }

            // remove any training commas from options
            for (var prop in options) {
                if (options.hasOwnProperty(prop) && typeof options[prop] == "string")
                    options[prop] = options[prop].replace(/,$/, '');
            }

            var dataType = options.dataType || Inrix.configuration.DEFAULT_DATATYPE;
            delete options.dataType;

            var timeout = options.timeout || Inrix.configuration.DEFAULT_TIMEOUT;
            delete options.timeout;

            var cache = options.cache || false;
            delete options.cache;

            var success = options.success;
            delete options.success;

            var error = options.error;
            delete options.error;

            var fetch = options.fetch;
            delete options.fetch;

            if (Inrix.Phs) {
                options = Inrix.Phs.injectPhs(theUrl, options);
            }

            console.log("GET Request: " + theUrl + " [" + JSON.stringify(options) + "]");

            var request = {
                url: theUrl,
                type: 'GET',
                dataType: dataType,
                timeout: timeout,
                cache: cache,
                data: options,
                success: success,
                error: error
            };

            if (fetch) {
                return fetch(request);
            } else {
                return $.ajax(request);
            }
        },

        /**
         * @method callAPI
         * @public
         */
        callAPI: function (options) {
            // TODO: remove the debug-only error handling
//            if (!options.error) {
//                options.error = function (jqXHR) {
//                    throw new Error(jqXHR.responseText);
//                }
//            }

            // if the request doesn't have a token, acquire it
            var token = options.token;
            if (!token)
            {
                token = this.getAuthToken();
                if (token) {
                    options.token = token;
                }
            }

            if (token) {
                // if we have a valid token, make a network call right away
                return this.makeServerCall(options);
            } else {
                // if token is invalid, initiate a new request to acquire it
                var tokenRequest = this.getAuthTokenFromServer();

                // build deferred object so we return the same object as direct call
                // resolve/reject the deferred only after original call is complete
                var dfd = $.Deferred();

                var self = this;
                tokenRequest
                    .done(function() {
                        options.token = self._token;
                        self.makeServerCall(options).done(dfd.resolve).fail(dfd.reject);
                    })
                    .fail(function(jqXHR,textStatus, errorThrown) {
                        // if token request fails, fail the original call
                        if (options.error) options.error(
                            jqXHR,
                            textStatus,
                            errorThrown,
                            {
                                inrixErrorCode: Inrix.kUnableToGetToken,
                                inrixErrorText: 'Error getting token'
                            }
                        );
                        dfd.reject(jqXHR);
                    });

                return dfd.promise();
            }
        },

        /**
         * Gets the information about speed bucket from the server.
         *
         * @method getSpeedBucketInformation
         * @param options Initial request parameters, must contain SpeedBucketID.
         */
        getSpeedBucketInformation: function(options) {
            var error = options.error;
            var success = options.success;

            delete options.success;
            delete options.error;

            // Update request options.
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Speedbucket.Get'
            });

            // Override callback functions (if any).
            options.success = function(result) {
                var speedBucketInfo = Inrix.parseSpeedBucketInformation(result);
                success && success(speedBucketInfo);
            };

            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = this.parseErrorResults(jqXHR, textStatus, errorThrown);
                error && error(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return this.callAPI(options);
        },

        /**
         * Parse the speed bucket information.
         *
         * @method parseSpeedBucketInformation
         * @param result Response from server.
         * @return {Inrix.SpeedBucket} An instance of the Inrix.SpeedBucket object.
         */
        parseSpeedBucketInformation: function(result) {
            var $xml = $(result).find('SpeedBucket');
            return new Inrix.SpeedBucket($xml);
        },

        /**
         * @method getRoute
         * @description: Fetch the details for a given route
         * Details on the Mobile.Route.Get API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/getroute/?api=mobile
         * @param options
         * @return $.Deferred
         */
        getRoute: function (options) {
            var error = options.error;

            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Route.Get',
                usetraffic: 'true',
                routeoutputfields: 's,i'
            });

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                var success = options.success;
                options.success = function (results) {
                    var routes = Inrix.parseRouteResults(results);
                    if (success) success(routes);
                };
            }


            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = this.parseErrorResults(jqXHR, textStatus, errorThrown);
                error && error(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };
            return this.callAPI(options);
        },

        /**
         * @method findRoute
         * @description: Find a route between waypoints
         * Details on the Mobile.Route.Find API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/findroute/?api=mobile
         * @param options
         * @return $.Deferred
         */
        findRoute: function (options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Route.Find',
                usetraffic: 'true',
                routeoutputfields: 's,i'
            });

            for (var param in options) {
                if (param.match(/wp_\d/))
                    options[param] = options[param].replace(/\|/,',');
            }
            var originalError = options.error;
            var originalSuccess = options.success;

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                options.success = function (results, textStatus, jqXHR) {
                    try {
                        var routes = Inrix.parseRouteResults(results);
                        if (originalSuccess) originalSuccess(routes);
                    } catch (ex) {
                        console.log(ex);
                        originalError && originalError(jqXHR, ex, kXmlParseError);
                    }
                };
            }
            options.error = function(jqXHR, textStatus, errorThrown) {
                // XXX
                // Need to figure out the problem as best we can
                console.log('(find route:) errorText: ' + textStatus);
                console.log('(find route:) error: ' + errorThrown);
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return this.callAPI(options);
        },

        /**
         * Parse the response data and return an error code.
         *
         * @method parseErrorResults
         * @param options
         * @return {Object}  {inrixErrorCode:statusId, inrixErrorText: statusText}
         */
        parseErrorResults: function(jqXHR, errorText, error) {
            var inrixErrorObject;
            try {
                var xml = $(jqXHR.responseText);
                inrixErrorObject = {
                    inrixErrorCode: xml.attr('statusId'),
                    inrixErrorText: xml.attr('statusText')
                };

            } catch (ex) {
                inrixErrorObject = {
                    inrixErrorCode: kXmlParseError,
                    inrixErrorText: ex
                };
            }
            console.log('parseErrorResults: (' + inrixErrorObject.inrixErrorText + ': ' +inrixErrorObject.inrixErrorCode + ')' );
            return inrixErrorObject;
        },

        /**
         * @method parseRouteResults
         * @param results
         * @return {Array} Routes
         */
        parseRouteResults: function (results) {
            var incidents = Inrix.parseIncidentResults($(results).find('Inrix > Incidents'));

            var routes = [];
            $(results).find('Route').each(function () {
                var route = new Inrix.Route(this);
                routes.push(route);

                // replace collection of incident ids with incident objects
                var routeIncidents = [];
                route.incidents.forEach(function(id) {
                    var incident;
                    incidents.forEach(function(elem) {
                        if (elem.id == id) {
                            incident = elem;
                        }
                    });

                    if (incident) {
                        routeIncidents.push(incident);
                    }
                });
                route.incidents = routeIncidents;
            });

            routes.sort(function (a, b) { return (a.ttm - b.ttm); });
            return routes;
        },

        /**
         * @method findRouteEta
         * @param options
         * @private
         * @return $.Deferred
         */
        findRouteEta: function (options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Route.Find',
                wp_1: options.origin,
                wp_2: options.destination,
                usetraffic: 'true',
                routeoutputfields: 's,i'
            });

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                var success = options.success;
                options.success = function (results) {
                    var eta = Inrix.parseRouteEta(result);
                    if (success) success(eta);
                };
            }

            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };
            return this.callAPI(options);
        },

        /**
         * @method parseRouteEta
         * @param result
         * @private
         * @return {Date} ETA
         */
        parseRouteEta: function (result) {
            var eta = new Date();
            var ttm = $(result).find('Route').attr('travelTimeMinutes');
            var mins = eta.getMinutes();
            mins += parseInt(ttm);
            eta.setMinutes(mins);
            return eta;
        },

        /**
         * @method getCurrentLocation
         * @param {Function} callback
         * @return {Object} Current location
         */
        getCurrentLocation: function (callback) {
            var self = this;
            if ((typeof callback === 'function') && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    self.setCurrentLocation(position.coords);
                    callback.call(self, self._currentLocation);
                });
            }
            return this._currentLocation;
        },

        /**
         * @method getCurrentLocationParam
         * @private
         * @return {Object} Current location
         */
        getCurrentLocationParam: function () {
            return this._currentLocation.latitude + '|' + this._currentLocation.longitude;
        },

        /**
         * @method setCurrentLocation
         * @param {Object} location
         * @param {Number} location.latitude
         * @param {Number} location.longitude
         */
        setCurrentLocation : function(location) {
            this._currentLocation.latitude = location.latitude;
            this._currentLocation.longitude = location.longitude;
        },

        /**
         * Retrieves the current location from the browser's location object and stores it in Inrix._currentLocation
         * use Inrix.getCurrentLocation to retrieve this value
         *
         * @method updateCurrentLocation
         * @param {Function} callback
         * @return
         */
        updateCurrentLocation: function (callback) {
            var self = this;
            var watchId;
            if (navigator.geolocation) {
                watchId = navigator.geolocation.watchPosition(function (position) {
                    self.setCurrentLocation(position.coords);
                    if (typeof callback === 'function') callback.call(self, self._currentLocation);
                }, function (error) {
                });
            }
            return watchId;
        },

        /**
         * @method updateLocation
         * @description: Update location details on the server
         * Details on the Mobile.Location.Update API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/updatelocation/?api=mobile
         * @param {Object} options
         * @return $.Deferred
         */
        updateLocation: function(options) {
            options.locationId || (options.locationId = options.id);
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Location.Update'
            });

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                var success = options.success;
                options.success = function (results) {
                    var points = Inrix.parseLocationResults(results);
                    if (success) success(points);
                };
            }
            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return this.callAPI(options);
        },

        /**
         * @method deleteLocation
         * @description: Delete location from the server
         * Details on the Mobile.Location.Delete API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/deletelocation/?api=mobile
         * @param {Object} options
         */
        deleteLocation: function(options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Location.Delete'
            });

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                var success = options.success;
                options.success = function (results) {
                    if (success) success();
                };
            }
            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return this.callAPI(options);
        },

        /**
         * @method addLocation
         * @description: Create a new location on the server
         * Details on the Mobile.Location.Create API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/createlocation/?api=mobile
         * @param {Object} options
         * @return $.Deferred
         */
        addLocation: function(options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Location.Create'
            });

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                var success = options.success;
                options.success = function (results) {
                    var newLocation = Inrix.parseLocationResults(results);
                    if (success) success(newLocation);
                };
            }
            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return this.callAPI(options);
        },

        /**
         * @method getLocation
         * @description: Retrieve all locations from the server
         * Details on the Mobile.Location.Get API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/getlocation/?api=mobile
         * @param {Object} options
         * @return $.Deferred
         */
        getLocation: function (options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Location.Get'
            });

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                var success = options.success;
                options.success = function (results) {
                    var points = Inrix.parseLocationResults(results);
                    if (success) success(points);
                };
            }
            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return this.callAPI(options);
        },

        /**
         * @method parseLocationResults
         * @param {Object} results
         * @return Points
         */
        parseLocationResults: function(results) {
            var points = [];
            $(results).find('Location').each(function () {
                var point = new Inrix.Location(this);
                points.push(point);
            });
            return points;
        },

        /**
         * Get incident by id
         *
         * @method getIncidents
         * @description: Fetch incident details by the incident ID
         * Details on the Mobile.Incidents.Get API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/getincident/?api=mobile
         * @param {Object} options
         * @return $.Deferred
         */
        getIncidents: function (options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Incidents.Get'
            });

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                var success = options.success;
                options.success = function (results) {
                    var incidents = Inrix.parseIncidentResults(results);
                    if (success) success(incidents);
                };
            }
            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return this.callAPI(options);
        },

        /**
         * @method getIncidentOptions
         * @description: Fetch the reportable incident types (UGI)
         * @param {Object} options
         * @param {Function} options.success(incidents) Return array of Incident objects
         * @param {Function} options.error(error) Return error object
         */
        getIncidentOptions: function(options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Incident.Options'
            });

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                var success = options.success;
                options.success = function (results) {
                    var incidentOptions = [];
                    $(results).find('EventCode').each(function () {
                        var io = new Inrix.IncidentOption(this);
                        incidentOptions.push(io);
                    });
                    if (success) success(incidentOptions);
                };
            }
            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };
            return this.callAPI(options);
        },



        /**
         * @method getIncidentsInBox
         * @description: Fetch traffic incidents in a specified geographic box
         * Details on the Mobile.Incidents.Box API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/getincidentsinbox/?api=mobile
         * @param {Object} options
         * @param {String} options.corner1 (required) 'lat|long'
         * @param {String} options.corner2 (required) 'lat|long'
         * @param {String} [options.incidentType] Current default on the server is: Incidents,Construction,Events,Flow.
         * @param {String} [options.incidentSource] Defaults to "All".
         * @param {String} [options.severity] 0,1,2,3,4 (low to highest) default is empty, which means "All".
         * @param {String} [options.incidentOutputFields] Comma separated list of fields to return. Default on the server is All (except Area, RDS, and DelayImpact).
         * @param {Function} options.success(incidents) Return array of Incident objects
         * @param {Function} options.error(error) Return error object
         */
        getIncidentsInBox: function (options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Incidents.Box'
            });

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                var success = options.success;
                options.success = function (results) {
                    var incidents = Inrix.parseIncidentResults(results, options.limit);
                    if (success) success(incidents);
                };
            }
            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return this.callAPI(options);
        },

        /**
         * @method parseIncidentResults
         * @param {Object} results
         * @param {Number} [limit]
         * @private
         */
        parseIncidentResults: function(results, limit) {
            // iterate the result set adding each one to the incident result array
            var incidents = [];
            var parsed = 0;
            limit = limit || 0;
            $(results).find('Incident').each(function () {
                if (limit > 0 && parsed > limit) return;
                var incident = new Inrix.Incident(this);
                incident.incidentId || (incident.incidentId = incident.id);
                incidents.push(incident);
                parsed++;
            });
            return incidents;
        },

        /**
         * @method getIncidentsInRadius
         * @description: Fetch traffic incidents in a specified geographic radius
         * Details on the Mobile.Incidents.Radius API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/getincidentsinradius/?api=mobile
         * @param {Object} options
         */
        getIncidentsInRadius: function (options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Incidents.Radius'
            });

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                var success = options.success;
                options.success = function (results) {
                    var incidents = Inrix.parseIncidentResults(results);
                    if (success) success(incidents);
                };
            }
            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return this.callAPI(options);
        },

        /**
         * @method getTrafficCamerasInBox
         * @description: Fetch traffic cameras in a specified geographic box
         * Details on the Mobile.Camera.Box API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/gettrafficcamerasinbox/?api=mobile
         * @param {Object} options
         * @return $.Deferred
         */
        getTrafficCamerasInBox: function (options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Camera.Box'
            });

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                var success = options.success;
                options.success = function (results) {
                    var cameras = Inrix.parseTrafficCameraResults(results);
                    if (success) success(cameras);
                };
            }

            return this.callAPI(options);
        },

        /**
         * @method parseTrafficCameraResults
         * @param {Object} results
         * @returns {Array} Array of Inrix.Camera objects
         * @private
         */
        parseTrafficCameraResults: function (results) {
            // iterate the result set adding each one to the incident result array
            var cameras = [];
            $(results).find('Camera').each(function () {
                var camera = new Inrix.Camera(this);
                cameras.push(camera);
            });
            return cameras;
        },

        /**
         * @method getTrafficRealtimeInBox
         * @param {Object} options
         */
        getTrafficRealtimeInBox: function (options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Traffic.Realtime.Box'
            });

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                var success = options.success;
                options.success = function (results) {
                    var tmcResultSet = Inrix.parseTMCResults(results);
                    if (success) success(tmcResultSet);
                };
            }
            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return this.callAPI(options);
        },

        /**
         * @method getTrafficIndexInBox
         * @param {Object} options
         */
        getTrafficIndexInBox: function (options) {

            var originalSuccess = options.success;
            options.success = function (TMCs) {
                var totalTTM = 0.0;
                var badTTM = 0.0;
                var goodTTM = 0.0;
                for (var i = 0; i < TMCs.length; i++) {
                    var tmc = TMCs[i];
                    // All TMC fields except "code" can be empty and parsed as NaN
                    if (!isNaN(tmc.travelTimeMinutes) && !isNaN(tmc.delta)) {
                        totalTTM += tmc.travelTimeMinutes;
                        var delta = tmc.delta;
                        if (delta < -17) {
                            badTTM += tmc.travelTimeMinutes;
                        }
                        if  (delta > 14) {
                            goodTTM += tmc.travelTimeMinutes;
                        }
                    }
                }
                var trafficIndex = 5; //ToDo: check value if it's correct default
                if (totalTTM > 0) {
                    // bump up bad index: 50% of segments bad = 100% bad
                    badTTM = Math.min(badTTM * 2, totalTTM);
                    var trafficIndex = Math.round(-5 * (badTTM - goodTTM) / totalTTM) + 5;
                    console.log("Traffic index: " + trafficIndex);

                }
                originalSuccess && originalSuccess(trafficIndex);

            };
            return this.getTrafficRealtimeInBox(options);
        },



        /**
         * @method parseTMCResults
         * @param {Object} results
         * @returns {Array}
         * @private
         */
        parseTMCResults: function (results){
            // iterate the result set adding each one to the road speed result set array
            var tmcResultSet = [];
            $(results).find('TMC').each(function (index, value) {
                var tr = new Inrix.TMCResults(value);
                tmcResultSet.push(tr);
            });
            return tmcResultSet;
        },


        /**
         * @method getRoadSpeedsInTMCs
         * @param {Object} options
         * @return $.Deferred
         */
        getRoadSpeedsInTMCs: function (options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Speeds.TMCs',
                IncludeSummary: 'true',
                speedoutputfields: 'all'
            });

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                var success = options.success;
                options.success = function (results) {
                    var roadSpeedResultSet = Inrix.parseRoadSpeedResults(results);
                    if (success) success(roadSpeedResultSet);
                };
            }
            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return this.callAPI(options);
        },

        /**
         * @method parseRoadSpeedResults
         * @param {Object} results
         * @returns {Array}
         * @private
         */
        parseRoadSpeedResults: function (results){
            // iterate the result set adding each one to the road speed result set array
            var roadSpeedResultSet = [];
            $(results).find('RoadSpeedResults').each(function () {
                var rsr = new Inrix.RoadSpeedResults(this);
                roadSpeedResultSet.push(rsr);
            });
            return roadSpeedResultSet;
        },

        /**
         * @method getParkingInfoInBox
         * @description: Fetch parking info including price, hours and location in a specified geographic box
         * Details on the Mobile.ParkingInfo.Box API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/getparkinginfoinbox/?api=mobile
         * @param {Object} options
         * @return $.Deferred
         */
        getParkingInfoInBox: function (options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'GetParkingInfoInBox'
            });

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                var success = options.success;
                options.success = function (results) {
                    var parkingLots = Inrix.parseParkingLotResults(results);
                    if (success) success(parkingLots);
                };
            }
            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return this.callAPI(options);
        },

        /**
         * @method parseRoadSpeedResults
         * @param {Object} results
         * @returns {Array} Returns array of Inrix.ParkingLot
         * @private
         */
        parseParkingLotResults: function (results) {
            // iterate the result set adding each one to the road speed result set array
            var parkingLots = [];
            $(results).find('ParkingLot').each(function () {
                var parkingLot = new Inrix.ParkingLot(this);
                parkingLots.push(parkingLot);
            });
            return parkingLots;
        },

        /**
         * @method geocode
         * @description: Fetch a geocoded address with lat/long given a set of input address fields
         * Details on the Mobile.Lookup.Geo API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/GeoCode/?api=mobile
         * @param {Object} options
         * @return $.Deferred
         */
        geocode: function (options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Lookup.Geo',
                freeform: 'true'
            });

            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return this.callAPI(options);
        },

        /**
         * @method topContributors
         * @param {Object} options
         * @return $.Deferred
         */
        topContributors: function(options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.Contributors.Top'

            });

            var success = options.success;

            options.success = function(results) {
                var contributors = [];
                $(results).find('Contributor').each(function () {
                    var $xml = $(this);
                    contributors.push({displayName: $xml.attr('displayName')});
                });
                success(contributors);
            };

            var error = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                error && error(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return this.callAPI(options);
        },

        /**
         * @method userSummary
         * @description: Retrieve the summary of user data from the server including locations, routes, preferences etc.
         * Details on the Mobile.User.Summary API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/getusersummary/?api=mobile
         * @param {Object} options
         * @return $.Deferred
         */
        userSummary: function(options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.User.Summary',
               // outputFields: 'CommunityInfo,ConsumerInfo'
                outputFields: 'all'
            });

            var success = options.success;

            options.success = function(results) {
                var info = [];
                info.push(new Inrix.UserSummary(results));

                success && success(results, info);
            };

            var error = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                error && error(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return this.callAPI(options);
        },


        /**
         * @method updateUser
         * @param {Object} options
         * @return $.Deferred
         */
        updateUser: function(options) {
            options = Inrix.Util.setDefaults(options, {
                action: 'Mobile.User.Update'

            });

            return this.callAPI(options);
        },


        /**
         * @method getParkingInfoInRadius
         * @description: Fetch parking info including price, hours and location in a specified geographic radius
         * Details on the Mobile.ParkingInfo.Radius API can be found at http://devzonedocs.inrix.com/v3/docs/index.php/cs/getparkinginfoinradius/?api=mobile
         * @param {Object} options
         * @param {Function} succeed
         * @param {Function} fail
         * @return $.Deferred
         */
        getParkingInfoInRadius: function (options, succeed, fail) {
            options = Inrix.Util.setDefaults(options, {
                action: 'GetParkingInfoInRadius'
            });

            this.getParkingInfoInBox(options);
        },

        setDeviceAuthorizationFailureCallback: function(functionToCall) {
            this._deviceAuthFailureCallback = functionToCall;
        },
        /**
        * Debug logging
        *
        * @method log
        * @param options
        * @param options.logLevel Values for filtering: Trace, Debug, Warn, Error, Critical.
        * @param options.module Name of the file/subsystem/area logging.
        * @param options.message Message to log.
        */
        log: function(options) {
            var msg = new Date().toString() + '[' + options.logLevel + '] [' + options.module + ']' + options.message;
            Inrix.logger.write(msg);
        },

        /**
         * @property {Object} logger
         * @property {Function} logger.write
         */
        logger: {
            write: function(msg) { console.log(msg); }
        },

        /**
         * Generates hardware id if it's set in settings and returns it
         *
         * @method getHardwareId
         * @return {String} HardwareId
         */
        getHardwareId: function() {
            if (!this.settings.hardwareId) {

                // TODO: get hardwareId from native layer or application
                this.settings.hardwareId = Inrix.Util.getUniqueId();
                this._saveSettings();
            }

            return this.settings.hardwareId;
        },

        /**
         * Returns consumer id from settings
         *
         * @method getConsumerId
         * @return {String} ConsumerId
         */
        getConsumerId: function() {
            return this.settings.consumerId;
        },

        /**
         * Returns consumer id from settings
         *
         * @method resetConsumerId
         */
        resetConsumerId: function() {
            this.settings.consumerId = undefined;
        },

        /**
         * Checks if consumer id is empty
         *
         * @method hasConsumerId
         * @return {Boolean} ConsumerId
         */
        hasConsumerId: function() {
            return !Inrix.Util.isEmpty(this.getConsumerId());
        },

        /**
         * Checks if consumer id is empty
         *
         * @method hasConsumerId
         * @return {String} ConsumerId
         */
        resetToken: function() {
            this._token = undefined;
        },

        /**
         * @method tokenizer
         * @return
         * @private
         */
        /**** TEMP CODE ***/
        tokenizer: function SHA1 (msg) {

            function rotate_left(n,s) {
                var t4 = ( n<<s ) | (n>>>(32-s));
                return t4;
            }

            function lsb_hex(val) {
                var str="";
                var i;
                var vh;
                var vl;

                for( i=0; i<=6; i+=2 ) {
                    vh = (val>>>(i*4+4))&0x0f;
                    vl = (val>>>(i*4))&0x0f;
                    str += vh.toString(16) + vl.toString(16);
                }
                return str;
            }

            function cvt_hex(val) {
                var str="";
                var i;
                var v;

                for( i=7; i>=0; i-- ) {
                    v = (val>>>(i*4))&0x0f;
                    str += v.toString(16);
                }
                return str;
            }

            function Utf8Encode(string) {
                string = string.replace(/\r\n/g,"\n");
                var utftext = "";

                for (var n = 0; n < string.length; n++) {

                    var c = string.charCodeAt(n);

                    if (c < 128) {
                        utftext += String.fromCharCode(c);
                    }
                    else if((c > 127) && (c < 2048)) {
                        utftext += String.fromCharCode((c >> 6) | 192);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
                    else {
                        utftext += String.fromCharCode((c >> 12) | 224);
                        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
                }

                return utftext;
            }

            var blockstart;
            var i, j;
            var W = new Array(80);
            var H0 = 0x67452301;
            var H1 = 0xEFCDAB89;
            var H2 = 0x98BADCFE;
            var H3 = 0x10325476;
            var H4 = 0xC3D2E1F0;
            var A, B, C, D, E;
            var temp;

            msg = Utf8Encode(msg);

            var msg_len = msg.length;

            var word_array = new Array();
            for( i=0; i<msg_len-3; i+=4 ) {
                j = msg.charCodeAt(i)<<24 | msg.charCodeAt(i+1)<<16 |
                    msg.charCodeAt(i+2)<<8 | msg.charCodeAt(i+3);
                word_array.push( j );
            }

            switch( msg_len % 4 ) {
                case 0:
                    i = 0x080000000;
                    break;
                case 1:
                    i = msg.charCodeAt(msg_len-1)<<24 | 0x0800000;
                    break;

                case 2:
                    i = msg.charCodeAt(msg_len-2)<<24 | msg.charCodeAt(msg_len-1)<<16 | 0x08000;
                    break;

                case 3:
                    i = msg.charCodeAt(msg_len-3)<<24 | msg.charCodeAt(msg_len-2)<<16 | msg.charCodeAt(msg_len-1)<<8	| 0x80;
                    break;
            }

            word_array.push( i );

            while( (word_array.length % 16) != 14 ) word_array.push( 0 );

            word_array.push( msg_len>>>29 );
            word_array.push( (msg_len<<3)&0x0ffffffff );


            for ( blockstart=0; blockstart<word_array.length; blockstart+=16 ) {

                for( i=0; i<16; i++ ) W[i] = word_array[blockstart+i];
                for( i=16; i<=79; i++ ) W[i] = rotate_left(W[i-3] ^ W[i-8] ^ W[i-14] ^ W[i-16], 1);

                A = H0;
                B = H1;
                C = H2;
                D = H3;
                E = H4;

                for( i= 0; i<=19; i++ ) {
                    temp = (rotate_left(A,5) + ((B&C) | (~B&D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
                    E = D;
                    D = C;
                    C = rotate_left(B,30);
                    B = A;
                    A = temp;
                }

                for( i=20; i<=39; i++ ) {
                    temp = (rotate_left(A,5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
                    E = D;
                    D = C;
                    C = rotate_left(B,30);
                    B = A;
                    A = temp;
                }

                for( i=40; i<=59; i++ ) {
                    temp = (rotate_left(A,5) + ((B&C) | (B&D) | (C&D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
                    E = D;
                    D = C;
                    C = rotate_left(B,30);
                    B = A;
                    A = temp;
                }

                for( i=60; i<=79; i++ ) {
                    temp = (rotate_left(A,5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
                    E = D;
                    D = C;
                    C = rotate_left(B,30);
                    B = A;
                    A = temp;
                }

                H0 = (H0 + A) & 0x0ffffffff;
                H1 = (H1 + B) & 0x0ffffffff;
                H2 = (H2 + C) & 0x0ffffffff;
                H3 = (H3 + D) & 0x0ffffffff;
                H4 = (H4 + E) & 0x0ffffffff;

            }

            temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);

            return temp.toLowerCase();

        }

        /**** TEMP CODE END ***/


    };

    //---------------------------
    // Object definitions
    //---------------------------

    /**
     * @class SpeedBucket
     *
     */
    Inrix.SpeedBucket = function(xml) {
        var $xml = $(xml);

        // Get speed bucket information.
        /**
         * @property type
         */
        this.type = $xml.attr('type');
        /**
         * @property id
         */
        this.id = $xml.attr('id');
        /**
         * @property name
         */
        this.name = $xml.attr('name');
        /**
         * @property description
         */
        this.description = $xml.attr('description');
        // Get road closure information.
        var $roadClosure = $xml.find('RoadClosure');
        /**
         * Road closure information.
         *
         * @property {Object} roadClosure
         * @property roadClosure.penStyle
         * @property roadClosure.backColor
         * @property roadClosure.foreColor
         * @property roadClosure.hatchStyle
         */
        this.roadClosure = {
            penStyle: $roadClosure.attr('penStyle'),
            backColor: $roadClosure.attr('backColor'),
            foreColor: $roadClosure.attr('foreColor'),
            hatchStyle: $roadClosure.attr('hatchStyle')
        };

        // Get specific buckets information.
        var buckets = [];
        $xml.find('Bucket').each(function() {
            var $bucket = $(this);
            var bucketInfo = {
                num: $bucket.attr('num'),
                min: $bucket.attr('min'),
                max: $bucket.attr('max'),
                penStyle: $bucket.attr('penStyle'),
                backColor: $bucket.attr('backColor')
            };
            buckets.push(bucketInfo);
        });
        /**
         * @property {Array} buckets
         */
        this.buckets = buckets;
    };

    /**
     * @class Incident
     *
     */
	Inrix.Incident = function (xml) {
		var $xml = $(xml);
        /**
         * @property type
         */
	    this.type = $xml.attr('type');

        /**
         * @property id
         */
	    this.id = $xml.attr('id');

        /**
         * @property incidentVersion
         */
        this.incidentVersion = $xml.attr('version');

        /**
         * @property latitude
         */
	    this.latitude = $xml.attr('latitude');

        /**
         * @property longitude
         */
	    this.longitude = $xml.attr('longitude');

        /**
         * @property point latitude|longitude
         */
	    this.point = this.latitude + '|' + this.longitude;

        /**
         * @property severity
         */
	    this.severity = $xml.attr('severity');

        /**
         * @property eventCode
         */
	    this.eventCode = $xml.attr('eventCode');

        /**
         * @property eventText
         */
	    this.eventText = $xml.find('EventText').text();

        /**
         * @property shortDesc
         */
	    this.shortDesc = $xml.find('ShortDesc').text();

        /**
         * @property fullDesc
         */
	    this.fullDesc = $xml.find('FullDesc').text();

        /**
         * @property startTime
         */
	    this.startTime = $xml.attr('startTime');

        /**
         * @property endTime
         */
	    this.endTime = $xml.attr('endTime');

        /**
         * @property TMCs
         */
	    this.TMCs = ''; var self = this; $xml.find('TMC').each(function () { self.TMCs += $(this).attr('code') + ','; });

        /**
         * @property roadName
         */
		this.roadName = $xml.find('RoadName').text();

        /**
         * @property direction
         */
		this.direction = $xml.find('Direction').text();

        var $delay = $xml.find('DelayImpact');
        /**
         * @property delayFromTypical
         */
		this.delayFromTypical = $delay.attr('fromTypicalMinutes');

        /**
         * @property delayFromFreeFlow
         */
		this.delayFromFreeFlow = $delay.attr('fromFreeFlowMinutes');

        /**
         * @property delayLength
         */
		this.delayLength = $delay.attr('distance');

		var crossroads = [];
		$xml.find('ParameterizedDescription').children().each(function(){
			if (this.nodeName.match(/crossroad/i))
				crossroads.push({tmc:$(this).attr('tmcCode'), name:$(this).text()});
		});

        /**
         * @property {Array} crossroads
         */
		this.crossroads = crossroads;
	};

    /**
     * @class IncidentOption
     *
     */
    Inrix.IncidentOption = function (xml) {


        var $xml = $(xml);

        /**
         * @property order
         */
        this.order = $xml.attr('order');

        /**
         * @property code
         */
        this.code = $xml.attr('code');

        /**
         * @property type
         */
        this.type = $xml.attr('type');

        /**
         * @property text
         */
        this.text = $xml.attr('text');


    };

    /**
     * @class UserSummary
     *
     */
    Inrix.UserSummary = function (xml) {
        var $xml = $(xml);


        var $consumer = $xml.find('Consumer');
        /**
         * @property {Object} consumer
         * @property consumer.firstName
         * @property consumer.lastName
         * @property consumer.address
         */
        this.consumer = {
            firstName: $consumer.attr('firstName'),
            lastName: $consumer.attr('lastName'),
            address: $consumer.attr('address')
        };
        //var $community = $xml.find('Community');
        var $incidents = $xml.find('Incidents');
        /**
         * @property {Object} community
         * @property {Object} community.incidents
         * @property community.incidents.displayName
         * @property community.incidents.trustLevel
         * @property community.incidents.submissions
         * @property community.incidents.ranking
         */
        this.community = {
            incidents: {
                // I don't like the fact that the displayName and such live under the incidents
                // property, but this is how they are expressed on the server
                displayName: $incidents.attr('displayName'),
                trustLevel: $incidents.attr('trustLevel'),
                submissions: $incidents.attr('submissions'),
                ranking: $incidents.attr('ranking')
            }
        }
    };

    /**
     * @class Location
     *
     */
    Inrix.Location = function (xml) {
        var $xml = $(xml);
        /**
         * @property point
         */
        this.point = $xml.attr('point');
        if (this.point) {
            var latLong = this.point.split("|");
            /**
             * Exists only if valid point exists
             * 
             * @property latitude
             * @optional
             */
            latLong.length && (this.latitude = latLong.shift());
            /**
             * Exists only if valid point exists
             *
             * @property longitude
             * @optional
             */
            latLong.length && (this.longitude = latLong.shift());
        }
        /**
         * @property id
         */
        this.id = this.locationId = $xml.attr('locationId');

        /**
         * @property name
         */
        this.name = $xml.attr('name');

        var address = $xml.attr('address');
        /**
         * @property address
         */
        this.address = address && address.replace(/,,/g,', ');

        /**
         * @property pointType
         */
        this.pointType = $xml.attr('pointType');

        /**
         * @property externalPointType
         */
        this.externalPointType = $xml.attr('externalPointType');

        /**
         * @property externalId
         */
        this.externalId = $xml.attr('externalId');
    };

    /**
     * @class Camera
     *
     */
    Inrix.Camera = function (xml) {
        var $xml = $(xml);
        /**
         * @property id
         */
        this.id = $xml.attr('id');

        /**
         * @property latitude
         */
        this.latitude = $xml.find('Point').attr('latitude');

        /**
         * @property longitude
         */
        this.longitude = $xml.find('Point').attr('longitude');

        /**
         * latitude|longitude
         * @property point
         */
        this.point = this.latitude + '|' + this.longitude;

        var status = $xml.find('Status').attr('outOfService');
        /**
         * @property outOfService
         */
        this.outOfService = (status && status == "true");

        /**
         * @property updateFrequency
         */
        this.updateFrequency = $xml.find('Status').attr('updateFreq');

        /**
         * @property name
         */
        this.name = $xml.find('Name').text();

        /**
         * @property license
         */
        this.license = $xml.find('License')[0];

        var $license = $(this.license);
        /**
         * @property useWhileDrivingProhibited
         */
        this.useWhileDrivingProhibited = ($license.attr('useWhileDrivingProhibited') == "true");

        /**
         * @property feeToEndUserProhibited
         */
        this.feeToEndUserProhibited = ($license.attr('feeToEndUserProhibited') == "true");

        /**
         * @property sublicenseProhibited
         */
        this.sublicenseProhibited = ($license.attr('sublicenseProhibited') == "true");

        /**
         * @property regionId
         */
        this.regionId = ($license.attr('regionId') == "true");

        /**
         * @property copyrightNotice
         */
        this.copyrightNotice = $license.find('CopyrightNotice').text();

        /**
         * @property view
         */
        this.view = $xml.find('View').text();

        /**
         * We can't build URL without token, in this case URL will be null.
         *
         * @property url
         */
        var token = Inrix.getAuthToken();
        if (!token) {
            this.url = null;
        } else {
            var options = {
                action:'gettrafficcameraimage',
                desiredwidth:'320',
                desiredheight:'240',
                cameraid: this.id,
                token: token
            };
            this.url = Inrix.apiUrl() + '?' + $.param(options);
        }
    };

    /**
     * @class RoadSpeedResults
     */
    Inrix.RoadSpeedResults = function(xml) {
        var $xml = $(xml);
        /**
         * @property totalTTM
         */
        this.totalTTM = $xml.attr('totalTTM');

        /**
         * @property meanSpeed
         */
        this.meanSpeed = $xml.attr('meanSpeed');

        /**
         * @property meanAverage
         */
        this.meanAverage = $xml.attr('meanAverage');

        /**
         * @property meanReference
         */
        this.meanReference = $xml.attr('meanReference');

        /**
         * @property congestionLevel
         */
        this.congestionLevel = $xml.attr('congestionLevel');

        /**
         * meanSpeed * (totalTTM / 60)
         * @property totalLength
         */
        this.totalLength = this.meanSpeed * (this.totalTTM / 60);

        /**
         * (totalLength / meanAverage) * 60
         * @property averageTTM
         */
        this.averageTTM = (this.totalLength / this.meanAverage) * 60;

        /**
         * (totalLength / meanReference) * 60
         * @property freeFlowTTM
         */
        this.freeFlowTTM = (this.totalLength / this.meanReference) * 60;

        /**
         * Math.ceil(totalTTM - freeFlowTTM)
         * @property currentDelay
         */
        this.currentDelay = Math.ceil(this.totalTTM - this.freeFlowTTM);

        /**
         * Math.ceil(averageTTM - freeFlowTTM)
         * @property averageDelay
         */
        this.averageDelay = Math.ceil(this.averageTTM - this.freeFlowTTM);
    };

    /**
     * @class TMCResults
     */
    Inrix.TMCResults = function(xml) {
        var $xml = $(xml);
        /**
         * @property code
         */
        this.code = $xml.attr('code');

        /**
         * @property {Number} speed
         */
        this.speed = parseFloat($xml.attr('speed'));

        /**
         * @property {Number} average
         */
        this.average = parseFloat($xml.attr('average'));

        /**
         * @property {Number} reference
         */
        this.reference = parseFloat($xml.attr('reference'));

        /**
         * @property {Number} delta
         */
        this.delta = parseFloat($xml.attr('delta'));

        /**
         * @property {Number} travelTimeMinutes
         */
        this.travelTimeMinutes = parseFloat($xml.attr('travelTimeMinutes'));

        /**
         * @property {Number} congestionLevel
         */
        this.congestionLevel = parseFloat($xml.attr('congestionLevel'));
    };

    /**
     * @class Route
     */
    Inrix.Route = function(xml) {
        var $xml = $(xml);
        /**
         * @property id
         */
        this.id = $xml.attr('id');

        /**
         * Travel Time Minutes.
         * @property ttm
         */
        this.ttm = $xml.attr('travelTimeMinutes');

        /**
         * Uncongested Travel Time Minutes.
         * @property ffttm
         */
        this.ffttm = $xml.attr('uncongestedTravelTimeMinutes');

        /**
         * @property totalDistance
         */
        this.totalDistance = $xml.attr('totalDistance');

        /**
         * @property averageSpeed
         */
        this.averageSpeed = $xml.attr('averageSpeed');

        /**
         * @property routeQuality
         */
        this.routeQuality = $xml.attr('routeQuality');

        /**
         * @property summary
         */
        this.summary = $xml.find('Summary').find('Text').text();

        /**
         * @property {Date} eta
         */
        this.eta = new Date();
        var mins = this.eta.getMinutes();
        mins += parseInt(this.ttm);
        this.eta.setMinutes(mins);

        var incidents = [];
        $xml.find('Incident').each(function(){
            incidents.push($(this).attr('id'));
        });

        /**
         * @property {Array} incidents
         */
        this.incidents = incidents;
               
        var points = [];
        $xml.find('Points').find('Point').each(function(){
            var $this = $(this);
            points.push({latitude:$this.attr('latitude'), longitude:$this.attr('longitude')});
        });
        /**
         * @property {Array} points
         */
        this.points = points;
    };

    /**
     * @class ParkingLot
     *
     */
    Inrix.ParkingLot = function(xml) {
        var $xml = $(xml);

        /**
         * @property id
         */
        this.id = $xml.attr('id');

        /**
         * @property name
         */
        this.name = $xml.attr('name');

        /**
         * @property latitude
         */
        this.latitude = $xml.attr('latitude');

        /**
         * @property longitude
         */
        this.longitude = $xml.attr('longitude');

        /**
         * @property staticContentLastUpdatedUtc
         */
        this.staticContentLastUpdatedUtc = $xml.attr('staticContentLastUpdatedUtc');

        /**
         * @property dynamicContentLastUpdatedUtc
         */
        this.dynamicContentLastUpdatedUtc = $xml.attr('dynamicContentLastUpdatedUtc');
        var $staticContent = $xml.find('staticContent');
        var $geometry = $staticContent.find('geometry');
        // add geometry stuff here
        var $description = $staticContent.find('description');
        if ($description.length) {
            // get the gate info
            var $parkingSpecification = $description.find('parkingSpecification');
            if ($parkingSpecification.length) {
                /**
                 * Available if description and parking specification are present.
                 * @property type
                 */
                this.type = $parkingSpecification.attr('type');
                var gateInfo = [];
                $parkingSpecification.find('gateInfo').each( function() {
                    var $this = $(this);
                    if ($this)
                        gateInfo.push({type:$this.attr('type'), latitude:$this.attr('latitude'), longitude:$this.attr('longitude')});
                } );
                /**
                 * Available if description and parking specification are present.
                 * @property gateInfo
                 */
                this.gateInfo = gateInfo;
            }
            // address and phone number
            var $parkingInfo = $description.find('parkingInfo');
            if ($parkingInfo.length) {
                var $address = $parkingInfo.find('address');
                this.address = ($address.attr('street') ? $address.attr('street')+', ' : "")
                    + ( $address.attr('city') ? $address.attr('city')+', ' : "")
                    + ( $address.attr('state') ? $address.attr('state')+', ' : "")
                    + $address.attr('zipCode');
                /**
                 * Available if description and parking info are present.
                 * @property address
                 */
                this.address = this.address.replace(/[, ]+$/, "");
                /**
                 * Available if description and parking info are present.
                 * @property phoneNumber
                 */
                this.phoneNumber = $address.attr('phoneNumber');
            }
            //pricing info
            var $rates = $description.find('pricingPayment');
            if ($rates.length) {
                var thisLot = this;
                /**
                 * Available if description and pricing payment are present.
                 * @property phoneNumber
                 */
                thisLot.currency = $rates.attr('currencyType');

                /**
                 * Available if description and pricing payment are present.
                 * @property phoneNumber
                 */
                thisLot.rates = [];
                $rates.each(function () {
                    var $pricingPayment = $(this);
                    var price = $pricingPayment.attr('amount');
                    if (price === undefined) price = $pricingPayment.attr('notes');
                    var $time = $pricingPayment.find('time');
                    if ($time.length>0) {
                        var $duration = $time.find('duration');
                        if ($duration.length > 0) {
                            var hours = $duration.attr('hours');
                            thisLot.rates.push({hours:hours, price:price});
                            thisLot["hour"+hours]=price;
                        }
                    }
                });
    //            this.relativeCost = $pricingPayment.attr('relativeCost');
            }
            // opening hours
            var $openingHours = $description.find('openingHours');
            if ($openingHours.length) {
                /**
                 * Available if description and opening hours are present.
                 * @property openHours
                 */
                this.openHours = $openingHours.attr('notes');
            }
        }
    };

    /**
     * @class GasStation
     */
    Inrix.GasStation = function(xml){

        var $xml = $(xml);
        var gasStation = {};
        /**
         * @property id
         */
        gasStation.id = $xml.attr('id');

        /**
         * @property brand
         */
        gasStation.brand = $xml.attr('brand');

        /**
         * @property latitude
         */
        gasStation.latitude = $xml.attr('latitude');

        /**
         * @property longitude
         */
        gasStation.longitude = $xml.attr('longitude');

        var $address = $xml.find('Address');
        /**
         * @property name
         */
        gasStation.name = $address.attr('name');

        gasStation.address = ( $address.attr('street') ? $address.attr('street')+', ' : "")
                    + ( $address.attr('city') ? $address.attr('city')+', ' : "")
                    + ( $address.attr('state') ? $address.attr('state')+', ' : "")
                    + $address.attr('zipCode');
        /**
         * Street, City, State, ZipCode
         * @property address
         */
        gasStation.address = gasStation.address.replace(/[, ]+$/, "");

        var products = [];
        $xml.find('Product').each(function() {
            var $product = $(this);
            var product = {};
            product.type = $product.attr('type');
            product.price = $product.attr('price');
            product.updateDate = $product.attr('updateDate');
            products.push(product);
            if (product.type.toLowerCase() == "regular")
                gasStation.price = product.price;
        });
        /**
         * Each product has type, price and update date.
         * @property {Array} products
         */
        gasStation.products = products;

        return gasStation;
    };

    /**
     * Represents an address
     * @class Address
     */
    Inrix.Address = function() {
        /**
         * The street line of an address. Example: 1020 Anywhere Street.
         * @property addressLine
         */
        this.addressLine = '';

        /**
         * The locality, such as a US city. Example: Seattle.
         * @property locality
         */
        this.locality = '';

        /**
         * A district, such as the abbreviation of a US state. Example: WA.
         * @property adminDistrict
         */
        this.adminDistrict = '';

        /**
         * The postal code, such as a US ZIP Code. Example: 98178.
         * @property postalCode
         */
        this.postalCode = '';

        /**
         * The ISO country code. Example: US.
         * @property isoCountry
         */
        this.isoCountry = '';

        /**
         * @property longitude
         */
        this.latitude = '';

        /**
         * @property longitude
         */
        this.longitude = '';
    };

    /**
     * @class Geolocator
     */
    Inrix.Geolocator = {};

    /**
     * @class Geocoder
     */
    Inrix.Geocoder = {};
    /**
     * @property Default
     */
    Inrix.Geocoder.Default = function() { };
    /**
     * @property {BingGeocoder} Bing
     */

    /**
     * @class BingGeocoder
     */
    Inrix.Geocoder.Bing = function(key) {
       // Use regular string concat rather than string builders - way faster
        // http://jsperf.com/stringbuilder-vs-concatenation
        // http://jsperf.com/best-js-string-builder

        var baseUrl = 'http://dev.virtualearth.net99/REST/v1/Locations';
        //var key = 'Ak1OvL26qSrc-n8DHtLyH3R-qiLc6liKouJlq1Qc53peL3zZ4VfBIjJhz47_RT9N';
        var apiKey = key;
        var that = this;

        /**
         * @method getAddress
         * @param {Object} params
         * @param {Function} params.success
         * @param {Function} params.error
         */
        this.getAddress = function(params) {
            var url = baseUrl + '/' + params.latitude + ',' + params.longitude + '?key=' + apiKey;
            $.get(url,function(data){
                var addressData = that._parseResults(data);
                params.success(addressData);
            }).error(params.error).success(params.success);

        };

        /**
         * @method getPoint
         * @param {Object} params
         * @param {Function} params.success
         * @param {Function} params.error
         */
        this.getPoint = function(params) {
            var  url = baseUrl + '/' + params.address.isoCountry + '/' + params.address.adminDistrict + '/' + params.address.postalCode + '/' + params.address.locality + '/' + params.address.addressLine + '?key=' + apiKey;
            // strip out .,+ chars for bing
            url = encodeURI(url);

            $.get(url,function(data){
                var addressData = that._parseResults(data);
                params.success(addressData);
            }).error(params.error).success(params.success);

        };

        /**
         * @method _parseResults
         * @param {Object} json
         * @return {Array}
         * @private
         */
        this._parseResults = function(json) {
            var geoCodeResults = json;
            if(typeof(json) !== 'object') {
                geoCodeResults = JSON.parseJSON(json);
            }
            var results = geoCodeResults.resourceSets[0].resources;
            var len = results.length;

            var ret = [];
            for(var i = 0; i < len; i++) {
                var address = new Inrix.Address();
                var resource = results[i];
                address.latitude = resource.point.coordinates[0];
                address.longitude = resource.point.coordinates[1];
                address.addressLine = resource.address.addressLine;
                address.adminDistrict = resource.address.adminDistrict;
                address.postalCode = resource.address.postalCode;
                address.isoCountry = resource.address.countryRegion;
                address.locality = resource.address.locality;
                ret.push(address);
            }
            //
            return ret;
        }

    };

    /**
     * This Inrix.Phs can be overriden with actual PHS implementation when necessary.
     * @class Phs
     */
    Inrix.Phs = {};
    /**
     * @method injectPhs
     * @param theUrl
     * @param options
     * @return options
     */
    Inrix.Phs.injectPhs = function(theUrl, options) {
        return options;
    };

    //-------------------------------------------------------------------------------
    // some utility functions
    /**
     * @class Util
     *
     */
    Inrix.Util = {
        /**
         * @method setDefaults
         * @param obj
         * @param defaultValues
         * @return obj
         */
        setDefaults: function (obj, defaultValues) {
            obj || (obj = {});
            for (var key in defaultValues) {
                if (!obj.hasOwnProperty(key)) obj[key] = defaultValues[key];
            }
            return obj;
        },

        /**
         * @method tileXYToQuadKey
         * @param x
         * @param y
         * @param zoom
         * @return
         */
        tileXYToQuadKey: function(x, y, zoom) {
            var key = [], quadKey, i, keyVal, mask;

            for(i = zoom; i > 0; i--) {
                keyVal = '0';
                mask = 1 << (i-1);
                if( (x & mask) !== 0)
                {
                    keyVal++;
                }
                if( (y & mask) !== 0)
                {
                    keyVal++;
                    keyVal++;
                }
                key.push(keyVal);
            }
            quadKey = key.join("");
            return quadKey;
        },

        /**
         * @method pluralize
         * @param {String} txt
         * @param {Number} num
         * @return {String}
         */
        pluralize: function(txt, num) {
            return (num == 1 ? txt : txt + 's');
        },

        /**
         * @method capitalizeFirstLetter
         * @param {String} string
         * @return {String}
         */
        capitalizeFirstLetter: function(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        },

        /**
         * @method formatXml
         * @param xml
         * @return
         */
        formatXml: function(xml) {
            var reg = /(>)(<)(\/*)/g;
            var wsexp = / *(.*) +\n/g;
            var contexp = /(<.+>)(.+\n)/g;
            xml = xml.replace(reg, '$1\n$2$3').replace(wsexp, '$1\n').replace(contexp, '$1\n$2');
            var pad = 0;
            var formatted = '';
            var lines = xml.split('\n');
            var indent = 0;
            var lastType = 'other';
            // 4 types of tags - single, closing, opening, other (text, doctype, comment) - 4*4 = 16 transitions
            var transitions = {
                'single->single': 0,
                'single->closing': -1,
                'single->opening': 0,
                'single->other': 0,
                'closing->single': 0,
                'closing->closing': -1,
                'closing->opening': 0,
                'closing->other': 0,
                'opening->single': 1,
                'opening->closing': 0,
                'opening->opening': 1,
                'opening->other': 1,
                'other->single': 0,
                'other->closing': -1,
                'other->opening': 0,
                'other->other': 0
            };

            for (var i = 0; i < lines.length; i++) {
                var ln = lines[i];
                var single = Boolean(ln.match(/<.+\/>/)); // is this line a single tag? ex. <br />
                var closing = Boolean(ln.match(/<\/.+>/)); // is this a closing tag? ex. </a>
                var opening = Boolean(ln.match(/<[^!].*>/)); // is this even a tag (that's not <!something>)
                var type = single ? 'single' : closing ? 'closing' : opening ? 'opening' : 'other';
                var fromTo = lastType + '->' + type;
                lastType = type;
                var padding = '';

                indent += transitions[fromTo];
                for (var j = 0; j < indent; j++) {
                    padding += '    ';
                }

                formatted += padding + ln + '\n';
            }

            return formatted;
        },

        /**
         * @method isEmpty
         * @param value
         * @return {Boolean}
         */
        isEmpty: function(value) {
            if (value === null || value === undefined) {
                return true;
            }

            if (typeof value == 'string' && value == '') {
                return true;
            }

            return value.length === 0;
        },

        /**
         * @method _parseText
         * @param sValue
         * @return {Boolean}
         * @private
         */
        _parseText: function(sValue) {
            if (/^\s*$/.test(sValue)) { return null; }
            if (/^(?:true|false)$/i.test(sValue)) { return sValue.toLowerCase() === "true"; }
            if (isFinite(sValue)) { return parseFloat(sValue); }
            if (isFinite(Date.parse(sValue))) { return new Date(sValue); }
            return sValue;
        },

        /**
         * @method getJXONTree
         * @param oXMLParent
         * @return
         */
        getJXONTree: function(oXMLParent) {
            var vResult = /* put here the default value for empty nodes! */ true, nLength = 0, sCollectedTxt = "";
            if (oXMLParent.hasAttributes()) {
                vResult = {};
                for (nLength; nLength < oXMLParent.attributes.length; nLength++) {
                    oAttrib = oXMLParent.attributes.item(nLength);
                    vResult["@" + oAttrib.name.toLowerCase()] = Inrix.Util._parseText(oAttrib.value.trim());
                }
            }
            if (oXMLParent.hasChildNodes()) {
                for (var oNode, sProp, vContent, nItem = 0; nItem < oXMLParent.childNodes.length; nItem++) {
                    oNode = oXMLParent.childNodes.item(nItem);
                    if (oNode.nodeType === 4) { sCollectedTxt += oNode.nodeValue; } /* nodeType is "CDATASection" (4) */
                    else if (oNode.nodeType === 3) { sCollectedTxt += oNode.nodeValue.trim(); } /* nodeType is "Text" (3) */
                    else if (oNode.nodeType === 1 && !oNode.prefix) { /* nodeType is "Element" (1) */
                        if (nLength === 0) { vResult = {}; }
                        sProp = oNode.nodeName.toLowerCase();
                        vContent = Inrix.Util.getJXONTree(oNode);
                        if (vResult.hasOwnProperty(sProp)) {
                            if (vResult[sProp].constructor !== Array) { vResult[sProp] = [vResult[sProp]]; }
                            vResult[sProp].push(vContent);
                        } else { vResult[sProp] = vContent; nLength++; }
                    }
                }
            }
            if (sCollectedTxt) { nLength > 0 ? vResult.keyValue = Inrix.Util._parseText(sCollectedTxt) : vResult = Inrix.Util._parseText(sCollectedTxt); }
            /* if (nLength > 0) { Object.freeze(vResult); } */
            return vResult;
        },

        /**
         * @method getUniqueId
         * @return {String} Unique identifier
         */
        getUniqueId: function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        }
    };

    /*
    * Date Format 1.2.3
    * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
    * MIT license
    *
    * Includes enhancements by Scott Trenda <scott.trenda.net>
    * and Kris Kowal <cixar.com/~kris.kowal/>
    *
    * Accepts a date, a mask, or a date and a mask.
    * Returns a formatted version of the given date.
    * The date defaults to the current date/time.
    * The mask defaults to dateFormat.masks.default.
    */

    var dateFormat = function() {
        var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
            timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
            timezoneClip = /[^-+\dA-Z]/g,
            pad = function(val, len) {
                val = String(val);
                len = len || 2;
                while (val.length < len) val = "0" + val;
                return val;
            };//'

        // Regexes and supporting functions are cached through closure
        return function(date, mask, utc) {
            var dF = dateFormat;

            // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
            if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
                mask = date;
                date = undefined;
            }

            // Passing date through Date applies Date.parse, if necessary
            date = date ? new Date(date) : new Date;
            if (isNaN(date)) {
                throw SyntaxError("invalid date");
            }

            mask = String(dF.masks[mask] || mask || dF.masks["default"]);

            // Allow setting the utc argument via the mask
            if (mask.slice(0, 4) == "UTC:") {
                mask = mask.slice(4);
                utc = true;
            }

            var _ = utc ? "getUTC" : "get",
                d = date[_ + "Date"](),
                D = date[_ + "Day"](),
                m = date[_ + "Month"](),
                y = date[_ + "FullYear"](),
                H = date[_ + "Hours"](),
                M = date[_ + "Minutes"](),
                s = date[_ + "Seconds"](),
                L = date[_ + "Milliseconds"](),
                o = utc ? 0 : date.getTimezoneOffset(),
                flags = {
                    d: d,
                    dd: pad(d),
                    ddd: dF.i18n.dayNames[D],
                    dddd: dF.i18n.dayNames[D + 7],
                    m: m + 1,
                    mm: pad(m + 1),
                    mmm: dF.i18n.monthNames[m],
                    mmmm: dF.i18n.monthNames[m + 12],
                    yy: String(y).slice(2),
                    yyyy: y,
                    h: H % 12 || 12,
                    hh: pad(H % 12 || 12),
                    H: H,
                    HH: pad(H),
                    M: M,
                    MM: pad(M),
                    s: s,
                    ss: pad(s),
                    l: pad(L, 3),
                    L: pad(L > 99 ? Math.round(L / 10) : L),
                    t: H < 12 ? "a" : "p",
                    tt: H < 12 ? "am" : "pm",
                    T: H < 12 ? "A" : "P",
                    TT: H < 12 ? "AM" : "PM",
                    Z: utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                    o: (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                    S: ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
                };

            return mask.replace(token, function($0) {
                return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
            });
        };
    } ();

    // Some common format strings
    dateFormat.masks = {
        "default": "ddd mmm dd yyyy HH:MM:ss",
        shortDate: "m/d/yy",
        mediumDate: "mmm d, yyyy",
        longDate: "mmmm d, yyyy",
        fullDate: "dddd, mmmm d, yyyy",
        shortTime: "h:MM TT",
        mediumTime: "h:MM:ss TT",
        longTime: "h:MM:ss TT Z",
        isoDate: "yyyy-mm-dd",
        isoTime: "HH:MM:ss",
        isoDateTime: "yyyy-mm-dd'T'HH:MM:ss",
        isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
    };

    // Internationalization strings
    dateFormat.i18n = {
        dayNames: [
            "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
            "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
        ],
        monthNames: [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
            "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
        ]
    };

    // For convenience...
    Date.prototype.format = function(mask, utc) {
        return dateFormat(this, mask, utc);
    };

    Date.prototype.parseISO8601 = function(str) {
        // we assume str is a UTC date ending in 'Z'

        if (str) {
        var parts = str.split('T'),
            dateParts = parts[0].split('-'),
            timeParts = parts[1].split('Z'),
            timeSubParts = timeParts[0].split(':'),
            timeSecParts = timeSubParts[2].split('.'),
            timeHours = Number(timeSubParts[0]);

        this.setUTCFullYear(Number(dateParts[0]));
        this.setUTCMonth(Number(dateParts[1])-1);
        this.setUTCDate(Number(dateParts[2]));
        this.setUTCHours(Number(timeHours));
        this.setUTCMinutes(Number(timeSubParts[1]));
        this.setUTCSeconds(Number(timeSecParts[0]));
        if (timeSecParts[1]) this.setUTCMilliseconds(Number(timeSecParts[1]));
        }
        // by using setUTC methods the date has already been converted to local time(?)
        return this;
    };

    /**
     * Helper extension to check whether the current date is before the specified date.
     * @param otherDate Another date object to compare with.
     */
    Date.prototype.before = Date.prototype.before || function(otherDate) {
        return this.getTime() < otherDate.getTime();
    };

    /**
     * Calculates the difference in days between two dates.
     * @param otherDate Another object to compare with.
     */
    Date.prototype.daydiff = Date.prototype.daydiff || function(otherDate) {
        return ((this.getTime() - otherDate.getTime()) / (1000*60*60*24));
    };

    // Expose Inrix as an AMD module. Register as a named module,
    // since Inrix can be concatenated with other files that may use define,
    // but not use a proper concatenation script that understands anonymous
    // AMD modules. A named AMD is safest and most robust way to register.
    // Lowercase inrix is used because AMD module names are derived from
    // file names, and Inrix is normally delivered in a lowercase file name.
    // Do this after creating the global so that if an AMD module wants to call
    // noConflict to hide this version of Inrix, it will work.
    if ( typeof define === "function" ) {
    	define( "inrix", [], function () { return Inrix; } );
    }

    //////////////////
    // Locations
    /////////////////

    //---------------------------
    // Inrix.Location
    // @description: Represents a saved point
    //
    // @properties
    //
    //        Name:                 required
    //                              A string specifying the unique name of the location
    //                              Example: Mofo's Tavern
    //
    //        Point:                required
    //                              Pipe separated lat|long string
    //                              Example: 32.0932|-172.039402
    //
    //        Address:              optional
    //                              String with an address description (no format is enforced)
    //                              Example: 99 North Blvd, Tukwilla
    //
    //        Description:          optional
    //                              String
    //
    //        ExternalPointType:    optional
    //                              Integer
    //
    //        ExternalId:           optional
    //                              Integer used for sort-order on client
    //
    //---------------------------

    /**
     * @class LocationManager
     */

    /**
     * @constructor
     * @param {Object} params
     * @param {Function} params.success
     * @param {Function} params.error

     */
    Inrix.LocationManager = function(params){
    };

    Inrix.LocationManager.prototype = {

        /**
         * @method getLocations
         * @param {Object} options
         * @param {Function} options.success
         * @param {Function} options.error

         */
        getLocations: function(options) {
            Inrix.getLocation(options);
        },

        /**
         * @method addLocation
         * @param {Object} options
         * @param {Function} options.success
         * @param {Function} options.error

         */
        addLocation: function(options) {
            Inrix.addLocation(options);
        },

        /**
         * @method updateLocation
         * @param {Object} options
         * @param {Function} options.success
         * @param {Function} options.error

         */
        updateLocation: function(options) {
            Inrix.updateLocation(options);
        },

        /**
         * @method deleteLocation
         * @param {Object} options
         * @param  options.id
         * @param {Function} options.success
         * @param {Function} options.error
         */
        deleteLocation: function(options) {
            Inrix.deleteLocation(options);
        }
    };

    //////////////////////////
    // Incidents
    //////////////////////////

    //---------------------------
    // Inrix.Incident
    //
    // @description: Represents an Incident
    //
    // @properties
    //
    //  type:           required
    //                  integer for Incident type
    //                  	Construction = 1,
    //                      Event = 2,
    //                      Congestion = 3
    //                      Accident = 4
    //                      Police = 6
    //                      FixedCamera = 7
    //  latitude        required
    //                  string
    //                  Example:    47.09382
    //  longitude       required
    //                  string
    //                  Example:    -172.30921
    //  point           required
    //                  pipe delimited lat|long string
    //                  Example:    34.03928|-132.94820
    //
    //  severity
    //  eventCode
    //  eventText
    //  shortDesc
    //  fullDesc
    //  startTime
    //  endTime
    //  TMCs = []
    //  roadName
    //  direction
    //  delay
    //  delayFromTypical
    //  delayFromFreeFlow
    //  delayLength
    //  crossroads = [];

    /**
     * @class IncidentManager
     */

    Inrix.IncidentManager = function(options) {
        /**
         * @property {Object} options*/
        this.options = options;

        /**
         * @method setOptions
         * @param {Object} options
         * @param options.radius
         * @param options.center
         * @param options.corner1
         * @param options.corner2
         * @param options.incidentType
         * @param options.incidentSource
         * @param options.severity
         * @param options.incidentOutputFields
         */
        this.setOptions = function(options) {
            this.options = options;
        };

        /*
         * options
         *  incidentType
         *      Construction = 1,
         *      Event = 2,
         *      Congestion = 3,
         *      Accident = 4,
         *      Police = 6,
         *      FixedCamera = 7
         *
         *  eventCode
         *      AccidentCode = 201,
         *      ConstructionCode = 244,
         *      EventCode = 701,
         *      PoliceSpeedTrapCode = 1477,
         *      FixedCameraTrapCode = 1971
         *
         *  location
         *      String
         *      Pipe separated lat|long pair:  34.03928|-132.94820
         *  incidentId
         *      comes back form the call
         *  incidentVersion
         *      comes back form the call
         *
         */

        /**
         * @method reportPolice
         * @param {Object} options
         * @param options.incidentType Construction = 1,<br/> Event = 2,<br/>Congestion = 3,<br/>Accident = 4,<br/>Police = 6,<br/>FixedCamera = 7
         * @param options.eventCode AccidentCode = 201,<br/>ConstructionCode = 244,<br/>EventCode = 701,<br/>PoliceSpeedTrapCode = 1477,<br/>FixedCameraTrapCode = 1971
         * @param {String} options.location Pipe separated lat|long pair:  34.03928|-132.94820.
         * @param options.incidentId Comes back form the call
         * @param options.incidentVersion Comes back form the call
         */

        this.reportPolice = function(options) {
            options.eventCode = 1477;
            options.incidentType = 6;
            this.reportIncident(options);
        };

        /**
         * @method reportIncident
         * @param {Object} options
         * @param options.incidentType Construction = 1,<br/> Event = 2,<br/>Congestion = 3,<br/>Accident = 4,<br/>Police = 6,<br/>FixedCamera = 7
         * @param options.eventCode AccidentCode = 201,<br/>ConstructionCode = 244,<br/>EventCode = 701,<br/>PoliceSpeedTrapCode = 1477,<br/>FixedCameraTrapCode = 1971
         * @param {String} options.location Pipe separated lat|long pair:  34.03928|-132.94820.
         * @param options.incidentId Comes back form the call
         * @param options.incidentVersion Comes back form the call
         * @return $.Deferred
         */
        this.reportIncident = function (options) {
            Inrix.Util.setDefaults(options, {
                action: 'Mobile.Incident.Report'
            });

            // if fetch method is provided, fetch should do parsing
            if (!options.fetch) {
                var success = options.success;
                options.success = function (results) {
                    var incidents = Inrix.parseIncidentResults(results);
                    //var incidents = Inrix.parseIncidentResults($(results).find('Inrix > Incidents'));
                    if (incidents && (incidents.length > 0)) {
                        // take the first item returned and marked it as a locally created UGI
                        Inrix.IncidentManager.trackNewlyCreatedIncident(incidents[0]);
                    }
                    if (success) {
                        success(incidents);
                    }
                };
            }
            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return Inrix.callAPI(options);
        };

         /**
         * @method voteOnIncident
         * @param {Object} options
         * @param options.incidentId
         * @param options.incidentVersion
         * @param {Boolean} options.confirmed True to confirm, false to clear.
         * @return $.Deferred
         */
        this.voteOnIncident = function(options) {
            Inrix.Util.setDefaults(options, {
                action: 'IncidentReview'
            });
            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };
            return Inrix.callAPI(options);
        };

        this.updateIncident = function(options) {

        };

        /**
         * @method getIncident
         * @param {Object} options
         * @param {Number} options.incidentId Id of the incident to be retrieved
         * @param {Function} options.success
         * @param {Function} options.error
         */
        this.getIncident = function(options) {
            Inrix.getIncidents(options);
        };

        /**
         * @method voteToClearIncident
         * @param {Object} options
         * @param options.incidentId
         * @param options.incidentVersion
         * @param {Function} options.success Method will not contain any data
         */
        this.voteToClearIncident = function(options) {
            options.confirmed = false;
            this.voteOnIncident(options);
        };

        /**
         * @method voteToConfirmIncident
         * @param {Object} options
         * @param options.incidentId
         * @param options.incidentVersion
         * @param {Function} options.success Method will not contain any data
         */
        this.voteToConfirmIncident = function(options) {
            options.confirmed = true;
            this.voteOnIncident(options);
        };

        /**
         * @method getUGI
         * @param {Object} options
         * @param options.center
         * @param options.radius
         * @param options.type Defaults to "All"
         * @param {Function} options.success(UIGs)
         * @param {Function} options.error(error)
         */
        this.getUGI = function(options) {
            // set the defaults, which will be overwritten if the caller has applied values
            options = $.extend({incidentType: 'All', incidentSource: 'Community'}, options);
            this.getIncidentsInRadius(options);
        };

        /**
         * @method deleteIncident
         * @param {Object} options
         * @param {Number} options.incidentVersion
         * @param {Number} options.incidentId
         * @param {Function} options.success
         * @param {Function} options.error
         * @return $.Deferred
         */
        this.deleteIncident = function(options) {
            var self = this;
            options.incidentId || (options.incidentId = options.id);

                if (!self.isIncidentOwnedByCurrentUser(options)) {
                    if (options.error) {
                        // @TODO: Add promise
                        options.error('User does not own the incident. Cannot delete');
                        return;
                    }
                }
            Inrix.Util.setDefaults(options, {
                action: 'Mobile.Incident.Cancel'
            });

            var originalError = options.error;
            options.error = function(jqXHR, textStatus, errorThrown) {
                var inrixErrorObject = Inrix.parseErrorResults(jqXHR);
                originalError && originalError(jqXHR, textStatus, errorThrown, inrixErrorObject);
            };

            return Inrix.callAPI(options);
        };

        /**
         * @method updateIncident
         * @param {Object} options
         * @param {Number} options.incidentVersion
         * @param {Number} options.incidentId
         * @param {Number} [options.id]
         * @param {Function} options.success
         * @param {Function} options.error
         */
        this.updateIncident = function(options) {
            // I think the update is the same as Add, but the call to Update should
            // have an incidentId and incidentVersion
            options.incidentId || (options.incidentId = options.id);
            if (options.incidentId && options.incidentVersion) {
                this.reportIncident(options);

            } else {
                options.error('No incidentId or incidentVersion provided');
            }
        };

        /**
         * @method getIncidentsInRadius
         * @param {Object} options
         */
        this.getIncidentsInRadius = function(options) {
            Inrix.getIncidentsInRadius(options);
        };

        /**
         * @method getIncidentsInBox
         * @param {Object} options
         */
        this.getIncidentsInBox = function(options) {
            Inrix.getIncidentsInBox(options);
        };

        /**
         * @method purgeLocalIncidentsOlderThan
         * @param {Date} cutoffDate
         */
        this.purgeLocalIncidentsOlderThan = function(cutoffDate) {
            var index = 0;
            while (index < localStorage.length) {
                var key = localStorage.key(index);
                console.log(key);
                if (key) {
                    if (key.indexOf('UGI_') == 0) {
                        // it's a UGI locally created
                        if (cutoffDate.getTime() >  new Date(localStorage[key]).getTime()) {
                            localStorage.removeItem(key);

                            // don't increment index after removal, array will shift under us
                            continue;
                        }
                    }
                }

                index += 1;
            }
        };

        /**
         * @method isIncidentOwnedByCurrentUser
         * @param {Object} options
         * @param {Number} options.incidentVersion
         * @param {Number} options.incidentId
         * @return Returns the timestamp associated with the UGI if the specified UGI was created locally, false if it was nto found locally, or the necessary items are not provided.
         */
        this.isIncidentOwnedByCurrentUser = function(options) {
            if (options.incidentId && options.incidentVersion) {
                var localIncidentKey = 'UGI_' + options.incidentId + '_' + options.incidentVersion;
                return localStorage[localIncidentKey];
            }
            else {
                return false;
            }
        };

        /**
         * @method refreshIncidents
         * @param {Object} options
         */
        this.refreshIncidents = function(options) {
            // overwrite the object's options with the options provided
            var callOptions = this.options ? $.extend({}, this.options) : {};
            callOptions = $.extend(callOptions, options);

            if (callOptions.radius && callOptions.center) {
                // Call the radius function
                this.getIncidentsInRadius(callOptions);

            } else {
                // Call the box function
                this.getIncidentsInBox(callOptions);
            }
        };
    };

    //---------------------------
    // Inrix.Route
    //
    // @description: Represents an Incident
    //
    // @properties
    //
    //  type:           required
    //                  integer for Incident type
    //                  	Construction = 1,
    //                      Event = 2,
    //                      Congestion = 3
    //                      Accident = 4
    //                      Police = 6
    //                      FixedCamera = 7
    //  latitude        required
    //                  string
    //                  Example:    47.09382
    //  longitude       required
    //                  string
    //                  Example:    -172.30921
    //  point           required
    //                  pipe delimited lat|long string
    //                  Example:    34.03928|-132.94820
    //
    //  severity

    /**
     * @method trackNewlyCreatedIncident
     * @param {Object} options
     * @param {Number} options.incidentVersion
     * @param {Number} options.incidentId
     * @return {Boolean}
     */
    Inrix.IncidentManager.trackNewlyCreatedIncident = function (options) {
        if (options.incidentId && options.incidentVersion) {
            var localIncidentKey = 'UGI_' + options.incidentId + '_' + options.incidentVersion;
            localStorage[localIncidentKey] = new Date();
            return true;
        }
        else {
            return false;
        }
    };

}).call(this);
