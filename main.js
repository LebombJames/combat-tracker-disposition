const MODULE = "combat-tracker-disposition"
let dispositionColors = {}

Hooks.on("init", () => {
    game.settings.registerMenu(MODULE, "customColours", {
        name: "Custom Colours",
        label: "Configure Custom Colours",
        hint: "Change the colour of each disposition in the combat tracker.",
        icon: "fas fa-paint-roller",
        type: CustomColourMenu
    });

    game.settings.register(MODULE, "hostileColour", {
        scope: "world",
        config: false,
        type: String,
        default: "#" + CONFIG.Canvas.dispositionColors.HOSTILE.toString(16),
        onChange: (value) => {
            dispositionColors.HOSTILE = value;
            updateColors();
        }
    });

    game.settings.register(MODULE, "neutralColour", {
        scope: "world",
        config: false,
        type: String,
        default: "#" + CONFIG.Canvas.dispositionColors.NEUTRAL.toString(16),
        onChange: (value) => {
            dispositionColors.NEUTRAL = value;
            updateColors();
        }
    });

    game.settings.register(MODULE, "friendlyColour", {
        scope: "world",
        config: false,
        type: String,
        default: "#" + CONFIG.Canvas.dispositionColors.FRIENDLY.toString(16),
        onChange: (value) => {
            dispositionColors.FRIENDLY = value;
            updateColors();
        }
    });

    game.settings.register(MODULE, "opacity", {
        scope: "world",
        config: true,
        type: Number,
        name: "Opacity",
        hint: "Configure the opacity of the background colour. Default 50.",
        default: 50,
        range: {
            min: 0,
            max: 100,
            step: 5
        },
        onChange: () => {
            updateColors();
        }
    });

    dispositionColors = { //On launch, set as the setting's value.
        FRIENDLY: game.settings.get(MODULE, "friendlyColour"),
        NEUTRAL: game.settings.get(MODULE, "neutralColour"),
        HOSTILE: game.settings.get(MODULE, "hostileColour")
    }
});

function getColor(combatant, disposition) {
    const opacity = game.settings.get(MODULE, "opacity").toString(16);
    if (combatant.getFlag(MODULE, "colorEnabled")) {
        return combatant.getFlag(MODULE, "color") + opacity;
    } else {
        switch (disposition) {
            case -1:
                return dispositionColors.HOSTILE + opacity;
                break;
            case 0:
                return dispositionColors.NEUTRAL + opacity;
                break;
            case 1:
                return dispositionColors.FRIENDLY + opacity;
                break;
        }
    }
}

function updateColors() {//Set the colours when the combat tracker is rendered
    if (game.combat) {
        for (const combatant of game.combat.combatants) {
            const combatantRows = document.querySelectorAll(`:is(#combat-tracker, #combat-popout) [data-combatant-id="${combatant.id}"]`);
            const color = getColor(combatant, combatant.token.disposition);
            combatantRows.forEach(row => row.style.background = color);
        };
    };
};

function updateColorsToken(token) {//Re-set the colours if any token's disposition changes
    if (game.combat) {
        const combatantRows = document.querySelectorAll(`:is(#combat-tracker, #combat-popout) [data-combatant-id="${token.combatant.id}"]`);
        const color = getColor(token.combatant, token.disposition);
        combatantRows.forEach(row => row.style.background = color);
    };
};

Hooks.on('renderCombatTracker', () => {
    updateColors();
});

Hooks.on('updateToken', (token, update) => {
    if (token.inCombat && !isNaN(update.disposition)) {
        updateColorsToken(token);
    };
});

Hooks.on('renderCombatantConfig', (config, html, dialog) => {
    const div = document.createElement("div");
    div.classList.add("form-group");

    const label = document.createElement("label");
    label.innerHTML = "Color Override";
    label.for = "color-enabled"

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "color-enabled"
    checkbox.checked = config.object.getFlag(MODULE, "colorEnabled")
    checkbox.classList.add("form-fields");

    const color = document.createElement("input");
    color.type = "color";
    color.id = "combatant-color"
    color.value = config.object.getFlag(MODULE, "color")
    color.classList.add("form-fields");

    div.appendChild(label);
    div.appendChild(checkbox);
    div.appendChild(color);

    let sumbitButton = html[0].querySelector("button[type=submit]");
    sumbitButton.insertAdjacentElement("beforebegin", div);
});

Hooks.on('closeCombatantConfig', async (config, html) => {
    let checkbox = html[0].querySelector("input[id=color-enabled]").checked;
    let color = html[0].querySelector("input[id=combatant-color]").value;

    await config.object.setFlag(MODULE, "colorEnabled", checkbox);
    await config.object.setFlag(MODULE, "color", color);
});

class CustomColourMenu extends FormApplication {
    constructor(...args) {
        super(...args);
    };

    getData() {
        return super.getData;
    };

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ['form'],
            popOut: true,
            template: `modules/combat-tracker-disposition/templates/custom-colours.html`,
            id: 'custom-colours',
            title: 'Custom Colours',
            width: 300
        });
    };

    activateListeners(html) {
        super.activateListeners(html);
        document.getElementById("hostile-colour").value = game.settings.get(MODULE, "hostileColour");
        document.getElementById("neutral-colour").value = game.settings.get(MODULE, "neutralColour");
        document.getElementById("friendly-colour").value = game.settings.get(MODULE, "friendlyColour");
    };

    async _updateObject(event, formData) {
        await game.settings.set(MODULE, "hostileColour", formData["hostile-colour"]);
        await game.settings.set(MODULE, "neutralColour", formData["neutral-colour"]);
        await game.settings.set(MODULE, "friendlyColour", formData["friendly-colour"]);
    };
};