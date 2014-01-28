/**
 * 
 * @file Helper.js
 * @fileOverview 
 * File containing the implementation of the helper functions.
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
 * @namespace Namespace for the helper.
 */
window.gasstationsapp.helper = window.gasstationsapp.helper || {};

window.gasstationsapp.helper.CONSTANTS = (function() {
    var constantArray = {
        'DISTANCE_NOT_AVAILABLE': '-1',
        'ANOTHER_CONST': '2',
        'STATE_CODE_MAP': {
            "Alabama": 'AL',
            "Alaska": 'AK',
            "Arizona": 'AZ',
            "Arkansas": 'AR',
            "California": 'CA',
            "Colorado": 'CO',
            "Connecticut": 'CT',
            "Delaware": 'DE',
            "District Of Columbia": 'DC',
            "Florida": 'FL',
            "Georgia": 'GA',
            "Hawaii": 'HI',
            "Idaho": 'ID',
            "Illinois": 'IL',
            "Indiana": 'IN',
            "Iowa": 'IA',
            "Kansas": 'KS',
            "Kentucky": 'KY',
            "Louisiana": 'LA',
            "Maine": 'ME',
            "Maryland": 'MD',
            "Massachusetts": 'MA',
            "Michigan": 'MI',
            "Minnesota": 'MN',
            "Mississippi": 'MS',
            "Missouri": 'MO',
            "Montana": 'MT',
            "Nebraska": 'NE',
            "Nevada": 'NV',
            "New Hampshire": 'NH',
            "New Jersey": 'NJ',
            "New Mexico": 'NM',
            "New York": 'NY',
            "North Carolina": 'NC',
            "North Dakota": 'ND',
            "Ohio": 'OH',
            "Oklahoma": 'OK',
            "Oregon": 'OR',
            "Pennsylvania": 'PA',
            "Rhode Island": 'RI',
            "South Carolina": 'SC',
            "South Dakota": 'SD',
            "Tennessee": 'TN',
            "Texas": 'TX',
            "Utah": 'UT',
            "Vermont": 'VT',
            "Virginia": 'VA',
            "Washington": 'WA',
            "West Virginia": 'WV',
            "Wisconsin": 'WI',
            "Wyoming": 'WY'
        }

    };

    return {
        /*
         * 
         * @param string name name of the constant to get
         * @returns the constant
         */
        get: function(name) {
            return constantArray[name];
        }
    };
})();


/**
 * Creates the singleton Helper.
 * 
 * @class Represents the singleton Helper. Helper functions include date
 *        formating.
 * @param undefined
 *            Parameter is not passed to obtain the generic javascript undefined
 *            type.
 */
window.gasstationsapp.helper.HelperHolder = (function(undefined) {

    /**
     * @exports instance as window.gasstationsapp.helper.HelperHolder
     * @ignore
     */
    var instance = {};
    instance.latitude = 0;
    instance.longitude = 0;

    /**
     * Constants
     */
    this.INITIAL_LATITUDE = 36.785533;// ABALTA san diego 36.785533
    this.INITIAL_LONGITUDE = -119.794561;// ABALTA san diego -119.794561
    this.GOOGLE_API_KEY = "AIzaSyAYfmaA4isMOlueTshd5E3DgrwvFDJs9VQ";

    /**
     * Initializes the HelperHolder.
     */
    instance.init = function() {

        // setting default position
        instance.latitude = INITIAL_LATITUDE;
        instance.longitude = INITIAL_LONGITUDE;

        window.setInterval(function() {
            instance.updateGeoLocation();
        }, 10000);

    };

    /**
     * Updating geo-location from the HTML5 - browser
     */
    instance.updateGeoLocation = function() {

        // success function
        successFunction = function(pos) {
            instance.latitude = pos.coords.latitude;
            instance.longitude = pos.coords.longitude;
        };

        // Fail function - outputs error code
        function failFunction(error) {

            var errorCode = error.code;
            console.log("The navigator error code is " + errorCode);

        }

        // calling HTML5 Geolocation function
        navigator.geolocation.getCurrentPosition(successFunction, failFunction, {
            enableHighAccuracy: false
        });
        // check if latitude is ready. todo: cache
        console.log("lat: " + instance.latitude);

    };

    /**
     * latitude
     */
    instance.getLatitude = function() {
        return instance.latitude;
    };

    /**
     * longitude
     */
    instance.getLongitude = function() {
        return instance.longitude;
    };

    /**
     * Generate readable timestamp with AMPM format.
     * 
     * @param inputDate
     * @returns Readable datetime with format "MM/DD/YYYY h:mm tt" e.g.
     *          6/11/2013 5:58PM
     */
    instance.dateFormatAMPM = function(inputDate) {
        if (inputDate === null) {
            inputDate = new Date();
        }
        var hours = inputDate.getHours();
        var minutes = inputDate.getMinutes();

        var timestamp = "";

        timestamp += inputDate.getMonth() + 1;
        timestamp += "/" + inputDate.getDate();
        timestamp += "/" + inputDate.getFullYear() + " ";
        if (hours > 12) {
            timestamp += " " + String(hours - 12);
        } else {
            timestamp += " " + String(hours);
        }

        timestamp += ":";

        if (minutes < 10) {
            timestamp += "0";
        }
        timestamp += minutes + " ";

        if (hours > 12) {
            timestamp += "PM";
        } else {
            timestamp += "AM";
        }

        return timestamp;
    };

    /**
     * Generate " days ago" string based on input date.
     * 
     * @param inputDate
     * @returns String with format "x days ago / x weeks ago / x months ago / x years ago" e.g.
     *          3 days ago
     */
    instance.daysAgoStringFromDate = function(inputDate) {
        if (inputDate === null) {
            inputDate = new Date();
        }
        var today = new Date();

        //difference in millisecs
        var difference = today - inputDate;
        var dayDiff = Math.round(difference / (1000 * 60 * 24));
        if (dayDiff < 1) {
            return "Today";
        }
        ;

        if (dayDiff === 1) {
            return ("1 day ago.");
        }

        if (dayDiff <= 7) {
            return (dayDiff + " days ago");
        }

        var weekDiff = Math.round(dayDiff / 7);

        if (weekDiff === 1) {
            return ("1 week ago");
        }

        if (weekDiff < 52) {
            return (weekDiff + " weeks ago");
        }

        //rough estimate
        var monthDiff = Math.round(weekDiff / 4.5);
        if (monthDiff === 1) {
            return ("1 month ago");
        }

        if (monthDiff < 12) {
            return (monthDiff + " months ago");
        }

        var yearDiff = Math.round(monthDiff);
        if (yearDiff === 1) {
            return ("1 year ago");
        }

        return (yearDiff + " years ago");
    };


    /**
     * Generates a Google Static Map API url e.g.
     * http://maps.googleapis.com/maps/api/staticmap?center=32.91232,
     * -117.14469&zoom=13&size=600x300&key=<key>&maptype=roadmap&markers=color:blue%7Clabel:Shell%7C32.91232,-117.14469&sensor=false
     * 
     * @param Location
     *            Parameters
     * 
     * center (required if markers not present) defines the center of the map,
     * equidistant from all edges of the map. This parameter takes a location as
     * either a comma-separated {latitude,longitude} pair (e.g.
     * "40.714728,-73.998672") or a string address (e.g. "city hall, new york,
     * ny") identifying a unique location on the face of the earth
     * 
     * zoom (required if markers not present) defines the zoom level of the map,
     * which determines the magnification level of the map. This parameter takes
     * a numerical value corresponding to the zoom level of the region desired
     * 
     * Map Parameters
     * 
     * size (required) defines the rectangular dimensions of the map image. This
     * parameter takes a string of the form {horizontal_value}x{vertical_value}
     * 
     * scale (optional) affects the number of pixels that are returned. scale=2
     * returns twice as many pixels as scale=1 while retaining the same coverage
     * area and level of detail
     * 
     * markers (optional) define one or more markers to attach to the image at
     * specified locations. This parameter takes a single marker definition with
     * parameters separated by the pipe character (|). Multiple markers may be
     * placed within the same markers parameter as long as they exhibit the same
     * style; you may add additional markers of differing styles by adding
     * additional markers parameters
     * 
     * path (optional) defines a single path of two or more connected points to
     * overlay on the image at specified locations. This parameter takes a
     * string of point definitions separated by the pipe character (|). You may
     * supply additional paths by adding additional path parameters. Note that
     * if you supply a path for a map, you do not need to specify the (normally
     * required) center and zoom parameters.
     * 
     * sensor (required) specifies whether the application requesting the static
     * map is using a sensor to determine the user's location.
     * 
     * @returns Google maps API url e.g.
     *          http://maps.googleapis.com/maps/api/staticmap?parameters
     */
    instance.generateGoogleMapStaticMap = function(options) {
        var url = "http://maps.googleapis.com/maps/api/staticmap";
        if ((options == {}) || (options == null)) {
            return url;
        }
        url += "?center=" + options['markers']['latitude'] + "," + options['markers']['longitude'];
        url += "&zoom=" + options['zoom'];
        url += "&size=" + options['size']['width'] + "x" + options['size']['height'];
        url += "&key=" + GOOGLE_API_KEY;
        url += "&maptype=" + options['maptype'];
        // &markers=color:blue|label:S|32.91232,-117.14469
        url += "&markers=color:" + options['markers']['color'] + "|label:" + options['markers']['label'] + "|" + options['markers']['latitude'] + "," + options['markers']['longitude'];
        url += "&sensor=" + options['sensor'];

        return url;
    }

    /**
     * Calculate flying distance between two points; using earth's radius
     * 
     * @param (float) firstLatitude lat
     * @param {float} firstLongitutde long
     * @param firstLongitude,  secondLatitude, secondLongitude
     * @returns distance
     */
    instance.flyingDistanceBetweenTwoPoints = function(firstLatitude, firstLongitude, secondLatitude, secondLongitude) {
        var R = 3958.76; // earth radius in mile

        var dLat = (secondLatitude - firstLatitude)* Math.PI / 180;
        var dLon = (secondLongitude - firstLongitude)* Math.PI / 180;
        var firstLatitude = firstLatitude* Math.PI / 180;
        var secondLatitude = secondLatitude* Math.PI / 180;

        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(firstLatitude) * Math.cos(secondLatitude);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var distance = R * c;
        return distance;
    };

    return instance;
})();