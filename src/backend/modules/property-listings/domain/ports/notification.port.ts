export interface INotificationPort {
  notifyLandlordOfInterest(
    landlordUserId: string,
    tenantName: string,
    listingId: string,
  ): Promise<void>;
}
