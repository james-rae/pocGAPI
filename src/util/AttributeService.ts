// TODO add proper comments

import esri = __esri;
import { InfoBundle, AttributeSet } from '../gapiTypes';
import BaseBase from '../BaseBase';
import { AttributeLoaderDetails, AsynchAttribController } from './AttributeLoader';

export default class AttributeService extends BaseBase {

    constructor (infoBundle: InfoBundle) {
        super(infoBundle);
    }

    private arcGisBatchLoad (details: AttributeLoaderDetails, controller: AsynchAttribController): Promise<Array<any>> {
        if (controller.loadAbortFlag) {
            // stop that stop that
            return Promise.resolve([]);
        }

        const params: esri.RequestOptions = {
            query: {
                where: `${details.oidField}>${details.maxId}`,
                outFields: details.attribs,
                returnGeometry: 'false',
                f: 'json'
            }
        };
        const restReq: IPromise<esri.RequestResponse> = this.esriBundle.esriRequest(details.serviceUrl + '/query', params);

        return new Promise((resolve, reject) => {
            // TODO revisit error handling. might need a try-catch?
            restReq.then((serviceResult: esri.RequestResponse) => {
                if (serviceResult.data && serviceResult.data.features) {
                    const feats: Array<any> = serviceResult.data.features;
                    const len: number = feats.length;

                    if (len > 0) {
                        // figure out if we hit the end of the data. different logic for newer vs older servers.
                        controller.loadedCount += len;
                        let moreDataToLoad: boolean;
                        if (details.supportsLimit) {
                            moreDataToLoad = serviceResult.data.exceededTransferLimit;
                        } else {
                            if (details.batchSize === -1) {
                                // this is our first batch. set the max batch size to this batch size
                                details.batchSize = len;
                            }
                            moreDataToLoad = (len >= details.batchSize);
                        }

                        if (moreDataToLoad) {
                            // call the service again for the next batch of data.
                            // max id becomes last object id in the current batch

                            details.maxId = feats[len - 1].attributes[details.oidField];
                            this.arcGisBatchLoad(details, controller).then((futureFeats: Array<any>) => {
                                // take our current batch, append on everything the recursive call loaded, and return
                                resolve(feats.concat(futureFeats));
                            }, (e: any) => {
                                reject(e);
                            });

                        } else {
                            // done thanks
                            resolve(feats);
                        }
                    } else {
                        // no more data.  we are done
                       resolve([]);
                    }

                } else {
                    // TODO nothing came back, handle appropriately with error party rejectorama
                    throw new Error('whoooops');
                }
            }, (e: any) => {
                // TODO handle errors properly
                // TODO investigate if this is proper location where EsriErrorDetails will appear
                throw new Error('Service attribute load error : ' + e.EsriErrorDetails || e);
            });
        });
    }

    loadArcGisServerAttributes(details: AttributeLoaderDetails, controller: AsynchAttribController): Promise<AttributeSet> {
        details.maxId = -1;
        details.batchSize = -1;

        return new Promise((resolve, reject) => {
            this.arcGisBatchLoad(details, controller).then((a: Array<any>) => {
                // TODO transform into attribute set here. the array may need transfomring, and the index needs generating
                const attSet: AttributeSet = {
                    features: a,
                    oidIndex: {}
                };

                // done thanks
               controller.loadIsDone = true;
               resolve(attSet);
            });
        });
    }

    loadGraphicsAttributes(details: AttributeLoaderDetails, controller: AsynchAttribController): Promise<AttributeSet> {
         // TODO call code to strip from layer
         if (!details.sourceGraphics) {
            throw new Error('No .sourceGraphics provided to file layer attribute loader');
        }

        const pluckedAttributes: esri.Collection<any> = details.sourceGraphics.map((g: esri.Graphic) => {
            // TODO we may need to strip off attributes here based on what we decide to do.
            //      there is no network traffic advantage for files (all data is already loaded).
            //      but we may need to do it for stuff like populating a grid with reduced columns.
            //      if we do this, we may need to clone the attribute objects then remove properties;
            //      we don't want to mess with the original source in the layer.
            return g.attributes;
        });

        // TODO generate oidIndex if we decide we are still going to use it
        const attSet: AttributeSet = {
            features: pluckedAttributes.toArray(),
            oidIndex: {}
        };

        controller.loadIsDone = true;
        controller.loadedCount = attSet.features.length;
        return Promise.resolve(attSet);
    }

}