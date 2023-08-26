"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const colors_1 = __importDefault(require("colors"));
const bot_1 = require("../bot");
(async function () {
    await Promise.all([(0, bot_1.registerCommands)(), (0, bot_1.loadCommands)(), (0, bot_1.loadEvents)(), (0, bot_1.login)()]).catch((err) => {
        console.error(colors_1.default.red("Error: "), err);
    });
})();
