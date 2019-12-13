// TODO add proper comments


import esri = __esri;
import { EsriBundle, InfoBundle, LayerState, RampLayerConfig } from '../gapiTypes';
import AttribLayer from './AttribLayer';

// Formerly known as DynamicLayer
export default class MapImageLayer extends AttribLayer {

    constructor (infoBundle: InfoBundle, config: RampLayerConfig, targetDiv: string) {
        // TODO massage incoming config to something that conforms to esri.MapProperties interface
        const esriConfig = config; // this becomes real logic

        super(infoBundle, esriConfig);

        this.innerLayer = new this.esriBundle.MapImageLayer(this.makeEsriLayerConfig(config));

        this.initLayer();

    }

 /**
     * Take a layer config from the RAMP application and derives a configuration for an ESRI layer
     *
     * @param rampLayerConfig snippet from RAMP for this layer
     * @returns configuration object for the ESRI layer representing this layer
     */
    protected makeEsriLayerConfig(rampLayerConfig: RampLayerConfig): esri.MapImageLayerProperties {
        // TODO flush out
        // NOTE: it would be nice to put esri.LayerProperties as the return type, but since we are cheating with refreshInterval it wont work
        //       we can make our own interface if it needs to happen (or can extent the esri one)
        const esriConfig: esri.MapImageLayerProperties = super.makeEsriLayerConfig(rampLayerConfig);

        // TODO add any extra properties for attrib-based layers here
        // if we have a definition at load, apply it here to avoid cancellation errors on

        /*
        const rampMapImageLayerConfig = {
            id: "extraFancyTest",
            name: "I was once called Dynamic",
            layerType: "esriDynamic", // TODO change this?
            layerEntries: [{ index: 21 }, { index: 17 }, { index: 19 }],
            disabledControls: ["opacity", "visibility"],
            state: {
            "opacity": 0,
            "visibility": false
            },
            url: "http://geoappext.nrcan.gc.ca/arcgis/rest/services/NACEI/energy_infrastructure_of_north_america_en/MapServer"
        };

        */

        return esriConfig;
    }

    /**
     * Actions to take when the layer loads.
     *
     * @function onLoadActions
     */
    onLoadActions (): Array<Promise<void>> {
        const loadPromises: Array<Promise<void>> = super.onLoadActions();
        /* TODO IMPLEMENT

        // we run into a lot of funny business with functions/constructors modifying parameters.
        // this essentially clones an object to protect original objects against trickery.
        const jsonCloner = (inputObject: any) => {
            return JSON.parse(JSON.stringify(inputObject));
        };

        this._isTrueDynamic = this._layer.supportsDynamicLayers;

        // don't worry about structured legend. the legend part is separate from
        // the layers part. we just load what we are told to. the legend module
        // will handle the structured part.

        // see comments on the constructor to learn about _configIsComplete and
        // what type of scenarios you can expect for incoming configs

        // snapshot doesn't apply to child layers
        // we don't include bounding box / extent, as we are inheriting it.
        // a lack of the property means we use the layer definition
        const dummyState = {
            opacity: 1,
            visibility: false,
            query: false
        };

        // subfunction to clone a layerEntries config object.
        // since we are using typed objects with getters and setters,
        // our usual easy ways of cloning an object don't work (e.g. using
        // JSON.parse(JSON.stringify(x))). This is not a great solution (understatement),
        //  but is being done as a quick n dirty workaround. At a later time,
        // the guts of this function can be re-examined for a better,
        // less hardcoded solution.
        const cloneConfig = origConfig => {
            const clone = {};

            // direct copies, no defaulting
            clone.name = origConfig.name;
            clone.index = origConfig.index;
            clone.stateOnly = origConfig.stateOnly;
            clone.nameField = origConfig.nameField;
            clone.highlightFeature = origConfig.highlightFeature || true; // simple default

            // an empty string is a valid property, so be wary of falsy logic
            clone.outfields = origConfig.hasOwnProperty('outfields') ? origConfig.outfields : '*';

            // with state, we are either complete, or pure defaults.
            // in the non-complete case, we treat our state as unreliable and
            // expect the client to assign properties as it does parent-child inheritance
            // defaulting (which occurs after this onLoad function has completed)
            if (this._configIsComplete) {
                clone.state = {
                    visiblity: origConfig.visiblity,
                    opacity: origConfig.opacity,
                    query: origConfig.query
                };
            } else {
                clone.state = Object.assign({}, dummyState);
            }

            // if extent is present, we assume it is fully defined.
            // extents are not using fancy typed objects, so can directly reference
            clone.extent = origConfig.extent;

            return clone;
        };

        // collate any relevant overrides from the config.
        const subConfigs = {};

        this.config.layerEntries.forEach(le => {
            subConfigs[le.index.toString()] = {
                config: cloneConfig(le),
                defaulted: this._configIsComplete
            };
        });

        // subfunction to return a subconfig object.
        // if it does not exist or is not defaulted, will do that first
        // id param is an integer in string format
        const fetchSubConfig = (id, serverName = '') => {

            if (subConfigs[id]) {
                const subC = subConfigs[id];
                if (!subC.defaulted) {
                    // config is incomplete, fill in blanks
                    // we will never hit this code block a complete config was passed in

                    // apply a server name if no name exists
                    if (!subC.config.name) {
                        subC.config.name = serverName;
                    }

                    // mark as defaulted so we don't do this again
                    subC.defaulted = true;
                }
                return subC.config;
            } else {
                // no config at all. we apply defaults, and a name from the server if available
                const configSeed = {
                    name: serverName,
                    index: parseInt(id),
                    stateOnly: true
                };
                const newConfig = cloneConfig(configSeed);
                subConfigs[id] = {
                    config: newConfig,
                    defaulted: true
                };
                return newConfig;
            }
        };

        // shortcut var to track all leafs that need attention
        // in the loading process
        const leafsToInit = [];

        // this subfunction will recursively crawl a dynamic layerInfo structure.
        // it will generate proxy objects for all groups and leafs under the
        // input layerInfo.
        // we also generate a tree structure of layerInfos that is in a format
        // that makes the client happy
        const processLayerInfo = (layerInfo, treeArray) => {
            const sId = layerInfo.id.toString();
            const subC = fetchSubConfig(sId, layerInfo.name);

            if (layerInfo.subLayerIds && layerInfo.subLayerIds.length > 0) {
                // group sublayer. set up our tree for the client, then crawl childs.

                const treeGroup = {
                    entryIndex: layerInfo.id,
                    name: subC.name,
                    childs: []
                };
                treeArray.push(treeGroup);

                // process the kids in the group.
                // store the child leaves in the internal variable
                layerInfo.subLayerIds.forEach(slid => {
                    processLayerInfo(this._layer.layerInfos.find(li => li.id === slid), treeGroup.childs);
                });

            } else {
                // leaf sublayer. make placeholders, add leaf to the tree

                const pfc = new placeholderFC.PlaceholderFC(this, subC.name);
                if (this._proxies[sId]) {
                    // we have a pre-made proxy (structured legend). update it.
                    this._proxies[sId].updateSource(pfc);
                } else {
                    // set up new proxy
                    const leafProxy = new layerInterface.LayerInterface(null);
                    leafProxy.convertToPlaceholder(pfc);
                    this._proxies[sId] = leafProxy;
                }

                treeArray.push({ entryIndex: layerInfo.id });
                leafsToInit.push(layerInfo.id.toString());
            }
        };

        this._childTree = []; // public structure describing the tree

        // process the child layers our config is interested in, and all their children.
        if (this.config.layerEntries) {
            this.config.layerEntries.forEach(le => {
                if (!le.stateOnly) {
                    processLayerInfo(this._layer.layerInfos.find(li => li.id === le.index), this._childTree);
                }
            });
        }

        // converts server layer type string to client layer type string
        const serverLayerTypeToClientLayerType = serverType => {
            switch (serverType) {
                case 'Feature Layer':
                    return shared.clientLayerType.ESRI_FEATURE;
                case 'Raster Layer':
                    return shared.clientLayerType.ESRI_RASTER;
                default:
                    console.warn('Unexpected layer type in serverLayerTypeToClientLayerType', serverType);
                    return shared.clientLayerType.UNKNOWN;
            }
        };

        // process each leaf we walked to in the processLayerInfo loop above
        // idx is a string
        leafsToInit.forEach(idx => {

            const subC = subConfigs[idx].config;
            const attribPackage = this._apiRef.attribs.loadServerAttribs(this._layer.url, idx, subC.outfields);
            const dFC = new dynamicFC.DynamicFC(this, idx, attribPackage, subC);
            dFC.highlightFeature = subC.highlightFeature;
            this._featClasses[idx] = dFC;

            // if we have a proxy watching this leaf, replace its placeholder with the real data
            const leafProxy = this._proxies[idx];
            if (leafProxy) {
                leafProxy.convertToDynamicLeaf(dFC);
            }

            // load real symbols into our source
            loadPromises.push(dFC.loadSymbology());

            // update asynchronous values
            const pLD = dFC.getLayerData()
                .then(ld => {
                    dFC.layerType = serverLayerTypeToClientLayerType(ld.layerType);

                    // if we didn't have an extent defined on the config, use the layer extent
                    if (!dFC.extent) {
                        dFC.extent = ld.extent;
                    }
                    dFC.extent = shared.makeSafeExtent(dFC.extent);

                    dFC._scaleSet.minScale = ld.minScale;
                    dFC._scaleSet.maxScale = ld.maxScale;

                    dFC.nameField = subC.nameField || ld.nameField || '';

                    // check the config for any custom field aliases, and add the alias as a property if it exists
                    ld.fields.forEach(field => {
                        const layerConfig = this.config.source.layerEntries.find(r => r.index == idx);
                        if (layerConfig && layerConfig.fieldMetadata) {
                            const clientAlias = layerConfig.fieldMetadata.find(f => f.data === field.name);
                            field.clientAlias = clientAlias ? clientAlias.alias : undefined;
                        }
                    });

                    // skip a number of things if it is a raster layer
                    // either way, return a promise so our loadPromises have a good
                    // value to wait on.
                    if (dFC.layerType === shared.clientLayerType.ESRI_FEATURE) {
                        dFC.geomType = ld.geometryType;
                        dFC.oidField = ld.oidField;

                        return this.getFeatureCount(idx).then(fc => {
                            dFC.featureCount = fc;
                        });
                    } else {
                        return Promise.resolve();
                    }
                })
                .catch(() => {
                    dFC.layerType = shared.clientLayerType.UNRESOLVED;
                });
            loadPromises.push(pLD);

        });

        // TODO careful now, as the dynamicFC.DynamicFC constructor also appears to be setting visibility on the parent.
        if (this._configIsComplete) {
            // if we have a complete config, want to set layer visibility
            // get an array of leaf ids that are visible.
            // use _featClasses as it contains keys that exist on the server and are
            // potentially visible in the client.
            const initVis = Object.keys(this._featClasses)
                .filter(fcId => { return fetchSubConfig(fcId).config.state.visibility; })
                .map(fcId => { return parseInt(fcId); });

            if (initVis.length === 0) {
                initVis.push(-1); // esri code for set all to invisible
            }
            this._layer.setVisibleLayers(initVis);
        } else {
            // default configuration for non-complete config.
            this._layer.setVisibility(false);
            this._layer.setVisibleLayers([-1]);
        }

        // get mapName of the legend entry from the service to use as the name if not provided in config
        if (!this.name) {
            const defService = this._esriRequest({
                url: this._layer.url + '?f=json',
                callbackParamName: 'callback',
                handleAs: 'json',
            });
            const setTitle = defService.then(serviceResult => {
                this.name = serviceResult.mapName;
            });
            loadPromises.push(setTitle);
        }

        */

        // TODO add back in promises
        // loadPromises.push(pLD, pFC, pLS);

        return loadPromises;
    }

}