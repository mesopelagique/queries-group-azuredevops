import { Control } from "VSS/Controls";
import { IWorkItemChangedArgs, IWorkItemLoadedArgs } from "TFS/WorkItemTracking/ExtensionContracts";
import { WorkItemFormService } from "TFS/WorkItemTracking/Services";
import { idField, projectField, parentField, typeField } from "./fieldNames";

class Query {
    name: string;
    icon: string;
    wiql: string;

    constructor(name: string, icon: string, wiql: string) {
        this.name = name;
        this.icon = icon;
        this.wiql = wiql;
    }

    link(id: number, orga: string, project: string, parent: number): string {
        const baseURL = `https://${orga}.visualstudio.com/${project}`
        const url = `${baseURL}/_workitems?_a=query&wiql=`; // XXX maybe use _queries/query/?wiql=
        var ql = this.wiql.replace("{{id}}", id.toString());
        if (parent) {
            ql = ql.replace("{{parent}}", parent.toString());
        }
        return url+ encodeURIComponent(ql);
    }
}

export class QueriesControl extends Control<{}> {
    // data
    private wiId: number;
    private project: string;
    //private type: string;
    private parent: number;
    private orga: string;
 
    public async refresh() {
        const formService = await WorkItemFormService.getService();
        const fields = await formService.getFieldValues([idField, projectField, typeField, parentField]);
        this.wiId = fields[idField] as number;
        this.project = fields[projectField] as string;
        //this.type = fields[typeField] as string;
        this.parent = fields[parentField] as number;
        this.orga = "4dimension";  // XXX TODO correct URL according to organisation
        await this.updateQueries();
    }

    private async updateQueries() {
        this._element.html("");
        const list = $("<div class=\"la-list\"></div>").appendTo(this._element);

        const self = this;

        var queries: Query[] = [];
        queries.push(new Query("Children tree", "bowtie-view-list-tree", "SELECT [System.Id],[System.WorkItemType],[System.Title],[System.AssignedTo], [System.State],[System.Tags] FROM workitemLinks WHERE ([Source].[System.TeamProject] = @project AND [Source].[System.Id] = {{id}}) AND ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') AND ([Target].[System.TeamProject] = @project AND [Target].[System.WorkItemType] <> '' ) MODE (Recursive)"));
        queries.push(new Query("Children tree (only open)","bowtie-view-list-tree", "SELECT [System.Id],[System.WorkItemType],[System.Title],[System.AssignedTo], [System.State],[System.Tags] FROM workitemLinks WHERE ([Source].[System.TeamProject] = @project AND [Source].[System.Id] = {{id}}) AND ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') AND ([Target].[System.TeamProject] = @project AND [Target].[System.WorkItemType] <> '' AND [Target].[System.State] <> 'Closed' AND [Target].[System.State] <> 'Resolved' AND [Target].[System.State] <> 'Rejected') MODE (Recursive)"));
        queries.push(new Query("Children tree (only open and assigned to me)","bowtie-work-item-bug", "SELECT [System.Id],[System.WorkItemType],[System.Title],[System.AssignedTo], [System.State],[System.Tags] FROM workitemLinks WHERE ([Source].[System.TeamProject] = @project AND [Source].[System.Id] = {{id}}) AND ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') AND ([Target].[System.TeamProject] = @project AND [Target].[System.WorkItemType] <> '' AND [Target].[System.State] <> 'Closed' AND [Target].[System.State] <> 'Resolved' AND [Target].[System.State] <> 'Rejected' AND [Target].[System.AssignedTo] = @me) MODE (Recursive)"));
        if (this.parent) {
            queries.push(new Query("Siblings", "bowtie-group-rows ", "SELECT [System.Id],[System.WorkItemType],[System.Title],[System.AssignedTo], [System.State],[System.Tags] FROM WorkItems WHERE ([System.Parent] = {{parent}})"));
        }
        queries.forEach(function (query) {
            const item = $("<div class=\"la-item\"></div>").appendTo(list);
            const wrapper = $("<div class=\"la-item-wrapper\"></div>").appendTo(item);
            const artifactdata = $("<div class=\"la-artifact-data\"></div>").appendTo(wrapper);
            const primarydata = $("<div class=\"la-primary-data\"></div>").appendTo(artifactdata);
 
            const primaryicon = $("<div class=\"la-primary-icon\" style=\"display: inline;\">&nbsp;</div>").appendTo(primarydata);
            $("<span aria-hidden=\"true\" class=\"bowtie-icon "+query.icon+" flex-noshrink\"> </span>&nbsp;").appendTo(primaryicon);

            const link = $("<div class=\"ms-TooltipHost \" style=\"display: inline;\">&nbsp;</div>").appendTo(primarydata);
            $("<a/>").text(query.name)
            .attr({
                href: query.link(self.wiId, self.orga, self.project, self.parent),
                target: "_blank",
                title: "Navigate to parent"
            }).appendTo(link);
        });
        VSS.resize();
    }

    public onLoaded(loadedArgs: IWorkItemLoadedArgs) {
        if (loadedArgs.isNew) {
            this._element.html(`<div class="new-wi-message">Save the work item to see queries data</div>`);
        } else {
            this.wiId = loadedArgs.id;
            this._element.html("");
            this._element.append($("<div/>").text("Looking for queries..."));
            this.refresh();
        }
    }

    public onRefreshed() {
        this.refresh();
    }

    public onSaved(_: IWorkItemChangedArgs) {
        this.refresh();
    }
}
