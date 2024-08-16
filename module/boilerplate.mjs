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
    formula: '1d20 + @abilities.ges.mod',
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

Handlebars.registerHelper('buildFormularForActor', function (varName, weapon, actor, options) { 
  // Ensure that the necessary properties exist
  if (!weapon || !actor) {
    return '';
  }
  console.log("weapon check")
  console.log(weapon)
  const abilityMod = weapon.system.hitChance;

  options.data.root[varName] = `1d20+@abilities.${abilityMod}.mod`;
  

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

  //Update ActionPoints
  if (updateData.system?.health || updateData.system?.ActionPoints) {
    actor.getActiveTokens().forEach(token => {
        renderTokenGraphics(token);
    });
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
  actionPoints: 3
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
  console.log("Debug: Actor reset");
  console.log(actor);

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
  html.find('.rollable').click(async event => {
    const label = $(event.currentTarget);
    const itemId = label.data("id");
    const item = getItemById(itemId).name;


    if (!item) {
        console.log("Weapon not found");
        return;
    }

    // Construct buttons for Attack and Damage
    const attackButton = `<button data-action="attack" data-id="${itemId}">Attack</button>`;
    const damageButton = `<button data-action="damage" data-id="${itemId}">Damage</button>`;

    // Create the chat message
    ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: app.actor }),
        content: `Actions for ${item}: ${attackButton} ${damageButton}`,
    });

    // Optionally handle button clicks within the same scope or separately
  }); 
});


Hooks.on('renderItemSheet', (app, html, data) => {
  
  // Add click handler for save button
  html.find('.save-button').click(async (event) => {
    event.preventDefault();
    
    // Gather form data
    const formData = new FormData(html.find('form')[0]);
    const formDataObj = Object.fromEntries(formData);
    
    // Extract individual values
    const diceNum = formDataObj['system.roll.diceNum'];
    const diceSize = formDataObj['system.roll.diceSize'];
    const diceBonusStat = formDataObj['system.hitChance']; //<--- this is the stat shortcut

    let abilityMod = 0;

    // Construct the new formula
    const newFormula = `${diceNum}d${diceSize}+@abilities.${diceBonusStat}.mod`;

    
    // Update the item with the new values
    await app.object.update({
      'name': formDataObj['name'],
      'system.quantity': formDataObj['system.quantity'],
      'system.weight': formDataObj['system.weight'],
      'system.roll.diceNum': diceNum,
      'system.roll.diceSize': diceSize,
      'system.formula': newFormula
    });

    // Optionally, close the dialog after saving
    app.close();
  });
});


////-------------------------TEST-----------------------////

Hooks.on("renderChatMessage", (message, html, data) => {
  html.find('button[data-action="attack"]').click(event => {
    const speaker = message.speaker;
    const actor = getActorById(speaker.actor);
    console.log(actor._id)
    const button = $(event.currentTarget);
    const item = getItemById(button.data("id"));
    const attributeBonus = actor.getAbilityValueFromFormula(item.system.hitChance);
    const attackFormula = `1d20 + ${attributeBonus}`;
    const CRITICAL_THRESHOLD = 18; // Custom critical threshold

    let d = new Dialog({
        title: "Choose Attack Type",
        content: "<p>Select the type of attack:</p>",
        buttons: {
            normal: {
                label: "Normal",
                callback: async () => {
                    let roll = new Roll(attackFormula);
                    await roll.evaluate({ async: true });
                    const wasCritical = checkCritical(roll, item, speaker, CRITICAL_THRESHOLD);
                    setCriticalState(html, wasCritical);
                    deductActionPoints(actor._id, 1); // Deduct 1 AP for normal attack
                }
            },
            advantage: {
                label: "Advantage",
                callback: async () => {
                    let roll1 = new Roll(attackFormula);
                    let roll2 = new Roll(attackFormula);
                    await roll1.evaluate({ async: true });
                    await roll2.evaluate({ async: true });
                    let higherRoll = roll1.total >= roll2.total ? roll1 : roll2;
                    const wasCritical = checkCritical(higherRoll, item, speaker, CRITICAL_THRESHOLD, roll2, 'advantage');
                    setCriticalState(html, wasCritical);
                    deductActionPoints(actor._id, 2); // Deduct 2 AP for advantage attack
                }
            },
            disadvantage: {
                label: "Disadvantage",
                callback: async () => {
                    let roll1 = new Roll(attackFormula);
                    let roll2 = new Roll(attackFormula);
                    await roll1.evaluate({ async: true });
                    await roll2.evaluate({ async: true });
                    let lowerRoll = roll1.total <= roll2.total ? roll1 : roll2;
                    const wasCritical = checkCritical(lowerRoll, item, speaker, CRITICAL_THRESHOLD, roll2, 'disadvantage');
                    setCriticalState(html, wasCritical);
                    deductActionPoints(actor._id, 2); // Deduct 2 AP for disadvantage attack
                }
            }
        },
        default: "normal",
        close: () => console.log("Attack dialog closed without making a choice.")
    });
    d.render(true);
});


  html.find('button[data-action="damage"]').click(async event => {
    const speaker = message.speaker;
    const actor = getActorById(speaker.actor);
    const button = $(event.currentTarget);
    
    const item = getItemById(button.data("id"));
    const attributeBonus = actor.getAbilityValueFromFormula(item.system.hitChance);
    const attackFormula = `1d20 + ${attributeBonus}`;
    
    const wasCritical = getCriticalState(html);
    if (game.user.targets.size > 0) {
        game.user.targets.forEach(async token => {
            
            //Damage Formula vars     todoMartin
            // weapon
            let BaseDMG_Weapon = item.system.damage;
            let Scalingwert = 0;

            console.log("debug item", item);

            // player
            let WaffenTypLevelDMG = 0; // todo add Waffentalentlevelsystem; update Actor
            let PersonalMultiplier = 1;
            let Kritschadenmultiplikatoren = 1;
            let entsprechendenSchadenwert = 1; // Schadenstats

            // item
            let ItemDMG = 0;

            // skills
            let SkillDMG = 0;     // todo add Skillsystem
            let PenValue = 0;

            // enemy
            let ImmunityEntety = 0;
            let WeaknessesEntety = 1;
            let ResistencesEntety = 0;
            let Amor = 0;
            let Magresi = 0;
            
            
            //todo add loop, to add all item damages in var ItemDMG.

            //Var zum Differ
            let Krit = wasCritical;
            console.log("Debug was krit", wasCritical);
            let ignoreEffect = false;
            let magAttack = false;

            //Damage Formula
            let ScalingDMG = Number(Scalingwert) * Number(entsprechendenSchadenwert);

            //let BaseDMG = (BaseDMG_Weapon + ScalingDMG + WaffenTypLevelDMG + SkillDMG + ItemDMG) * PersonalMultiplier;
            let BaseDMG = (Number(BaseDMG_Weapon) + Number(ScalingDMG) + Number(WaffenTypLevelDMG) + Number(SkillDMG) + Number(ItemDMG)) * Number(PersonalMultiplier);
            const OutgoingDMG = Number(BaseDMG) * Number((Krit? Number(1.5) + Number(Kritschadenmultiplikatoren) : 1));
            //const ElementalMultiplier = (WeaknessesEntety + (ResistencesEntety - (PenValue * ResistencesEntety)) * (ignoreEffect? 1 : ImmunityEntety));
            const ElementalMultiplier = (Number(WeaknessesEntety) + (Number(ResistencesEntety) - (Number(PenValue) * Number(ResistencesEntety))) * (ignoreEffect ? 1 : Number(ImmunityEntety)));
            const CalculatedDMG = Number(OutgoingDMG) * Number(ElementalMultiplier);
            const DMGToApply = Number(CalculatedDMG) - Number((magAttack? Magresi : Amor));

            let currentHP = token.actor.system.health.value;
            
            let newHP = currentHP - DMGToApply; //todo hier den DMG für Tracker abgreifen
            

            if(newHP <= 0){  //todo add effect unconscious and death
              newHP = 0;
            }

            await token.actor.update({"system.health.value": newHP});

            // Create floating text
            createFloatingText(token, `-${DMGToApply}`, wasCritical);
            
            console.log(`${token.name} takes ${DMGToApply} damage, new HP is ${newHP}.`);
        });
    } else {
        console.log("No targets currently selected.");
    }
    console.log("Damage with weapon ID:", item.id);
  });
});


Hooks.on("createChatMessage", (message) => {
  // Check if the message contains a roll
  if (message.isRoll && message.rolls) {
    // Check if it's a d20 roll
    const dice = message.rolls; // Get dice parts of the roll
    const d20Roll = dice.find(die => die.faces === 20 && die.number === 1); // Look for a single d20

    if (d20Roll) {
      console.log("A d20 roll was made:", message.roll.formula);
      // You can further interact here, such as analyzing the result
    }
  }
});

Hooks.on("preCreateChatMessage", async (document, data, options, userId) => {
  // Access the roll object
  if (document.isRoll && document.roll) {
    // Check for d20 rolls specifically
    const d20Roll = document.roll.dice.find(die => die.faces === 20 && die.number === 1);
    if (d20Roll) {
      console.log("Intercepted a d20 roll:", document.roll.formula);
      // Additional logic here
    }
  }
});

//<--------------------------Hooks for Canvas------------------------------------>

Hooks.on("canvasReady", canvas => {
  canvas.tokens.placeables.forEach(token => {
    if (token.actor.type === "character") { // Ensure it's a character token
        renderTokenGraphics(token);
    }
  });
});

let movementInProgress = false;

Hooks.on("updateToken", (tokenDocument, updateData, options, userId) => {
  if (movementInProgress) return; // Skip the hook if we're already handling movement
  
  const token = canvas.tokens.get(tokenDocument.id);
  const actor = token.actor;
  console.log(actor);
  
  if (updateData.x !== undefined || updateData.y !== undefined || updateData.rotation !== undefined) {
    if (token.actor.type === "character") { // Ensure it's a character token
        renderTokenGraphics(token);
    }

    handleTokenMovement(token, tokenDocument, updateData)
      .then(() => {
        console.log("Token movement handled successfully.");
      })
      .catch(error => {
        console.error("Error handling token movement:", error);
      });
  }
});


//<--------------------------Hooks for Combat------------------------------------>

Hooks.on("updateCombat", async (combat, changed, options, userId) => {
  // Check if the turn has changed
  if (changed.turn !== undefined) {
      const currentToken = combat.turns[combat.turn]?.actorId;
      if (!currentToken) return;

      let actor = game.actors.get(currentToken);
      if (!actor) return;

      console.log(`Processing turn for ${actor.name}`);
      console.log(combat.turns[combat.turn]);

      if (actor.type === "character") { // Ensure that the actor is a character
        await resetCharacterValues(actor._id);
        await triggerStartOfTurnEffects(actor._id);
      }

      actor.getActiveTokens().forEach(token => {
        if (token.actor.type === "character") {
          renderTokenGraphics(token);
        }
      });
  }
});

/**
 * Retrieves an actor by their unique ID.
 * @param {string} actorId - The unique identifier for the actor.
 * @returns {Actor|null} - The actor if found, otherwise null.
 */
function getActorById(actorId) {
  return game.actors.get(actorId);
}

/**
 * Retrieves an item by its unique ID from the global game items collection.
 * @param {string} itemID - The unique identifier for the item.
 * @returns {Item|null} - The item if found, otherwise null.
 */
function getItemById(itemID) {
  return game.items.get(itemID);
}


function checkCritical(roll, weapon, speaker, criticalThreshold, roll2 = null, condition = 'normal') {
  let messageContent = "";
  let isCritical = false; // Flag to indicate if the roll is critical

  if (condition === 'advantage' || condition === 'disadvantage') {
      const chosenRoll = (condition === 'advantage' ? (roll.total >= roll2.total ? roll : roll2) : (roll.total <= roll2.total ? roll : roll2));
      const discardedRoll = (condition === 'advantage' ? (roll.total < roll2.total ? roll : roll2) : (roll.total > roll2.total ? roll : roll2));
      
      messageContent += `Rolls: <span style="color: green;"><strong>${chosenRoll.total}</strong></span> and <span style="color: red; text-decoration: line-through;">${discardedRoll.total}</span><br>`;
      isCritical = chosenRoll.terms[0].results[0].result >= criticalThreshold;
  } else {
      messageContent += `Roll: <strong>${roll.total}</strong><br>`;
      isCritical = roll.terms[0].results[0].result >= criticalThreshold;
  }
  messageContent += `${isCritical ? "<span style='color: red; font-weight: bold;'>Critical Hit!</span>" : ""} Attack with ${weapon.name}`;
  roll.toMessage({
      speaker: speaker,
      flavor: messageContent
  });

  return isCritical; // Return the critical hit status
}

function setCriticalState(html, isCritical) {
  html.find('.message-content').data('was-critical', isCritical); // Store critical hit state in a data attribute
}

function getCriticalState(html) {
  return html.find('.message-content').data('was-critical'); // Retrieve the stored critical hit state
}

function createFloatingText(token, text, critical) {
  const style = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 42,
    fill: critical ? '#ff0000' : '#1e00ff', // Red for critical, bright green for normal
    stroke: '#000000',
    strokeThickness: 4,
    fontWeight: 'bold', // Making the text bold
    dropShadow: true,
    dropShadowColor: '#000000',
    dropShadowBlur: 6, // Increased blur for better visibility
    dropShadowAngle: Math.PI / 6,
    dropShadowDistance: 8, // Increased distance for a more pronounced shadow
    align: 'center'
  });

  const textSprite = new PIXI.Text(text, style);
  textSprite.position.set(token.center.x, token.center.y - 80); // Position slightly above the token
  canvas.tokens.addChild(textSprite);

  // Animate the text rising and fading
  animateText(textSprite);
}

function animateText(textSprite) {
  let count = 60; // Duration of the effect in frames
  const animateFunc = () => {
      textSprite.y -= 1; // Move text up
      textSprite.alpha -= 1 / count; // Fade text out
      count--;

      if (count <= 0) {
          canvas.tokens.removeChild(textSprite); // Remove text after animation
          textSprite.destroy(); // Clean up resources
      } else {
          requestAnimationFrame(animateFunc); // Continue animation
      }
  };

  animateFunc();
}

function renderTokenGraphics(token) {
  // Remove old health bar and related graphics if they exist
  if (token.healthBar) {
      token.removeChild(token.healthBar);
      token.healthBar.destroy();
  }

  if (token.healthBarBackground) {
      token.removeChild(token.healthBarBackground);
      token.healthBarBackground.destroy();
  }

  if (token.healthText) {
      token.removeChild(token.healthText);
      token.healthText.destroy();
  }

  // Remove old action points bar and related graphics if they exist
  if (token.actionPointsBackground) {
      token.removeChild(token.actionPointsBackground);
      token.actionPointsBackground.destroy();
  }

  if (token.actionPointsText) {
      token.removeChild(token.actionPointsText);
      token.actionPointsText.destroy();
  }

  // Fetch current health and action points from the actor
  const currentHealth = token.actor.system.health.value;
  const maxHealth = token.actor.system.health.max;
  const currentActionPoints = token.actor.system.ActionPoints.curValue;
  const currentTmpBonusAP = token.actor.system.ActionPoints.tmpBonus;
  const maxActionPoints = token.actor.system.ActionPoints.maxValue;

  // Draw Health Bar Above the Token
  const barHeight = 10;
  const barWidth = token.w; // Width of the health bar is the same as the token width
  const barX = 0; // Start at the left edge of the token
  const barY = -15; // Position above the token

  // Background for the health bar
  const barBackground = new PIXI.Graphics();
  barBackground.beginFill(0x333333); // Dark gray background
  barBackground.drawRect(barX, barY, barWidth, barHeight);
  barBackground.endFill();

  token.addChild(barBackground);
  token.healthBarBackground = barBackground;

  // Health bar itself
  const healthBar = new PIXI.Graphics();
  const healthBarWidth = (barWidth * currentHealth) / maxHealth;

  healthBar.beginFill(0xFF0000); // Red color for the health bar
  healthBar.drawRect(barX, barY, healthBarWidth, barHeight);
  healthBar.endFill();

  token.addChild(healthBar);
  token.healthBar = healthBar;

  // Health text (optional)
  const healthText = new PIXI.Text(`${currentHealth}/${maxHealth}`, {
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0xFFFFFF, // White text
      stroke: 0x000000, // Black stroke for better visibility
      strokeThickness: 3,
  });
  healthText.anchor.set(0.5);
  healthText.position.set(barX + (barWidth / 2), barY - barHeight / 2 - 2); // Position the text above the bar

  token.addChild(healthText);
  token.healthText = healthText;

  // Draw Action Points Below the Token
  const apBackgroundWidth = 60; // Adjust width to fit the text nicely
  const apBackgroundHeight = 30; // Height of the background
  const apBackgroundX = (token.w / 2) - (apBackgroundWidth / 2); // Center horizontally relative to the token
  const apBackgroundY = token.h + 5; // Position below the token with a 5px gap

  // Background for action points
  const apBackground = new PIXI.Graphics();
  apBackground.beginFill(0x333333); // Dark gray background
  apBackground.drawRoundedRect(apBackgroundX, apBackgroundY, apBackgroundWidth, apBackgroundHeight, 5); // Rounded corners
  apBackground.endFill();

  token.addChild(apBackground);
  token.actionPointsBackground = apBackground;

  const aPToApply = currentActionPoints + currentTmpBonusAP;
  // Action points text
  const apText = new PIXI.Text(`AP: ${aPToApply}`, {
      fontFamily: 'Arial',
      fontSize: 20,
      fill: 0xFFFFFF, // White text
      stroke: 0x000000, // Black stroke for better visibility
      strokeThickness: 4,
  });
  apText.anchor.set(0.5);
  apText.position.set(apBackgroundX + (apBackgroundWidth / 2), apBackgroundY + apBackgroundHeight / 2); // Center the text on the background

  token.addChild(apText);
  token.actionPointsText = apText;
}

async function deductActionPoints(actorId, amount) {
  let actor = game.actors.get(actorId);
  if (!actor) return; // Actor not found

  const currentAP = actor.system.ActionPoints.curValue;
  const newAP = Math.max(currentAP - amount, 0);

  console.log("Deducting action points:", amount, "New AP:", newAP);
  await actor.update({'system.ActionPoints.curValue': newAP});

  actor.getActiveTokens().forEach(token => {
    renderTokenGraphics(token); // Update action point display on token
  });
}

async function resetCharacterValues(actorId) {
  let actor = getTokenByActorId(actorId).actor;
  if (!actor) return; // Actor not found

  const maxActionPoints = actor.system.ActionPoints.maxValue;
  await actor.update({'system.ActionPoints.curValue': maxActionPoints});

  console.log(`Reset action points for ${actor.name} to ${maxActionPoints}.`);
  actor.getActiveTokens().forEach(token => {
    renderTokenGraphics(token);
  });
}

async function triggerStartOfTurnEffects(actorId) {
  console.log(`Triggering start of turn effects for ${actorId}.`);
  const tmpBonusAP = 0;
  let actor = getTokenByActorId(actorId).actor;
  if (!actor) {
    console.error(`Actor with ID ${actorId} not found.`);
    return;
  }
  
  const health = actor.system.health;
  const newHealth = Math.min(health.value + 5, health.max);
  // Regenerate 5 HP, but do not exceed max
  await actor.update(
    {'system.health.value': newHealth,
    'system.ActionPoints.tmpBonus': tmpBonusAP
  });

  actor.getActiveTokens().forEach(token => {
    renderTokenGraphics(token);
  });

  console.log(`${actor.name} regenerates 5 HP, now at ${newHealth}/${health.max}`);
}

function getTokenByActorId(actorId) {
  // Iterate over all tokens on the canvas
  for (let token of canvas.tokens.placeables) {
      // Check if the token's actor ID matches the provided actorId
      if (token.actor?.id === actorId) {
          return token;
      }
  }
  // If no matching token is found, return null or undefined
  return null;
}

function handleTokenMovement(token, tokenDocument, updateData) {
  return new Promise(async (resolve, reject) => {
    try {
      // Calculate the original and new positions
      const originalX = tokenDocument.x;
      const originalY = tokenDocument.y;
      const newX = updateData.x !== undefined ? updateData.x : originalX;
      const newY = updateData.y !== undefined ? updateData.y : originalY;

      // Calculate the movement in the X and Y axes
      const deltaX = Math.abs(newX - originalX);
      const deltaY = Math.abs(newY - originalY);

      // Determine the number of grid units moved
      const gridSize = canvas.grid.size;
      const fieldsMovedX = deltaX / gridSize;
      const fieldsMovedY = deltaY / gridSize;

      // Determine the movement cost
      let apReduction = 0;
      let movementCost = 0.5; // token.actor.system.movementCost.value;

      if (fieldsMovedX === fieldsMovedY) {
        // Diagonal movement (top-left, top-right, bottom-left, bottom-right)
        apReduction = 2 * movementCost * fieldsMovedX; // 1 AP per field for diagonal
      } else {
        // Horizontal or vertical movement
        apReduction = movementCost * (fieldsMovedX + fieldsMovedY); // 0.5 AP per field
      }

      // Get the current Action Points
      const currentActionPoints = token.actor.system.ActionPoints.curValue;

      // Calculate the new Action Points
      const newActionPoints = Math.max(currentActionPoints - apReduction, 0); // Prevent going below 0


      //Change_Martin: add for to find playerowner id
      // Show a confirmation dialog before reducing AP
      let actor = token.actor;
      // Check actor permissions to find the owner who is not a GM
      let ownerUserId = null;

      for (let [userId, permission] of Object.entries(actor.permission)) {
          // Check if the permission level is owner (3) and the user is not a GM
          let user = game.users.get(userId);
          if (permission === 3 && user && !user.isGM) {
              ownerUserId = userId;
              break;
          }
      }
      let confirmMovement = await confirmMovementDialog(token.actor.name, apReduction);
      


      if (confirmMovement) {
        // Update the actor's Action Points
        await token.actor.update({ 'system.ActionPoints.curValue': newActionPoints });

        // Optionally, update the token's display to show the new Action Points
        renderTokenGraphics(token);

        console.log(`${token.actor.name} moved and lost ${apReduction} Action Points. New AP: ${newActionPoints}`);
      } else {
        // Revert the token to its original position
        movementInProgress = true; // Set the flag to avoid re-triggering the updateToken hook
        await token.document.update({ x: originalX, y: originalY });
        movementInProgress = false; // Reset the flag after the update

        console.log(`${token.actor.name} movement canceled, returning to original position.`);
      }

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

function confirmMovementDialog(actorName, apReduction) {
  return new Promise((resolve) => {
    //Change_Martin: add if to check if token has Playerowner and render only for ownerUserId -> Player
    // Create a confirmation dialog
    if(ownerUserId){
      let d = new Dialog({
        title: "Confirm Movement",
        content: `<p>Do you want to move ${actorName} and lose ${apReduction} Action Points?</p>`,
        buttons: {
          yes: {
            icon: '<i class="fas fa-check"></i>',
            label: "Yes",
            callback: () => resolve(true)
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: "No",
            callback: () => resolve(false)
          }
        },
        default: "yes",
        close: () => resolve(false) // Resolve false if the dialog is closed without a choice
      });
  
      d.render(true, {user: ownerUserId});
    }
    else{
      console.log("No owner found for this token")
    }
    
  });
}