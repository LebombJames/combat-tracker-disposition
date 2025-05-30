const MODULE = "combat-tracker-disposition";
type LowercaseKeys<T> = {
    [K in keyof T as Lowercase<string & K>]: T[K]
};

import HTMLColorPickerElement = foundry.applications.elements.HTMLColorPickerElement
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin
import ApplicationV2 = foundry.applications.api.ApplicationV2
import { DeepPartial } from "fvtt-types/utils";
import fields = foundry.data.fields

type DispositionColorField = fields.ColorField<{ required: true, initial: string, nullable: false }, string>

type DispositionColorsSchema = {
    friendly: DispositionColorField,
    hostile: DispositionColorField
    neutral: DispositionColorField,
    opacity: fields.AlphaField<{ required: true, nullable: false, initial: number }, number>,
    defeatedEnabled: fields.BooleanField<{ required: true, initial: true, nullable: false }, boolean>,
    defeatedColor: fields.ColorField<{ required: true, initial: string, nullable: true }, string>
}

type GlobalDispositionColors = {
    friendly: Color,
    hostile: Color
    neutral: Color,
    opacity: number,
    defeatedEnabled: boolean,
    defeatedColor: Color
}

let dispositionColors = {} as GlobalDispositionColors;

export class CustomColorModel extends foundry.abstract.DataModel<DispositionColorsSchema, null, {}> {
    static override defineSchema(): DispositionColorsSchema {
        return {
            friendly: new fields.ColorField<{ required: true, initial: string, nullable: false }, string>({ required: true, initial: "#" + CONFIG.Canvas.dispositionColors.FRIENDLY.toString(16), nullable: false }),
            hostile: new fields.ColorField<{ required: true, initial: string, nullable: false }, string>({ required: true, initial: "#" + CONFIG.Canvas.dispositionColors.HOSTILE.toString(16), nullable: false }),
            neutral: new fields.ColorField<{ required: true, initial: string, nullable: false }, string>({ required: true, initial: "#" + CONFIG.Canvas.dispositionColors.NEUTRAL.toString(16), nullable: false }),
            defeatedEnabled: new fields.BooleanField<{ required: true, initial: true, nullable: false }, boolean>({ required: true, initial: true, nullable: false }),
            defeatedColor: new fields.ColorField<{ required: true, initial: string, nullable: true }, string>({ required: true, initial: "#000000", nullable: true }),
            opacity: new fields.AlphaField<{ required: true, initial: number, nullable: false }, number>({ required: true, initial: 0.4, nullable: false })
        }

    }
}

Hooks.on("init", () => {
    game.settings.registerMenu(MODULE, "customColours", {
        name: "Custom Colours",
        label: "Configure Custom Colours",
        hint: "Change the colour of each disposition in the combat tracker.",
        icon: "fas fa-paint-roller",
        type: CustomColourMenu,
        restricted: true
    });

    game.settings.register(MODULE, "customColorSettings", {
        scope: "world",
        config: false,
        type: CustomColorModel,
        onChange: (value) => {
            dispositionColors.friendly = Color.from(value.friendly)
            dispositionColors.neutral = Color.from(value.neutral)
            dispositionColors.hostile = Color.from(value.hostile)
            dispositionColors.defeatedColor = Color.from(value.defeatedColor)
            dispositionColors.opacity = value.opacity
            dispositionColors.defeatedEnabled = value.defeatedEnabled
        }
    })

    dispositionColors = game.settings.get("combat-tracker-disposition", "customColorSettings");
});

function getColor(combatant: Combatant, disposition: CONST.TOKEN_DISPOSITIONS) {
    const opacity = dispositionColors.OPACITY;

    if (combatant.defeated && dispositionColors.DEFEATED) return dispositionColors.DEFEATED + opacity;

    const actorOverride = combatant.actor?.getFlag(MODULE, "override");
    if (actorOverride?.enabled) return actorOverride?.color + opacity;
    else {
        switch (disposition) {
            case -2:
                return "#00000000"
            case -1:
                return dispositionColors.HOSTILE + opacity;
            case 0:
                return dispositionColors.NEUTRAL + opacity;
            case 1:
                return dispositionColors.FRIENDLY + opacity;
            default:
                return "#00000000"
        }
    }
}

function updateColors() {
    // Set the colours when the combat tracker is rendered
    if (!game.combat) return;

    for (const combatant of game.combat.combatants) {
        const combatantRows = document.querySelectorAll<HTMLElement>(
            `:is(#combat-tracker, #combat-popout) [data-combatant-id="${combatant.id}"]`
        )

        if (!combatant.token || combatantRows.length === 0) continue;

        const color = getColor(combatant, combatant.token.disposition);
        for (let row of combatantRows) {
            row.style.background = color;
        }
    }
}

Hooks.on("renderCombatTracker", () => updateColors());

Hooks.on("renderCombatantConfig", (app: CombatantConfig, html: HTMLFormElement) => {
    if (!app.object.actor) return;

    const div = document.createElement("div");
    div.classList.add("form-group");

    const label = document.createElement("label");
    label.innerHTML = "Colour Override";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "color-enabled";
    checkbox.checked = app.object.actor.getFlag(MODULE, "override")?.enabled;
    checkbox.classList.add("form-fields");

    const color = HTMLColorPickerElement.create({
        name: "combatant-color",
        value: app.object.actor.getFlag(MODULE, "override")?.color || "#000000",
        placeholder: "#000000"
    });

    color.classList.add("form-fields");

    div.appendChild(label);
    div.appendChild(checkbox);
    div.appendChild(color);

    let sumbitButton = html.querySelector("button[type=submit]");
    sumbitButton?.insertAdjacentElement("beforebegin", div);

    app.setPosition({ height: "auto" });
});

Hooks.on("closeCombatantConfig", async (app: CombatantConfig, html: HTMLFormElement) => {
    let checkbox = html.querySelector<HTMLInputElement>("input[name=color-enabled]")?.checked;
    let color = html.querySelector<HTMLColorPickerElement>("color-picker[name=combatant-color]")?.value;

    if (!(checkbox && color && app.object.actor)) return;

    await app.object.actor.setFlag(MODULE, "override", {
        enabled: checkbox,
        color
    });
    updateColors();
});

declare namespace CustomColourMenu {
    interface RenderContext extends ApplicationV2.RenderContext, LowercaseKeys<Omit<DispositionColorsSchema, "opacity">> { }
}

class CustomColourMenu<
    RenderContext extends CustomColourMenu.RenderContext = CustomColourMenu.RenderContext
> extends HandlebarsApplicationMixin(ApplicationV2)<RenderContext> {
    constructor(...args: ConstructorParameters<typeof ApplicationV2>) {
        super(...args);
    }

    override async _prepareContext(options: ApplicationV2.RenderOptions) {
        let data = await super._prepareContext(options);

        data.hostile = dispositionColors.HOSTILE;
        data.neutral = dispositionColors.NEUTRAL;
        data.friendly = dispositionColors.FRIENDLY;
        data.defeated = dispositionColors.DEFEATED;

        return data;
    }

    static override DEFAULT_OPTIONS: DeepPartial<ApplicationV2.Configuration> & object = {
        classes: ["form"],
        id: "custom-colours",
        window: {
            title: "Custom Colours",
        },
        position: {
            width: 300,
            height: "auto",
        }
    }

    static PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
        main: {
            template: `modules/combat-tracker-disposition/templates/custom-colours.hbs`,
        }
    }


    override async _onRender(context: DeepPartial<RenderContext>, options: DeepPartial<ApplicationV2.RenderOptions>) {
        super._onRender(context, options);
        const html = this.element;

        html.querySelector("form.combat-tracker-disposition.custom-colour-form button.reset")?.addEventListener("click", this._onClickReset.bind(this));

    }

    _onClickReset(event: Event) {
        event.preventDefault();

        const defaults = {
            friendly: game.settings.settings.get(`${MODULE}.friendlyColour`)!.default,
            neutral: game.settings.settings.get(`${MODULE}.neutralColour`)!.default,
            hostile: game.settings.settings.get(`${MODULE}.hostileColour`)!.default,
            defeated: game.settings.settings.get(`${MODULE}.defeatedColour`)!.default,
        } as Record<string, string>

        const colourDivs = this.element.querySelector("div.combat-tracker-disposition.custom-colour-form section.colour-selections")?.children;

        for (const div of (colourDivs ?? [])) {
            const picker = div.querySelector<HTMLColorPickerElement>("color-picker")
            if (picker) picker.value = defaults[div.classList[1]]
        }
    }

    async _updateObject(event: Event, formData) {
        game.settings.set(MODULE, "hostileColour", formData["hostile-colour"])
        game.settings.set(MODULE, "neutralColour", formData["neutral-colour"])
        game.settings.set(MODULE, "friendlyColour", formData["friendly-colour"])
        game.settings.set(MODULE, "defeatedColour", formData["defeated-colour"])
    }
}