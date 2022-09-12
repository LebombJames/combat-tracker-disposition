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

  dispositionColors = {
    //On launch, set as the setting's value.
    FRIENDLY: game.settings.get(MODULE, "friendlyColour"),
    NEUTRAL: game.settings.get(MODULE, "neutralColour"),
    HOSTILE: game.settings.get(MODULE, "hostileColour"),
    OPACITY: game.settings.get(MODULE, "opacity").toString(16)
  };
});

function getColor(combatant, disposition) {
  const opacity = dispositionColors.OPACITY;
  if (combatant.getFlag(MODULE, "override")?.enabled) {
    return combatant.getFlag(MODULE, "override")?.color + opacity;
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

function updateColors() {
  //Set the colours when the combat tracker is rendered
  if (game.combat) {
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
}

Hooks.on("renderCombatTracker", () => {
  updateColors();
});

Hooks.on("renderCombatantConfig", (app, html) => {
  const div = document.createElement("div");
  div.classList.add("form-group");

  const label = document.createElement("label");
  label.innerHTML = "Color Override";
  label.for = "color-enabled";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = "color-enabled";
  checkbox.checked = app.object.getFlag(MODULE, "override")?.enabled;
  checkbox.classList.add("form-fields");

  const color = document.createElement("input");
  color.type = "color";
  color.id = "combatant-color";
  color.value = app.object.getFlag(MODULE, "override")?.color;
  color.classList.add("form-fields");

  div.appendChild(label);
  div.appendChild(checkbox);
  div.appendChild(color);

  let sumbitButton = html[0].querySelector("button[type=submit]");
  sumbitButton.insertAdjacentElement("beforebegin", div);

  app.setPosition({ height: "auto" });
});

Hooks.on("closeCombatantConfig", async (app, html) => {
  let checkbox = html[0].querySelector("input[id=color-enabled]").checked;
  let color = html[0].querySelector("input[id=combatant-color]").value;

  await app.object.setFlag(MODULE, "override", {
    enabled: checkbox,
    color: color
  });
});

class CustomColourMenu extends FormApplication {
  constructor(...args) {
    super(...args);
  }

  getData() {
    return super.getData;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["form"],
      popOut: true,
      template: `modules/combat-tracker-disposition/templates/custom-colours.html`,
      id: "custom-colours",
      title: "Custom Colours",
      width: 300
    });
  }

  activateListeners(html) {
    super.activateListeners(html);
    document.getElementById("hostile-colour").value = game.settings.get(
      MODULE,
      "hostileColour"
    );
    document.getElementById("neutral-colour").value = game.settings.get(
      MODULE,
      "neutralColour"
    );
    document.getElementById("friendly-colour").value = game.settings.get(
      MODULE,
      "friendlyColour"
    );
  }

  async _updateObject(event, formData) {
    await game.settings.set(
      MODULE,
      "hostileColour",
      formData["hostile-colour"]
    );
    await game.settings.set(
      MODULE,
      "neutralColour",
      formData["neutral-colour"]
    );
    await game.settings.set(
      MODULE,
      "friendlyColour",
      formData["friendly-colour"]
    );
  }
}
