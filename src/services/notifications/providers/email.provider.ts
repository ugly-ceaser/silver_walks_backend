import { INotificationProvider } from "../types";
import { mailService } from "../../mail.service";

export class EmailProvider implements INotificationProvider {
    /**
     * Send email notification
     */
    async send(recipient: string, title: string, body: string, metadata?: any): Promise<any> {
        return mailService.send({
            to: recipient,
            subject: title,
            text: body,
            html: metadata?.html || `<p>${body}</p>`,
            ...metadata
        });
    }
}
