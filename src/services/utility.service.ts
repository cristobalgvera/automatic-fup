import { COMMON, UI } from '../../config/app.settings';

function today() {
    return new Date().toLocaleDateString(COMMON.UTIL.LOCALE);
}

function todayNoYear() {
    return Utilities.formatDate(new Date(), 'GMT-3', 'dd-MMM');
}

function toCamelCase( str: string ) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function ( match, index ) {
        if (+match === 0) return ''; // or if (/\s+/.test(match)) for white spaces
        return index === 0 ? match.toLowerCase() : match.toUpperCase();
    });
}

function userConfirmation( title: string, vendorsNames?: string[] ) {
    const ui = SpreadsheetApp.getUi();

    if (!vendorsNames) {
        const response = ui.alert(UI.MODAL.ERROR, title, ui.ButtonSet.OK_CANCEL);
        return response === ui.Button.OK;
    }

    const vendorsToSendEmails = vendorsNames
        .reduce(( word, name, i, arr ) =>
                !!arr[i + 1]
                    ? word.concat(`- ${name}\n`)
                    : word.concat(`- ${name}`)
            , '');

    const response = ui.alert(title, vendorsToSendEmails, ui.ButtonSet.OK_CANCEL);
    return response === ui.Button.OK;
}

function removeExtension( fileName: string, extension: string ) {
    return fileName.replace(`.${extension}`, '');
}

export {
    removeExtension,
    toCamelCase,
    today,
    todayNoYear,
    userConfirmation,
};
