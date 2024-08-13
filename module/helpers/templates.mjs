/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    // Actor partials.
    'systems/nazrudin/templates/actor/parts/actor-features.hbs',
    'systems/nazrudin/templates/actor/parts/actor-items.hbs',
    'systems/nazrudin/templates/actor/parts/actor-weapons.hbs',
    'systems/nazrudin/templates/actor/parts/actor-spells.hbs',
    'systems/nazrudin/templates/actor/parts/actor-effects.hbs',
    "systems/nazrudin/templates/actor/parts/actor-schadenswerte.hbs",
    // Item partials
    'systems/nazrudin/templates/item/parts/item-effects.hbs',
  ]);
};
