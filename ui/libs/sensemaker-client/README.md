# @neighbourhoods/client
This package provides an API for interacting with a sensemaker-lite instance along with typescript type definitions of sensemaker-lite primitives, IO payloads, other utility types and functions, along with a reactive state objects for declarative binding UI components to the state.

Currently compatible with holochain `v0.1`.

## Sensemaker Store API
The main way to interact with the API is by spawning an instance of [`SensemakerStore`](./src/sensemakerStore.ts):

```typescript
const installedAppId = "applet_name"; //this would change to whatever app ID your NH happ is given
const roleName = "nh_role_name"; // this would change to whatever role name your NH happ is given
const appAgentWebsocket: AppAgentWebsocket = await AppAgentWebsocket.connect(``, installedAppId);
const sensemakerService = new SensemakerService(appAgentWebsocket, roleName)
const sensemakerStore = new SensemakerStore(sensemakerService);
```

Then you can use any of the methods on the `sensemakerStore` object to interact with the sensemaker-lite instance.

See the [API Documentation](./docs/API.md) for implementation details.


Stateful properties use [`svelte/store`](https://svelte.dev/tutorial/writable-stores) to provide a reactive interface to the data. To subscribe to the store, you can use [`lit-svelte-store`](https://www.npmjs.com/package/lit-svelte-stores) to create a reactive property in a lit-element component:

```typescript
export class ContextSelector extends ScopedElementsMixin(LitElement) {
    @consume({ context: sensemakerStoreContext, subscribe: true })
    @state()
    public  sensemakerStore!: SensemakerStore

    contexts: StoreSubscriber<AppletConfig> = new StoreSubscriber(this, () => this.sensemakerStore.appletConfig());

    render() {
        return html`
            <div class="list-list-container">
                <mwc-list>
                    ${Object.keys(this.contexts?.value?.cultural_contexts).map((contextName) => html`
                        <list-item listName=${contextName}></list-item> 
                    `)}
                <mwc-list>
            </div>
        `
    }
}
```
In this example, if `this.contexts.value` changes, the component will re-render. For example, if `this.sensemakerStore.createCulturalContext(...)` is called, it updates the applet config store, which triggers a re-render of the component with the new value.


## Widget Registration
Part of the NH framework is being able to define your own *widgets* which are used to assess resources and display dimensions. This is the core of enabling the full configurability of your NH applets and exploring various forms of assessing and the cascading feedback-loop effects of those assessments.

There are two main types of widgets:
- create assessment widgets: used to create an assessment along a specific dimension for a resource
- display assessment widgets: used to display the value of an assessment along an output dimension of a method (for example, the total "likes" on a resource)

To define your own custom component for each type of widget, there are two abstract classes which you will extend respectively, `AssessDimensionWidget` and `DisplayDimensionWidget`. For example,
```typescript
export class ImportanceDimensionAssessment extends AssessDimensionWidget {
```
and
```typescript
export class ImportanceDimensionDisplay extends DisplayDimensionWidget {
```

Then you would implement the `render()` function to return the HTML template for your widget.

You can then register these widgets in the widget registry using the `registerWidget` function, which is used to register a pair of widgets (assessment and display) for a list of dimensions.

## Assessing resources
There is a wrapper component `sensemake-resource` that you can use to wrap your resource components, which will handle rendering dimension and assessment widgets based on the current sensemaker store state. To use it, you can include it in your html code and wrap the resource component, like so:
```typescript
<sensemake-resource 
    .resourceEh=${task.entry_hash} 
    .resourceDefEh=${get(this.sensemakerStore.appletConfig()).resource_defs["task_item"]}
>
    <task-item 
        .task=${task} 
        .completed=${('Complete' in task.entry.status)} 
    ></task-item>
</sensemake-resource> 
```

All you need to do is provide the component with the resource entry hash and the resource def entry hash.