import {_mailRecordRepository} from '../../db/mail-record.repository';
import {CreateMailRecord} from '../../util/schema/dto/create-mail-record.dto';

function getById(mailId: string) {
  return _mailRecordRepository.getById(mailId);
}

function saveOne(createMailRecord: CreateMailRecord) {
  return _mailRecordRepository.saveOne(createMailRecord);
}

function existsById(mailId: string) {
  return _mailRecordRepository.existsById(mailId);
}

const mailRecordService = {
  saveOne,
  existsById,
  getById,
};

export {mailRecordService};
