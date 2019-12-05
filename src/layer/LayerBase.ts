// put things here that would be common to all layers
// TODO add proper comments

import esri = __esri;
import { EsriBundle, InfoBundle } from '../gapiTypes';
import BaseBase from '../BaseBase';

export default class LayerBase extends BaseBase {

    // TODO think about how to expose. protected makes sense, but might want to make it public to allow hacking and use by a dev module if we decide to
    innerLayer: esri.Layer;

    // NOTE since constructor needs to be called first, we might want to push a lot of initialization to an .init() function
    //      that actual implementer classes call in their constructors. e.g. for a file layer, might need to process file parts prior to running LayerBase stuff
    protected constructor (infoBundle: InfoBundle, config: esri.MapProperties) {
        super(infoBundle);

        // this.innerMap = new esriBundle.Map(config);
    }

    // generic init stuff, like adding listeners/propogaters to events
    protected initLayer(layer: esri.Layer) {
        // TODO add event handlers.  basic stuff here, super classes can add more.

        // loading stuff
        // https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html#loadStatus
        // https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html#loaded

        // updateing (is now on the layer view)
        // need to figure out best way to do this. if we decide to support multiple map views, the updating flag
        // will be different on each map (i.e. map 1 pans, shows layer updating; map 2 chills, no animation).
        // at minimum we need to include the view id or map id on the event so client can inspect
        // and know it is dealing with an event it cares about
        // https://developers.arcgis.com/javascript/latest/api-reference/esri-views-layers-LayerView.html#updating

        // this also affects visible, opacity,etc.
        // so maybe need a bigger deal.

        // https://developers.arcgis.com/javascript/latest/api-reference/esri-views-MapView.html#allLayerViews
        // map (the view specifically) might need to be aware of layers registered to it
        // and have a way of passing the view to the layer once it's been created. then this can wire up events.

        // alternately we can try to use this event
        // https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-Layer.html#event-layerview-create
        // could do e.layerView.watch(updating).then(this.raiseEvent.visible({this.layerId, findGeoAPIMapId(e.view)}))
        //       would need a way to make IDs on views or link them to GeoAPI map object           ^

        // think i need to put this to the refactor chat proposal: do we support mutiple views, or always one

    }

    // TODO strongly type if it makes sense. unsure if we want client config definitions in here
    //      that said if client shema is different that here, things are gonna break so maybe this is good idea
    /**
     * Take a layer config from the RAMP application and derives a configuration for an ESRI layer
     *
     * @param rampLayerConfig snippet from RAMP for this layer
     * @returns configuration object for the ESRI layer representing this layer
     */
    protected makeEsriLayerConfig(rampLayerConfig: any): any {
        // TODO flush out
        // NOTE: it would be nice to put esri.LayerProperties as the return type, but since we are cheating with refreshInterval it wont work
        //       we can make our own interface if it needs to happen (or can extent the esri one)
        return {
            id: rampLayerConfig.id,
            opacity: rampLayerConfig.state.opacity,
            visible: rampLayerConfig.state.visibility,
            refreshInterval: rampLayerConfig.refreshInterval
        }
    }

}