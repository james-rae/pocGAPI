// gapi loader needs to be a oneshot default due to magic (something about module load being dependant on dojo script load [waves hands, points at Aly]).
// so putting the types here so they can be shared around

export interface DojoWindow extends Window {
    require?: any;  // require is both a function, and has event handlers. probably a way to define in typescript interface, not going to right now.
}

// TODO is there a cleaner way to define a key/value pair of string to random object?
// TODO do we want to get fancy and somehow explicitly define an interface, so it takes advantage of the ESRI typescript types? Would make developmight MIGHTY NICE.
export interface EsriBundle {
    [classname: string]: any;
}

/*
export interface EsriBundle {
    MapView: MapView;
    Map: Map;
    FeatureLayer: FeatureLayer;
}
*/

// TODO might be worth making this a class or a generator function with defaults.  dont know what the impact of making all properties optonal is.
// TODO figure out best way of managing classes.  e.g. fakeNewsMaps needs to import that file, but that file imports this.
export interface GeoApiInterface {
    esriBundle?: EsriBundle;
    // TODO add module names as we import them

    fakeNewsMaps?: any; // TODO remove after real maps are implemented
}