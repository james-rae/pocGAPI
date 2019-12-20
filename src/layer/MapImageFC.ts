// TODO add proper comments

import esri = __esri;
import { InfoBundle } from '../gapiTypes';
import BaseLayer from './BaseLayer';
import AttribFC from './AttribFC';

export default class MapImageFC extends AttribFC {

    constructor (infoBundle: InfoBundle, parent: BaseLayer, layerIdx: number = 0) {
        super(infoBundle, parent, layerIdx);
    }

    protected innerSubLayer(): esri.Sublayer {
        // TODO fix, cannot guarantee array order, likely need to search
        return (<esri.MapImageLayer>this.parentLayer.innerLayer).sublayers[this.layerIdx];
    }

}