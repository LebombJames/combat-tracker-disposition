import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import ApplicationV2 = foundry.applications.api.ApplicationV2;
import { DeepPartial } from "fvtt-types/utils";
import { dispositionColors, CustomColorModel, MODULE } from "./combat-tracker-disposition";
import HTMLColorPickerElement = foundry.applications.elements.HTMLColorPickerElement;
import HTMLRangePickerElement = foundry.applications.elements.HTMLRangePickerElement;

declare namespace CustomColourMenu {
    interface RenderContext extends ApplicationV2.RenderContext {
        hostile: string;
        neutral: string;
        friendly: string;
        defeated: string;
        opacity: number;
        fields: any;
        buttons: ApplicationV2.FormFooterButton[];
    }
}

export class CustomColourMenu<
    RenderContext extends CustomColourMenu.RenderContext = CustomColourMenu.RenderContext
> extends HandlebarsApplicationMixin(ApplicationV2)<RenderContext> {
    constructor(...args: ConstructorParameters<typeof ApplicationV2>) {
        super(...args);
    }

    static override DEFAULT_OPTIONS: DeepPartial<ApplicationV2.Configuration> & object = {
        classes: ["combat-tracker-disposition custom-colors"],
        id: "custom-colours",
        tag: "form",
        window: {
            title: "Combat Tracker Disposition Settings",
            contentClasses: ["standard-form"],
            icon: "fas fa-paint-roller"
        },
        position: {
            width: 400,
            height: "auto"
        },
        actions: {
            reset: CustomColourMenu.#onClickReset
        },
        form: {
            closeOnSubmit: true,
            handler: CustomColourMenu.#onSubmit
        }
    };

    static PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
        main: {
            template: `modules/combat-tracker-disposition/templates/custom-colours.hbs`
        },
        footer: {
            template: "templates/generic/form-footer.hbs"
        }
    };

    override async _prepareContext(options: ApplicationV2.RenderOptions) {
        const data = await super._prepareContext(options);

        data.hostile = dispositionColors.hostile.css;
        data.neutral = dispositionColors.neutral.css;
        data.friendly = dispositionColors.friendly.css;
        data.defeated = dispositionColors.defeatedColor.css;
        data.opacity = dispositionColors.opacity;

        data.fields = CustomColorModel.schema.fields;

        data.buttons = [
            { type: "submit", icon: "fa fa-check", label: "OK" },
            { type: "button", action: "reset", icon: "fa fa-undo", label: "Reset to Default" }
        ];
        return data;
    }

    static #onClickReset(this: CustomColourMenu, event: Event, target: HTMLElement) {
        event.preventDefault();

        const model = new CustomColorModel();

        const defaults: Record<string, string> = {
            friendly: model.friendly.css,
            neutral: model.neutral.css,
            hostile: model.hostile.css,
            defeated: model.defeatedColor.css
        };

        const colourDivs = this.element.querySelector("section.colour-selections")?.children;

        for (const div of colourDivs ?? []) {
            const picker = div.querySelector<HTMLColorPickerElement>("color-picker");
            if (picker) picker.value = defaults[div.classList[1]];
        }

        const opacity = this.element.querySelector<HTMLRangePickerElement>("range-picker");
        if (opacity) opacity.value = model.opacity;
    }

    static async #onSubmit(this: CustomColourMenu, event: Event, form: HTMLFormElement, formData: FormDataExtended) {
        const data = formData.object;

        // @ts-expect-error This works in Foundry
        game.settings.set(MODULE, "customColorSettings", data);
    }
}
