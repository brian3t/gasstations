/**
* 
* @file ModelManager.js
* @fileOverview 
* File containing the implementation of the ModelManager singleton.
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
* Creates the singleton ModelManager.
* @class Represents the singleton ModelManager. ModelManager is responsible to initialize all models.
* @param undefined Parameter is not passed to obtain the generic javascript undefined type
*/
window.gasstationsapp.models.ModelManager = (function (undefined) {

    /** 
    * @exports instance as window.gasstationsapp.models.ModelManager
    * @ignore 
    */
    var instance = {};

    /**
    * Initializes all models.
    */
    instance.init = function() {
        window.gasstationsapp.models.GasStationsModel.init();
    };

    return instance;
})();