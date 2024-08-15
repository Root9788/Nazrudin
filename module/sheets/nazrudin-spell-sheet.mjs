import NazrudinEffect from '../helpers/nazrudin-effect.mjs';
/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export default class NazrudinSpellSheet extends ItemSheet {
    /** @override */
    static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['nazrudin', 'sheet', 'item'],
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

    get template() {
        return `systems/nazrudin/templates/nazrudin-item/nazrudin-spell-sheet.hbs`;
    }

    getData() {
        const data = super.getData();
        data.spell = this.item.system;
        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.add-effect-button').click((event) => {
            event.preventDefault();
            this._onAddEffect(event);
        });

        html.find('.edit-effect-button').click((event) => {
            event.preventDefault();
            const index = $(event.currentTarget).data("index");
            this._onEditEffect(event, index);
        });

        html.find('.delete-effect-button').click((event) => {
            event.preventDefault();
            const index = $(event.currentTarget).data("index");
            this._onDeleteEffect(event, index);
        });

        html.find('.save-button').click(async (event) => {
            event.preventDefault();
            await this._onSaveSpell();
        });
    }

    _onAddEffect(event) {
        const effects = this.item.system.effects || [];
        effects.push(new NazrudinEffect({}));
        this.item.update({ 'system.effects': effects.map(e => e.toObject()) });
    }

    _onEditEffect(event, index) {
        const effects = this.item.system.effects;
        if (effects && effects[index]) {
            // Logic to edit the effect at the given index
            console.log(`Editing effect at index ${index}:`, effects[index]);
        }
    }

    _onDeleteEffect(event, index) {
        const effects = this.item.system.effects;
        if (effects && effects[index]) {
            effects.splice(index, 1);
            this.item.update({ 'system.effects': effects.map(e => e.toObject()) });
        }
    }

    async _onSaveSpell() {
        // Gather form data and update the spell
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());

        data['system.effects'] = this.item.system.effects.map(e => e.toObject());

        await this.item.update(data);
        this.close();
    }
}