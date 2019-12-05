// put things here that would be common to both 2D and 3D maps
// might be empty for the beginning
// may be pointless and should be removed...limitied experience with 3D
// TODO add proper comments

import esri = __esri;
import { EsriBundle, InfoBundle, GeoApi } from '../gapiTypes';
import BaseBase from '../BaseBase';

export default class MapBase extends BaseBase {

    // TODO think about how to expose. protected makes sense, but might want to make it public to allow hacking and use by a dev module if we decide to
    innerMap: esri.Map;

    protected constructor (infoBundle: InfoBundle, config: esri.MapProperties) {
        super(infoBundle);
        this.innerMap = new this.esriBundle.Map(config);

    }

    // TODO shared Map (not view-based) functions could go here.
    //      Includes passthrough things. Could also include addLayer (assuming the LayerView gets handled automagically in 3D case?)

}