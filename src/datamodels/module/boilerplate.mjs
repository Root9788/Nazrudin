// Import document classes.
import { BoilerplateActor } from './documents/actor.mjs';
import { BoilerplateItem } from './documents/item.mjs';
import { NazrudinItem } from './documents/nazrudinSpell.mjs';
// Import sheet classes.
import { BoilerplateActorSheet } from './sheets/actor-sheet.mjs';
import { BoilerplateItemSheet } from './sheets/item-sheet.mjs';
import { NazrudinSpellSheet } from './sheets/nazrudin-spell-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { BOILERPLATE } from './helpers/config.mjs';
// Import DataModel classes
import * as models from './data/_module.mjs';

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.boilerplate = {
    BoilerplateActor,
    NazrudinItem,
    rollItemMacro,
  };

  // Add custom constants for configuration.
  CONFIG.BOILERPLATE = BOILERPLATE;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '1d20 + @abilities.dex.mod',
    decimals: 2,
  };

  // Define custom Document and DataModel classes
  CONFIG.Actor.documentClass = BoilerplateActor;

  // Note that you don't need to declare a DataModel
  // for the base actor/item classes - they are included
  // with the Character/NPC as part of super.defineSchema()
  CONFIG.Actor.dataModels = {
    character: models.BoilerplateCharacter,
    npc: models.BoilerplateNPC
  }
  CONFIG.Item.documentClass = BoilerplateItem;
  CONFIG.Item.dataModels = {
    item: models.BoilerplateItem,
    feature: models.BoilerplateFeature,
    spell: models.BoilerplateSpell,
    weapon: models.BoilerplateWeapon
  }

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('nazrudin', BoilerplateActorSheet, {
    makeDefault: true,
    label: 'BOILERPLATE.SheetLabels.Actor',
  });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('nazrudin', BoilerplateItemSheet, {
    makeDefault: true,
    label: 'BOILERPLATE.SheetLabels.Item',
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("nazrudin", NazrudinSpellSheet, { 
    makeDefault: true, 
    label: 'NAZRUDIN.SheetLabels.Item', 
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

Handlebars.registerHelper('debug', function(value) {
  console.log('Debug:', value);
  return ''; // Return an empty string to avoid rendering unwanted content
});

Handlebars.registerHelper('setVar', function (varName, varValue, options) {
  if (!options.data.root[varName]) {
    options.data.root[varName] = varValue;
  } else {
    options.data.root[varName] = varValue;
  }
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.nazrudin.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'nazrudin.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}

Hooks.on('renderItemSheet', (app, html, data) => {
  console.log("updated");
  // Add click handler for save button
  html.find('.save-button').click(async (event) => {
    event.preventDefault();
    
    
    // Gather form data
    const formData = new FormData(html.find('form')[0]);
    const data = Object.fromEntries(formData);

    // Extract individual values
    const diceNum = data['system.roll.diceNum'];
    const diceSize = data['system.roll.diceSize'];
    const diceBonus = data['system.roll.diceBonus'];

    // Construct the new formula
    const newFormula = `${diceNum}${diceSize}${diceBonus}`;

    // Update the item with the new values
    await app.object.update({
      'name': data['name'],
      'system.quantity': data['system.quantity'],
      'system.weight': data['system.weight'],
      'system.roll.diceNum': diceNum,
      'system.roll.diceSize': diceSize,
      'system.roll.diceBonus': diceBonus,
      'system.formula': newFormula
    });

    // Optionally, close the dialog after saving
    app.close();
  });
});
