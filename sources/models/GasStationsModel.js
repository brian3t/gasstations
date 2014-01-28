/**
 * 
 * @file GasStationsModel.js
 * @fileOverview 
 * File containing the implementation of the GasStationsModel singleton.
 * 
 * @author Abalta Technologies, Inc.
 * @date March, 2013
 *
 * @cond Copyright
 *
 * COPYRIGHT 2007 ABALTA TECHNOLOGIES or "CUSTOMER NAME"
 * ALL RIGHTS RESERVED.<p>
 * This program may not be reproduced, in whole or in
 * part in any form or any means whatsoever without the
 * written permission of ABALTA TECHNOLOGIES or "CUSTOMER
 * NAME".
 *
 * @endcond
 */

        /**
         * @namespace Namespace of the current web application.
         */
        window.gasstationsapp = window.gasstationsapp || {};

/**
 * @namespace Namespace for the models.
 */
window.gasstationsapp.models = window.gasstationsapp.models || {};

/**
 * Creates the singleton GasStationsModel.
 * 
 * @class Represents the singleton GasStationsModel.
 * @param undefined
 *            Parameter is not passed to obtain the generic javascript undefined
 *            type.
 */
window.gasstationsapp.models.GasStationsModel = (function(undefined) {

    /**
     * @exports instance as window.gasstationsapp.models.GasStationsModel
     * @ignore
     */
    var instance = {};

    /**
     * Holds the initial data retrieved by the GasStationsService.
     */
    instance.initialData = null;

    /**
     * Holds the gas stations data retrieved by the GasStationsService. Model: {
     * stations: [ { address, city, country, date, diesel, distance, id, lat,
     * lng, region, station, zip, updateDate, regular_price, diesel_price, premium_price, midgrade_price  } ]
     * 
     * status: { } }
     */
    instance.gasStationsData = null;

    /**
     * Holds the gas stations filter options, to be passed onto
     * GasStationsService when requesting data.
     */
    instance.gasStationsDataOptions = {
        'fuelType': '',
        'sortBy': 'price',
        'isAdhoc': true
    };

    /**
     * Holds the timer interval Id of get Stations Data function
     */
    instance.gasStationsDataTimerIntervalId = 0;

    /**
     * Holds the single gas station data retrieved by the GasStationsService.
     * Model: 'details': { 'address' , 'city', 'country'', 'diesel',
     * 'diesel_date', 'diesel_price', 'id', 'lat', 'lng', 'mid_date',
     * 'mid_price', 'pre_date', 'pre_price', 'reg_date', 'reg_price', 'region',
     * 'station_name', 'zip', 'date' }, 'status': { }
     */
    instance.singleGasStationData = null;

    var gasStationsDataNotificationList = null; // The notification list for
    // GasStations Data listeners

    /**
     * Constants
     */
    this.PAGE_AUTO_REFRESH_INTERVAL = 60000;


    /**
     * Initializes the GasStationsModel.
     */
    instance.init = function() {
        gasStationsDataNotificationList = new window.gasstationsapp.app.NotificationList();
        singleGasStationDataNotificationList = new window.gasstationsapp.app.NotificationList();

        // It is safe to call services here because they are already created.
        instance.initialData = window.gasstationsapp.services.ServiceManager.gasStationsService.getInitialData();

        // Start polling data from the Gas Stations service
        instance.gasStationsDataTimerInterval = window.setInterval(instance.refreshGasStationsData,
                PAGE_AUTO_REFRESH_INTERVAL);

    };


    /**
     * Request gas station data from the service and notices listeners
     */
    instance.refreshGasStationsData = function() {
        instance.gasStationsData = window.gasstationsapp.services.ServiceManager.gasStationsService.getGasStationsData(instance.gasStationsDataOptions);
        var timestamp = new Date();
        var timeString = window.gasstationsapp.helper.HelperHolder.dateFormatAMPM(timestamp);
        instance.onNewGasStationsData(instance.gasStationsData, timeString);
    };



    /**
     * Reset interval timer
     */
    instance.resetGasStationsDataTimer = function() {
        window.clearInterval(instance.gasStationsDataTimerInterval);
        instance.gasStationsDataTimerInterval = window.setInterval(instance.refreshGasStationsData,
                PAGE_AUTO_REFRESH_INTERVAL);

    };

    /**
     * Returns the available gas stations data.
     * 
     * @param {boolean}
     *            fromCache If true returns the cached data, otherwise calls a
     *            service to obtain it
     * 
     * @returns the gasStationsData
     */
    instance.getGasStationsData = function(fromCache) {
        if (!fromCache) {
            instance.gasStationsData = window.gasstationsapp.services.ServiceManager.gasStationsService.getGasStationsData(instance.gasStationsDataOptions);
        }
        return instance.gasStationsData;
    };
    
    /**
     * Sets Adhoc to false. To be called by service after the adhoc request has been fulfilled
     * 
     * @returns {undefined} none
     */
    instance.adHocCompleted = function() {
        this.gasStationsDataOptions['isAdhoc'] = false;
    };

    /**
     * Sets Adhoc to true. To be called by CONTROLLER so that the next request will be ad-hoc
     * 
     * @returns {undefined} none
     */
    instance.turnOnAdhoc = function() {
        this.gasStationsDataOptions['isAdhoc'] = true;
    };

    /**
     * Request for the available single gas station data.
     * 
     * @param 
     * 
     * 			options the options in request url options has {
     * 		distance, latitude and
     * 		longitude this is a temporary storage because mygasfeed does not
     * 		return latitude and longitude for a single station,
     * 		{boolean} fromCache : If true returns the cached data, otherwise calls
     *            a service to obtain it
     * 
     * @returns if fromCache is true; returns the singleGasStationData if
     *          fromCache is false; wait for the SERVICE to callback with a
     *          new data. When data arrives, SERVICE will invoke
     *          MODEL.onNewSingleGasStationData()
     */
    instance.getSingleGasStationData = function(options) {
        if (!options['fromCache']) {
            window.gasstationsapp.services.ServiceManager.gasStationsService.getSingleGasStationData(options);
        }
        return instance.singleGasStationData;
    };

    /**
     * Registers listener which will be notified when new gas stations data
     * is obtained.
     * 
     * @param listener
     *            The listener object that will be registered for
     *            notifications.
     * 
     * @returns the ID of the listener.
     */
    instance.registerGasStationsDataListener = function(listener) {
        return gasStationsDataNotificationList.registerListener(listener);
    };

    /**
     * Registers listener which will be notified when new single gas station
     * data is obtained.
     * 
     * @param listener
     *            The listener object that will be registered for
     *            notifications.
     * 
     * @returns the ID of the listener.
     */
    instance.registerSingleGasStationDataListener = function(listener) {
        return singleGasStationDataNotificationList.registerListener(listener);
    };

    /**
     * Unregisters gas stations data listener by ID.
     * 
     * @param id
     *            The ID of the listener that will be unregistered.
     */
    instance.unregisterGasStationsDataListener = function(listenerID) {
        gasStationsDataNotificationList.unregisterListener(listenerID);
    };

    /**
     * Unregisters SINGLE gas station data listener by ID.
     * 
     * @param id
     *            The ID of the listener that will be unregistered.
     */
    instance.unregisterSingleGasStationDataListener = function(listenerID) {
        singleGasStationDataNotificationList.unregisterListener(listenerID);
    };

    /**
     * Notifies all listeners for new gas stations data.
     * 
     * @param data
     *            The new gas stations data.
     * @param timestamp
     *            The timestamp when the new gas stations data is obtained.
     */
    instance.onNewGasStationsData = function(data, timestamp) {
        gasStationsDataNotificationList.notifyAll("onNewGasStationsData", [data, timestamp]);
    };

    /**
     * Notifies all listeners for new SINGLE gas station data.
     * 
     * This function can also be called by Service when polling Single gas
     * stations data; so that wait time is minimized
     * 
     * TRINGUYEN Updated Apr30: When using MyGasFeed API, 50% single gas station data
     *  was incorrect, e.g. station name becomes NULL.
     * To address this, before notifying listeners, Model looks up existing GasStationsData 
     * to replace bad data with better data if there is such better data
     * 
     * @param data
     *            The new single gas station data.
     * @param timestamp
     *            The timestamp when the new gas stations data is obtained.
     */
    instance.onNewSingleGasStationData = function(data, timestamp) {
        // processes data so that "null" or "M" station name gets replaced with better value
        if ((data['details']['station_name'] === null) || (data['details']['station_name'].length === 1) || (data['details']['station_name'].toUpperCase() === "NULL")) {
            //pull up existing gas Stations
            var stations = this.gasStationsData['stations'];
            for (i = 0; (i < stations.length); i++) {
                if (stations[i]['id'] === data['details']['id']) {
                    data['details']['station_name'] = stations[i]['station'];
                }
                ;
            }
        }
        ;

        gasStationsDataNotificationList.notifyAll("onNewSingleGasStationData", [data, timestamp]);
    };


    /**
     * Getters Setters
     */
    instance.getGasStationsDataOptions = function() {
        return this.gasStationsDataOptions;
    };

    instance.setGasStationsDataOptions = function(options) {
        this.gasStationsDataOptions = options;
    };


    return instance;


})();