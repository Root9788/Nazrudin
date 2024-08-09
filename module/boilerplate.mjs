// Import document classes.
import { BoilerplateActor } from './documents/actor.mjs';
import { BoilerplateItem } from './documents/item.mjs';
// Import sheet classes.
import { BoilerplateActorSheet } from './sheets/actor-sheet.mjs';
import { BoilerplateItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { BOILERPLATE } from './helpers/config.mjs';

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.boilerplate = {
    BoilerplateActor,
    BoilerplateItem,
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

  // Define custom Document classes
  CONFIG.Actor.documentClass = BoilerplateActor;
  CONFIG.Item.documentClass = BoilerplateItem;

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('boilerplate', BoilerplateActorSheet, {
    makeDefault: true,
    label: 'BOILERPLATE.SheetLabels.Actor',
  });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('boilerplate', BoilerplateItemSheet, {
    makeDefault: true,
    label: 'BOILERPLATE.SheetLabels.Item',
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

Handlebars.registerHelper('setById', function (varName, source, idValue, options) { 
  for (let i = 0; i < source.length; i++) {
    if(source[i]._id == idValue)
      options.data.root[varName] = source[i];
  }
});

Handlebars.registerHelper('getById', function (source, idValue) { 
  for (let i = 0; i < source.length; i++) {
    if(source[i]._id == idValue)
      return source[i];
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
  const command = `game.boilerplate.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'boilerplate.itemMacro': true },
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

/* -------------------------------------------- */
/*  Update Hook for Actors                      */
/* -------------------------------------------- */

Hooks.on('updateActor', async (actor, updateData, options, userId) => {
  console.log("Triggered");

  // Check if the XP value is being updated
  if (updateData.system && updateData.system.xp) {
    const oldXP = actor.system.xp.value;
    const oldMaxXP = actor.system.xp.max;
    let newXP = updateData.system.xp.value;
    let maxXP = actor.system.xp.max;
    let currentLevel = actor.system.attributes.level.value;

    console.log(`Old XP: ${oldXP}, New XP: ${newXP}, Max XP: ${maxXP}, Current Level: ${currentLevel}`);

    // Calculate the difference between the new and old XP
    const xpDifference = newXP - oldXP;

    // Check if new XP exceeds the current max XP
    if (newXP >= maxXP) {
      console.log("XP value has exceeded the max XP");

      // Continue increasing the level until the XP is below the max XP of the next level
      let newLevel = currentLevel;
      let accumulatedMaxXP = maxXP;
      while (newXP >= accumulatedMaxXP) {
        newLevel++;
        const nextThreshold = BOILERPLATE.levelThresholds.find(threshold => threshold.level === newLevel);

        if (!nextThreshold) {
          console.log("No more levels to increase.");
          break;  // Stop if we've reached the highest level
        }

        // Add the max XP of the next level to the accumulated max XP
        accumulatedMaxXP += nextThreshold.xp;
        maxXP = nextThreshold.xp;

        console.log(`Level increased to ${newLevel}, new accumulated Max XP is ${accumulatedMaxXP}`);
      }

      // Calculate the remaining XP after leveling up
      const newCurrentXP = newXP - (accumulatedMaxXP - maxXP);

      console.log(`New Level: ${newLevel}`);
      console.log(`New Current XP: ${newCurrentXP}`);
      console.log(`New Max XP for this level: ${maxXP}`);

      // Update the actor's level, max XP, and current XP
      await actor.update({
        'system.xp.max': maxXP,
        'system.xp.value': newCurrentXP,
        'system.attributes.level.value': newLevel
      });

      console.log(`Actor updated: Level ${newLevel}, Max XP ${maxXP}, Current XP ${newCurrentXP}`);
    } else {
      console.log("XP is still below max XP, no changes made.");
    }
  }
});


  /* -------------------------------------------- */
  /*  Update Hook for Render                      */
  /* -------------------------------------------- */

Hooks.on('renderActorSheet', (app, html, data) => {
  // Attach click handler to the Add XP button
  html.find('.add-xp-button').click(() => {
    new Dialog({
      title: "Add XP",
      content: `
        <form>
          <div class="form-group">
            <label for="xp-amount">XP Amount:</label>
            <input type="number" id="xp-amount" name="xp-amount" value="0"/>
          </div>
        </form>
      `,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Add XP",
          callback: (html) => {
            const xpAmount = parseInt(html.find('[name="xp-amount"]').val());
            if (xpAmount > 0) {
              addXPToActor(app.actor, xpAmount);
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "confirm"
    }).render(true);
  });

  // Attach click handler to the Reset Character button
  html.find('.reset-character-button').click(() => {
    new Dialog({
      title: "Reset Character",
      content: `<p>Are you sure you want to reset this character to its original state? This action cannot be undone.</p>`,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: "Reset",
          callback: () => {
            resetCharacter(app.actor);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "confirm"
    }).render(true);
  });
});

// Define the default values (adjust these to match your system's defaults)
const DEFAULTS = {
  xp: {
    value: 0,
    max: 5
  },
  level: 1,
  health: {
    value: 80,
    max: 80
  },
  shield: {
    value: 0,
    max: 0
  },
  evasion: {
    value: 7
  },
  conter: {
    value: 7
  },
  openHpPoints: 0,
  openAttributePoints: 0,
  // Add any other default values as needed
};

// Function to reset character to default values
async function resetCharacter(actor) {
  await actor.update({
    'system.xp.value': DEFAULTS.xp.value,
    'system.xp.max': DEFAULTS.xp.max,
    'system.attributes.level.value': DEFAULTS.level,
    'system.health.value': DEFAULTS.health.value,
    'system.evasion.value': DEFAULTS.evasion.value,
    'system.conter.value': DEFAULTS.conter.value,
    'system.health.max': DEFAULTS.health.max,
    'system.shield.value': DEFAULTS.shield.value,
    'system.shield.max': DEFAULTS.shield.max,
    'system.openHpPoints': DEFAULTS.openHpPoints,
    'system.openAttributePoints': DEFAULTS.openAttributePoints
    // Reset any other fields to their default values here
  });

  ui.notifications.info(`Character ${actor.name} has been reset to its original state.`);
}

async function addXPToActor(actor, xpAmount) {
  const oldXP = actor.system.xp.value;
  const oldMaxXP = actor.system.xp.max;
  let newXP = oldXP + xpAmount;
  let maxXP = oldMaxXP;
  let currentLevel = actor.system.attributes.level.value;

  console.log(`Old XP: ${oldXP}, New XP: ${newXP}, Max XP: ${maxXP}, Current Level: ${currentLevel}`);

  // Check if new XP exceeds the current max XP
  if (newXP >= maxXP) {
    console.log("XP value has exceeded the max XP");

    // Continue increasing the level until the XP is below the max XP of the next level
    let newLevel = currentLevel;
    let accumulatedMaxXP = maxXP;
    let levelPoints = 0;

    while (newXP >= accumulatedMaxXP) {
      newLevel++;
      const nextThreshold = BOILERPLATE.levelThresholds.find(threshold => threshold.level === newLevel);

      if (!nextThreshold) {
        console.log("No more levels to increase.");
        break;  // Stop if we've reached the highest level
      }

      // Add the max XP of the next level to the accumulated max XP
      accumulatedMaxXP += nextThreshold.xp;
      maxXP = nextThreshold.xp;

      console.log(`Level increased to ${newLevel}, new accumulated Max XP is ${accumulatedMaxXP}`);

      levelPoints++;  // Award a point for each level gained
    }

    // Calculate the remaining XP after leveling up
    const newCurrentXP = newXP - (accumulatedMaxXP - maxXP);

    console.log(`New Level: ${newLevel}`);
    console.log(`New Current XP: ${newCurrentXP}`);
    console.log(`New Max XP for this level: ${maxXP}`);

    // Update the actor's level, max XP, current XP, and award points
    await actor.update({
      'system.xp.max': maxXP,
      'system.xp.value': newCurrentXP,
      'system.attributes.level.value': newLevel,
      'system.openHpPoints': (actor.system.openHpPoints || 0) + levelPoints,  // Add HP points for each level gained
      'system.openAttributePoints': (actor.system.openAttributePoints || 0) + levelPoints // Add Attribute points for each level gained
    });

    console.log(`Actor updated: Level ${newLevel}, Max XP ${maxXP}, Current XP ${newCurrentXP}`);
    ui.notifications.info(`Added ${xpAmount} XP to ${actor.name}. New Level: ${newLevel}, Max XP: ${maxXP}, Current XP: ${newCurrentXP}`);
  } else {
    // Simply update the actor's XP if no level-up occurred
    await actor.update({
      'system.xp.value': newXP
    });
    console.log(`XP updated to ${newXP}, no level-up occurred.`);
    ui.notifications.info(`Added ${xpAmount} XP to ${actor.name}. Current XP: ${newXP}`);
  }
}

//<--------------------------ALOCATE OPEN POINTS TODO: Merge if works------------------------------------>

  Hooks.on('renderActorSheet', (app, html, data) => {
    // Click handler for Add Attribute Point button
    html.find('.add-attribute-point-button').click(() => {
      if (app.actor.system.openAttributePoints > 0) {
        new Dialog({
          title: "Spend Attribute Point",
          content: `
            <form>
              <div class="form-group">
                <label for="attribute">Select Attribute to Increase:</label>
                <select id="attribute" name="attribute">
                  <option value="ges">Geschicklichkeit</option>
                  <option value="agi">Agilität</option>
                  <option value="gen">Genauigkeit</option>
                  <option value="kon">Konzentration</option>
                  <option value="kkf">Körperkraft</option>
                  <option value="tal">Talent</option>
                </select>
              </div>
            </form>
          `,
          buttons: {
            confirm: {
              icon: '<i class="fas fa-check"></i>',
              label: "Confirm",
              callback: async (html) => {
                const attribute = html.find('[name="attribute"]').val();
                await app.actor.update({
                  [`system.abilities.${attribute}.value`]: app.actor.system.abilities[attribute].value + 1,
                  'system.openAttributePoints': app.actor.system.openAttributePoints - 1
                });
                ui.notifications.info(`${attribute} increased by 1.`);
              }
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: "Cancel"
            }
          },
          default: "confirm"
        }).render(true);
      }
    });

    // Click handler for Add HP Point button
    html.find('.add-hp-point-button').click(() => {
      if (app.actor.system.openHpPoints > 0) {
        new Dialog({
          title: "Spend HP Point",
          content: `
            <form>
              <div class="form-group">
                <label for="hp-choice">Choose what to increase:</label>
                <select id="hp-choice" name="hp-choice">
                  <option value="health">HP</option>
                  <option value="evasion">Ausweichen</option>
                  <option value="conter">Konter</option>
                </select>
              </div>
            </form>
          `,
          buttons: {
            confirm: {
              icon: '<i class="fas fa-check"></i>',
              label: "Confirm",
              callback: async (html) => {
                const choice = html.find('[name="hp-choice"]').val();
                let updateData = {};
                let notificationMessage = '';

                switch (choice) {
                  case 'health':
                    updateData = {
                      'system.health.max': app.actor.system.health.max + 20,
                      'system.openHpPoints': app.actor.system.openHpPoints - 1
                    };
                    notificationMessage = 'HP increased by 20.';
                    break;
                  case 'evasion':
                    updateData = {
                      'system.evasion.value': app.actor.system.evasion.value + 1,
                      'system.openHpPoints': app.actor.system.openHpPoints - 1
                    };
                    notificationMessage = 'Evasion increased by 1.';
                    break;
                  case 'conter':
                    updateData = {
                      'system.conter.value': app.actor.system.conter.value + 1,
                      'system.openHpPoints': app.actor.system.openHpPoints - 1
                    };
                    notificationMessage = 'conter increased by 1.';
                    break;
                }

                await app.actor.update(updateData);
                ui.notifications.info(notificationMessage);
              }
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: "Cancel"
            }
          },
          default: "confirm"
        }).render(true);
      }
  }); 
});


Hooks.on('renderItemSheet', (app, html, data) => {
  console.log(data);
  
  // Add click handler for save button
  html.find('.save-button').click(async (event) => {
    event.preventDefault();
    
    // Gather form data
    const formData = new FormData(html.find('form')[0]);
    const formDataObj = Object.fromEntries(formData);
    
    // Extract individual values
    const diceNum = formDataObj['system.roll.diceNum'];
    const diceSize = formDataObj['system.roll.diceSize'];
    const diceBonus = formDataObj['system.roll.diceBonus'];
    const diceBonusStat = formDataObj['system.hitChance']; //<--- this is the stat shortcut

    let abilityMod = 0;

    // Check if diceBonusStat is defined and valid
    if (diceBonusStat) {
      const actor = app.actor; // The actor associated with the item
      if (actor && actor.system.abilities[diceBonusStat]) {
        abilityMod = actor.system.abilities[diceBonusStat].mod;
      }
    }

    // Construct the new formula
    const newFormula = `${diceNum}d${diceSize}+${diceBonus}+${abilityMod}`;

    console.log("New Formula:");
    console.log(newFormula);
    
    // Update the item with the new values
    await app.object.update({
      'name': formDataObj['name'],
      'system.quantity': formDataObj['system.quantity'],
      'system.weight': formDataObj['system.weight'],
      'system.roll.diceNum': diceNum,
      'system.roll.diceSize': diceSize,
      'system.roll.diceBonus': diceBonus,
      'system.formula': newFormula
    });

    // Optionally, close the dialog after saving
    app.close();
  });
});
/*Hooks.on('renderItemSheet', (app, html, data) => {
  console.log(data);
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
    const diceBonusStat = data['system.hitChance']; //<--- in here is the stat shortcut

    // Construct the new formula
    const newFormula = `${diceNum}d${diceSize}+${diceBonus}+@${diceBonusStat}`;

    console.log("new Formulat");
    console.log(newFormula);
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
});*/

