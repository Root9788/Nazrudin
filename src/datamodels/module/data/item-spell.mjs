import { CustomEffect } from './CustomEffect.js';

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

    schema.effects = new fields.ArrayField(
      new fields.SchemaField({
        name: new fields.StringField({ required: true, initial: "Unnamed Effect" }),
        duration: new fields.NumberField({ required: true, initial: 1 }), 
        statToChanges: new fields.StringField({ required: true, initial: "strength" }),
        amountToChange: new fields.NumberField({ required: true, initial: 1 }),
        description: new fields.StringField({ initial: "Effect description" }),
        id: new fields.StringField({ initial: () => `id-${Date.now()}-${Math.floor(Math.random() * 1000000)}` })
      }),
      { initial: [] }
    );

    return schema;
  }

  async castSpell(targetActor) {
    this.system.effects.forEach(effectData => {
      const effect = new CustomEffect(effectData);
      this.applyEffect(targetActor, effect);
    });

    const roll = new Roll(`1d20 + ${this.system.spellDamage}`);
    await roll.evaluate({ async: true });
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${this.name} deals ${this.system.spellDamage} damage!`
    });
  }

  applyEffect(targetActor, effect) {
    effect.apply(targetActor);
  }
}