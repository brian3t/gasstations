/**
* 
* @file GasStation.js
* @fileOverview 
* File containing the declaration of the GasStation class.
* This is a Data Object class
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
 * @exports ns_service as window.gasstationsapp.services
 */
var ns_services = window.gasstationsapp.services;

/**
* Declares a GasStation.
* @class Object Class that is used by the Models and Services. Represents a single Gas Station.
* @exports ns_services as window.gasstationsapp.services
*/
ns_services.GasStation = function () {

	//private properties
    /**
     * An example from MyGasFeed:
     * 		A "country": "Canada",
     *				"price": "3.65",
		            "address": "3885, Boulevard Saint-Rose",
		            "diesel": "0",
		            "id": "33862",
		            "lat": "45.492367",
		            "lng": "-73.710915",
		            "station": "Shell",
		            "region": "Quebec",
		            "city": "Saint-Laurent",
		            "date": "3 hours agp",
		            "distance": "1.9km"
	*/	
	var country		= "";
	var price 		= "";
	var address		= "";
	var hasDiesel	= false;
	var id			= 0;
	var lat			= 0.0;
	var lng			= 0.0;
	var name		= "";
	var region		= "";
	var city		= "";
	var updatedDate = new Date();
	var distance	= 0.0;
	var distanceMetric	= "km";
	
	//public properties
	
	/**
	 * Getter methods
	 */
	
    this.getCountry = function() {
    	return this.country;
    };
	
    this.getPrice = function() {
    	return this.price;
    };

    this.getAddress = function() {
    	return this.address;
    };

    this.getHasDiesel = function() {
    	return this.hasDiesel;
    };

    this.getId = function() {
    	return this.id;
    };

    this.getLat = function() {
    	return this.lat;
    };

    this.getLng = function() {
    	return this.lng;
    };

    this.getName = function() {
    	return this.Name;
    };

    this.getRegion = function() {
    	return this.region;
    };

    this.getCity = function() {
    	return this.city;
    };

    this.getUpdatedDate = function() {
    	return this.updatedDate;
    };

    this.getDistance = function() {
    	return this.distance;
    };

    this.getDistanceMetric = function() {
    	return this.distanceMetric;
    };

    /**
     * setter methods
     */
    this.setCountry = function(newCountry) {
    	this.country = newCountry;
    };
	
    this.setPrice = function(newPrice) {
    	this.price = newPrice;
    };

    this.setAddress = function(newAddress) {
    	this.address = newAddress;
    };

    this.setHasDiesel = function(newHasDiesel) {
    	this.hasDiesel = newHasDiesel;
    };

    this.setId = function(newId) {
    	this.id = newId;
    };

    this.setLat = function(newLat) {
    	this.lat = newLat;
    };

    this.setLng = function(newLng) {
    	this.lng = newLng;
    };

    this.setName = function(newName) {
    	this.Name = newName;
    };

    this.setRegion = function(newRegion) {
    	this.region = newRegion;
    };

    this.setCity = function(newCity) {
    	this.city = newCity;
    };

    this.setUpdatedDate = function(newUpdatedDate) {
    	this.updatedDate = newUpdatedDate;
    };

    this.setDistance = function(newDistance) {
    	this.distance = newDistance;
    };

    this.setDistanceMetric = function(newDistanceMetric) {
    	this.distanceMetric = newDistanceMetric;
    };

};
