import {MailRecord} from '../mail-record.schema';

export interface MailRecordCollection {
  [id: string]: MailRecord;
}
