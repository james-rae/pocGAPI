// TODO add proper comments

import esri = __esri;
import { InfoBundle } from '../gapiTypes';
import BaseLayer from './BaseLayer';
import AttribFC from './AttribFC';
import { AttributeLoaderDetails, FileLayerAttributeLoader } from '../util/AttributeLoader';

export default class GeoJsonFC extends AttribFC {

    tooltipField: string; // TODO if we end up having more things that are shared with FeatureFC, consider making a FeatureBaseFC class for both to inherit from

    constructor (infoBundle: InfoBundle, parent: BaseLayer, layerIdx: number = 0) {
        super(infoBundle, parent, layerIdx);
    }

    // TODO consider moving a bulk of this out to LayerModule; the wizard may have use for running this (e.g. getting field list for a service url)
    extractLayerMetadata(): void {

        const l: esri.FeatureLayer = <esri.FeatureLayer>this.parentLayer.innerLayer;

                // properties for all endpoints
        this.layerType = 'Feature Layer'; // TODO validate this matches server string. TODO validate we don't want to change to a different value. TODO define an Enum for layerType?
        this.supportsFeatures = true;

        this.geomType = l.geometryType;

        // TODO if we ever make config override for scale, would need to apply on the layer constructor, will end up here
        this.scaleSet.minScale = l.minScale || 0;
        this.scaleSet.maxScale = l.maxScale || 0;

        // TODO will need to calculate this as esri removed their library to calculate it
        // TODO check if layer auto-gens this in .fullExtent
        this.extent = l.fullExtent;

        this.fields = l.fields;
        this.nameField = l.displayField;
        this.oidField = l.objectIdField;

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

        const loadData: AttributeLoaderDetails = {
            sourceGraphics: l.source,
            oidField: this.oidField,
            attribs: '*' // TODO re-align with our attribs decision above

        };
        this.attLoader = new FileLayerAttributeLoader(this.infoBundle(), loadData);

    }

}