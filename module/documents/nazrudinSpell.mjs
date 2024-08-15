import NazrudinEffect from '../helpers/nazrudin-effect.mjs';

export default class NazrudinSpell extends Item {
    prepareData() {
        super.prepareData();

        // Initialize effects from the stored data
        this.system.effects = (this.system.effects || []).map(effectData => new NazrudinEffect(effectData));
    }

    applyEffects(target) {
        const effects = this.system.effects || [];
        effects.forEach(effect => {
            effect.apply(target);
        });
    }
}