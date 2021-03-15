/**
 * @namespace Namespace of the current web application.
 */
window.gasstationsapp = window.gasstationsapp || {};

/**
 * @namespace Namespace for the services.
 */
window.gasstationsapp.services = window.gasstationsapp.services || {};

/**
 * @exports ns_service as window.gasstationsapp.services
 */
var ns_services = window.gasstationsapp.services;

ns_services.CONSTANTS = (function() {
    var constantArray = {
        singleStationKeyMap: {
            'address': 'address',
            'city': 'city',
            'country': 'country',
            'diesel': 'diesel',
            'diesel_date': 'diesel_date',
            'diesel_price': 'diesel_price',
            'id': 'id',
            'lat': 'lat',
            'lng': 'lng',
            'mid_date': 'midgrade_date',
            'mid_price': 'midgrade_price',
            'pre_date': 'premium_date',
            'pre_price': 'premium_price',
            'reg_date': 'regular_date',
            'reg_price': 'regular_price',
            'region': 'region',
            'station_name': 'station_name',
            'zip': 'zip',
            'date': 'date'
        },
        gasStationsKeyMap: {
            'address': 'address',
            'city': 'city',
            'country': 'country',
            'date': 'date',
            'diesel': 'diesel',
            'distance': 'distance',
            'id': 'id',
            'lat': 'lat',
            'lng': 'lng',
            'price': 'price',
            'regular_price': 'regular_price',
            'diesel_price': 'diesel_price',
            'premium_price': 'premium_price',
            'midgrade_price': 'midgrade_price',
            'region': 'region',
            'station': 'station',
            'zip': 'zip'
        }
    };

    return {
        get: function(name) {
            return constantArray[name];
        }
    };
})();

/**
 * Creates a GasStationsService_MyGasFeed.
 *
 * @class Class that is used by the Models to obtain gas stations data.
 * @exports ns_services as window.gasstationsapp.services
 */
ns_services.GasStationsService_MyGasFeed = function() {

    /**
     * public properties
     *
     */

    // constants
    this.DEVELOPMENT_URL = "http://devapi.mygasfeed.com";
    this.DEV_API_KEY = "rfej9napna";
    this.PRODUCTION_URL = "http://api.mygasfeed.com";
    this.PRODUCTION_API_KEY = "ok3227rc3r";
    this.DATA_TYPE = "json";
    this.NEARBY_DISTANCE = 20;
    this.OPTIONS_MAP = {
        'regular': 'reg',
        'midgrade': 'mid',
        'premium': 'pre',
        'diesel': 'diesel',
        'price': 'price',
        'distance': 'distance'
    };

    /**
     * Array for the gas stations data.
     */
    this.gasStationsData = "";

    /**
     * Object for the single gas station data.
     */
    this.singleGasStationData = {};
};

/**
 * Retrieves initial data.
 *
 * @returns the initial data
 *
 */
ns_services.GasStationsService_MyGasFeed.prototype.getInitialData = function() {
    return {};
};

/**
 * Creates a new array with the same values but different
 * keys. Must be called when returning data to Model; in order to follow Model's
 * structure e.g. data { first: 26, second: 37 } will be mapped into data { 1st:
 * 26, 2nd: 38 }
 *
 * @returns the new array with keys mapped using keymap
 * @param data: the original array
 * @param keymap: the name of the keymap that will be used for key mapping. The keymap be fetched from CONSTANTS
 *
 */

ns_services.GasStationsService_MyGasFeed.prototype.copyArrayUsingKeyMap = function(
        data, keymap) {
    var copy = Object.create(Object.getPrototypeOf(data));
    var propNames = Object.getOwnPropertyNames(data);
    var singleStationKeyMap = ns_services.CONSTANTS.get(keymap);// fetching keymap , e.g. 'singleStationKeyMap' or 'gasStationsKeyMap' from CONSTANTS

    propNames.forEach(function(name) {
        var desc = Object.getOwnPropertyDescriptor(data, name);
        Object.defineProperty(copy, singleStationKeyMap[name], desc);
    });

    return copy;
};

/**
 * Retrieves gas stations data from mygasfeed service. Also generates state code
 * created from map
 *
 * @param {array} options {
 *        fuelType, sortBy,
 *        {boolean} adhoc if request is ad-hoc, success function
 *          must call back to notify MODEL as soon as data arrives
 *   }
 *
 * @returns the gas stations data
 *
 *
 */
ns_services.GasStationsService_MyGasFeed.prototype.getGasStationsData = function(
        options) {
    /**
     * Initializing API GET request Url example:
     * /stations/radius/(Latitude)/(Longitude)/(distance)/(fuel type)/(sort
     * by)/apikey.json?callback=?
     */

    var latitude = window.gasstationsapp.helper.HelperHolder.getLatitude();
    var longitude = window.gasstationsapp.helper.HelperHolder.getLongitude();
    var myGasFeedFuelType = this.OPTIONS_MAP[options['fuelType']];

    url = this.PRODUCTION_URL;
    url = url + "/stations/radius";
    url += "/" + latitude;
    url += "/" + longitude;
    url += "/" + this.NEARBY_DISTANCE;

    url += "/" + myGasFeedFuelType;
    url += "/" + this.OPTIONS_MAP[options['sortBy']];
    url = url + "/" + this.PRODUCTION_API_KEY + '.json?callback=?';
    dataToSend = {};
    success = function(data) {

        /* storing data */
        var newDataStations = data.stations;
        var size = newDataStations.length;
        var i = 0;
        while (i < size) {
            //storing price in the corresponding key
            if ((typeof newDataStations[i]['price'] === 'undefined') || (isNaN(newDataStations[i]['price']))) {
                newDataStations[i]['price'] = "N/A";
            }

            pricePropertyName = options['fuelType'] + "_price";

            newDataStations[i][pricePropertyName] = newDataStations[i]['price'];
            newDataStations[i] = ns_services.GasStationsService_MyGasFeed.prototype
                    .copyArrayUsingKeyMap(data.stations[i], "gasStationsKeyMap");
            i++;
        }

        data['stations'] = newDataStations;

        ns_services.GasStationsService_MyGasFeed.gasStationsData = data;
        //if this request is Ad-hoc, notifies MODEL immediately
        if (options['isAdhoc']) {
            var timestamp = new Date();
            var timeString = window.gasstationsapp.helper.HelperHolder
                    .dateFormatAMPM(timestamp);

            window.gasstationsapp.models.GasStationsModel.onNewGasStationsData(data, timeString);
            window.gasstationsapp.models.GasStationsModel.adHocCompleted();
        }
        /* console.log("Gas Stations data: " + this.gasStationsData); */
    };
    dataType = this.DATA_TYPE;

    $.ajax({
        url: url,
        data: dataToSend,
        success: success,
        dataType: dataType
    });

    return ns_services.GasStationsService_MyGasFeed.gasStationsData;
};

/**
 * Retrieves a single gas station data from mygasfeed.
 * Callback MODEL when new data arrives
 *
 * @param options:
 *            the options in request url options has distance, latitude and
 *            longitude this is a temporary storage because mygasfeed does not
 *            return latitude and longitude for a single station
 * @returns null
 */
ns_services.GasStationsService_MyGasFeed.prototype.getSingleGasStationData = function(
        options) {
    /**
     * Initializing API GET request Url example:
     * /locations/pricehistory/(station id)/apikey.json?callback=?
     */

    if (options["gasStationId"] == null) {
        return null;
    }

    url = this.PRODUCTION_URL;
    url = url + "/stations/details" + "/" + options["gasStationId"];
    url = url + "/" + this.PRODUCTION_API_KEY + '.json?callback=?';
    dataToSend = {};
    success = function(data) {

        /* storing data */
        var newDetail = ns_services.GasStationsService_MyGasFeed.prototype
                .copyArrayUsingKeyMap(data['details'], "singleStationKeyMap");
        data['details'] = newDetail;
        console.log("new data: " + data);
        ns_services.GasStationsService_MyGasFeed.singleGasStationData = data;

        var detailPage = $("#stationDetail");

        var timestamp = new Date();
        var timeString = window.gasstationsapp.helper.HelperHolder
                .dateFormatAMPM(timestamp);

        //set updated date to be regular date
        //todo compare dates to get the least value between reg_date, pre_date and diesel_date
        data['details']['date'] = newDetail['regular_date'];
        if (typeof data['details']['date'] === "undefined") {
            data['details']['date'] = "";
        }


        // append gas station distance, lat and long
        data['latitude'] = options['latitude'];
        data['longitude'] = options['longitude'];
        data['gasStationDistance'] = options['gasStationDistance'];

        //callback to notify MODEL immediately when new data arrives
        window.gasstationsapp.models.GasStationsModel
                .onNewSingleGasStationData(data, timeString);

    };
    dataType = this.DATA_TYPE;

    /* TEMPORARY sync todo: async call */
    $.ajax({
        async: false,
        url: url,
        data: dataToSend,
        success: success,
        dataType: dataType
    });

    return {};
};
