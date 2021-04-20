export interface Audit {
  vendorEmail?: string;
  isPurchase: boolean;
  updatedInSheet: boolean;
  creationDate?: Date;
  createdBy?: string;
  updateDate?: Date;
  updatedBy?: string;
}
