// TODO add proper comments


import esri = __esri;
import { InfoBundle, LayerState, RampLayerConfig, RampLayerMapImageLayerEntryConfig } from '../gapiTypes';
import AttribLayer from './AttribLayer';
import TreeNode from './TreeNode';
import MapImageFC from './MapImageFC';

// Formerly known as DynamicLayer
export default class MapImageLayer extends AttribLayer {

    constructor (infoBundle: InfoBundle, config: RampLayerConfig, targetDiv: string) {

        super(infoBundle, config);

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

        // IMPORTANT NOTE: do not set esriConfig.sublayers here.
        //                 it will defeat our auto-crawl behavior of sublayer trees.
        //                 if we do decide we need to leverage sublayer initialization on the layer constructor,
        //                 we would need to query the service root and extract the tree structure from there
        //                 prior to running this function. essentially do tree traversal before this instead
        //                 of on onLoadActions like we currently do.
        /*
        if (rampLayerConfig.layerEntries) {
            // NOTE: important not to set esriConfig property to empty array, as that will request no sublayers
            // TODO documentation isn't clear if we should be using .sublayers or .allSublayers ; if .sublayers can it be flat array?
            //      play with their online sandbox using a nested service if cant figure it out.
            // let us all stop to appreciate this line of code.
            esriConfig.sublayers = (<Array<RampLayerMapImageLayerEntryConfig>>rampLayerConfig.layerEntries).map((le: RampLayerMapImageLayerEntryConfig) => {
                // the super call will set up the basics/common stuff like vis, opacity, def query
                // works because the sublayer property scheme is nearly identical to a normal layer
                const subby: esri.SublayerProperties = super.makeEsriLayerConfig(le);
                subby.id = le.index;

                // TODO process the other options
                return subby;
            })
        }
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

        // TODO it is not apparent this property still exists, or what the alternate is to check it.
        //      last resort is we query the service root here and get the value from arcgis server.
        //      could double up with the default-name logic which does the same, though it only runs if required.
        // this._isTrueDynamic = this._layer.supportsDynamicLayers;

        // TODO the whole "configIsComplete" logic in RAMP2 was never invoked by the client.
        //      Don't see the point in re-adding it here.

        // we run into a lot of funny business with functions/constructors modifying parameters.
        // this essentially clones an object to protect original objects against trickery.
        const jsonCloner = (inputObject: any) => {
            return JSON.parse(JSON.stringify(inputObject));
        };

        // don't worry about structured legend. the legend part is separate from
        // the layers part. we just load what we are told to. the legend module
        // will handle the structured part.

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
        /*
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
        */

        // collate any relevant overrides from the config.
        const subConfigs: {[key: number]: RampLayerMapImageLayerEntryConfig} = {};

        (<Array<RampLayerMapImageLayerEntryConfig>>this.origRampConfig.layerEntries).forEach((le: RampLayerMapImageLayerEntryConfig) => {
            subConfigs[le.index] = le;
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

        // this subfunction will recursively crawl a sublayer structure.
        // it will generate FCs for all leafs under the sublayer
        // we also generate a tree structure of our layer that is in a format
        // that makes the client happy
        const processSublayer = (subLayer: esri.Sublayer, parentTreeNode: TreeNode): void => {
            const sid: number = subLayer.id;
            const subC: RampLayerMapImageLayerEntryConfig = subConfigs[sid];

            if (subLayer.sublayers && subLayer.sublayers.length > 0) {
                // group sublayer. set up our tree for the client, then crawl childs.
                const gName = subC ? subC.name : '' || subLayer.title || ''; // config if exists, else server, else none
                const treeGroup = new TreeNode(sid, gName, false);
                parentTreeNode.childs.push(treeGroup);

                // process the kids in the group.
                subLayer.sublayers.forEach((subSubLayer: esri.Sublayer) => {
                    processSublayer(subSubLayer, treeGroup);
                });

            } else {
                // leaf sublayer. make placeholders, add leaf to the tree
                if (!this.fcs[sid]) {
                    const miFC = new MapImageFC(this.infoBundle(), this, sid);
                    const lName = subC ? subC.name : '' || subLayer.title || ''; // config if exists, else server, else none
                    miFC.name = lName;
                    this.fcs[sid] = miFC;
                    leafsToInit.push(miFC);
                }

                const treeLeaf = new TreeNode(sid, this.fcs[sid].name, true);
                parentTreeNode.childs.push(treeLeaf);
            }
        };

        // TODO validate -1 is how we are notating a map image layer root (effectively service folder, no real index)
        this.layerTree = new TreeNode(-1, this.origRampConfig.name, false); // public structure describing the tree

        // process the child layers our config is interested in, and all their children.
        (<Array<RampLayerMapImageLayerEntryConfig>>this.origRampConfig.layerEntries).forEach((le: RampLayerMapImageLayerEntryConfig) => {
            if (!le.stateOnly) {
                const rootSub: esri.Sublayer = (<esri.MapImageLayer>this.innerLayer).allSublayers.find((s: esri.Sublayer) => {
                    return s.id === le.index;
                });
                processSublayer(rootSub, this.layerTree);
            }
        });

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
                // TODO should also update the tree root name here
            });
            loadPromises.push(setTitle);
        }


        // TODO add back in promises
        // loadPromises.push(pLD, pFC, pLS);

        return loadPromises;
    }

}