/**
* 
* @file ServiceManager.js
* @fileOverview 
* File containing the implementation of the ServiceManager singleton.
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
* @namespace Namespace for the services.
*/
window.gasstationsapp.services = window.gasstationsapp.services || {};

/**
* Creates the singleton ServiceManager.
* @class Represents the singleton ServiceManager. ServiceManager is responsible to create all necessary services.
* @param undefined Parameter is not passed to obtain the generic javascript undefined type
*/
window.gasstationsapp.services.ServiceManager = (function (undefined) {

    /** 
    * @exports instance as window.gasstationsapp.services.ServiceManager
    * @ignore 
    */
    var instance = {};

    /** 
    * Holds an instance of a GasStationsService.
    */
    instance.gasStationsService = null;

    /**
    * Creates all necessary services.
    */
    instance.init = function() {
        //toggle between MyGasFeed and INRIX by commenting out the appropriate line
//        instance.gasStationsService = new window.gasstationsapp.services.GasStationsService_MyGasFeed();
        instance.gasStationsService = new window.gasstationsapp.services.GasStationsService_INRIX();
        
    };

    return instance;
})();