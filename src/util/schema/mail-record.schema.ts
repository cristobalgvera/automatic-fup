import {Audit} from './shared/audit.schema';

export interface MailRecord {
  mailId: string;
  audit: Required<Pick<Audit, 'createdBy' | 'creationDate' | 'vendorEmail'>>;
}
