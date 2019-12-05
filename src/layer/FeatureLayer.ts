// TODO add proper comments


import esri = __esri;
import { EsriBundle, InfoBundle } from '../gapiTypes';
import AttribLayer from './AttribLayer';

export default class FeatureLayer extends AttribLayer {

    innerView: esri.MapView;

    constructor (infoBundle: InfoBundle, config: any, targetDiv: string) {
        // TODO massage incoming config to something that conforms to esri.MapProperties interface
        const esriConfig = config; // this becomes real logic

        super(infoBundle, esriConfig);

        this.innerLayer = new this.esriBundle.FeatureLayer(this.makeEsriLayerConfig(config));

        this.initLayer(this.innerLayer);

    }

    /**
     * Take a layer config from the RAMP application and derives a configuration for an ESRI layer
     *
     * @param rampLayerConfig snippet from RAMP for this layer
     * @returns configuration object for the ESRI layer representing this layer
     */
    protected makeEsriLayerConfig(rampLayerConfig: any): esri.FeatureLayerProperties {
        // TODO flush out
        // NOTE: it would be nice to put esri.LayerProperties as the return type, but since we are cheating with refreshInterval it wont work
        //       we can make our own interface if it needs to happen (or can extent the esri one)
        const esriConfig: esri.FeatureLayerProperties = super.makeEsriLayerConfig(rampLayerConfig);

        // TODO add any extra properties for attrib-based layers here
        // if we have a definition at load, apply it here to avoid cancellation errors on
        if (rampLayerConfig.initialFilteredQuery) {
            esriConfig.definitionExpression = rampLayerConfig.initialFilteredQuery;
        }
        return esriConfig;
    }

}