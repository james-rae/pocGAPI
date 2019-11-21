import { GeoApiInterface, EsriBundle } from './gapitypes';

export class FakeNewsMap {

    // TODO consider private?
    // TODO change to types when figured out
    innerMap: any;
    innerView: any;

    constructor (esriBundle: EsriBundle, targetDiv: string) {
        this.innerMap = new esriBundle.Map({
            basemap: 'topo'
          });

          this.innerView = new esriBundle.MapView({
            map: this.innerMap,
            container: targetDiv,
            center: [-76.772, 44.423],
            zoom: 10
          });
    }

    addLayer (): void {

    }
}

export class FakeNewsMapModule {
    esriBundle: EsriBundle;

    constructor (esriBundle: EsriBundle) {
        this.esriBundle = esriBundle;
    }

    makeMap(targetDiv: string): FakeNewsMap {
        const map = new FakeNewsMap(this.esriBundle, targetDiv);
        return map;
    }
}