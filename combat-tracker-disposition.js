const MODULE = "combat-tracker-disposition";
let dispositionColors = {};

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

    game.settings.register(MODULE, "enableDefeated", {
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        name: "Enable Defeated Colour",
        hint: "Apply a colour to defeated combatants.",
        onChange: (value) => {
            if (!value) dispositionColors.DEFEATED = null;
            else dispositionColors.DEFEATED = game.settings.get(MODULE, "defeatedColour");
            updateColors();
        }
    });

    game.settings.register(MODULE, "defeatedColour", {
        scope: "world",
        config: false,
        type: String,
        default: "#000000",
        onChange: (value) => {
            dispositionColors.DEFEATED = value;
            updateColors();
        }
    });

    game.settings.register(MODULE, "opacity", {
        scope: "world",
        config: true,
        type: Number,
        name: "Opacity",
        hint: "Configure the opacity of the background colour. Default 30.",
        default: 30,
        range: {
            min: 0,
            max: 100,
            step: 5
        },
        onChange: (value) => {
            const normalized255 = 255 * (value / 100);
            dispositionColors.OPACITY = Math.round(normalized255).toString(16);
            updateColors();
        }
    });

    dispositionColors = {
        // On launch, set as the setting's value.
        FRIENDLY: game.settings.get(MODULE, "friendlyColour"),
        NEUTRAL: game.settings.get(MODULE, "neutralColour"),
        HOSTILE: game.settings.get(MODULE, "hostileColour"),
        OPACITY: Math.round(255 * (game.settings.get(MODULE, "opacity") / 100)).toString(16),
        DEFEATED: game.settings.get(MODULE, "enableDefeated") ? game.settings.get(MODULE, "defeatedColour") : null
    };
});

function getColor(combatant, disposition) {
    const opacity = dispositionColors.OPACITY;

    if (combatant.defeated && dispositionColors.DEFEATED) return dispositionColors.DEFEATED + opacity;

    const actorOverride = combatant.actor.getFlag(MODULE, "override");
    if (actorOverride?.enabled) return actorOverride?.color + opacity;
    else {
        switch (disposition) {
            case -1:
                return dispositionColors.HOSTILE + opacity;
            case 0:
                return dispositionColors.NEUTRAL + opacity;
            case 1:
                return dispositionColors.FRIENDLY + opacity;
        }
    }
}

function updateColors() {
    // Set the colours when the combat tracker is rendered
    if (!game.combat) return;

    for (const combatant of game.combat.combatants) {
        const combatantRows = document.querySelectorAll(
            `:is(#combat-tracker, #combat-popout) [data-combatant-id="${combatant.id}"]`
        );

        const color = getColor(combatant, combatant.token.disposition);
        for (let row of combatantRows) {
            row.style.background = color;
        }
    }
}

Hooks.on("renderCombatTracker", () => updateColors());

Hooks.on("renderCombatantConfig", (app, html) => {
    const div = document.createElement("div");
    div.classList.add("form-group");

    const label = document.createElement("label");
    label.innerHTML = "Colour Override";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "color-enabled";
    checkbox.checked = app.object.actor.getFlag(MODULE, "override")?.enabled;
    checkbox.classList.add("form-fields");

    const color = document.createElement("color-picker");
    color.name = "combatant-color";
    color.value = app.object.actor.getFlag(MODULE, "override")?.color || "#000000";
    color.placeholder = "#000000";
    color.classList.add("form-fields");

    div.appendChild(label);
    div.appendChild(checkbox);
    div.appendChild(color);

    let sumbitButton = html[0].querySelector("button[type=submit]");
    sumbitButton.insertAdjacentElement("beforebegin", div);

    app.setPosition({ height: "auto" });
});

Hooks.on("closeCombatantConfig", async (app, html) => {
    let checkbox = html[0].querySelector("input[name=color-enabled]").checked;
    let color = html[0].querySelector("color-picker[name=combatant-color]").value;

    await app.object.actor.setFlag(MODULE, "override", {
        enabled: checkbox,
        color
    });
    updateColors();
});

class CustomColourMenu extends FormApplication {
    constructor(...args) {
        super(...args);
    }

    getData() {
        let data = super.getData();

        data.hostile = dispositionColors.HOSTILE;
        data.neutral = dispositionColors.NEUTRAL;
        data.friendly = dispositionColors.FRIENDLY;
        data.defeated = dispositionColors.DEFEATED;

        return data;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["form"],
            popOut: true,
            template: `modules/combat-tracker-disposition/templates/custom-colours.hbs`,
            id: "custom-colours",
            title: "Custom Colours",
            width: 300
        });
    }

    activateListeners($html) {
        super.activateListeners($html);
        const [html] = $html;

        html.querySelector("form.combat-tracker-disposition.custom-colour-form button.reset").addEventListener("click", this._onClickReset.bind(this));

    }

    _onClickReset(event) {
        event.preventDefault();

        const defaults = {
            friendly: game.settings.settings.get(`${MODULE}.friendlyColour`).default,
            neutral: game.settings.settings.get(`${MODULE}.neutralColour`).default,
            hostile: game.settings.settings.get(`${MODULE}.hostileColour`).default,
            defeated: game.settings.settings.get(`${MODULE}.defeatedColour`).default,
        }

        const colourDivs = this.form.querySelector("form.combat-tracker-disposition.custom-colour-form section.colour-selections").children;

        for (const div of colourDivs) {
            div.querySelector("color-picker").value = defaults[div.classList[1]]
        }
    }

    async _updateObject(event, formData) {
        game.settings.set(MODULE, "hostileColour", formData["hostile-colour"])
        game.settings.set(MODULE, "neutralColour", formData["neutral-colour"])
        game.settings.set(MODULE, "friendlyColour", formData["friendly-colour"])
        game.settings.set(MODULE, "defeatedColour", formData["defeated-colour"])
    }
}
