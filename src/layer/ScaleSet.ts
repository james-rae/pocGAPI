
// TODO add proper comments

import esri = __esri;
import { EsriBundle, InfoBundle } from '../gapiTypes';

// TODO move to main gapi types file?
interface OffScaleStatus {
    offScale: boolean;
    zoomIn: boolean;
}

export default class ScaleSet {

    minScale: number;
    maxScale: number;

    constructor (minScale: number = 0, maxScale: number = 0) {
        this.minScale = minScale;
        this.maxScale = maxScale;
    }

    /**
     * Indicates if the feature class is not visible at the given scale,
     * and if so, if we need to zoom in to see it or zoom out
     *
     * @function isOffScale
     * @param {Integer}  mapScale the scale to test against
     * @returns {Object} has boolean properties `offScale` and `zoomIn`
     */
    isOffScale (mapScale: number): OffScaleStatus {

        // GIS for dummies.
        // scale increases as you zoom out, decreases as you zoom in
        // minScale means if you zoom out beyond this number, hide the layer
        // maxScale means if you zoom in past this number, hide the layer
        // 0 value for min or max scale means there is no hiding in effect

        const result = {
            offScale: false,
            zoomIn: false
        };

        // check if out of scale and set zoom direction to scaleSet
        if (mapScale < this.maxScale && this.maxScale !== 0) {
            result.offScale = true;
            result.zoomIn = false;
        } else if (mapScale > this.minScale && this.minScale !== 0) {
            result.offScale = true;
            result.zoomIn = true;
        }

        return result;
    }

}



