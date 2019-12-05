// put things here that would be common to all/most geoapi objects.
// mainly utilitiy links to make stuff easy to code

import { EsriBundle, InfoBundle, GeoApi } from './gapiTypes';

export default class BaseBase {

    // points to collection of ESRI API Dojo Classes
    protected esriBundle: EsriBundle;

    // points to instance of geoApi to allow other functions to be called
    protected gapi: GeoApi;

    protected constructor (infoBundle: InfoBundle) {
        this.esriBundle = infoBundle.esriBundle;
        this.gapi = infoBundle.api;
    }
}