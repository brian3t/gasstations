/**
* 
* @file NotificationList.js
* @fileOverview 
* File containing the declaration of the NotificationList class.
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
* @namespace Namespace for the application specific classes.
*/
window.gasstationsapp.app = window.gasstationsapp.app || {};

/**
* Creates an instance of the NotificationList class.
* @class Represents a notification list that can register/unregister listeners and notifies them for an event.
*/
window.gasstationsapp.app.NotificationList = function () {
    /**
    * The counter for the listeners ID in the list.
    */
    this.idCounter = 0;

    /**
    * Map with key listener ID and value the listener.
    */
    this.listenerMap = {};
};

/**
* Registers listener which will be notified when event occurs.
*
* @param listener The listener object that will be registered.
*
* @returns the ID of the listener.
*/
window.gasstationsapp.app.NotificationList.prototype.registerListener = function(listener) {
    var id = null;
    if (listener) {
        this.idCounter += 1;
        var id = this.idCounter;
        this.listenerMap[id] = listener;
    }
    return id;
};

/**
* Unregisters listener by ID.
*
* @param id The ID of the listener that will be unregistered.
*/
window.gasstationsapp.app.NotificationList.prototype.unregisterListener = function(id) {
    if (id) {
        delete this.listenerMap[id];
    }
};

/**
* Notifies all listeners for event.
*
* @param {String} notificationType The type of the notification.
* @param args An array containing the arguments for the notification.
*/
window.gasstationsapp.app.NotificationList.prototype.notifyAll = function(notificationType, args) {
    if (notificationType) {
        for (var nId in this.listenerMap) {
            var listener = this.listenerMap[nId];
            if (listener && typeof (listener[notificationType]) == "function") {
                listener[notificationType].apply(listener, args);
            }
        }
    }
};
