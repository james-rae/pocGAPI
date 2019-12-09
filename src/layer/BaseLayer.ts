// put things here that would be common to all layers
// TODO add proper comments

import esri = __esri;
import { EsriBundle, InfoBundle, LayerState, RampLayerConfig } from '../gapiTypes';
import BaseBase from '../BaseBase';
import FakeEvent from '../FakeEvent';
import BaseFC from './BaseFC';
import TreeNode from './TreeNode';
import NaughtyPromise from '../util/NaughtyPromise';

export default class BaseLayer extends BaseBase {

    // TODO think about how to expose. protected makes sense, but might want to make it public to allow hacking and use by a dev module if we decide to
    //      could be the FCs need to access it so no choice
    innerLayer: esri.Layer;

    // events
    visibilityChanged: FakeEvent;
    opacityChanged: FakeEvent;
    stateChanged: FakeEvent;

    // statuses
    state: LayerState;
    get initLoadDone (): boolean { return this.sawLoad && this.sawRefresh; }
    protected sawLoad: boolean;
    protected sawRefresh: boolean;
    protected name: string; // TODO re-evaluate this. using protected property here to store name until FCs get created. might be smarter way
    protected origRampConfig: RampLayerConfig;
    protected loadProimse: NaughtyPromise; // a promise that resolves when layer is fully ready and safe to use. for convenience of caller

    // FC management
    protected fcs: Array<BaseFC>;
    protected layerTree: TreeNode;

    // ----------- LAYER CONSTRUCTION AND INITIALIZAION -----------

    // NOTE since constructor needs to be called first, we might want to push a lot of initialization to an .init() function
    //      that actual implementer classes call in their constructors. e.g. for a file layer, might need to process file parts prior to running LayerBase stuff
    protected constructor (infoBundle: InfoBundle, rampConfig: RampLayerConfig) {
        super(infoBundle);

        this.visibilityChanged = new FakeEvent();
        this.opacityChanged = new FakeEvent();
        this.stateChanged = new FakeEvent();

        this.state = LayerState.LOADING;
        this.sawLoad = false;
        this.sawRefresh = false;
        this.loadProimse = new NaughtyPromise();

        this.fcs = [];
        this.origRampConfig = rampConfig;
        this.name = rampConfig.name || '';
    }

    // generic init stuff, like adding listeners/propogaters to events
    protected initLayer() {
        // TODO add event handlers.  basic stuff here, super classes can add more.
        // TODO clean up comment mass after design is settled and working

        // loading stuff
        // https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html#loadStatus
        // https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-FeatureLayer.html#loaded

        // updateing (is now on the layer view)
        // need to figure out best way to do this. if we decide to support multiple map views, the updating flag
        // will be different on each map (i.e. map 1 pans, shows layer updating; map 2 chills, no animation).
        // at minimum we need to include the view id or map id on the event so client can inspect
        // and know it is dealing with an event it cares about
        // https://developers.arcgis.com/javascript/latest/api-reference/esri-views-layers-LayerView.html#updating

        // this also affects visible, opacity,etc. NO IT IS NOT. WRONG
        // so maybe need a bigger deal. NO. JUST THE UPDATEs apparently. I'm fine with other views showing updates.

        // https://developers.arcgis.com/javascript/latest/api-reference/esri-views-MapView.html#allLayerViews
        // map (the view specifically) might need to be aware of layers registered to it
        // and have a way of passing the view to the layer once it's been created. then this can wire up events.

        // alternately we can try to use this event
        // https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-Layer.html#event-layerview-create
        // could do e.layerView.watch(updating).then(this.raiseEvent.visible({this.layerId, findGeoAPIMapId(e.view)}))
        //       would need a way to make IDs on views or link them to GeoAPI map object           ^

        // think i need to put this to the refactor chat proposal: do we support mutiple views, or always one

        // TODO consider putting lots of info on the events.  e.g. instead of just state changed, have .state, .layerid
        //      visibility might need an optional FC index (whatever we're calling that)

        this.innerLayer.watch('visibility', (newval: boolean) => {
            this.visibilityChanged.fireEvent(newval);
        });

        this.innerLayer.watch('opacity', (newval: number) => {
            this.opacityChanged.fireEvent(newval);
        });

        this.innerLayer.watch('loadStatus', (newval: string) => {
            const statemap = {
                'not-loaded': LayerState.LOADING,
                loading: LayerState.LOADING,
                loaded: LayerState.LOADED,
                failed: LayerState.ERROR
            };

            if (newval === 'loaded') {
                // loaded is a special case. the Layer object (subclasses of BaseLayer) need to do
                // additional asynch work to fully set things up, so we delay firing the event until
                // that is done.
                this.onLoad();
                this.sawLoad = true; // TODO investigate if we need to push this to the same location that the event is fired
            } else {
                this.stateChanged.fireEvent(statemap[newval]);
            }
        });

        this.innerLayer.on('layerview-create', (e: esri.LayerLayerviewCreateEvent) => {
            e.layerView.watch('updating', (newval: boolean) => {
                this.stateChanged.fireEvent(newval ? LayerState.REFRESH : LayerState.LOADED );
                if (newval) {
                    this.sawRefresh = true;
                }
            });
        });

    }

    // TODO strongly type if it makes sense. unsure if we want client config definitions in here
    //      that said if client shema is different that here, things are gonna break so maybe this is good idea
    /**
     * Take a layer config from the RAMP application and derives a configuration for an ESRI layer
     *
     * @param rampLayerConfig snippet from RAMP for this layer
     * @returns configuration object for the ESRI layer representing this layer
     */
    protected makeEsriLayerConfig(rampLayerConfig: RampLayerConfig): any {
        // TODO flush out
        // NOTE: it would be nice to put esri.LayerProperties as the return type, but since we are cheating with refreshInterval it wont work
        //       we can make our own interface if it needs to happen (or can extent the esri one)

        const esriConfig: any = {
            id: rampLayerConfig.id,
            url: rampLayerConfig.url,
            opacity: rampLayerConfig.state.opacity,
            visible: rampLayerConfig.state.visibility
        };

        // TODO careful now. seems setting this willy nilly, even if undefined value, causes layer to keep pinging the server
        if (typeof rampLayerConfig.refreshInterval !== 'undefined') {
            esriConfig.refreshInterval = rampLayerConfig.refreshInterval;
        }
        return esriConfig;
    }

    // ----------- LAYER LOAD -----------

    // when esri layer loads, this will make sure the layer and FCs are in synch then let outsiders know its loaded
    protected onLoad(): Array<Promise<void>> {
        if (!this.name) {
            // no name from config. attempt layer name
            this.name = this.innerLayer.title || '';
        }

        // basic layer tree. fancier layers will simply steamroll over this
        this.layerTree = new TreeNode(0, this.name);

        // TODO implement extent defaulting. Need to add property, get appropriate format from incoming ramp config, maybe need an interface
        /*
        if (!this.extent) {
            // no extent from config. attempt layer extent
            this.extent = this.innerLayer.fullExtent;
        }

        this.extent = shared.makeSafeExtent(this.extent);
        */

        let lookupPromise = Promise.resolve();

        // TODO figure out how we're going to handle this.
        /*
        if (this._epsgLookup) {
            const check = this._apiRef.proj.checkProj(this.spatialReference, this._epsgLookup);
            if (check.lookupPromise) {
                lookupPromise = check.lookupPromise;
            }

            // TODO if we don't find a projection, the app will show the layer loading forever.
            //      might need to handle the fail case and show something to the user.
        }
        */
        return [lookupPromise];
    }

    // provides a promise that resolves when the layer has finished loading
    isLayerLoaded(): Promise<void> {
        return this.loadProimse.getPromise();
    }

    // ----------- LAYER MANAGEMENT -----------

    getLayerTree(): TreeNode {

        // TODO construction of tree is done in onLoad
        // TODO throw error if called too early? may want to standardize that error for other properties
        // TODO make type for tree node
        // TODO make basic tree code here (one child at root)
        // TODO override in MapImageLayer for fancy tree
        return this.layerTree;
    }

    protected getFC(layerIdx: number): BaseFC {
        let workingIdx: number = layerIdx; // copy so orig val can be displayed in error msg

        if (this.isUn(layerIdx)) {
            workingIdx = this.fcs.findIndex((fc: BaseFC) => fc); // find first fc (there could be indexes of nothing, thus the find)
        }
        if (workingIdx === -1 || this.isUn(this.fcs[workingIdx])) {
            throw new Error(`Attempt to access non-existing layer index [layerid ${this.innerLayer.id}, index ${layerIdx}]`);
        }
        return this.fcs[workingIdx];
    }

    getName (layerIdx: number = undefined): string {
        return this.getFC(layerIdx).name;
    }

    /**
     * Returns the visibility of the layer/sublayer.
     *
     * @function getVisibility
     * @param {Integer} [layerIdx] targets a layer index to get visibility for. Uses first/only if omitted.
     * @returns {Boolean} visibility of the layer/sublayer
     */
    getVisibility (layerIdx: number = undefined): boolean {
        return this.getFC(layerIdx).getVisibility();
    }

    /**
     * Applies visibility to feature class.
     *
     * @function setVisibility
     * @param {Boolean} value the new visibility setting
     * @param {Integer} [layerIdx] targets a layer index to get visibility for. Uses first/only if omitted.
     */
    setVisibility (value: boolean, layerIdx: number = undefined): void {
        this.getFC(layerIdx).setVisibility(value);
    }

}