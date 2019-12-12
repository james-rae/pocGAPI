import esri = __esri;
import { InfoBundle, AttributeSet } from '../gapiTypes';
import BaseBase from '../BaseBase';
import { Tools } from 'terraformer';
import proj4 from 'proj4'; // TODO we may need proj4 as part of infoBundle; could need to be an instance since we register new projections on it. need to test with adding then checking in separate calls

// this was old way, might need to do this?
/*
let proj4 = require('proj4');
proj4 = proj4.default ? proj4.default : proj4;
*/

export default class ProjectionService extends BaseBase {

    // TODO probably need a epsgLookup function getting passed into here.
    constructor (infoBundle: InfoBundle) {
        super(infoBundle);
    }

    /**
     * Convert a projection to an string that is compatible with proj4.  If it is an ESRI SpatialReference or an integer it will be converted.
     * @param {Object|Integer|String} proj an ESRI SpatialReference, integer or string.  Strings will be unchanged and unchecked,
     * ints and SpatialReference objects will be converted.
     * @return {String} A string in the form EPSG:####
     * @private
     */
    normalizeProj(proj: any): string {

        if (typeof proj === 'object') {
            if (proj.wkid) {
                return 'EPSG:' + proj.wkid;
            } else if (proj.wkt) {
                return proj.wkt;
            }
        } else if (typeof proj === 'number') {
            return 'EPSG:' + proj;
        } else if (typeof proj === 'string') {
            return proj;
        }
        throw new Error('Bad argument type, please provide a string, integer or SpatialReference object.');
    }

    // TODO probably need to make this return a promise, and do epsgLookups on the proj codes.
    /**
     * Reproject a GeoJSON object in place.
     * @param {Object} geojson the GeoJSON to be reprojected, this will be modified in place
     * @param {String|Number} outputSpatialReference the target spatial reference,
     * 'EPSG:4326' is used by default; if a number is suppied it will be used as an EPSG code
     * @param {String|Number} inputSpatialReference same rules as outputSpatialReference if suppied
     * if missing it will attempt to find it encoded in the GeoJSON
     * @returns {Object} projected geoJson
     */
    projectGeoJson(geoJson: any, inputSR: string | number, outputSR: string | number): any {
        // TODO revist the types on the SR params. figure out what we're really supporting, and what terraformer can support

        // TODO add a "if number, convert to string" or do this.normalizeProj

        let inSr: string = this.normalizeProj(inputSR);
        let outSr: string = this.normalizeProj(outputSR);
        const urnRegex = /urn:ogc:def:crs:EPSG::(\d+)/;

        if (!inSr && geoJson.crs && geoJson.crs.type === 'name') {
            // no input SR given, and geojson has some spatial ref info on it
            const matches = geoJson.crs.properties.name.match( urnRegex );
            if (matches) {
                inSr = 'EPSG:' + matches[1];
            } else {
                inSr = geoJson.crs.properties.name;
            }
        }

        if (!inSr) {
            inSr = 'EPSG:4326';
        } else if (!proj4.defs(inSr)) {
            throw new Error('Projection: '+inSr+' could not be found in proj4.defs');
        }

        if (!outSr) {
            outSr = 'EPSG:4326';
            if (outSr === inSr) return;
        } else if (!proj4.defs(outSr)) {
            throw new Error('Projection: '+outSr+' could not be found in proj4.defs');
        }

        const projFunc = proj4(inSr, outSr).forward;

        return Tools.applyConverter( geoJson, projFunc );
    }

}