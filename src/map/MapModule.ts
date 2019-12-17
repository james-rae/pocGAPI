// this makes the module that gets exposed on GeoAPI under .map(s)
// TODO add proper comments

import esri = __esri;
import { InfoBundle } from '../gapiTypes';
import Map from './Map';
import BaseBase from '../BaseBase';

export default class MapModule extends BaseBase {

    constructor (infoBundle: InfoBundle) {
        super(infoBundle);
    }

    // TODO will we have a config type? is it bad to have something that is defined on the client be defined here?
    createMap(config: any, targetDiv: string): Map {
        const map: Map = new Map(this.infoBundle(), config, targetDiv);
        return map;
    }

    // TODO other functions
    // create overview
    // create 3d map
    // etc
}