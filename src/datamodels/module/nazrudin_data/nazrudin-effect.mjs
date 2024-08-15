export default class NazrudinEffect {
    constructor({ name, type, triggerTime, duration, attributeToChange, amountToChange, description, id }) {
        this._id = id || this.generateUUID();
        this._name = name || "Unnamed Effect";
        this._type = type || "Buff";
        this._triggerTime = triggerTime || "onApply";
        this._duration = duration || 1;
        this._attributeToChange = attributeToChange || "";
        this._amountToChange = amountToChange || 0;
        this._description = description || "No description provided";
    }

    generateUUID() {
        return `id-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    }

    get id() {
        return this._id;
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get type() {
        return this._type;
    }

    set type(value) {
        this._type = value;
    }

    get triggerTime() {
        return this._triggerTime;
    }

    set triggerTime(value) {
        this._triggerTime = value;
    }

    get duration() {
        return this._duration;
    }

    set duration(value) {
        this._duration = value;
    }

    get attributeToChange() {
        return this._attributeToChange;
    }

    set attributeToChange(value) {
        this._attributeToChange = value;
    }

    get amountToChange() {
        return this._amountToChange;
    }

    set amountToChange(value) {
        this._amountToChange = value;
    }

    get description() {
        return this._description;
    }

    set description(value) {
        this._description = value;
    }

    toObject() {
        return {
            id: this._id,
            name: this._name,
            type: this._type,
            triggerTime: this._triggerTime,
            duration: this._duration,
            attributeToChange: this._attributeToChange,
            amountToChange: this._amountToChange,
            description: this._description,
        };
    }

    apply(targetActor) {
        console.log(`Applying ${this._name} to ${targetActor.name}`);
        // Implement application logic here
    }
}