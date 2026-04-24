export class InAppNotificationEntity {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly notificationTypeId: string,
        public readonly title: string,
        public readonly message: string,
        public readonly read: boolean,
        public readonly eventSource: string,
        public readonly data: Record<string, unknown>,
        public readonly createdAt: Date,
    ) { }
}
