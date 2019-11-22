// this makes the module that gets exposed on GeoAPI under .map(s)
// TODO add proper comments

import esri = __esri;
import { EsriBundle } from '../gapiTypes';
import Map from './Map';

export default class MapModule {
    private esriBundle: EsriBundle;

    constructor (esriBundle: EsriBundle) {
        this.esriBundle = esriBundle;
    }

    // TODO will we have a config type? is it bad to have something that is defined on the client be defined here?
    createMap(config: any, targetDiv: string): Map {
        const map: Map = new Map(config, this.esriBundle, targetDiv);
        return map;
    }

    // TODO other functions
    // create overview
    // create 3d map
    // etc
}