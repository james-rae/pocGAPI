// TODO add proper comments

import esri = __esri;
import { EsriBundle, InfoBundle, AsynchAttribController, AttributeSet } from '../gapiTypes';
import BaseBase from '../BaseBase';

export default class AttributeLoader extends BaseBase {

    // TODO need to specificy either load url or load source (a file, a layer with baked attributes)

    protected aac: AsynchAttribController;
    protected loadPromise: Promise<AttributeSet>;

    constructor (infoBundle: InfoBundle) {
        super(infoBundle);
        this.aac = new AsynchAttribController();
    }

    // TODO change void to attribute set type
    getAttribs(): Promise<AttributeSet> {
        if (this.loadPromise) {
            return this.loadPromise;
        } else {
            // promise creation
            this.aac = new AsynchAttribController();
        }
    }

    abortAttribLoad():void {
        this.aac.loadAbortFlag = true;

        // TODO nuke the promise?
        // this.destroyAttribs();
    }

    destroyAttribs(): void {
        // TODO erase private promise
    }

}