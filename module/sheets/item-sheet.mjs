import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';
import { CustomEffect } from '../helpers/effect-custom.mjs';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class BoilerplateItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['boilerplate', 'sheet', 'item'],
      width: 520,
      height: 480,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'description',
        },
      ],
    });
  }

  /** @override */
  get template() {
    const path = 'systems/nazrudin/templates/item';
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.hbs`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.hbs`.
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = this.document.toObject(false);

    // Enrich description info for display
    context.enrichedDescription = await TextEditor.enrichHTML(
        this.item.system.description,
        {
            secrets: this.document.isOwner,
            async: true,
            rollData: this.item.getRollData(),
            relativeTo: this.item,
        }
    );

    // Ensure that the system object exists
    context.system = context.system || {};

    // Ensure that the effects are in array form
    let effectsData = itemData.system.effects;
    
    // Convert to array if it's an object with numeric keys
    if (!Array.isArray(effectsData)) {
        effectsData = Object.values(effectsData);
    }

    // Initialize the effects array
    context.system.effects = effectsData.map(effectData => new CustomEffect(effectData));

    console.log("Debug effects: ", context.system.effects);

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click handlers, etc. would go here.

    // Active Effect management
    /* html.on('click', '.effect-control', (ev) =>
      onManageActiveEffect(ev, this.item)
    ); */
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Handle the add effect button click
    html.find('.add-effect-button').click((event) => {
      event.preventDefault();
      openEffectDialog(this);
    });

    // Handle the edit effect button click
    html.find('.edit-effect-button').click((event) => {
      event.preventDefault();
      const index = $(event.currentTarget).data("index");
      const effect = this.object.system.effects[index];
      openEffectDialog(this, effect, index);
    });

    // Handle the delete effect button click
    html.find('.delete-effect-button').click(async (event) => {
      event.preventDefault();
      const index = $(event.currentTarget).data("index");
      const effects = this.object.system.effects;
      effects.splice(index, 1); // Remove the effect at the specified index
      await this.object.update({ 'system.effects': effects });
      this.render(); // Re-render the sheet to reflect changes
    });

    // Handle save spell button click
    html.find('.save-button-spell').click(async (event) => {
      event.preventDefault();

      // Gather the form data
      const formData = new FormData(this.form);
      const data = Object.fromEntries(formData.entries());

      // Parse any fields that require it
      data['system.skillQuality'] = parseInt(data['system.skillQuality']);
      data['system.spellDamage'] = parseInt(data['system.spellDamage']);

      // Prepare the effects for saving
      const effects = this.object.system.effects.map(effect => effect instanceof CustomEffect ? effect.toObject() : effect);

      // Update the item with the new data
      await this.object.update({
          'name': data['name'],
          'system.skillQuality': data['system.skillQuality'],
          'system.castingTime': data['system.castingTime'],
          'system.range': data['system.range'],
          'system.targetable': data['system.targetable'],
          'system.type': data['system.type'],
          'system.spellDamage': data['system.spellDamage'],
          'system.effects': effects
      });

      // Close the form
      this.close();
    });
}

  // Save spell function
  async _onSaveSpell(event) {
    event.preventDefault();

    // Gather the form data
    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData.entries());

    // Parse any fields that require it
    data['system.skillQuality'] = parseInt(data['system.skillQuality']);
    data['system.spellDamage'] = parseInt(data['system.spellDamage']);

    // Prepare the effects if any
    const effects = this.object.system.effects.map(effectData => new CustomEffect(effectData).toObject());

    // Update the item with the new data
    await this.object.update({
      'name': data['name'],
      'system.skillQuality': data['system.skillQuality'],
      'system.castingTime': data['system.castingTime'],
      'system.range': data['system.range'],
      'system.targetable': data['system.targetable'],
      'system.type': data['system.type'],
      'system.spellDamage': data['system.spellDamage'],
      'system.effects': effects
    });

    // Close the form
    this.close();
  }

}

function openEffectDialog(app, effectData = {}, index = -1) {
  const actor = game.actors.contents[0];

  if (!actor || typeof actor.getAllActorAttributes !== 'function') {
      console.error("Actor or getAllActorAttributes function not found.");
      return;
  }

  const actorAttributes = actor.getAllActorAttributes();
  console.log("Debug: effectData:", effectData);

  // If it's an existing effect, instantiate it as a CustomEffect, else create a new one
  const effect = new CustomEffect(effectData);

  renderTemplate("systems/nazrudin/templates/item/parts/effect-configure.hbs", {
      effectName: effect.name,
      effectDuration: effect.duration,
      statToChanges: effect.statToChanges,
      amountToChange: effect.amountToChange,
      effectDescription: effect.description,
      actorAttributes: actorAttributes // Pass the actor's attributes to the template
  }).then(htmlContent => {
      new Dialog({
          title: index === -1 ? "Configure New Effect" : "Edit Effect",
          content: htmlContent,
          buttons: {
              confirm: {
                  label: index === -1 ? "Add Effect" : "Save Changes",
                  callback: async (html) => {
                      const formElement = html.find('.effect-configure-form')[0];
                      if (!formElement) {
                          console.error("Form element not found.");
                          return;
                      }

                      const formData = new FormData(formElement);
                      const effectData = Object.fromEntries(formData.entries());

                      // Update the effect with the new data
                      effect.name = effectData['effect-name'];
                      effect.duration = parseInt(effectData['effect-duration']);
                      effect.statToChanges = effectData['effect-stat'];
                      effect.amountToChange = parseInt(effectData['effect-value']);
                      effect.description = effectData['effect-description'];

                      const effects = app.object.system.effects || [];
                      if (index === -1) {
                          effects.push(effect.toObject()); // Ensure the effect is saved as a plain object
                      } else {
                          effects[index] = effect.toObject();
                      }

                      await app.object.update({ 'system.effects': effects });

                      console.log("Effect saved:", effect);
                      app.render();
                  }
              },
              cancel: {
                  label: "Cancel"
              }
          },
          default: "confirm"
      }).render(true);
  }).catch(err => console.error("Template rendering failed:", err));
}
