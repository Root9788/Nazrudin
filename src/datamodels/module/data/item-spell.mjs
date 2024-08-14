import BoilerplateItemBase from "./base-item.mjs";
import { CustomEffect } from './CustomEffect.js'; // Assuming CustomEffect is in the same directory

export default class BoilerplateSpell extends BoilerplateItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.skillQuality = new fields.NumberField({ required: true, nullable: false, initial: 1, min: 1, max: 15 });
    schema.castingTime = new fields.StringField({ required: true, nullable: false, initial: "1 action" });
    schema.range = new fields.StringField({ required: true, nullable: false, initial: "6 Felder" });
    schema.targetable = new fields.StringField({ required: true, nullable: false, initial: "V, S" });
    schema.type = new fields.StringField({ required: true, nullable: false, initial: "Buff" });
    schema.spellDamage = new fields.NumberField({ required: false, nullable: false, initial: 10, min: 0 });

    // Ensure effects is initialized as an empty array by default
    schema.effects = new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true, initial: "Unnamed Effect" }),
        duration: new fields.NumberField({ required: true, initial: 1 }), // Duration in rounds
        changes: new fields.ArrayField(new fields.SchemaField({
          stat: new fields.StringField({ required: true, initial: "strength" }),
          value: new fields.NumberField({ required: true, initial: 1 }),
        })),
        description: new fields.StringField({ initial: "Effect description" })
      }),
      { initial: [] }  // Initialize as an empty array by default
    );

    return schema;
  }

  async castSpell(targetActor) {
    // Example: Apply the effects to the target actor
    this.system.effects.forEach(effectData => {
      const effect = new CustomEffect(effectData);
      this.applyEffect(targetActor, effect);
    });

    // Handle other spell logic, like damage
    const roll = new Roll(`1d20 + ${this.system.spellDamage}`);
    await roll.evaluate({ async: true });
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${this.name} deals ${this.system.spellDamage} damage!`
    });
  }

  applyEffect(targetActor, effect) {
    // Logic to apply the effect to the target actor
    console.log(`Applying effect ${effect.name} to ${targetActor.name}`);

    // Example: Modify a stat on the target actor
    effect.changes.forEach(change => {
      const currentValue = targetActor.system.attributes[change.stat].value;
      const newValue = currentValue + change.value;
      targetActor.update({ [`system.attributes.${change.stat}.value`]: newValue });

      console.log(`${targetActor.name}'s ${change.stat} is now ${newValue}`);
    });

    // You could also handle the effect duration here, e.g., using a hook to remove the effect after a number of rounds.
  }
}
