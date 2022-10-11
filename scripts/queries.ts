/// <reference types="vss-web-extension-sdk" />

import { QueriesControl } from "./queriesControl";
import * as Controls from "VSS/Controls";
import { IWorkItemNotificationListener } from "TFS/WorkItemTracking/ExtensionContracts";
 
const control = <QueriesControl>Controls.BaseControl.createIn(QueriesControl, $(".queries-control"));

const contextData: Partial<IWorkItemNotificationListener> = {
    onSaved: (savedEventArgs) => control.onSaved(savedEventArgs),
    onRefreshed: () => control.onRefreshed(),
    onLoaded: (loadedArgs) => control.onLoaded(loadedArgs)
};

VSS.register(VSS.getContribution().id, contextData);