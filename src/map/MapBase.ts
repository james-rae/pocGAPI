// put things here that would be common to both 2D and 3D maps
// might be empty for the beginning
// may be pointless and should be removed...limitied experience with 3D
// TODO add proper comments

import esri = __esri;
import { EsriBundle } from '../gapiTypes';

export default class MapBase {

    // TODO consider private?
    innerMap: esri.Map;
    readonly esriBundle: EsriBundle; // is there a way to make a property only visible to class and it's inheritors? private means inheritor can't see it.  I'd like Map to use this internally, but no myMap.esriBundle to be allowed.

    constructor (esriBundle: EsriBundle, config: esri.MapProperties) {
        this.esriBundle = esriBundle;
        this.innerMap = new esriBundle.Map(config);

    }

    // TODO shared Map (not view-based) functions could go here.
    //      Includes passthrough things. Could also include addLayer (assuming the LayerView gets handled automagically in 3D case?)

}