import { CustomColorAPI } from "./src/module/api";
import { CustomColorModel } from "./src/module/combat-tracker-disposition";

export {};

declare module "fvtt-types/configuration" {
    interface SettingConfig {
        "combat-tracker-disposition.hostileColour": string;
        "combat-tracker-disposition.neutralColour": string;
        "combat-tracker-disposition.friendlyColour": string;
        "combat-tracker-disposition.enableDefeated": boolean;
        "combat-tracker-disposition.defeatedColour": string;
        "combat-tracker-disposition.opacity": number;
        "combat-tracker-disposition.customColorSettings": typeof CustomColorModel;
    }

    interface FlagConfig {
        Actor: {
            "combat-tracker-disposition": {
                override: { enabled: boolean; color: string };
            };
        };
    }

    interface ModuleConfig {
        "combat-tracker-disposition": {
            api: CustomColorAPI;
        };
    }

    interface RequiredModules {
        "combat-tracker-disposition": {};
    }
}
