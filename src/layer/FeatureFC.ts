// put things here that would be common to all FCs that rock with esri attributes
// TODO add proper comments

// TODO we may not need this file. RAMP2 doesnt use it. if we try to make a dedicated class for file layers, might be useful

import esri = __esri;
import { EsriBundle, InfoBundle } from '../gapiTypes';
import BaseLayer from './BaseLayer';
import AttribFC from './AttribFC';

export default class FeatureFC extends AttribFC {

    constructor (infoBundle: InfoBundle, parent: BaseLayer, layerIdx: number = 0) {
        super(infoBundle, parent, layerIdx);
    }

}