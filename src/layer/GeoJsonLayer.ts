// TODO add proper comments


import esri = __esri;
import { EsriBundle, InfoBundle, LayerState, RampLayerConfig, ArcGisServerUrl } from '../gapiTypes';
import AttribLayer from './AttribLayer';
import AttribFC from './AttribFC';
import TreeNode from './TreeNode';
import FeatureFC from './FeatureFC';

// TODO i think we need to change the extends to AttribLayer, as FeatureLayer constructor will attempt to make its own feature layer
export default class GeoJsonLayer extends AttribLayer {

    private esriJson: esri.FeatureLayerProperties; // used as temp var to get around typescript parameter grousing. will be undefined after initLayer()

    constructor (infoBundle: InfoBundle, rampLayerConfig: RampLayerConfig, geoJson: any, systemOptions: any) {

        super(infoBundle, rampLayerConfig);

        // NOTE: file based layers can require reprojection.
        //       that is an asynchronous action. and has to happen before the esri layer
        //       can be created.
        //       means we need some type of promise for the map to know to wait on before adding the layer to it.
        //       could be a problem for adding things in order to the map. i.e. 1 layer delays, gets added later.
        //       if we have the synch layer stack we will be ok
        // TODO execute the logic to convert geoJson to EsriJson, then smash into feature layer
        const realJson: any = typeof geoJson === 'string' ? JSON.parse(geoJson) : geoJson;

        // esri 4: https://developers.arcgis.com/javascript/latest/sample-code/layers-featurelayer-collection/index.html
        // might need to change our terraformer call to just create a set of graphics? need to inspect terrafomer outputs

        // TODO figure out options parameter.
        // TODO look into supporting renderer from rampConfig. dont we already have something like this?
        // TODO should be a colour option. figure out where that comes from. will our ramp config have that? or is it sys option for wizard trickery?
        // TODO figure out how a sourceProjection option would work. who is supplying this? an API caller? RAMP UI / Config really doesnt support it.
        const opts = {
            layerId: rampLayerConfig.id || '',
            targetSR: systemOptions.mapSR
        };
        this.gapi.layers.file.geoJsonToEsriJson(realJson, {}).then((eJson: esri.FeatureLayerProperties) => {

            this.esriJson = eJson;
            // this will be asynch, triggered after the reprojection of the geojson
            this.innerLayer = new this.esriBundle.FeatureLayer(this.makeEsriLayerConfig(rampLayerConfig));

            this.esriJson = undefined;
            this.initLayer();
        });
    }

    /**
     * Take a layer config from the RAMP application and derives a configuration for an ESRI layer
     *
     * @param rampLayerConfig snippet from RAMP for this layer
     * @returns configuration object for the ESRI layer representing this layer
     */
    protected makeEsriLayerConfig(rampLayerConfig: RampLayerConfig): esri.FeatureLayerProperties {
        // TODO might want to add an extra paremter here, as we will be passing in fields, source graphics, renderer, etc.
        const esriConfig: esri.FeatureLayerProperties = super.makeEsriLayerConfig(rampLayerConfig);

        // TEMP CHECKLIST OF PROPERTIES
        // source - converter
        // objectIdField - converter
        // id - config || converter
        // fields - converter, possibly alias overrides from config
        // renderer - converter
        // spatialReference - converter
        // geometryType - converter
        // definitionExpression - TODO need to test / figure out. likely need to port to our filter framework and not set on the layer. might also be handled by AttribLayer plumbing


        // TODO add any extra properties for geoJson layers here
        //      in none, delete this function and let super get called automatically
        const copyProp: Array<string> = [
            'source',
            'objectIdField',
            'id',
            'fields',
            'renderer',
            'spatialReference',
            'geometryType'
        ];

        copyProp.forEach((p: string) => {
            esriConfig[p] = this.esriJson[p];
        });

        // TODO inspect rampLayerConfig for any config field alias overrides or field restrictions. apply them to esriConfig.fields

        this.esriJson = undefined; // done with parameter trickery, erase this.

        return esriConfig;
    }

    /**
     * Triggers when the layer loads.
     *
     * @function onLoadActions
     */
    onLoadActions (): Array<Promise<void>> {
        const loadPromises: Array<Promise<void>> = super.onLoadActions();

        // TODO likely need to populate a lot of stuff using file logic

        // we run into a lot of funny business with functions/constructors modifying parameters.
        // this essentially clones an object to protect original objects against trickery.
        const jsonCloner = (inputObject: any) => {
            return JSON.parse(JSON.stringify(inputObject));
        };

        // attempt to set custom renderer here. if fails, we can attempt on client but prefer it here
        // as this doesnt care where the layer came from
        if (this.origRampConfig.customRenderer.type) {
            // TODO implement custom renderers
            /*
            // all renderers have a type field. if it's missing, no renderer was provided, or its garbage
            const classMapper = {
                simple: this._apiRef.symbology.SimpleRenderer,
                classBreaks: this._apiRef.symbology.ClassBreaksRenderer,
                uniqueValue: this._apiRef.symbology.UniqueValueRenderer
            }

            // renderer constructors apparently convert their input json from server style to client style.
            // we dont want that. use a clone to protect config's property.
            const cloneRenderer = jsonCloner(this.config.customRenderer);
            const custRend = classMapper[cloneRenderer.type](cloneRenderer);
            this._layer.setRenderer(custRend);
            */
        }

        // get attribute package

        // TODO implement the package. we probably want to refactor this so everything is defined in layers (AttribFC seems good target)
        //      and loading attributes is a call to attribute module
        // TODO split file stuff to subclass?
        /*
        let attribPackage;
        let featIdx;
        if (this.dataSource() !== shared.dataSources.ESRI) {
            featIdx = '0';
            attribPackage = this._apiRef.attribs.loadFileAttribs(this._layer);
        } else {
            const splitUrl = shared.parseUrlIndex(this._layer.url);
            featIdx = splitUrl.index;
            this.rootUrl = splitUrl.rootUrl;

            // methods in the attrib loader will update our copy of the renderer. if we pass in the config reference, it gets
            // updated and some weird stuff happens. Make a copy.
            const cloneRenderer = jsonCloner(this.config.customRenderer);
            attribPackage = this._apiRef.attribs.loadServerAttribs(splitUrl.rootUrl, featIdx, this.config.outfields,
                cloneRenderer);
        }
        */

        // TODO .url seems to not have the /index ending.  there is parsedUrl.path, but thats not on official definition
        //      can also consider changing logic to use origRampConfig.url;
        // const layerUrl: string = (<esri.FeatureLayer>this.innerLayer).url;
        const layerUrl: string = (<any>this.innerLayer).parsedUrl.path;
        const urlData: ArcGisServerUrl = this.gapi.utils.shared.parseUrlIndex(layerUrl);
        const featIdx: number =  urlData.index;

        // feature has only one layer
        const featFC = new FeatureFC(this.infoBundle(), this, featIdx);
        this.fcs[featIdx] = featFC;
        this.layerTree = new TreeNode(featIdx, this.name); // TODO verify name is populated at this point

        // TODO implement symbology load
        // const pLS = aFC.loadSymbology();

        // update asynch data
        // TODO do all this lol
        const pLD: Promise<void> = featFC.loadLayerMetadata(layerUrl).then(() => {
            // apply any config based overrides to the data we just downloaded
            featFC.nameField = this.origRampConfig.nameField || featFC.nameField || '';
            featFC.tooltipField = this.origRampConfig.tooltipField || featFC.nameField;

            // TODO add back in after we deicde https://github.com/james-rae/pocGAPI/issues/14
            /*
            // check the config for any custom field aliases, and add the alias as a property if it exists
            if (this.origRampConfig.fieldMetadata) {
                ld.fields.forEach(field => {
                    const clientAlias = this.config.source.fieldMetadata.find(f => f.data === field.name);
                    field.clientAlias = clientAlias ? clientAlias.alias : undefined;
                });
            }
            */
        });

        /*
        const pLD = aFC.getLayerData().then(ld => {


            // TODO implement, maybe move into superclass

            // trickery. file layer can have field names that are bad keys.
            // our file loader will have corrected them, but config.nameField and config.tooltipField will have
            // been supplied from the wizard (it pre-fetches fields to present a choice
            // to the user). If the nameField / tooltipField was adjusted for bad characters, we need to
            // re-synchronize it here.
            if (this.dataSource() !== shared.dataSources.ESRI) {
                if (ld.fields.findIndex(f => f.name === aFC.nameField) === -1) {
                    const validField = ld.fields.find(f => f.alias === aFC.nameField);
                    if (validField) {
                        aFC.nameField = validField.name;
                        if (!this.config.tooltipField) {    // tooltipField wasn't explicitly provided, so it was also using the bad nameField key
                            aFC.tooltipField = validField.name
                        }
                    } else {
                        // give warning. impact is tooltips will have no text, details pane no header
                        console.warn(`Cannot find name field in layer field list: ${aFC.nameField}`);
                    }
                }

                // only check the tooltipField if it was provided from the config, otherwise it would have been corrected above already (if required)
                if (this.config.tooltipField && ld.fields.findIndex(f => f.name === aFC.tooltipField) === -1) {
                    const validField = ld.fields.find(f => f.alias === aFC.tooltipField);
                    if (validField) {
                        aFC.tooltipField = validField.name;
                    } else {
                        // give warning. impact is tooltips will have no text, details pane no header
                        console.warn(`Cannot find name field in layer field list: ${aFC.tooltipField}`);
                    }
                }
            }
        });
        */

        // TODO implement feature count
        /*
        const pFC = this.getFeatureCount().then(fc => {
            this._fcount = fc;
        });
        */

        // if file based (or server extent was fried), calculate extent based on geometry
        // TODO implement this. may need a manual loop to calculate graphicsExtent since ESRI torpedo'd the function
        /*
        if (!this.extent || !this.extent.xmin) {
            this.extent = this._apiRef.proj.graphicsUtils.graphicsExtent(this._layer.graphics);
        }
        */

        // TODO add back in promises
        loadPromises.push(pLD); // , pFC, pLS

        return loadPromises;
    }

}