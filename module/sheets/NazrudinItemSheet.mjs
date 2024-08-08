export default class itemSheet extends itemSheet {
    get template() {
        return `systems/Nazrudin/templates/sheets/${this.item.data.type}-sheet.html`;
    }
}