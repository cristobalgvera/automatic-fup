const today = () => new Date().toLocaleDateString(COMMON.UTIL.LOCALE);
const todayNoYear = () => Utilities.formatDate(new Date(), "GMT-3", "dd-MMM")

function toCamelCase(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
    if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

function userConfirmation(title, vendorsNames) {
  const vendorsToSendEmails = vendorsNames
    .reduce((word, name, i, arr) =>
      !!arr[i + 1]
        ? word.concat(`- ${name}\n`)
        : word.concat(`- ${name}`)
      , '');

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(title, vendorsToSendEmails, ui.ButtonSet.OK_CANCEL);

  return response === ui.Button.OK;
}

function removeExtension(fileName, extension) {
  const name = fileName.replace(`.${extension}`, "");
  return name;
}

function excelToSheet(excelFile, folder) {

  try {
    const blob = excelFile.getBlob();
    const fileName = removeExtension(excelFile.getName(), COMMON.UTIL.FILE_EXTENSION.XLSX);
    const resource = {
      title: fileName,
      mimeType: MimeType.GOOGLE_SHEETS,
      parents: [{ id: folder.getId() }],
    };

    Drive.Files.insert(resource, blob);
    return SpreadsheetApp.openById(folder.getFilesByName(fileName).next().getId());
  } catch (f) {
    console.error(f.toString());
  }
}

function sheetToExcel(fileId, name) {
  try {
    const url = `https://docs.google.com/feeds/download/spreadsheets/Export?key=${fileId}&exportFormat=${COMMON.UTIL.FILE_EXTENSION.XLSX}`;
    const params = {
      headers: {
        "Authorization": `Bearer ${ScriptApp.getOAuthToken()}`
      },
      muteHttpExceptions: true,
    };

    return UrlFetchApp.fetch(url, params).getBlob().setName(name + `.${COMMON.UTIL.FILE_EXTENSION.XLSX}`);
  } catch (e) {
    console.error(e.toString());
  }
}
