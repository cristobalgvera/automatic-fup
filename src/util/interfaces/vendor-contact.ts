export interface VendorContact {
    id: string;
    name: string;
    email: string;
    sendDate: Date;
    sendEmail: boolean;
}

export interface VendorsContact {
    [name: string]: VendorContact
}
