export interface VendorContact {
  id: string;
  name: string;
  email: string;
  cc: string;
  sendDate: Date;
  sendEmail: boolean;
}

export interface VendorsContact {
  [name: string]: VendorContact;
}
