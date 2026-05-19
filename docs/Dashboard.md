# Dashboard

> init from version: 2.6.0

to enable dashboard need configure it 

if dashboard disabled you can configure welcome message

```
module.exports.adminpanel = { 
  dashboard: false,
  welcome: {
     title: "Welcome",
     text: "Any text here"
  }
};

```


```
module.exports.adminpanel = {
    dashboard: {
        enable: true
    }
}
```

or 

```
module.exports.adminpanel = {
    dashboard: true
}

```




# Widgets

### WidgetHandler
 WidgetHandler is a static class that processes widgets made with the abstract widget classes. A widget can have four types:
 * info [InfoBase] - give information without any action
 * switcher [SwitcherBase] - switcher change boolean state 
 * action [ActionBase] - start action by click on widget
 * link [LinkBase] - provide link logic in widget
 * custom [CustomBase] - mount JS/html widget into dashboard widget
 
Widgets are registered on the Adminizer instance through `adminizer.widgetHandler.add(widget)`. The dashboard config can also define `autoloadWidgetsPath` for project-specific widget loading.

 > ⚠️ Any new widget type must be added to `WidgetType` inside `/lib/widgets/widgetHandller.ts`. Within this handler you also need to implement the logic for the new type in the `getAll` method.

> ⚠️ You can access the widget handler as `adminizer.widgetHandler`.

 > ⚠️ You can add a widget by calling `adminizer.widgetHandler.add(widget)`.


WidgetBase instance has this props:
- `id`: string, required 
- `name`: string, 
- `description`: string, 
- `icon`: string | null, default = null
- `department`: string,  For group access rights by department
- `size`: {h: number, w: number} | null; size of box on client
- `widgetType`: 
        /** An informational widget type that only shows the state */
        "info" |
        /** Binary state switching */
        "switcher" |
        /** Run task */
        "action" |
        /** Change location, or open in new tab */
        "link" |
        /**  any task from JS file */
        "custom"
 
The new type of widgets created on the WidgetBase will have their own field which have to be as `public abstract readonly`

**Promotions in the interface**
<!-- `ISPUBLIC: True` when requesting a group or product, the promotion will be calculated based on Worktime, Enable
Promotions that are displayed in the interface cannot be single, for the flag `isjoint: true` will not be taken into account even if the flag is` Ispublic: true`.

> ⚠️  You can use this mechanism to display the user's personal promotions, as he transfers the user when calculating the promotion

The public promotion can turn on a banner or perform another action if such a connection is available through the emitter `Emit('Apply-Promotion', promotion)`.

**Example**
First we have to create widget type `abstractCustom`. In the way like this.

export default abstract class CustomBase extends BaseWidget{
    /** Widget background css (color, Image) */
    public abstract readonly  backgroundCSS: string | null;
}

Then we will add type to `widgetHandller.ts` 

type WidgetType = (SwitcherBase | InfoBase | ActionBase | LinkBase | CustomBase);

Add new type to `BaseWidget`

public abstract readonly widgetType:
		/** An informational widget type that only shows the state */
		"info" |
		/** Binary state switching */
		"switcher" |
		/** Run task */
		"action" |
		/** Change location, or open in new tab */
		"link" |

		"custom"
	;


Next Handling Custom Widgets. Add logic to `getAll` method:

            else if (widget instanceof CustomBase) {
				if (adminizer.accessRightsHelper.hasPermission(`widget-${widget.id}`, user)) {
					widgets.push({
						id: `${widget.id}_${id_key}`,
						type: widget.widgetType,
						api: `${config.routePrefix}/widgets-custom/${widget.id}`,
						description: widget.description,
						icon: widget.icon,
						name: widget.name,
						backgroundCSS: widget.backgroundCSS ?? null,
					})
				}
            }

Then we`ll create Instance of this widget type

class CustomOne extends CustomBase {
	readonly id: string = 'site_custom';
	readonly department: string = 'test';
	readonly description: string = 'Widget Custom One';
	readonly icon: string = 'dog';
	readonly name: string = 'Site Custom';
	readonly widgetType = 'custom';
	readonly backgroundCSS = '#da4fcf'

}

And export it as function which create our instances

const setCustomsWidgets = (adminizer) => {
	adminizer.widgetHandler.add(new CustomOne())
}

`module.exports = { setCustomsWidgets }`

Then call `setCustomsWidgets(adminizer)` after Adminizer is initialized.


### customizable and programmable promotion

<!-- **Completed**
The adapter supplied with the core has support for promotion configurations for certain groups, or/and dishes
Each record in the model will create a copy of the custom promotion.So that such a promotion created by the user through the admin panel is
distinguishable, we use a sign of `Creedby: 'adminpanel'` -->


**Programmable**
<!-- Since the promotion is a copy of the class, we can realize any logic of such a promotion.

> ⚠️ We do not recommend using promotions to describe complex promotions, use the Promotions adapter for this

The Promotion should be implemented as an adapter from the abstract class `@webresto/core/adapters/promotion/AbstractPromotion.ts` and added to
the model via> `PromotionAdapter.addPromotionHandler()`. The adapter is responsible for recording transactions in an external source or syncing
from an external source by implementing the abstract class `AbstractPromotionAdapter`. -->

