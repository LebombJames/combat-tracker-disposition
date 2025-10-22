export const MODULE = "combat-tracker-disposition";

import "../css/combat-tracker-disposition.css";

import HTMLColorPickerElement = foundry.applications.elements.HTMLColorPickerElement;
import fields = foundry.data.fields;
import { CustomColourMenu } from "./custom-colour-menu";
import { CustomColorAPI } from "./api";

type DispositionColorField = fields.ColorField<DispositionColorFieldOptions>;
type RequiredNonNullable = { required: true; nullable: false };
type DispositionColorFieldOptions = RequiredNonNullable & { initial: string };

type DispositionColorsSchema = {
    friendly: DispositionColorField;
    hostile: DispositionColorField;
    neutral: DispositionColorField;
    opacity: fields.AlphaField<RequiredNonNullable & { initial: number }>;
    defeatedEnabled: fields.BooleanField<RequiredNonNullable & { initial: true }>;
    defeatedColor: DispositionColorField;
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
                initial: 0.3,
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
        name: "Combat Tracker Disposition Settings",
        label: "Configure Settings",
        hint: "Change disposition colours and opacity.",
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

    dispositionColors = game.settings.get(MODULE, "customColorSettings");

    game.modules.get(MODULE).api = new CustomColorAPI();
});

async function getColor(combatant: Combatant, disposition: CONST.TOKEN_DISPOSITIONS) {
    const { opacity } = dispositionColors;

    if (combatant.defeated && dispositionColors.defeatedEnabled) return dispositionColors.defeatedColor.toRGBA(opacity);

    const actorOverride = combatant.actor?.getFlag(MODULE, "override");
    if (actorOverride?.enabled) return Color.from(actorOverride?.color).toRGBA(opacity);

    const apiColor = await game.modules.get(MODULE).api.getTopColor(combatant, disposition);
    if (apiColor !== null) return Color.from(apiColor).toRGBA(opacity);

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

async function updateColors() {
    // Set the colours when the combat tracker is rendered
    if (!game.combat) return;

    const updateLis = async (combatant: Combatant) => {
        if (!combatant.token) return;

        const combatantRows = document.querySelectorAll<HTMLLIElement>(
            `ol.combat-tracker [data-combatant-id="${combatant.id}"]`
        );

        if (combatantRows.length === 0) return;

        const color = await getColor(combatant, combatant.token.disposition);
        for (const row of combatantRows) {
            row.style.background = color;
        }
    };

    for (const combatant of game.combat.combatants) {
        updateLis(combatant);
    }
}

Hooks.on("renderCombatTracker", () => updateColors());

Hooks.on("updateToken", (doc, changes) => {
    if (!("disposition" in changes)) return;

    updateColors();
});

Hooks.on(
    "renderCombatantConfig",
    (app: foundry.applications.api.DocumentSheetV2<Combatant>, form, context, options) => {
        if (!(app.document.actor && options.isFirstRender)) return;

        const formGroup = document.createElement("div");
        formGroup.classList.add("form-group");

        const label = document.createElement("label");
        label.innerHTML = "Colour Override";
        formGroup.appendChild(label);

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "color-enabled";
        checkbox.checked = app.document.actor.getFlag(MODULE, "override")?.enabled;
        checkbox.classList.add("form-fields");

        const color = HTMLColorPickerElement.create({
            name: "combatant-color",
            value: app.document.actor.getFlag(MODULE, "override")?.color || "#000000",
            placeholder: "#000000"
        });
        color.classList.add("form-fields");

        const formField = document.createElement("div");
        formField.classList.add("form-field");
        formField.appendChild(checkbox);
        formField.appendChild(color);

        formGroup.appendChild(formField);

        const el = app.element;

        const sumbitButton = el.querySelectorAll<HTMLButtonElement>(".form-group");
        sumbitButton[sumbitButton.length - 1]?.insertAdjacentElement("afterend", formGroup);

        el.addEventListener("submit", async (event) => {
            const html = event.target as HTMLElement;

            if (!(html && app.document.actor)) return;

            const checkbox = html.querySelector<HTMLInputElement>("input[name='color-enabled']");
            const picker = html.querySelector<HTMLColorPickerElement>("color-picker[name='combatant-color']");

            if (!(checkbox && picker)) return;

            const { checked } = checkbox;
            const color = picker.value;

            await app.document.actor.setFlag(MODULE, "override", {
                enabled: checked,
                color
            });
            updateColors();
        });

        app.setPosition({ height: "auto" });
    }
);
