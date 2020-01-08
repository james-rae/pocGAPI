// TODO add proper comments


import esri = __esri;
import { InfoBundle, LayerState, RampLayerConfig, ArcGisServerUrl } from '../gapiTypes';
import AttribLayer from './AttribLayer';
import TreeNode from './TreeNode';
import FeatureFC from './FeatureFC';

export default class FeatureLayer extends AttribLayer {

    constructor (infoBundle: InfoBundle, config: RampLayerConfig) {

        const esriConfig = config; // this becomes real logic

        super(infoBundle, esriConfig);

        this.innerLayer = new this.esriBundle.FeatureLayer(this.makeEsriLayerConfig(config));
        this.initLayer();

    }

    /**
     * Take a layer config from the RAMP application and derives a configuration for an ESRI layer
     *
     * @param rampLayerConfig snippet from RAMP for this layer
     * @returns configuration object for the ESRI layer representing this layer
     */
    protected makeEsriLayerConfig(rampLayerConfig: RampLayerConfig): esri.FeatureLayerProperties {
        // TODO flush out
        // NOTE: it would be nice to put esri.LayerProperties as the return type, but since we are cheating with refreshInterval it wont work
        //       we can make our own interface if it needs to happen (or can extent the esri one)
        const esriConfig: esri.FeatureLayerProperties = super.makeEsriLayerConfig(rampLayerConfig);

        // TODO add any extra properties for attrib-based layers here
        // if we have a definition at load, apply it here to avoid cancellation errors on
        if (rampLayerConfig.initialFilteredQuery) {
            esriConfig.definitionExpression = rampLayerConfig.initialFilteredQuery;
        }
        return esriConfig;
    }

    /**
     * Triggers when the layer loads.
     *
     * @function onLoadActions
     */
    onLoadActions (): Array<Promise<void>> {
        const loadPromises: Array<Promise<void>> = super.onLoadActions();

        // we run into a lot of funny business with functions/constructors modifying parameters.
        // this essentially clones an object to protect original objects against trickery.
        const jsonCloner = (inputObject: any) => {
            return JSON.parse(JSON.stringify(inputObject));
        };

        // attempt to set custom renderer here. if fails, we can attempt on client but prefer it here
        // as this doesnt care where the layer came from
        if (this.origRampConfig.customRenderer.type) {
            // TODO implement custom renderers
            // TODO try and do this in the constructor for the esri layer; API4 might accomodate that.
            //      since GeoJsonLayer would use this too, maybe abstarct the creation part to a util module
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
        this.layerTree = new TreeNode(featIdx, featFC.uid, this.name); // TODO verify name is populated at this point

        // TODO implement symbology load
        // const pLS = aFC.loadSymbology();

        // update asynch data
        // TODO do all this lol
        // TODO check if we have custom renderer, add to options parameter here
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

        const pFC = featFC.loadFeatureCount(layerUrl);


        // if file based (or server extent was fried), calculate extent based on geometry
        // TODO implement this. may need a manual loop to calculate graphicsExtent since ESRI torpedo'd the function
        /*
        if (!this.extent || !this.extent.xmin) {
            this.extent = this._apiRef.proj.graphicsUtils.graphicsExtent(this._layer.graphics);
        }
        */

        // TODO add back in promises
        loadPromises.push(pLD, pFC); // , pLS

        return loadPromises;
    }

}