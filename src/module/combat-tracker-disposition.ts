export const MODULE = "combat-tracker-disposition";

import "../css/combat-tracker-disposition.css";

import HTMLColorPickerElement = foundry.applications.elements.HTMLColorPickerElement;
import fields = foundry.data.fields;
import { CustomColourMenu } from "./custom-colour-menu";

type DispositionColorField = fields.ColorField<DispositionColorFieldOptions>;
type RequiredNonNullable = { required: true, nullable: false };
type DispositionColorFieldOptions = RequiredNonNullable & { initial: string };

type DispositionColorsSchema = {
    friendly: DispositionColorField,
    hostile: DispositionColorField
    neutral: DispositionColorField,
    opacity: fields.AlphaField<RequiredNonNullable & { initial: number }>,
    defeatedEnabled: fields.BooleanField<RequiredNonNullable & { initial: true }>,
    defeatedColor: DispositionColorField
};

export let dispositionColors = {} as CustomColorModel;

export class CustomColorModel extends foundry.abstract.DataModel<DispositionColorsSchema, null, {}> {
    static override defineSchema(): DispositionColorsSchema {
        return {
            friendly: new fields.ColorField({
                required: true,
                initial: "#" + CONFIG.Canvas.dispositionColors.FRIENDLY.toString(16),
                nullable: false
            }),
            hostile: new fields.ColorField({
                required: true,
                initial: "#" + CONFIG.Canvas.dispositionColors.HOSTILE.toString(16),
                nullable: false
            }),
            neutral: new fields.ColorField({
                required: true,
                initial: "#" + CONFIG.Canvas.dispositionColors.NEUTRAL.toString(16),
                nullable: false
            }),
            opacity: new fields.AlphaField({
                required: true,
                initial: 0.4,
                nullable: false
            }),
            defeatedEnabled: new fields.BooleanField({
                required: true,
                initial: true,
                nullable: false
            }),
            defeatedColor: new fields.ColorField({
                required: true,
                initial: "#000000",
                nullable: false
            })
        };

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
            dispositionColors = value;
            updateColors();
        }
    });

    dispositionColors = game.settings.get("combat-tracker-disposition", "customColorSettings");
});

function getColor(combatant: Combatant, disposition: CONST.TOKEN_DISPOSITIONS) {
    const { opacity } = dispositionColors;

    if (combatant.defeated && dispositionColors.defeatedEnabled) return dispositionColors.defeatedColor.toRGBA(opacity);

    const actorOverride = combatant.actor?.getFlag(MODULE, "override");
    if (actorOverride?.enabled) return Color.from(actorOverride?.color).toRGBA(opacity);
    else {
        switch (disposition) {
            case -1:
                return dispositionColors.hostile.toRGBA(opacity);
            case 0:
                return dispositionColors.neutral.toRGBA(opacity);
            case 1:
                return dispositionColors.friendly.toRGBA(opacity);
            default:
                return Color.from("#000000").toRGBA(0);
        }
    }
}

function updateColors() {
    // Set the colours when the combat tracker is rendered
    if (!game.combat) return;

    for (const combatant of game.combat.combatants) {
        if (!combatant.token) continue;

        const combatantRows = document.querySelectorAll<HTMLLIElement>(
            `ol.combat-tracker [data-combatant-id="${combatant.id}"]`
        );

        if (combatantRows.length === 0) continue;

        const color = getColor(combatant, combatant.token.disposition);
        for (const row of combatantRows) {
            row.style.background = color;
        }
    }
}

Hooks.on("renderCombatTracker", () => updateColors());

Hooks.on("updateToken", (doc, changes) => {
    if (!("disposition" in changes)) return;

    updateColors();
});

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

    const sumbitButton = html.querySelector<HTMLButtonElement>("button[type=submit]");
    sumbitButton?.insertAdjacentElement("beforebegin", div);

    app.setPosition({ height: "auto" });
});

Hooks.on("closeCombatantConfig", async (app: CombatantConfig, html: HTMLFormElement) => {
    const checkbox = html.querySelector<HTMLInputElement>("input[name=color-enabled]")?.checked;
    const color = html.querySelector<HTMLColorPickerElement>("color-picker[name=combatant-color]")?.value;

    if (!(checkbox && color && app.object.actor)) return;

    await app.object.actor.setFlag(MODULE, "override", {
        enabled: checkbox,
        color
    });
    updateColors();
});