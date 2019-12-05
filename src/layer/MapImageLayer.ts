// TODO add proper comments


import esri = __esri;
import { EsriBundle, InfoBundle } from '../gapiTypes';
import AttribLayer from './AttribLayer';

// Formerly known as DynamicLayer
export default class MapImageLayer extends AttribLayer {

    innerView: esri.MapView;

    constructor (infoBundle: InfoBundle, config: any, targetDiv: string) {
        // TODO massage incoming config to something that conforms to esri.MapProperties interface
        const esriConfig = config; // this becomes real logic

        super(infoBundle, esriConfig);


    }

}