/**
 * 
 * @file GasStationsController.js
 * @fileOverview 
 * File containing the implementation of the GasStationsController singleton.
 * 
 * @author Abalta Technologies, Inc.
 * @date April, 2013
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
 * @namespace Namespace for the controllers classes.
 */
window.gasstationsapp.controllers = window.gasstationsapp.controllers || {};

/**
 * @exports ns_controllers as window.gasstationsapp.controllers
 */
var ns_controllers = window.gasstationsapp.controllers;

/**
 * Creates the singleton GasStationsController.
 * 
 * @class Represents the singleton GasStationsController.
 * @param undefined
 *            Parameter is not passed to obtain the generic javascript undefined
 *            type
 * @exports ns_controllers as window.gasstationsapp.controllers
 */
ns_controllers.GasStationsController = (function(undefined) {

    /**
     * @exports instance as
     *          window.gasstationsapp.controllers.GasStationsController
     * @ignore
     */
    var instance = {
        // constants
        DEMO_SIZE: 20

    };

    var DEFAULT_ZOOM = 12;
    var DETAIL_MAP_WIDTH = 330;
    var DETAIL_MAP_HEIGHT = 330;
    var MAP_TYPE = "roadmap";
    /**
     * Is the controller waiting for new data?
     */
    instance.isWaitingForData = false;

    /**
     * When did CONTROLLER started waiting for data?
     */
    instance.waitingStartTime = new Date();

    /**
     * Holds the gas station list data retrieved by the GasStationsModel.
     */
    instance.gasStationsData = null;

    /*
     * Holds the jScrollPaneElement
     */
    instance.jScrollPaneElement = {};

    /**
     * Holds the gas stations filter options, to be passed onto GasStationsModel
     * when requesting data.
     */
    instance.gasStationsDataOptions = {
        'fuelType': "regular",
        'sortBy': "price",
        'isAdhoc': true
    };

    /**
     * Holds the single gas station data retrieved by the GasStationsModel.
     */
    instance.singleGasStationData = null;

    /**
     * The listener ID obtained from the gasstations model.
     */
    instance.gasStationsDataListenerID = null;
    instance.singleGasStationDataListenerID = null;

    /*
     * The UI in which the gas stations data will be displayed.
     */
    instance.gasStationsDataDisplay = null;

    delayedRequestOnStartUp = function() {
        // Calls method of the GasStationsModel which is already created and
        // initialized.
        instance.gasStationsData = window.gasstationsapp.models.GasStationsModel
                .getGasStationsData(false);

        // Register for notifications from the GasStationsModel
        instance.gasStationsDataListenerID = window.gasstationsapp.models.GasStationsModel
                .registerGasStationsDataListener(this);
    };


    instance.delayedF = function() {
        // Register for notifications from the GasStationsModel
        instance.gasStationsDataListenerID = window.gasstationsapp.models.GasStationsModel
                .registerGasStationsDataListener(this);

        // Calls method of the GasStationsModel which is already created and
        // initialized.

        instance.gasStationsData = window.gasstationsapp.models.GasStationsModel
                .getGasStationsData(false);


    };

    /**
     * Initializes the GasStationsController.
     */
    instance.init = function() {

        instance.waitForData();

        // Initialize data options
        window.gasstationsapp.models.GasStationsModel
                .setGasStationsDataOptions(instance.gasStationsDataOptions);

        window.setTimeout(function() {
            instance.delayedF();
        }, 12000);

        // Obtains the gas Station list data UI
        instance.gasStationsDataDisplay = $("#stationList");

        // init html elements
        $(document).bind('pageinit', function() {

            //callback to execute after the page Single Station Detail is transitioned
            $("#stationDetail").on("pageshow", function(event, ui) {
//                instance.waitForData();
            });

            $('#stationListPage').on("pageshow",
                    function(event, ui) {
                        var jScrollPaneApi = instance.jScrollPaneElement.data('jsp');

                        //reinitialise jScrollPane upon device orientation change only in landscape
                        jScrollPaneApi.reinitialise();
                    });

        });

        /* Bind an event to window.orientationchange that, when the device is turned,
         * gets the orientation and displays it to on screen
         */

        $(window).on("orientationchange", function(event) {
            var jScrollPaneApi = instance.jScrollPaneElement.data('jsp');

            //reinitialise jScrollPane upon device orientation change only in landscape
            if (event.orientation === "landscape") {
                jScrollPaneApi.reinitialise();
            }
        });

        instance.initButtons();
        instance.jScrollPaneElement = $("#scrollPane").jScrollPane({
            verticalDragMinHeight: 38,
            verticalDragMaxHeight: 38,
            verticalGutter: -20,
            minStep: 1,
            hideFocus: true,
            showArrows: true,
            contentWidth: 800,
            horizontalDragMaxWidth: 0,
            horizontalGutter: 0
        });
        $("#scrollPane").width("100%");
        $(".jspContainer").width("100%");
        $(".jspPane").width("100%");
    };

    instance.initButtons = function() {

        /* functions for station list page */
        $("#popupFuelType").bind(
                {
                    popupafteropen: function(event, ui) {
                        $("a#fuelType").addClass('select');
                        $("a#fuelType").find('.ui-btn-text').addClass(
                                'highlighted');
                        $("#stationList").find("li").each(function() {
                            $(this).addClass("dimmed");
                        $("div.jspVerticalBar").addClass("dimmed");
                        });
                    },
                    popupafterclose: function() {
                        $("a#fuelType").removeClass('select');
                        $("a#fuelType").find('.ui-btn-text').removeClass(
                                'highlighted');
                            
                            $("#stationList").find("li").each(function() {
                                $(this).removeClass("dimmed");
                            });
                            $("div.jspVerticalBar").removeClass("dimmed");

                    }
                });

        // calling Model to immediately refresh new gas stations data
        $("#page-refresh").click(
                function() {
                    instance.gasStationsDataOptions['isAdhoc'] = true;
                    window.gasstationsapp.models.GasStationsModel
                            .setGasStationsDataOptions(instance.gasStationsDataOptions);
                    window.gasstationsapp.models.GasStationsModel
                            .resetGasStationsDataTimer();
                    window.gasstationsapp.models.GasStationsModel
                            .refreshGasStationsData();
                    instance.waitForData();

                });

        // Filter Fuel Price selected - Update filter options and refresh data
        $(":input[type=radio][name=radio-choice-fuelType]")
                .bind(
                "change",
                function(event, ui) {
                    instance.gasStationsDataOptions['fuelType'] = $(
                            this).val();
                    $("a#fuelType").find('.ui-btn-text').text(
                            this.value);

                    instance.gasStationsDataOptions['isAdhoc'] = true;
                    window.gasstationsapp.models.GasStationsModel
                            .setGasStationsDataOptions(instance.gasStationsDataOptions);
                    window.gasstationsapp.models.GasStationsModel
                            .resetGasStationsDataTimer();
                    window.gasstationsapp.models.GasStationsModel.refreshGasStationsData();
                    $("#popupFuelType").popup('close');
                    instance.waitForData();

                });

        // Sort By clicked - Toggle between sort by price / sort by distance and
        // refresh data
        $("#sortBy")
                .click(
                function(event, ui) {
                    if (instance.gasStationsDataOptions['sortBy'] == "price") {
                        $(this).removeClass('sort-by-price');
                        instance.gasStationsDataOptions['sortBy'] = "distance";
                        $(this).addClass('sort-by-distance');
                    } else {
                        $(this).removeClass('sort-by-distance');
                        instance.gasStationsDataOptions['sortBy'] = "price";
                        $(this).addClass('sort-by-price');
                    }

                    instance.gasStationsDataOptions['isAdhoc'] = true;
                    window.gasstationsapp.models.GasStationsModel
                            .setGasStationsDataOptions(instance.gasStationsDataOptions);
                    window.gasstationsapp.models.GasStationsModel
                            .resetGasStationsDataTimer();
                    window.gasstationsapp.models.GasStationsModel
                            .refreshGasStationsData();

                    instance.waitForData();
                });

        /* functions for station list page */

        /* functions for station detail page */

    };

    /**
     * Method that will be invoked when controller is actively waiting for new
     * data, e.g. when filter option has just been changed or when single
     * station data is not yet available
     * 
     * @returns false if controller is already waiting for new data true if
     *          succeed in entering waiting phase
     */
    instance.waitForData = function() {
        if (instance.isWaitingForData === true) {
            return false;
        }

        $.mobile.loading("show");// show loading
        $("#scrollPane").addClass("dimmed");
        $("ul#fuelPrices").addClass("dimmed");
        //record the time when CONTROLLER started waiting for new data
        instance.waitingStartTime = new Date();

        instance.isWaitingForData = true;
    };

    /**
     * Method that will be invoked when controller wants to stop waiting for new
     * data, e.g. when new data has become available or when controller decides
     * not to
     * 
     * @returns false if controller is not waiting for new data true if succeed
     *          in exiting waiting phase
     */
    instance.stopWaitingForData = function() {
        if (instance.isWaitingForData === false) {
            return false;
        }
        var now = new Date();

        $.mobile.loading("hide");// hide loading
        $("#scrollPane").removeClass("dimmed");
        $("ul#fuelPrices").removeClass("dimmed");

        instance.gasStationsDataOptions['isAdhoc'] = false;
        instance.isWaitingForData = false;
    };

    /**
     * Method that will be invoked when a station list item is clicked. Method
     * that initiates Gas Station list item anchor click function It populates
     * detail page and displays detail page
     */

    instance.listClickFunction = function(listElement) {
        var gasStationId = "";
        var options = {
        };
        var list = $(listElement);

//        instance.waitForData();

        options["gasStationId"] = list.find('.gasStationId').text();
        options["gasStationDistance"] = list.find('.gasStationDistance').text();
        options['latitude'] = list.find('.gasStationLatitude').text();
        options['longitude'] = list.find('.gasStationLongitude').text();
        options['fromCache'] = false;

        /*
         * get data from MyGasFeed.
         * 
         * Update Apr 28: Register for notifications from MODEL; instead of
         * calling SERVICE directly Once single gas station data is fetched,
         * unregisters for notification, since single gas station data is a
         * one-time request.
         */
        var singleGasStationData = {};
        // Register for notifications from the GasStationsModel
        instance.singleGasStationDataListenerID = window.gasstationsapp.models.GasStationsModel
                .registerSingleGasStationDataListener(this);
        instance.waitForData();
        // invoke request for single station data. This is ad-hoc invocation
        // hence it is initiated by CONTROLLER
        window.gasstationsapp.models.GasStationsModel.getSingleGasStationData(options);

        /*
         * singleGasStationData =
         * window.gasstationsapp.services.ServiceManager.gasStationsService
         * .getSingleGasStationData(options); detailPage = $("#stationDetail");
         * 
         * var addressString = singleGasStationData["details"]["address"]; if
         * (singleGasStationData["details"]["city"] != null) { addressString += ', ' +
         * singleGasStationData["details"]["city"]; } if
         * (singleGasStationData["details"]["region"] != null) { var stateCodeMap =
         * window.gasstationsapp.helper.CONSTANTS .get('STATE_CODE_MAP'); var
         * stateCode = stateCodeMap[singleGasStationData["details"]['region']];
         * 
         * addressString += ', ' + stateCode; }
         * 
         * updating UI detailPage.find(".gasStationId").text(
         * singleGasStationData["details"]["id"]);
         * detailPage.find(".gasstationName").text(
         * singleGasStationData["details"]["station_name"]);
         * detailPage.find(".gasStationAddress").text(addressString);
         * detailPage.find(".lastUpdated").text(
         * singleGasStationData["details"]["reg_date"]);
         * detailPage.find("label:contains('Regular')").next().text( "$ " +
         * singleGasStationData["details"]["reg_price"]);
         * detailPage.find("label:contains('Midgrade')").next().text( "$ " +
         * singleGasStationData["details"]["mid_price"]);
         * detailPage.find("label:contains('Premium')").next().text( "$ " +
         * singleGasStationData["details"]["pre_price"]);
         * detailPage.find("label:contains('Diesel')").next().text( "$ " +
         * singleGasStationData["details"]["diesel_price"]);
         * detailPage.find(".distance").text($(".gasStationDistance")); // preparing
         * map image options['zoom'] = this.DEFAULT_ZOOM; options['size'] = { width :
         * this.DETAIL_MAP_WIDTH, height : this.DETAIL_MAP_HEIGHT };
         * options['maptype'] = "roadmap"; //
         * &markers=color:blue|label:S|32.91232,-117.14469 options['markers'] = {
         * color : "blue", label :
         * singleGasStationData["details"]["station_name"][0], // first // letter //
         * only latitude : options['latitude'], longitude : options['longitude'] };
         * options['sensor'] = false; // updating image source var img =
         * detailPage.find("#mapDetail").find('img'); img.attr('src',
         * window.gasstationsapp.helper.HelperHolder
         * .generateGoogleMapStaticMap(options));
         */    };

    /**
     * Method that will be invoked as a notification when a new gasStations data
     * from MyGasFeed is obtained. It displays the new gasStations data and the
     * timestamp when it is obtained. todo: if timestamp is less than 0:00 ; the
     * value for .gasStationUpdated is today
     * 
     * @param data
     *            The received new gasStations data.
     * @param timestamp
     *            The timestamp when the gasStations data is obtained.
     */
    instance.onNewGasStationsData = function(data, timestamp) {
        /*
         * instance.gasStationsDataDisplay.html("Data: " + data + "; Obtained: " +
         * timestamp);
         */
        if (data == null) {
            return false;
        }
        var size = data['stations'].length;
        console.log("size: " + size);
        if (size == 0) {
            return false;
        }

        /* prepare elements */
        StationListItem = function() {
            return $(
                    '<li></li>',
                    {
                        html: '        <a href="#stationDetail"> 						'
                                + '                			<div class="ui-grid-b"> 									'
                                + '						        <div class="ui-block-a">								'
                                + '						            <label class="gasStationId"></label>				'
                                + '						            <label class="gasStationName"></label>		'
                                + '						            <p													'
                                + '						                class="gasStationAddress subtitle blue">		'
                                + '        							</p>				'
                                + '									<label class="gasStationLatitude"></label>					'
                                + '									<label class="gasStationLongitude"></label>					'
                                + '						        </div>													'
                                + '						        <div class="ui-block-b">								'
                                + '					            Updated <label class="gasStationUpdated"> </label>		'
                                + '					        	</div>													'
                                + '					        															'
                                + '    							<div class="ui-block-c">								'
                                + '					            <label class="gasPrice"> </label>					'
                                + '					            <p														'
                                + '					                class="gasStationDistance blue">			'
                                + '					                </p>												'
                                + '        						</div>													'
                                + '        					</div>														'
                                + '        					</a>'
                    });
        };
        var gasStationListItemCollection = new Array();

        /** a single gas station from MyGasFeed */
        var stationName = "";
        var stationId = "";
        var stateCodeMap = window.gasstationsapp.helper.CONSTANTS
                .get('STATE_CODE_MAP');
        var stateCode = "";

        var i = 0;
        var numOfValidRecords = 0;
        while ((i < size) && (numOfValidRecords < instance.DEMO_SIZE)) {
            var gasStationListItem = new StationListItem();

            stationId = data['stations'][i]['id'];
            stationName = data['stations'][i]['station'];
            stationAddress = data['stations'][i]['address'];

            var addressString = stationAddress;
            if (data['stations'][i]["city"] != null) {
                addressString += ', ' + data['stations'][i]["city"];
            }
            if (data['stations'][i]["region"] != null) {
                stateCode = stateCodeMap[data["stations"][i]['region']];
                addressString += ', ' + stateCode;
            }

            stationLatitude = data['stations'][i]['lat'];
            stationLongitude = data['stations'][i]['lng'];
            stationUpdated = data['stations'][i]['date'];

            stationDistance = data['stations'][i]['distance'];
            if (stationDistance !== window.gasstationsapp.helper.CONSTANTS.get("DISTANCE_NOT_AVAILABLE")) {
                stationDistance = parseFloat(stationDistance).toFixed(1);
            }

            /* filter out N/A or NaN prices from MyGasFeed 
             * This filter is only applied when CONTROLLER is NOT waiting for data. 
             * When CONTROLLER is waiting for data, some outdated data remains hence we just 
             * display them while waiting (otherwise there is nothing to display)
             * */
            var pricePropertyName = instance.gasStationsDataOptions['fuelType'] + '_price';
            if ((isNaN(data['stations'][i][pricePropertyName])) || (data['stations'][i][pricePropertyName] === "N/A")) {
                i = i + 1;
                continue;
            }
            stationGasPrice = parseFloat(data['stations'][i][pricePropertyName]).toFixed(2);

            /* filter out development data from MyGasFeed */
            if ((stationName === null) || (stationName.length < 4) || (stationName.toUpperCase() === "UNBRANDED")
                    || (stationId === null) || (stationId === "")) {
                i = i + 1;
                continue;
            }
            /* filter out "NA" data from model */
            if (stationGasPrice === "N/A") {
                i = i + 1;
                continue;
            }

            //else, count a valid record


            numOfValidRecords = numOfValidRecords + 1;

            /* assigning property values */
            gasStationListItem.find('.gasStationId').text(stationId);
            gasStationListItem.find('.gasStationName').text(stationName);
            gasStationListItem.find('.gasStationAddress').text(addressString);
            gasStationListItem.find('.gasStationLatitude')
                    .text(stationLatitude);
            gasStationListItem.find('.gasStationLongitude').text(
                    stationLongitude);
            gasStationListItem.find('.gasStationUpdated').text(stationUpdated);
            gasStationListItem.find('.gasPrice').text('$ ' + stationGasPrice);
            if (stationDistance !== window.gasstationsapp.helper.CONSTANTS.get("DISTANCE_NOT_AVAILABLE")) {
                gasStationListItem.find('.gasStationDistance').text(stationDistance + " mi");
            }
            /* /assigning property values */

            gasStationListItemCollection.push(gasStationListItem);
            i = i + 1;
        }
        //end while loop

        /* update station list */
        instance.gasStationsDataDisplay.html(gasStationListItemCollection);

        // refresh station listview
        instance.gasStationsDataDisplay.listview('refresh');

        // also change Last Updated timestamp
        $('#listUpdatedTime').text(timestamp);

        $("li").each(function(index) {
            gasStationId = $(this).find('.gasStationId').text();

            $(this).find('a').click(function() {
                instance.listClickFunction(this);
            });
        });

        //reinitialise jScrollPane 
        var jScrollPaneApi = instance.jScrollPaneElement.data('jsp');
        jScrollPaneApi.reinitialise();

        if (instance.isWaitingForData) {
            instance.stopWaitingForData();
        }
        return true;
    };

    /**
     * Method that will be invoked as a notification when a new single
     * gasStation data from MyGasFeed is obtained. It displays the new single
     * gas station data and the timestamp when it is obtained.
     * 
     * @param data
     *            The received new singleGasStations data. This data also
     *            contains latitude and longitude. to do: store those data in
     *            html labels
     * @param timestamp
     *            The timestamp when the singleGasStation data is obtained.
     */
    instance.onNewSingleGasStationData = function(singleGasStationData,
            timestamp) {

        var options = {
        };
        var stateCodeMap = window.gasstationsapp.helper.CONSTANTS
                .get('STATE_CODE_MAP');

        /* updating UI */
        var detailPage = $("#stationDetail");

        var addressString = singleGasStationData["details"]["address"];
        if (singleGasStationData["details"]["city"] != null) {
            addressString += ', ' + singleGasStationData["details"]["city"];
        }
        if (singleGasStationData["details"]["region"] != null) {

            addressString += ', ' + stateCodeMap[singleGasStationData["details"]["region"]];
        }

        detailPage.find(".gasStationId").text(
                singleGasStationData["details"]["id"]);
        detailPage.find(".gasStationName").text(
                singleGasStationData["details"]["station_name"]);
        detailPage.find(".gasStationAddress").text(addressString);
        detailPage.find(".lastUpdated").text(
                singleGasStationData["details"]["date"] + ":");

        if (typeof singleGasStationData["details"]["regular_price"] !== "undefined") {
            detailPage.find("label:contains('Regular')").next().text(
                    "$ " + singleGasStationData["details"]["regular_price"]);
        }
        else {
            detailPage.find("label:contains('Regular')").next().text("N/A");
        }

        if (typeof singleGasStationData["details"]["midgrade_price"] !== "undefined") {
            detailPage.find("label:contains('Midgrade')").next().text(
                    "$ " + singleGasStationData["details"]["midgrade_price"]);
        }
        else {
            detailPage.find("label:contains('Midgrade')").next().text("N/A");
        }

        if (typeof singleGasStationData["details"]["premium_price"] !== "undefined") {
            detailPage.find("label:contains('Premium')").next().text(
                    "$ " + singleGasStationData["details"]["premium_price"]);
        }
        else {
            detailPage.find("label:contains('Premium')").next().text("N/A");
        }

        if (typeof singleGasStationData["details"]["diesel_price"] !== "undefined") {
            detailPage.find("label:contains('Diesel')").next().text(
                    "$ " + singleGasStationData["details"]["diesel_price"]);
        }
        else {
            detailPage.find("label:contains('Diesel')").next().text("N/A");
        }
        detailPage.find(".distance").text(
                singleGasStationData["gasStationDistance"]);

        // preparing map image
        options['zoom'] = 12;
        options['size'] = {
            width: 330,
            height: 330
        };
        options['maptype'] = "roadmap";
        // &markers=color:blue|label:S|32.91232,-117.14469
        options['markers'] = {
            color: "blue",
            label: singleGasStationData["details"]["station_name"][0], // first
            // letter
            // only
            latitude: singleGasStationData['latitude'],
            longitude: singleGasStationData['longitude']
        };
        options['sensor'] = false;

        // updating image source
        var img = detailPage.find("#mapDetail").find('img');
        img.attr('src', window.gasstationsapp.helper.HelperHolder
                .generateGoogleMapStaticMap(options));

        instance.stopWaitingForData();
    };

    return instance;
})();