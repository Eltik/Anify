/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
"use client";

import { useEffect, useState, useRef } from "react";

export function SettingsPanel(props: any) {
    const menuCon = useRef(null);
    const [DMenu, setDMenu] = useState<any>();

    function createElement(config:any) {
        let temp;
        if ("element" in config) {
            temp = document.createElement(config.element);
        } else {
            temp = document.createElement("div");
        }
        const attributes = config.attributes;
        for (const value in attributes) {
            temp.setAttribute(value, attributes[value]);
        }
        for (const value in config.style) {
            temp.style[value] = config.style[value];
        }
        if ("id" in config) {
            temp.id = config.id;
        }
        if ("class" in config) {
            temp.className = config.class;
        }
        if ("innerText" in config) {
            temp.textContent = config.innerText;
        }
        if ("innerHTML" in config) {
            temp.innerHTML = config.innerHTML;
        }
        const listeners = config.listeners;
        for (const value in listeners) {
            temp.addEventListener(value, () => {
                // @ts-ignore
                listeners[value].bind(this)();
            });
        }
        return temp;
    }
    /**
     * A toggle class
     */
    class Toggle {
        element: any;
        constructor(element:any) {
            this.element = element;
        }
        /**
         * Turns the toggle on if it isn't already on
         */
        turnOn() {
            if (!this.isOn()) {
                this.element.click();
            }
        }
        /**
         * Turns the toggle off if it isn't already off
         */
        turnOff() {
            if (this.isOn()) {
                this.element.click();
            }
        }
        /**
         * Checks if the toggle is on
         * @returns true if the toggle is on. false otherwise
         */
        isOn() {
            return this.element.classList.contains("active");
        }
        /**
         * Toggles the toggle
         */
        toggle() {
            if (this.isOn()) {
                this.turnOff();
            } else {
                this.turnOn();
            }
        }
    }
    class Selectables {
        element: any;
        DDMinstance: any;
        sceneID: any;
        sceneElem: any;
        constructor(element:any, DDMinstance:any, sceneID:any, sceneElem:any) {
            this.element = element;
            this.DDMinstance = DDMinstance;
            this.sceneID = sceneID;
            this.sceneElem = sceneElem;
        }
        select() {
            Selectables.selectWithoutCallback(
                this.element,
                this.DDMinstance,
                this.sceneID,
                this.sceneElem
            );
        }
        selectWithCallback() {
            this.element.click();
        }
        static selectWithoutCallback(element:any, DDMinstance:any, sceneID:any, sceneElem:any) {
            const parentElement = element.parentElement
                ? element.parentElement
                : sceneElem;
            const siblings = parentElement.children;
            for (let i = 0; i < siblings.length; i++) {
                const child = siblings[i];
                if (child.getAttribute("highlightable") === "true") {
                    child.classList.remove("selected");
                }
            }
            element.classList.add("selected");
            if (sceneID) {
                const selectedValue = element.getAttribute("data-alttext");
                DDMinstance.selectedValues[sceneID] = selectedValue
                    ? selectedValue
                    : element.innerText;
                DDMinstance.updateSelectVals(sceneID);
            }
        }
    }
    class Scene {
        DDMinstance: any;
        data: any;
        element: any;
        /**
         *
         * @param {menuSceneConfig} config the config that builds the scene
         * @param {dropDownMenu} dropDownMenuInstance The drop down menu that the scene is a part of
         *
         */
        constructor(config:any, dropDownMenuInstance:any) {
            this.data = config;
            this.DDMinstance = dropDownMenuInstance;
        }
        addItem(config:any, isHeading = false) {
            let _a, _b;
            if (!this.DDMinstance) return;
            if (!this.data) return;
            const sceneElem = this.element.querySelector(".scene");
            if (sceneElem) {
                const item = this.DDMinstance.makeItem(
                    config,
                    isHeading,
                    this.data.id,
                    sceneElem
                );
                if (
                    config.selected &&
                    config.triggerCallbackIfSelected === true
                ) {
                    item.click();
                }
                sceneElem.append(item);
            }
            if (this.element.classList.contains("active")) {
                this.DDMinstance.menuCon.style.height =
                    ((_b =
                        (_a = this.element.querySelector(".scene")) === null ||
                        _a === void 0
                            ? void 0
                            : _a.offsetHeight) !== null && _b !== void 0
                        ? _b
                        : 100) + "px";
                        this.DDMinstance.menuCon.style.setProperty('--height', ((_b =
                          (_a = this.element.querySelector(".scene")) === null ||
                          _a === void 0
                              ? void 0
                              : _a.offsetHeight) !== null && _b !== void 0
                          ? _b
                          : 100) + "px")
            }
        }
        delete() {
            this.deleteItems();
            delete this.DDMinstance.scenes[this.data.id];
            this.data = undefined;
            this.DDMinstance = undefined;
            this.element.remove();
        }
        deleteItems() {
            if (!this.DDMinstance) return;
            if (!this.data) return;
            const sceneDOM = this.element.querySelector(".scene");
            if (sceneDOM) {
                sceneDOM.innerHTML = "";
            }
            if (this.data.id in this.DDMinstance.selectedValues) {
                this.DDMinstance.selectedValues[this.data.id] = "";
            }
            this.DDMinstance.updateSelectVals(this.data.id);
            this.DDMinstance.deleteSceneFromHistory(this.data.id);
            for (const item of this.data.items) {
                this.DDMinstance.deleteItem(item);
            }
            this.data.items = [];
        }
    }
    class dropDownMenu {
        scenes: any;
        toggles: any;
        history: any;
        selectedValuesDOM: any;
        selections: any;
        menuCon: any;
        selectedValues: any;
        constructor(scenes:Menu[], menuCon:any) {
            this.scenes = {};
            this.menuCon = menuCon;
            this.history = [];
            this.toggles = {};
            this.selections = {};
            this.selectedValues = {};
            this.selectedValuesDOM = {};
            for (const scene of scenes) {
                this.scenes[scene.id] = new Scene(scene, this);
            }
            for (const scene of scenes) {
                if (!this.scenes[scene.id].element) {
                    this.makeScene(scene);
                }
            }
            menuCon.onscroll = function () {
                menuCon.scrollLeft = 0;
            };
        }
        /**
         * Opens a scene
         * @param {string} id the sceneID
         */
        open(id:any) {
            if (id && id in this.scenes) {
                if (
                    !this.history.length ||
                    (this.history.length &&
                        this.history[this.history.length - 1] != id)
                ) {
                    this.history.push(id);
                }
                for (const sceneID in this.scenes) {
                    if (sceneID === id) {
                        this.scenes[sceneID].element.classList.add("active");
                        this.menuCon.style.height =
                            this.scenes[sceneID].element.querySelector(".scene")
                                .offsetHeight + "px";
                        this.menuCon.style.setProperty('--height', this.scenes[sceneID].element.querySelector(".scene")
                        .offsetHeight + "px")
                    } else {
                        this.scenes[sceneID].element.classList.remove("active");
                    }
                }
            }
        }
        /**
         * Goes back to the the last-opened scene
         * Closes the menu if it can't go back
         */
        back() {
            if (this.history.length > 1) {
                const lastHistory = this.history.pop();
                this.open(this.history.pop());
            } else {
                this.closeMenu();
            }
        }
        /**
         * Opens the menu
         */
        openMenu() {
          this.menuCon.style.display = "flex"
        }
        /**
         * Closes the menu
         */
        closeMenu() {
            //this.menuCon.style.display = "none"
        }
        /**
         *
         * @param {menuItemConfig} itemConfig the config object used to build the menuItem
         * @param {boolean} isHeading if the item is a heading or now
         * @param {string} sceneID the sceneID of the scene of which this menuItem is a part of
         * @returns {HTMLElement}
         */
        makeItem(itemConfig:any, isHeading:any, sceneID:any, sceneElem:any) {
            const item = itemConfig;
            let shouldShowValue = false;
            if (item.open) {
                item.selectedValue = this.selectedValues[item.open];
                if (this.scenes[item.open] instanceof Scene) {
                    shouldShowValue =
                        this.scenes[item.open].data.selectableScene === true;
                }
            }
            const tempConfig:any = {
                class: "menuItemText",
            };
            if (item.html) {
                tempConfig.innerHTML = isHeading
                    ? `<div style="display: flex; align-items: center; gap: 8px;"><svg width="10px" height="10px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="#8a8a8a"><path fill="#8a8a8a" d="M41.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.3 256 278.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"/></svg>${item.html}</div>`
                    : item.html;
            } else {
                tempConfig.innerHTML = isHeading
                    ? `<div style="display: flex; align-items: center; gap: 8px;"><svg width="10px" height="10px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" fill="#8a8a8a"><path fill="#8a8a8a" d="M41.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.3 256 278.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"/></svg>${item.text}</div>`
                    : item.text;
            }
            if (item.altText) {
                tempConfig.attributes = {
                    "data-alttext": item.altText,
                };
            }
            const menuConfig:any = {
                class: isHeading ? "menuHeading" : "menuItem",
            };
            if (item.attributes) {
                menuConfig.attributes = item.attributes;
            }
            const menuItem = createElement(menuConfig);
            const menuItemText = createElement(tempConfig);
            if (item.altText) {
                menuItem.setAttribute("data-alttext", item.altText);
            }
            if (!isHeading && "iconID" in item) {
                const menuItemIcon = createElement({
                    class: "menuItemIcon",
                    id: item.iconID,
                });
                menuItem.append(menuItemIcon);
            }
            if (item.open && !isHeading) {
                menuItem.addEventListener("click", () => {
                    this.open(item.open);
                });
            }
            if (isHeading && item.hideArrow !== true) {
                const menuItemIcon = createElement({
                    class: "menuItemIcon menuItemIconBack",
                });
                menuItem.addEventListener("click", () => {
                    this.back();
                });
                menuItem.append(menuItemIcon);
            }
            if (item.callback) {
                menuItem.addEventListener("click", () => {
                    let _a;
                    (_a = item.callback) === null || _a === void 0
                        ? void 0
                        : _a.bind(menuItem)();
                });
            }
            // Should be before selectWithoutCallback is called to make sure
            // .innerText is not an empty string
            menuItem.append(menuItemText);
            if (item.selected) {
                if (sceneID) {
                    Selectables.selectWithoutCallback(
                        menuItem,
                        this,
                        sceneID,
                        sceneElem
                    );
                    this.updateSelectVals(sceneID);
                }
            }
            if (item.highlightable) {
                if (item.id) {
                    this.selections[item.id] = new Selectables(
                        menuItem,
                        this,
                        sceneID,
                        sceneElem
                    );
                }
                menuItem.setAttribute("highlightable", "true");
                menuItem.addEventListener("click", () => {
                    Selectables.selectWithoutCallback(
                        menuItem,
                        this,
                        sceneID,
                        sceneElem
                    );
                });
            }
            if (item.textBox) {
                const elementConfig = {
                    element: "input",
                    class: "textBox",
                    attributes: {
                        type: "text",
                    },
                };
                if (item.customId) {
                    (elementConfig.attributes as any).customId = item.customId;
                }
                const textBox = createElement(elementConfig);
                if (item.value) {
                    textBox.value = item.value;
                }
                textBox.addEventListener("input", function (event:any) {
                    if (item.onInput) {
                        item.onInput(event);
                    }
                });
                menuItem.append(textBox);
            }
            if (shouldShowValue) {
                const valueDOM = createElement({
                    innerText: item.selectedValue,
                    class: "menuItemValue",
                });
                menuItem.append(valueDOM);
                item.valueDOM = valueDOM;
                if (item.open) {
                    if (!this.selectedValuesDOM[item.open]) {
                        this.selectedValuesDOM[item.open] = {};
                    }
                    const sValue = this.selectedValuesDOM[item.open];
                    if (sValue.elements) {
                        sValue.elements.push(valueDOM);
                    } else {
                        sValue.elements = [valueDOM];
                    }
                }
            }
            if (item.open && item.hideSubArrow !== true) {
                menuItem.append(
                    createElement({
                        class: "menuItemIcon menuItemIconSub",
                        style: {
                            marginLeft: item.selectedValue ? "3px" : "auto",
                        },
                    })
                );
            }
            if (item.toggle) {
                menuItem.classList.add("menuItemToggle");
                const elementConfig = {
                    class: `toggle ${item.on ? " active" : ""}`,
                    listeners: {
                        click: function () {
                            const toggleButton = menuItem.querySelector(".toggle");
                            toggleButton?.classList.toggle("active");
                            if (toggleButton?.classList.contains("active")) {
                                item.toggleOn ? item.toggleOn() : "";
                            } else {
                                item.toggleOff ? item.toggleOff() : "";
                            }
                        },
                    },
                    attributes: {

                    }
                };
                if (item.customId) {
                    (elementConfig.attributes as any).customId = item.customId;
                }
                const toggle = createElement(elementConfig);
                if (item.id) {
                    this.toggles[item.id] = new Toggle(toggle);
                }
                menuItem.append(toggle);
            }
            return menuItem;
        }
        /**
         * Updates all menuItems that point to the scene with a particular sceneID
         * @param {string} sceneID the sceneID of the scene whose selected values will be updated
         */
        updateSelectVals(sceneID:any) {
            if (this.selectedValuesDOM[sceneID]) {
                for (const elems of this.selectedValuesDOM[sceneID].elements) {
                    elems.innerText = this.selectedValues[sceneID];
                }
            }
        }
        makeScene(config:any) {
            const scene = createElement({
                class: "scene",
            });
            const sceneCon = createElement({
                class: "sceneCon",
            });
            const openScene = this.scenes[config.id];
            if (
                openScene === null || openScene === void 0
                    ? void 0
                    : openScene.element
            ) {
                return;
            }
            if (config.heading) {
                scene.append(
                    this.makeItem(config.heading, true, config.id, scene)
                );
            }
            for (const item of config.items) {
                const newItemConfig = item;
                if (item.open) {
                    const openScene = this.scenes[item.open];
                    if (!openScene.element && openScene.data.selectableScene) {
                        this.makeScene(this.scenes[item.open].data);
                    }
                }
                scene.append(
                    this.makeItem(newItemConfig, false, config.id, scene)
                );
            }
            sceneCon.append(scene);
            this.scenes[config.id].element = sceneCon;
            this.menuCon.append(sceneCon);
            return sceneCon;
        }
        addScene(config:any) {
            this.scenes[config.id] = new Scene(config, this);
            const sceneDIV = this.makeScene(config);
            if (sceneDIV) {
                this.menuCon.append(sceneDIV);
                config.element = sceneDIV;
            }
        }
        deleteScene(id:any) {
            if (id in this.scenes) {
                this.scenes[id].delete();
                delete this.scenes[id];
            }
        }
        deleteItem(item:any) {
            if (item.id && item.id in this.selections) {
                delete this.selections[item.id];
            }
            if (item.id && item.id in this.toggles) {
                delete this.toggles[item.id];
            }
            if (item.open) {
                const elem = this.selectedValuesDOM[item.open];
                if (elem) {
                    const elements = elem.elements;
                    const idx = elements.indexOf(item.valueDOM);
                    if (idx > -1) {
                        elements.splice(idx, 1);
                    }
                }
            }
        }
        deleteSceneFromHistory(val:any) {
            for (let i = this.history.length - 1; i >= 0; i--) {
                if (this.history[i] == val) {
                    this.history.splice(i, 1);
                }
            }
        }
        /**
         *
         * @param {string} id the id of the toggle
         * @returns {Toggle | null}
         */
        getToggle(id:any) {
            if (id in this.toggles) {
                return this.toggles[id];
            }
            return null;
        }
        /**
         *
         * @param {string} id the id of the scene
         * @returns {Scene | null}
         */
        getScene(id:any) {
            if (id in this.scenes) {
                return this.scenes[id];
            }
            return null;
        }
    }

    useEffect(() => {
        const tempData = new dropDownMenu(
            props.menuCon,
            menuCon.current
        );

        setDMenu(tempData);
    }, []);

    useEffect(() => {
        if (DMenu != null) {
            DMenu.open("initial");
            DMenu.closeMenu();
        }
    }, [DMenu]);

    useEffect(() => {
        if (DMenu != null) {
            if (props.isOpen) {
                DMenu.openMenu();
            } else {
                DMenu.closeMenu();
            }
        }
    }, [props.isOpen]);

    return (
        <div className={`transition-all duration-300 ${props.isOpen ? "opacity-100 pointer-events-auto -translate-y-0" : "opacity-0 pointer-events-none translate-y-5"}`}>
            <div className="menuCon" ref={menuCon}></div>
        </div>
    );
}
export interface Menu {
    id: string;
    items?: MenuItem[];
    selectableScene?: boolean;
    heading?: {
        html?: string;
        open?: string;
        text?: string;
        hideSubArrow?: boolean;
        back?: boolean;
    }
}

export interface MenuItem {
    html?: string;
    callback?: () => void;
    text?: string;
    highlightable?: boolean;
    selected?: boolean;
    toggle?: boolean;
    toggleOn?: () => any;
    toggleOff?: () => any;
    textBox?: boolean;
    value?: string;
    onInput?: (value: any) => any;
    altText?: string;
    iconID?: string;
    open?: string
}