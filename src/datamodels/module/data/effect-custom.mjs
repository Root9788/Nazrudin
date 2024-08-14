export class CustomEffect {
  constructor({ name, duration, changes, description }) {
    this._name = name || "Unnamed Effect";
    this._duration = duration || 1; // Default duration is 1 round
    this._changes = changes || []; // Default is an empty array
    this._description = description || "No description";
  }

  // Getter for name
  get name() {
    return this._name;
  }

  // Setter for name
  set name(value) {
    this._name = value;
  }

  // Getter for duration
  get duration() {
    return this._duration;
  }

  // Setter for duration
  set duration(value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error("Duration must be a non-negative number.");
    }
    this._duration = value;
  }

  // Getter for changes
  get changes() {
    return this._changes;
  }

  // Setter for changes
  set changes(value) {
    if (!Array.isArray(value)) {
      throw new Error("Changes must be an array.");
    }
    this._changes = value;
  }

  // Getter for description
  get description() {
    return this._description;
  }

  // Setter for description
  set description(value) {
    this._description = value;
  }

  // Method to apply the effect (optional)
  apply(targetActor) {
    console.log(`Applying effect: ${this._name} to ${targetActor.name}`);

    this._changes.forEach(change => {
      const currentValue = targetActor.system.attributes[change.stat].value;
      const newValue = currentValue + change.value;
      targetActor.update({ [`system.attributes.${change.stat}.value`]: newValue });
      console.log(`${targetActor.name}'s ${change.stat} is now ${newValue}`);
    });
  }
}