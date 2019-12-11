// this makes the module that gets exposed on GeoAPI under .layer(s)
// TODO add proper comments

import esri = __esri;
import { EsriBundle, InfoBundle } from '../gapiTypes';
import BaseBase from '../BaseBase';
import FeatureLayer from './FeatureLayer';
import HighlightLayer from './HighlightLayer';
// import Map from './Map';

export default class LayerModule extends BaseBase {

    constructor (infoBundle: InfoBundle) {
        super(infoBundle);
    }

    // TODO make create layer set of functions
    // specific ones, maybe a string-driven one

    createFeatureLayer(config: any): FeatureLayer {
        const l = new FeatureLayer(this.infoBundle(), config);
        return l;
    }

    createHighlightLayer(options: any): HighlightLayer {
        // TODO figure out parameters
        return new HighlightLayer(this.infoBundle(), options);
    }

    /*
    // TODO will we have a config type? is it bad to have something that is defined on the client be defined here?
    createMap(config: any, targetDiv: string): Map {
        const map: Map = new Map(config, this.esriBundle, targetDiv);
        return map;
    }
    */
}
