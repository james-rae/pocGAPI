// put things here that would be common to all FCs that rock with esri attributes
// TODO add proper comments

import esri = __esri;
import { InfoBundle } from '../gapiTypes';
import BaseLayer from './BaseLayer';
import BaseFC from './BaseFC';
import { AttributeLoaderBase, AttributeLoaderDetails, ArcServerAttributeLoader } from '../util/AttributeLoader';

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
    attLoader: AttributeLoaderBase;
    featureCount: number; // TODO figure out how to identify an unknown count. will use undefined for now. -1 would be other option

    constructor (infoBundle: InfoBundle, parent: BaseLayer, layerIdx: number = 0) {
        super(infoBundle, parent, layerIdx);

        this.geomType = '';
        this.oidField = '';
        this.nameField = '';
    }

    // NOTE this logic is for ArcGIS Server sourced things.
    //      other sourced attribute layers should override this function.
    // TODO consider moving a bulk of this out to LayerModule; the wizard may have use for running this (e.g. getting field list for a service url)
    loadLayerMetadata(serviceUrl: string): Promise<void> {

        if (!serviceUrl) {
            // case where a file class (who inherits this class) ends up calling this via .super magic.
            // will avoid failed attempts at reading a non-existing service.
            // class should implement their own logic to load metadata (e.g. scrape from file layer)
            return Promise.resolve();
        }
        return new Promise ((resolve, reject) => {

            // extract info for this service
            // TODO appears new esriRequest defaults to what we normally use.
            const restReq: IPromise<esri.RequestResponse> = this.esriBundle.esriRequest(serviceUrl, { query: { f: 'json' } });

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
                        this.fields = sData.fields.map((f: any) => this.esriBundle.Field.fromJSON(f)); // TODO need to use Field.fromJSON() to make things correct
                        this.nameField = sData.displayField;

                        // find object id field
                        const noFieldDefOid: boolean = this.fields.every((elem: esri.Field) => {
                            if (elem.type === 'oid') {
                                this.oidField = elem.name;
                                return false; // break the loop
                            }

                            return true; // keep looping
                        });

                        if (noFieldDefOid) {
                            // we encountered a service that does not mark a field as the object id.
                            // attempt to use alternate definition. if neither exists, we are toast.
                            this.oidField = sData.objectIdField ||
                                (() => { console.error(`Encountered service with no OID defined: ${serviceUrl}`); return ''; })();
                        }

                        // TODO revist. see https://github.com/james-rae/pocGAPI/issues/14
                        // ensure our attribute list contains the object id
                        /*
                        if (attribs !== '*') {
                            if (attribs.split(',').indexOf(layerData.oidField) === -1) {
                                attribs += (',' + layerData.oidField);
                            }
                        }
                        */

                        // TODO add in renderer and legend magic
                        // add renderer and legend
                        /*
                        const renderer = customRenderer.type ? customRenderer : serviceResult.drawingInfo.renderer;
                        layerData.renderer = geoApi.symbology.cleanRenderer(renderer, serviceResult.fields);

                        layerData.legend = geoApi.symbology.rendererToLegend(layerData.renderer, featureIdx,
                            serviceResult.fields);
                        geoApi.symbology.enhanceRenderer(layerData.renderer, layerData.legend);
                        */

                        // temporarily store things for delayed attributes
                        const loadData: AttributeLoaderDetails = {
                            // version number is only provided on 10.0 SP1 servers and up.
                            // servers 10.1 and higher support the query limit flag
                            supportsLimit: (sData.currentVersion || 1) >= 10.1,
                            serviceUrl,
                            oidField: this.oidField,
                            attribs: '*' // TODO re-align with our attribs decision above
                        };
                        this.attLoader = new ArcServerAttributeLoader(this.infoBundle(), loadData);
                    }

                    // tell aller we are donethanks
                    resolve();
                } else {
                    // case where service request was successful but no data appeared in result
                    console.warn('Service metadata load error');
                    reject(new Error('Unknown error loading service metadata'));
                }
            }, error => {
                // failed to load service info. reject with error
                // TODO investigate if this is proper location where EsriErrorDetails will appear
                console.warn('Service metadata load error : ' + error.EsriErrorDetails || error);
                reject(error);
            });
        });
    }
}