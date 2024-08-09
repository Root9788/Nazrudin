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
                <option value="strength">Strength</option>
                <option value="dexterity">Dexterity</option>
                <option value="intelligence">Intelligence</option>
                <!-- Add more attributes as needed -->
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
                [`system.attributes.${attribute}.value`]: app.actor.system.attributes[attribute].value + 1,
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
          <p>Would you like to increase your HP by 1?</p>
        `,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: "Confirm",
            callback: async () => {
              await app.actor.update({
                'system.health.max': app.actor.system.health.max + 1,
                'system.openHpPoints': app.actor.system.openHpPoints - 1
              });
              ui.notifications.info(`HP increased by 1.`);
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
/*Hooks.on('renderActorSheet', (app, html, data) => {
  // Attach click handler to the Add XP button
  html.find('.add-xp-button').click(() => {
    // Open a dialog to input the XP amount
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
});

async function addXPToActor(actor, xpAmount) {
  const currentXP = actor.system.xp.value;
  let maxXP = actor.system.xp.max;
  const currentLevel = actor.system.attributes.level.value;

  // Calculate new XP value
  let newXP = currentXP + xpAmount;

  // Determine new level and max XP based on level thresholds
  let newLevel = currentLevel;
  let accumulatedMaxXP = maxXP;
  while (newXP >= accumulatedMaxXP) {
    newLevel++;
    const nextThreshold = BOILERPLATE.levelThresholds.find(threshold => threshold.level === newLevel);

    if (!nextThreshold) {
      console.log("No more levels to increase.");
      break;
    }

    accumulatedMaxXP += nextThreshold.xp;
    maxXP = nextThreshold.xp;
  }

  // Calculate the remaining XP after leveling up
  let newCurrentXP = newXP - (accumulatedMaxXP - maxXP);

  // Update the actor's level, max XP, and current XP
  await actor.update({
    'system.xp.max': maxXP,
    'system.xp.value': newCurrentXP,
    'system.attributes.level.value': newLevel
  });

  ui.notifications.info(`Added ${xpAmount} XP to ${actor.name}. New Level: ${newLevel}, Max XP: ${maxXP}, Current XP: ${newCurrentXP}`);
}*/
