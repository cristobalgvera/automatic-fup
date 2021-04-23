export interface Audit {
  vendorEmail?: string;
  isPurchase: boolean;
  updatedInSheet: boolean;
  conflictive?: boolean;
  creationDate?: Date;
  createdBy?: string;
  updateDate?: Date;
  updatedBy?: string;
}
