export default class itemSheet extends itemSheet {
    get template() {
        return `systems/nazrudin/templates/sheets/${this.item.data.type}-sheet.html`;
    }
}