const dispositionColors = {
    FRIENDLY: "#" + CONFIG.Canvas.dispositionColors.FRIENDLY.toString(16) + "28",
    NEUTRAL: "#" + CONFIG.Canvas.dispositionColors.NEUTRAL.toString(16) + "28",
    HOSTILE: "#" + CONFIG.Canvas.dispositionColors.HOSTILE.toString(16) + "28"
};

const r = document.querySelector(':root');
r.style.setProperty('--friendly', dispositionColors.FRIENDLY);
r.style.setProperty('--neutral', dispositionColors.NEUTRAL);
r.style.setProperty('--hostile', dispositionColors.HOSTILE);

function updateColors() {
    if (game.combat) {
        for (const combatant of game.combat.combatants) {
            const combatantRow = $('#combat-tracker, #combat-popout').find(`[data-combatant-id=${combatant.id}]`);
            combatantRow.toggleClass("hostile",  combatant.token.data.disposition === -1);
            combatantRow.toggleClass("neutral",  combatant.token.data.disposition === 0);
            combatantRow.toggleClass("friendly", combatant.token.data.disposition === 1);
        };
    };
};

function updateColorsToken(token) {
    if (game.combat) {
        const combatantRow = $('#combat-tracker, #combat-popout').find(`[data-combatant-id=${token.combatant.id}]`);
        combatantRow.toggleClass("hostile",  token.data.disposition === -1);
        combatantRow.toggleClass("neutral",  token.data.disposition === 0);
        combatantRow.toggleClass("friendly", token.data.disposition === 1);
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