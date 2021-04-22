import {Audit} from './shared/audit.schema';

export interface MailRecord {
  mailId: string;
  subject: string;
  audit: Required<Pick<Audit, 'createdBy' | 'creationDate' | 'vendorEmail'>>;
}
