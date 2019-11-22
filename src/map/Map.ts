// a 2D esri map
// TODO add proper comments


import esri = __esri;
import { EsriBundle } from '../gapiTypes';
import MapBase from './MapBase';

export default class Map extends MapBase {

    innerView: esri.MapView;

    constructor (esriBundle: EsriBundle, config: any, targetDiv: string) {
        // TODO massage incoming config to something that conforms to esri.MapProperties interface
        const esriConfig = config; // this becomes real logic

        super(esriBundle, esriConfig);

        // TODO extract more from config and set appropriate view properties (e.g. intial extent, initial projection, LODs)
        this.innerView = new esriBundle.MapView({
            map: this.innerMap,
            container: targetDiv,
            center: [-76.772, 44.423],
            zoom: 10
        });
    }

    // TODO implement
    addLayer (): void {

    }

    // TODO passthrough functions, either by aly magic or make them hardcoded

    // TODO function to allow a second Map to be shot out, that shares this map but has a different scene

    // TODO basemap generation stuff (might need to be delayed due to lack of dojo dijit)

}