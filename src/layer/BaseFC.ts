// put things here that would be common to all FCs
// TODO add proper comments

import esri = __esri;
import { EsriBundle, InfoBundle } from '../gapiTypes';
import BaseBase from '../BaseBase';
import BaseLayer from './BaseLayer';
import ScaleSet from './ScaleSet';

export default class BaseFC extends BaseBase {

    protected parentLayer: BaseLayer;
    layerIdx: number; // final name TBD
    name: string;
    scaleSet: ScaleSet;

    constructor (infoBundle: InfoBundle, parent: BaseLayer, layerIdx: number = 0) {

        super(infoBundle);

        this.parentLayer = parent;
        this.layerIdx = layerIdx;
        this.name = '';
    }

    /**
     * Returns the visibility of the feature class.
     *
     * @function getVisibility
     * @returns {Boolean} visibility of the feature class
     */
    getVisibility (): boolean {
        // basic case - fc vis === layer vis
        return this.parentLayer.innerLayer.visible;
    }

    /**
     * Applies visibility to feature class.
     *
     * @function setVisibility
     * @param {Boolean} value the new visibility setting
     */
    setVisibility (value: boolean): void {
        // basic case - set layer visibility
        this.parentLayer.innerLayer.visible = value;
    }

}