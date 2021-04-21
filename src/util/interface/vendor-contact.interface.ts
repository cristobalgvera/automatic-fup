import {DATA_ORIGIN} from '../enum/data-origin.enum';

export interface VendorContact {
  id: string;
  name: string;
  email: string;
  cc: string;
  sendDate: Date;
  sendEmail: boolean;
  type: DATA_ORIGIN;
  automaticallySendEmail: boolean;
}

export interface VendorsContact {
  [name: string]: VendorContact;
}
