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

/*
 *
 * mapping constants
 * key: field name of data returned by service
 * value: field name of data to be stored into model. This should be the same for all services
 */

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
            'midgrade_date': 'midgrade_date',
            'midgrade_price': 'midgrade_price',
            'premium_date': 'premium_date',
            'premium_price': 'premium_price',
            'regular_date': 'regular_date',
            'regular_price': 'regular_price',
            'region': 'region',
            'name': 'station_name',
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
            'latitude': 'lat',
            'longitude': 'lng',
            'region': 'region',
            'name': 'station',
            'zip': 'zip',
            'regular_price': 'regular_price',
            'diesel_price': 'diesel_price',
            'premium_price': 'premium_price',
            'midgrade_price': 'midgrade_price',
        }
    };

    return {
        get: function(name) {
            return constantArray[name];
        }
    };
})();

/**
 * Creates a GasStationsService_INRIX.
 *
 * @class Class that is used by the Models to obtain gas stations data.
 * @exports ns_services as window.gasstationsapp.services
 */
ns_services.GasStationsService_INRIX = function() {

    /**
     * public properties
     *
     */

    // constants
    this.DEVELOPMENT_URL = "http://api.sandbox.inrix.com/V3/Traffic/Inrix.ashx";
    this.DEV_API_KEY = "rfej9napna";
    this.PRODUCTION_URL = "";
    this.PRODUCTION_API_KEY = "ok3227rc3r";
    this.DATA_TYPE = "xml";
    this.NEARBY_DISTANCE = 20;
    this.OPTIONS_MAP = {
        'Regular': 'regular',
        'MidGrade': 'midgrade',
        'Premium': 'premium',
        'Diesel': 'diesel',
        'price': 'price',
        'distance': 'distance'
    };

    /**
     * Array for the gas stations data.
     */
    this.gasStationsData = {};

    /**
     * Object for the single gas station data.
     */
    this.singleGasStationData = {};


    //Init INRIX.js platform with the set of credentials (vendorId, vendorToken).
    InitializeInrixPlatform();

};


/**
 * Set gas stations data
 *
 * @param newData gas stations value
 *
 */
ns_services.GasStationsService_INRIX.prototype.setGasStationsData = function(newData) {
    this.gasStationsData['stations'] = newData;
};


/*
 * Initializes Inrix Platform using VendorID and Mobile token
 *
 * @returns {undefined}
 */
function InitializeInrixPlatform()
{
    var config = {
        appVersion: '1.0 Prod',
        systemVersion: Inrix.VERSION,
        deviceModel: 'MDK1.0',
        // inrixApp Free
        serverUrl: 'http://api.mobile.inrix.com',
        vendorId: '1632823320',
        vendorToken: 'f7687c49-096b-479b-b31e-0bf7dc9a75e5'
    };
    Inrix.init(config);

    if (!Inrix.hasConsumerId()) {
        Inrix.deviceRegister({registerError: function() {
                alert('Error while registering device with Vendor ID: ' + config.vendorId + ', vendor Token: ' + config.vendorToken);
            }});
    }
}


/**
 * Retrieves initial data.
 *
 * @returns the initial data
 *
 */
ns_services.GasStationsService_INRIX.prototype.getInitialData = function() {
    return {};
};

/**
 * Creates a new array with the same values but different
 * keys. Must be called when returning data to Model; in order to follow Model's
 * structure e.g. data { first: 26, second: 37 } will be mapped into data { 1st:
 * 26, 2nd: 38 }
 *
 * @returns the new array with keys mapped using keymap
 * @param data the original array
 * @param keymap the name of the keymap that will be used for key mapping. The keymap be fetched from CONSTANTS
 *
 */

ns_services.GasStationsService_INRIX.prototype.copyArrayUsingKeyMap = function(
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
 * Retrieves gas stations data from Inrix service. Using Inrix callAPI
 *
 * @returns the gas stations data
 *

 * @param {array} options includes
 *                  radius: radius from center
 *                  {boolean} adhoc if request is ad-hoc, success function
 *          must call back to notify MODEL as soon as data arrives
 *
 */
ns_services.GasStationsService_INRIX.prototype.getGasStationsData = function(
        options) {

    var latitude = window.gasstationsapp.helper.HelperHolder.getLatitude();
    var longitude = window.gasstationsapp.helper.HelperHolder.getLongitude();
    var radius = null;
    var OPTIONS_MAP = this.OPTIONS_MAP;

    if ((options['radius'] === null) || (options['radius'] === undefined)) {
        radius = this.NEARBY_DISTANCE;
    }
    else {
        radius = options['radius'];
    }

    options.action = 'Mobile.GasStation.Radius';
    options.Center = latitude + "|" + longitude;
    options.Radius = radius;
    //options.ProductType =
    options.success = function(data) {

        /* storing data */
        var newDataStations = data.firstChild.firstChild;
        var gasStationsArray = new Array();

        var size = newDataStations.childNodes.length;
        var gasStationXML = {};
        var gasStation = {};
        var gasStationMapped = {};
        for (var i = 0; i < size; i++) {
            gasStationXML = newDataStations.childNodes[i];
            gasStation = Inrix.GasStation(gasStationXML);

            //extra data manipulation
            //maybe compose as a helper method as in INRIX lib
            var $gasStation = $(gasStationXML);

            //store price and updated Date for each product
            //from Inrix there are three updated dates for the three types of fuel
            //set the updated date in Model to be either today or oldest date from INRIX
            gasStation['date'] = new Date();
            var products = [];
            var numOfProducts = 0;
            $gasStation.find('Product').each(function() {
                var $product = $(this);
                var product = {};
                product.type = $product.attr('type');
                product.price = $product.attr('price');
                if ((typeof product.price === 'undefined') || (isNaN(product.price)) || (product.price === "undefined")) {
                    product.price = "N/A";
                }

                var pricePropertyName = OPTIONS_MAP[product.type] + "_price";
                gasStation[pricePropertyName] = product.price;

                //comparing dates
                product.updateDate = new Date();
                product.updateDate = $product.attr('updateDate');
                if (product.updateDate < gasStation['date']) {
                    gasStation['date'] = product.updateDate;
                }
                products.push(product);
                numOfProducts = numOfProducts + 1;
            });
            //get the oldest updated Date from INRIX
            gasStation['date'] = window.gasstationsapp.helper.HelperHolder.daysAgoStringFromDate(gasStation['date']);


            //leave out zip code
            gasStation['zip'] = gasStation.address.match(/, (\d+)$/g);
            gasStation.address = gasStation.address.replace(/, (\d+)$/g, "");

            //clean up station name; e.g. "NAME (DISCOUNT AVAILABLE" becomes "NAME"
            gasStation['name'] = gasStation['name'].replace(/\(.*\)/g, "");

            //set fixed distance; since service does not return distance. Todo: calculate or request distance
            //OB gasStation['distance'] = window.gasstationsapp.helper.CONSTANTS.get("DISTANCE_NOT_AVAILABLE");
            gasStation['distance'] = window.gasstationsapp.helper.HelperHolder.flyingDistanceBetweenTwoPoints(latitude, longitude, gasStation['latitude'], gasStation['longitude']);



            gasStationMapped = ns_services.GasStationsService_INRIX.prototype
                    .copyArrayUsingKeyMap(gasStation, "gasStationsKeyMap");


            gasStationsArray.push(gasStationMapped);
        }

        //since INRIX service does not sort its stations result,
        //this method sorts the list manually, based on gasstations data options defined earlier by CONTROLLER

        if (options['sortBy'] === "price") {
            var propertyToSort = options['fuelType'] + "_" + "price";
            function isNotNaN(element, index, array) {
                return (!isNaN(element[propertyToSort]));
            }
            gasStationsArray = gasStationsArray.filter(isNotNaN);

            gasStationsArray.sort(function(a, b) {
                return (a[propertyToSort] - b[propertyToSort]);
            });
        }

        if (options['sortBy'] === "distance") {
            var propertyToSort = "distance";
            function isNotNaN(element, index, array) {
                return (!isNaN(element[propertyToSort]));
            }
            gasStationsArray = gasStationsArray.filter(isNotNaN);

            gasStationsArray.sort(function(a, b) {
                return (a[propertyToSort] - b[propertyToSort]);
            });
        }

        data['stations'] = gasStationsArray;

        ns_services.GasStationsService_INRIX.gasStationsData = data;
        //if this request is Ad-hoc, notifies MODEL immediately
        if (options['isAdhoc']) {
            var timestamp = new Date();
            var timeString = window.gasstationsapp.helper.HelperHolder
                    .dateFormatAMPM(timestamp);
            window.gasstationsapp.models.GasStationsModel.onNewGasStationsData(data, timeString);
            window.gasstationsapp.models.GasStationsModel.adHocCompleted();
        }
    };

    options.error = function(error) {

        var output = 'error:';
        for (property in error) {
            output += property + ': ' + error[property] + '; ';
        }
        console.log(output);
    };

    Inrix.callAPI(options);

    return ns_services.GasStationsService_INRIX.gasStationsData;
};

/**
 * Retrieves a single gas station data from Inrix.
 * Callback MODEL when new data arrives
 *
 * @param options
 *            the options in request url options has distance, latitude and
 *            longitude this is a temporary storage because Inrix does not
 *            return latitude and longitude for a single station
 * @returns null
 */
ns_services.GasStationsService_INRIX.prototype.getSingleGasStationData = function(
        options) {

    if (options["gasStationId"] === null) {
        return null;
    }

    var OPTIONS_MAP = this.OPTIONS_MAP;
    var latitude = window.gasstationsapp.helper.HelperHolder.getLatitude();
    var longitude = window.gasstationsapp.helper.HelperHolder.getLongitude();
    var radius = null;

    if ((options['radius'] === null) || (options['radius'] === undefined)) {
        radius = this.NEARBY_DISTANCE;
    }
    else {
        radius = options['radius'];
    }

    options.action = 'Mobile.GasStation.Get';
    options.Id = options["gasStationId"];
    options.ProductType = "Diesel,Regular,MidGrade,Premium";

    options.success = function(data) {

        /* storing data */
        var returnedData = {};
        var newDataStations = data.firstChild.firstChild;

        var size = newDataStations.childNodes.length;
        if (size !== 1) {
            console.log("Single gas station Inrix API returned with size: " + size);
            return {};
        }
        var gasStationXML = {};
        var gasStation = {};
        var gasStationMapped = {};

        gasStationXML = newDataStations.childNodes[0];
        gasStation = Inrix.GasStation(gasStationXML);

        //extra data manipulation
        //maybe compose as a helper method as in INRIX lib
        var $gasStation = $(gasStationXML);

        //store price and updated Date for each product
        //from Inrix there are three updated dates for the three types of fuel
        //set the updated date in Model to be either today or oldest date from INRIX
        gasStation['date'] = new Date();
        var products = [];
        var numOfProducts = 0;
        $gasStation.find('Product').each(function() {
            var $product = $(this);
            var product = {};
            product.type = $product.attr('type');
            product.price = $product.attr('price');
            if ((typeof product.price === 'undefined') || (isNaN(product.price)) || (product.price === "undefined")) {
                product.price = "N/A";
            }

            product.price = parseFloat(product.price).toFixed(2);
            var pricePropertyName = OPTIONS_MAP[product.type] + "_price";
            gasStation[pricePropertyName] = product.price;

            //comparing dates
            product.updateDate = new Date();
            product.updateDate = $product.attr('updateDate');
            if (product.updateDate < gasStation['date']) {
                gasStation['date'] = product.updateDate;
            }
            products.push(product);
            numOfProducts = numOfProducts + 1;
        });
        //get the oldest updated Date from INRIX
        gasStation['date'] = window.gasstationsapp.helper.HelperHolder.daysAgoStringFromDate(gasStation['date']);

        //leave out zip code
        gasStation['zip'] = gasStation.address.match(/, (\d+)$/g);
        gasStation.address = gasStation.address.replace(/, (\d+)$/g, "");

        //set fixed distance; since service does not return distance. Todo: calculate or request distance
        gasStation['distance'] = window.gasstationsapp.helper.CONSTANTS.get("DISTANCE_NOT_AVAILABLE");

        gasStationMapped = ns_services.GasStationsService_INRIX.prototype
                .copyArrayUsingKeyMap(gasStation, "singleStationKeyMap");


        returnedData['details'] = gasStationMapped;

        var timestamp = new Date();
        var timeString = window.gasstationsapp.helper.HelperHolder
                .dateFormatAMPM(timestamp);

        // append gas station distance, lat and long
        returnedData['latitude'] = options['latitude'];
        returnedData['longitude'] = options['longitude'];
        returnedData['gasStationDistance'] = options['gasStationDistance'];

        //callback to notify MODEL immediately when new data arrives
        window.gasstationsapp.models.GasStationsModel
                .onNewSingleGasStationData(returnedData, timeString);

    };

    options.error = function(error) {

        var output = 'error:';
        for (property in error) {
            output += property + ': ' + error[property] + '; ';
        }
        console.log(output);
    };

    Inrix.callAPI(options);

    return {};
};
