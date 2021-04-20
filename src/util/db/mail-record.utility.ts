import {cleanUpUndefined, isValidDate} from '../../service/utility.service';
import {MailRecordCollection} from '../schema/collection/mail-record-collection.schema';
import {MailRecord} from '../schema/mail-record.schema';

function _convertProperties(
  mailRecordCollection: MailRecordCollection
): MailRecord[] {
  const data = Object.values(mailRecordCollection);

  return data.map(mailRecord => {
    mailRecord.audit.creationDate = isValidDate(
      new Date(mailRecord.audit.creationDate)
    );

    return cleanUpUndefined(mailRecord);
  });
}

export {_convertProperties};
