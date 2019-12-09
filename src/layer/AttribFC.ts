// put things here that would be common to all FCs that rock with esri attributes
// TODO add proper comments

import esri = __esri;
import { EsriBundle, InfoBundle } from '../gapiTypes';
import BaseLayer from './BaseLayer';
import BaseFC from './BaseFC';

export default class AttribFC extends BaseFC {

    geomType: string;
    layerType: string; // TODO revisit this. is value still useful?
    oidField: string;
    supportsFeatures: boolean; // will be false for "raster layer" children in Map Image
    fields: Array<esri.Field>;
    nameField: string;
    extent: esri.Extent;
    renderer: esri.Renderer; // TODO careful. this is js api class, we might be dealing with server class.  also since we enhance, we might need to extend the interface
    legend: any; // TODO figure out what this is. i think it's our custom class. make a definition somewhere
    loadData: any; // TODO flush out. this is temp info that gets used by the attribute loader. see layerData.load in old gapi

    constructor (infoBundle: InfoBundle, parent: BaseLayer, layerIdx: number = 0) {
        super(infoBundle, parent, layerIdx);

        this.geomType = '';
        this.oidField = '';
        this.nameField = '';
    }

    protected loadLayerMetadata(serviceUrl: string): Promise<void> {
        return new Promise ((resolve, reject) => {

            // extract info for this service
            // TODO appears new esriRequest defaults to what we normally use.
            const restReq: IPromise<esri.RequestResponse> = this.esriBundle.esriRequest.esriRequest(serviceUrl);

            // TODO revisit error handling. might need a try-catch?
            restReq.then((serviceResult: esri.RequestResponse) => {
                if (serviceResult.data) {
                    const sData: any = serviceResult.data;

                    // properties for all endpoints
                    this.layerType = sData.type;
                    this.geomType = sData.geometryType || 'none'; // TODO need to decide what propert default is. Raster Layer has null gt.
                    this.scaleSet.minScale = sData.effectiveMinScale || sData.minScale;
                    this.scaleSet.maxScale = sData.effectiveMaxScale || sData.maxScale;
                    this.supportsFeatures = false; // saves us from having to keep comparing type to 'Feature Layer' on the client
                    this.extent = sData.extent; // TODO might need to cast/fromJson to a proper esri object

                    if (sData.type === 'Feature Layer') {
                        this.supportsFeatures = true;
                        this.fields = sData.fields; // TODO need to use Field.fromJSON() to make things correct
                        this.nameField = sData.displayField;

                        // find object id field
                        // NOTE cannot use arrow functions here due to bug
                        const noFieldDefOid: boolean = this.fields.every(function (elem: esri.Field) {
                            if (elem.type === 'esriFieldTypeOID') {
                                layerData.oidField = elem.name;
                                return false; // break the loop
                            }

                            return true; // keep looping
                        });

                        if (noFieldDefOid) {
                            // we encountered a service that does not mark a field as the object id.
                            // attempt to use alternate definition. if neither exists, we are toast.
                            layerData.oidField = serviceResult.objectIdField ||
                                console.error(`Encountered service with no OID defined: ${layerUrl}`);
                        }

                        // ensure our attribute list contains the object id
                        if (attribs !== '*') {
                            if (attribs.split(',').indexOf(layerData.oidField) === -1) {
                                attribs += (',' + layerData.oidField);
                            }
                        }

                        // add renderer and legend
                        const renderer = customRenderer.type ? customRenderer : serviceResult.drawingInfo.renderer;
                        layerData.renderer = geoApi.symbology.cleanRenderer(renderer, serviceResult.fields);

                        layerData.legend = geoApi.symbology.rendererToLegend(layerData.renderer, featureIdx,
                            serviceResult.fields);
                        geoApi.symbology.enhanceRenderer(layerData.renderer, layerData.legend);

                        // temporarily store things for delayed attributes
                        layerData.load = {
                            // version number is only provided on 10.0 SP1 servers and up.
                            // servers 10.1 and higher support the query limit flag
                            supportsLimit: (serviceResult.currentVersion || 1) >= 10.1,
                            layerUrl,
                            attribs
                        };
                    }

                    // return the layer data promise result
                    resolve(layerData);
                } else {
                    // case where error happened but service request was successful
                    console.warn('Service metadata load error');
                    if (serviceResult && serviceResult.error) {
                        // reject with error
                        reject(serviceResult.error);
                    } else {
                        reject(new Error('Unknown error loading service metadata'));
                    }
                }
            }, error => {
                // failed to load service info. reject with error
                console.warn('Service metadata load error : ' + error);
                reject(error);
            });
            });

        });
    }

}