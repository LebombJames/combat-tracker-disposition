import { PrettifyType } from "fvtt-types/utils";

export type CustomHandler = (combatant: Combatant, disposition: CONST.TOKEN_DISPOSITIONS) => Promise<Color | null>;
type ConsumerHandlerOptions = {
    id: string;
    description?: string;
    handler: CustomHandler;
};

type RegisteredHandlerOptions = PrettifyType<Omit<ConsumerHandlerOptions, "id"> & { priority: number, description: string }>;

export class CustomColorAPI {
    #handlers: Record<string, RegisteredHandlerOptions> = {};

    get handlers() {
        return this.#handlers;
    }

    registerHandler({ id, handler, description = "" }: ConsumerHandlerOptions) {
        if (!id || !handler) throw "Missing handler id or function!";

        this.#handlers[id] = {
            description,
            handler,
            priority: Object.keys(this.#handlers).length + 1
        };
    }

    deregisterHandler(id: string) {
        if (this.#handlers[id]) {
            delete this.#handlers[id];
            return true;
        }
        return false;
    }

    get toSortedArray() {
        return Object.values(this.#handlers).sort((a, b) => b.priority - a.priority);
    }

    async getTopColor(combatant: Combatant, disposition: CONST.TOKEN_DISPOSITIONS) {
        for (const handler of this.toSortedArray) {
            if (handler.priority < 0) continue;

            const handlerResult = await handler.handler(combatant, disposition);
            if (handlerResult?.valid) return handlerResult;
        }
        return null;
    }
}
