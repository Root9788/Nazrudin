export class CustomEffect {
  constructor({ name, duration, statToChanges, amountToChange, description, id }) {
    this._id = id || this.generateUUID();
    this._name = name || "Unnamed Effect";
    this._duration = duration || 1; // Default duration is 1 round
    this._statToChanges = statToChanges || []; // Default is an empty array
    this._amountToChange = amountToChange || 0;
    this._description = description || "No description";
  }

  // Getter and Setter for UUID
  get id() {
    return this._id;
  }

  // Function to generate a UUID
  generateUUID() {
    return uuidv4(); // Generates a version 4 UUID
  }

  // Getter and Setter for name
  get name() {
    return this._name;
  }

  set name(value) {
    this._name = value;
  }

  // Getter and Setter for duration
  get duration() {
    return this._duration;
  }

  set duration(value) {
    this._duration = value;
  }

  // Getter and Setter for statToChanges
  get statToChanges() {
    return this._statToChanges;
  }

  set statToChanges(value) {
    this._statToChanges = value;
  }

  // Getter and Setter for amountToChange
  get amountToChange() {
    return this._amountToChange;
  }

  set amountToChange(value) {
    this._amountToChange = value;
  }

  // Getter and Setter for description
  get description() {
    return this._description;
  }

  set description(value) {
    this._description = value;
  }

  // Method to return the effect as a plain object (useful for saving data)
  toObject() {
    return {
      uuid: this._uuid,
      name: this._name,
      duration: this._duration,
      statToChanges: this._statToChanges,
      amountToChange: this._amountToChange,
      description: this._description
    };
  }

  // Function to generate a UUID
  generateUUID() {
    return `id-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  }

  // Method to apply the effect (optional)
  apply(targetActor) {
    console.log(`Applying effect: ${this._name} to ${targetActor.name}`);

    this._statToChanges.forEach(change => {
      const currentValue = targetActor.system.attributes[change.stat].value;
      const newValue = currentValue + change.value;
      targetActor.update({ [`system.attributes.${change.stat}.value`]: newValue });
      console.log(`${targetActor.name}'s ${change.stat} is now ${newValue}`);
    });
  }
}