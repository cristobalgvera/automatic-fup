import {database, messages} from '.';
import {FIREBASE} from '../config';
import {_convertProperties} from '../util/db/mail-record.utility';
import {MailRecordCollection} from '../util/schema/collection/mail-record-collection.schema';
import {CreateMailRecord} from '../util/schema/dto/create-mail-record.dto';
import {MailRecord} from '../util/schema/mail-record.schema';

function getById(mailId: string): MailRecord {
  const mailRecordCollection: MailRecordCollection = database.getData(
    `${FIREBASE.PATH.MAIL_RECORD.BASE}`,
    {orderBy: 'mailId', equalTo: mailId}
  );

  return mailRecordCollection
    ? _convertProperties(mailRecordCollection)[0]
    : null;
}

function saveOne(mailRecord: CreateMailRecord) {
  const url = `${FIREBASE.PATH.MAIL_RECORD.BASE}`;
  const {mailId} = mailRecord;

  if (!existsById(mailId)) {
    const data = _createMailRecord(mailRecord);
    return database.pushData(url, data);
  }

  console.error(messages.alreadyExistMessage(mailId));
}

function existsById(id: string) {
  const url = `${FIREBASE.PATH.MAIL_RECORD.BASE}`;
  const data = database.getData(url, {orderBy: 'mailId', equalTo: id});
  return !!Object.keys(data).length;
}

function _createMailRecord({
  mailId,
  vendorEmail,
}: CreateMailRecord): MailRecord {
  return {
    mailId,
    audit: {
      creationDate: new Date(),
      createdBy: Session.getActiveUser().getEmail(),
      vendorEmail,
    },
  };
}

const _mailRecordRepository = {
  saveOne,
  existsById,
  getById,
};

export {_mailRecordRepository};
