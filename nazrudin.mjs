import NazrudinItemSheet from "./module/sheets/NazrudinItemSheet.mjs";

Hooks.once("init", function () {
    console.log("nazrudin | Init Nazrudin System");

    // Unregister the core item sheet
    Items.unregisterSheet("core", ItemSheet);

    // Register the custom item sheet for the Nazrudin system
    Items.registerSheet("Nazrudin", NazrudinItemSheet, { makeDefault: true });
});