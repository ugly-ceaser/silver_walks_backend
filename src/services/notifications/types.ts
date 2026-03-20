export interface INotificationProvider {
    /**
     * Send a notification through the provider's channel
     * @param recipient Recipient identifier (email, phone, or device token)
     * @param title Notification title or subject
     * @param body Notification body content
     * @param metadata Optional provider-specific metadata
     */
    send(recipient: string, title: string, body: string, metadata?: any): Promise<any>;
}
