/**
* 
* @file ControllerManager.js
* @fileOverview 
* File containing the implementation of the ControllerManager singleton.
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
* @namespace Namespace for the controllers.
*/
window.gasstationsapp.controllers = window.gasstationsapp.controllers || {};

/**
* Creates the singleton ControllerManager.
* @class Represents the singleton ControllerManager. ControllerManager is responsible to initialize all controllers.
* @param undefined Parameter is not passed to obtain the generic javascript undefined type.
*/
window.gasstationsapp.controllers.ControllerManager = (function (undefined) {

    /** 
    * @exports instance as window.gasstationsapp.controllers.ControllerManager
    * @ignore 
    */
    var instance = {};

    /**
    * Initializes all controllers.
    */
    instance.init = function() {
        window.gasstationsapp.controllers.GasStationsController.init();
    };

    return instance;
})();